"""Certificate-based registration and admin review."""

import json
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.certificates import MAX_CERTIFICATE_BYTES, sniff_certificate_type

client = TestClient(app, client=("203.0.113.9", 50000))
PDF = b"%PDF-1.7\n" + b"x" * 200
PHARMACY_ID = str(uuid4())
USER_ID = str(uuid4())


class FakeQuery:
    def __init__(self, db, table):
        self.db, self.table, self.op, self.payload, self.filters = db, table, "select", None, []

    def __getattr__(self, name):  # eq / neq / gte / is_ / limit / order / not_ ...
        def chain(*args, **kwargs):
            self.filters.append((name, args))
            return self
        return chain

    @property
    def not_(self):
        return self

    def select(self, *a, **k):
        self.op = "select"
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def execute(self):
        self.db.calls.append((self.table, self.op, self.payload, self.filters))
        queue = self.db.responses.get((self.table, self.op), [])
        result = queue.pop(0) if queue else []
        if isinstance(result, Exception):
            raise result
        return SimpleNamespace(data=result)


class FakeBucket:
    def __init__(self, db):
        self.db = db

    def upload(self, path, data, options):
        self.db.uploads.append((path, len(data), options))

    def remove(self, paths):
        self.db.removed.extend(paths)

    def create_signed_url(self, path, seconds):
        return {"signedURL": f"https://storage.example/{path}?token=t"}


class FakeSupabase:
    def __init__(self, responses, auth_error=None):
        self.responses = {k: list(v) for k, v in responses.items()}
        self.calls, self.uploads, self.removed, self.auth_users = [], [], [], []
        self.storage = SimpleNamespace(from_=lambda bucket: FakeBucket(self))

        def create_user(attrs):
            if auth_error:
                raise auth_error
            self.auth_users.append(attrs)

        self.auth = SimpleNamespace(admin=SimpleNamespace(create_user=create_user))

    def table(self, name):
        return FakeQuery(self, name)


def _account_row(**over):
    row = {"id": str(uuid4()), "email": "pharma@example.tn", "full_name": "Dr Test",
           "status": "pending", "pharmacy_id": PHARMACY_ID}
    row.update(over)
    return row


def _post(fake, files=None, **fields):
    data = {"email": "pharma@example.tn", "full_name": "Dr Test", "phone": "72 431 210", **fields}
    files = {"certificate": ("cert.pdf", PDF, "application/pdf")} if files is None else files
    with patch("app.routers.pharmacist.get_supabase", return_value=fake):
        return client.post("/api/pharmacist/registrations", data=data, files=files)


def test_sniffing_ignores_claimed_type():
    assert sniff_certificate_type(b"%PDF-1.4") == "application/pdf"
    assert sniff_certificate_type(b"\x89PNG\r\n\x1a\n....") == "image/png"
    assert sniff_certificate_type(b"\xff\xd8\xff\xe0") == "image/jpeg"
    assert sniff_certificate_type(b"RIFF\x00\x00\x00\x00WEBPVP8 ") == "image/webp"
    assert sniff_certificate_type(b"<html><script>") is None
    assert sniff_certificate_type(b"MZ\x90\x00") is None


def test_claim_listed_pharmacy_happy_path():
    fake = FakeSupabase({
        ("pharmacist_accounts", "select"): [[], [], []],  # rate limit, live account, email
        ("pharmacies", "select"): [[{"id": PHARMACY_ID, "name": "Pharmacie Test"}]],
        ("pharmacist_accounts", "insert"): [[_account_row()]],
    })
    r = _post(fake, pharmacy_id=PHARMACY_ID)
    assert r.status_code == 201, r.text
    assert r.json()["new_pharmacy"] is False
    (path, size, options), = fake.uploads
    assert options["content-type"] == "application/pdf" and path.endswith(".pdf")
    inserted = next(c[2] for c in fake.calls if c[:2] == ("pharmacist_accounts", "insert"))
    assert inserted["certificate_path"] == path and "status" not in inserted
    assert fake.auth_users == [{"email": "pharma@example.tn", "email_confirm": True}]


class _AuthError(Exception):
    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code


def _listed_fake(auth_error=None):
    return FakeSupabase({
        ("pharmacist_accounts", "select"): [[], [], []],
        ("pharmacies", "select"): [[{"id": PHARMACY_ID, "name": "Pharmacie Test"}]],
        ("pharmacist_accounts", "insert"): [[_account_row()]],
    }, auth_error=auth_error)


def test_existing_auth_user_is_fine():
    fake = _listed_fake(_AuthError("A user with this email address has already been registered", code="email_exists"))
    assert _post(fake, pharmacy_id=PHARMACY_ID).status_code == 201


def test_auth_failure_rolls_back_the_whole_registration():
    fake = _listed_fake(_AuthError("upstream timeout"))
    r = _post(fake, pharmacy_id=PHARMACY_ID)
    assert r.status_code == 503
    assert fake.removed == [fake.uploads[0][0]]                      # certificate removed
    assert any(c[:2] == ("pharmacist_accounts", "delete") for c in fake.calls)  # account removed


def test_one_account_per_pharmacy():
    fake = FakeSupabase({
        ("pharmacist_accounts", "select"): [[], [{"id": "existing"}]],
        ("pharmacies", "select"): [[{"id": PHARMACY_ID, "name": "Pharmacie Test"}]],
    })
    r = _post(fake, pharmacy_id=PHARMACY_ID)
    assert r.status_code == 409 and r.json()["detail"] == "pharmacy already has an account"
    assert fake.uploads == []


def test_propose_missing_pharmacy_is_created_hidden():
    pid = str(uuid4())
    fake = FakeSupabase({
        ("pharmacist_accounts", "select"): [[], []],
        ("governorates", "select"): [[{"slug": "sfax"}]],
        ("pharmacies", "insert"): [[{"id": pid}]],
        ("pharmacist_accounts", "insert"): [[_account_row(pharmacy_id=pid)]],
    })
    proposal = {"name": "Pharmacie Nouvelle", "address": "12 rue X", "city": "Sfax",
                "governorate_slug": "sfax", "lat": 34.74, "lng": 10.76, "phone": "74 000 000"}
    r = _post(fake, new_pharmacy=json.dumps(proposal))
    assert r.status_code == 201, r.text
    assert r.json()["new_pharmacy"] is True
    created = next(c[2] for c in fake.calls if c[:2] == ("pharmacies", "insert"))
    assert created["is_public"] is False and created["source"] == "manual" and created["phone"] == "+21674000000"


def test_failed_account_insert_cleans_up_upload_and_pharmacy():
    pid = str(uuid4())
    fake = FakeSupabase({
        ("pharmacist_accounts", "select"): [[], []],
        ("governorates", "select"): [[{"slug": "sfax"}]],
        ("pharmacies", "insert"): [[{"id": pid}]],
        ("pharmacist_accounts", "insert"): [RuntimeError("db down")],
    })
    proposal = {"name": "Pharmacie Nouvelle", "address": "12 rue X", "city": "Sfax",
                "governorate_slug": "sfax", "lat": 34.74, "lng": 10.76}
    r = _post(fake, new_pharmacy=json.dumps(proposal))
    assert r.status_code == 503
    assert fake.removed == [fake.uploads[0][0]]
    assert any(c[:2] == ("pharmacies", "delete") for c in fake.calls)


@pytest.mark.parametrize("fields,files,status", [
    ({"pharmacy_id": PHARMACY_ID}, {}, 422),                                                      # no file
    ({"pharmacy_id": PHARMACY_ID}, {"certificate": ("c.pdf", b"<html>", "application/pdf")}, 415),  # lying type
    ({"pharmacy_id": PHARMACY_ID}, {"certificate": ("c.pdf", b"", "application/pdf")}, 422),        # empty
    ({}, None, 422),                                                                              # neither
    ({"pharmacy_id": PHARMACY_ID, "new_pharmacy": json.dumps({"name": "ab"})}, None, 422),        # both
    ({"new_pharmacy": json.dumps({"name": "Ph X", "address": "addr", "city": "Paris",
                                  "governorate_slug": "sfax", "lat": 48.85, "lng": 2.35})}, None, 422),  # not in TN
])
def test_registration_rejects_bad_input(fields, files, status):
    fake = FakeSupabase({("pharmacist_accounts", "select"): [[], [], []],
                         ("pharmacies", "select"): [[{"id": PHARMACY_ID, "name": "P"}]]})
    r = _post(fake, files=files, **fields)
    assert r.status_code == status, r.text
    assert fake.uploads == []


def test_oversized_body_refused_before_parsing():
    r = client.post(
        "/api/pharmacist/registrations",
        content=b"x" * 10,
        headers={"content-type": "multipart/form-data; boundary=x", "content-length": str(MAX_CERTIFICATE_BYTES * 2)},
    )
    assert r.status_code == 413


# ------------------------------- admin --------------------------------

def _admin_db(extra=None):
    responses = {("admin_users", "select"): [[{"id": str(uuid4()), "email": "admin@example.tn", "auth_user_id": USER_ID}]]}
    responses.update(extra or {})
    return FakeSupabase(responses)


def _as_user(email="admin@example.tn"):
    return patch("app.dependencies._verify_supabase_token",
                 return_value={"id": USER_ID, "email": email, "email_confirmed_at": "2026-01-01T00:00:00Z"})


def _registration(status="pending", is_public=True, cert=True):
    return {
        "id": str(uuid4()), "email": "pharma@example.tn", "full_name": "Dr Test", "phone": "+21672431210",
        "status": status, "created_at": "2026-11-04T10:00:00Z", "reviewed_at": None, "review_note": None,
        "certificate_path": "a.pdf" if cert else None, "certificate_content_type": "application/pdf",
        "certificate_uploaded_at": "2026-11-04T10:00:00Z",
        "pharmacy": {"id": PHARMACY_ID, "name": "P", "address": "A", "city": "C", "governorate": "Sfax",
                     "governorate_slug": "sfax", "lat": 34.7, "lng": 10.7, "phone": None,
                     "is_public": is_public, "source": "manual", "verified": False},
    }


def test_non_admin_is_refused():
    fake = FakeSupabase({("admin_users", "select"): [[], []]})
    with _as_user("someone@example.tn"), patch("app.dependencies.get_supabase", return_value=fake):
        r = client.get("/api/admin/registrations", headers={"Authorization": "Bearer t"})
    assert r.status_code == 403


def test_admin_approves_proposed_pharmacy_and_publishes_it():
    reg = _registration(is_public=False)
    fake = _admin_db({
        ("pharmacist_accounts", "select"): [[reg], [{**reg, "status": "active"}]],
        ("pharmacist_accounts", "update"): [[{"id": reg["id"]}]],
    })
    with _as_user(), patch("app.dependencies.get_supabase", return_value=fake), \
         patch("app.routers.admin.get_supabase", return_value=fake):
        r = client.post(f"/api/admin/registrations/{reg['id']}/decision",
                        json={"action": "approve"}, headers={"Authorization": "Bearer t"})
    assert r.status_code == 200, r.text
    update = next(c for c in fake.calls if c[:2] == ("pharmacist_accounts", "update"))
    assert update[2]["status"] == "active" and update[2]["reviewed_by_admin_id"]
    assert ("eq", ("status", "pending")) in update[3]  # guarded against concurrent decisions
    assert any(c[:2] == ("pharmacies", "update") and c[2] == {"is_public": True} for c in fake.calls)


@pytest.mark.parametrize("status,action,note,code", [
    ("pending", "reject", None, 422),        # reason required
    ("active", "approve", None, 409),        # invalid transition
    ("pending", "suspend", "x", 409),
])
def test_admin_decision_rules(status, action, note, code):
    reg = _registration(status=status)
    fake = _admin_db({("pharmacist_accounts", "select"): [[reg]]})
    with _as_user(), patch("app.dependencies.get_supabase", return_value=fake), \
         patch("app.routers.admin.get_supabase", return_value=fake):
        r = client.post(f"/api/admin/registrations/{reg['id']}/decision",
                        json={"action": action, "note": note}, headers={"Authorization": "Bearer t"})
    assert r.status_code == code, r.text


def test_cannot_approve_without_certificate():
    reg = _registration(cert=False)
    fake = _admin_db({("pharmacist_accounts", "select"): [[reg]]})
    with _as_user(), patch("app.dependencies.get_supabase", return_value=fake), \
         patch("app.routers.admin.get_supabase", return_value=fake):
        r = client.post(f"/api/admin/registrations/{reg['id']}/decision",
                        json={"action": "approve"}, headers={"Authorization": "Bearer t"})
    assert r.status_code == 409


def test_certificate_link_is_short_lived():
    reg = _registration()
    fake = _admin_db({("pharmacist_accounts", "select"): [[reg]]})
    with _as_user(), patch("app.dependencies.get_supabase", return_value=fake), \
         patch("app.routers.admin.get_supabase", return_value=fake):
        r = client.get(f"/api/admin/registrations/{reg['id']}/certificate", headers={"Authorization": "Bearer t"})
    assert r.status_code == 200 and r.json()["expires_in"] == 120 and "token=" in r.json()["url"]
