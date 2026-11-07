from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.dependencies import PharmacistIdentity, require_active_pharmacist
from app.main import app
from app.schemas.pharmacist import DutyShiftCreate

client = TestClient(app, client=("203.0.113.7", 50000))
NOW = datetime.now(timezone.utc)


def test_results_require_a_governorate():
    assert client.get("/api/medications/levothyrox-50/pharmacies").status_code == 422
    assert client.get("/api/pharmacies").status_code == 422


@pytest.mark.parametrize("bad", ["Bizerte", "biz_erte", "x" * 41, "../etc", "tunis1"])
def test_governorate_slug_is_validated(bad):
    r = client.get("/api/pharmacies", params={"governorate": bad})
    assert r.status_code == 422


def test_view_logging_passes_governorate():
    fake = MagicMock()
    with patch("app.routers.medications.get_supabase", return_value=fake):
        r = client.post(
            "/api/medications/levothyrox-50/views",
            params={"governorate": "sfax"},
            headers={"X-Mawjoud-Client": "web"},
        )
    assert r.status_code == 204
    assert fake.rpc.call_args.args[1]["p_governorate"] == "sfax"


def test_duty_shift_schema():
    ok = DutyShiftCreate(kind="night", starts_at=NOW, ends_at=NOW + timedelta(hours=12))
    assert ok.kind == "night"
    with pytest.raises(ValidationError):  # naive datetime is ambiguous
        DutyShiftCreate(kind="night", starts_at=datetime(2026, 11, 5, 20), ends_at=datetime(2026, 11, 6, 8))
    with pytest.raises(ValidationError):
        DutyShiftCreate(kind="night", starts_at=NOW, ends_at=NOW - timedelta(hours=1))
    with pytest.raises(ValidationError):
        DutyShiftCreate(kind="weekend", starts_at=NOW, ends_at=NOW + timedelta(hours=73))
    with pytest.raises(ValidationError):
        DutyShiftCreate(kind="party", starts_at=NOW, ends_at=NOW + timedelta(hours=2))


def _identity():
    return PharmacistIdentity(
        account_id=uuid4(), pharmacy_id=uuid4(), email="ph@example.tn", status="active", auth_user_id=uuid4()
    )


def test_duty_shift_rules():
    app.dependency_overrides[require_active_pharmacist] = _identity
    try:
        existing = [{"id": str(uuid4()), "kind": "night",
                     "starts_at": (NOW + timedelta(hours=10)).isoformat(),
                     "ends_at": (NOW + timedelta(hours=20)).isoformat()}]
        with patch("app.routers.pharmacist._fetch_upcoming_shifts") as fetch, \
             patch("app.routers.pharmacist.get_supabase") as sb:
            from app.schemas.pharmacist import DutyShift
            fetch.return_value = [DutyShift(**e) for e in existing]

            def post(start_h, end_h):
                return client.post("/api/pharmacist/duty-shifts", json={
                    "kind": "night",
                    "starts_at": (NOW + timedelta(hours=start_h)).isoformat(),
                    "ends_at": (NOW + timedelta(hours=end_h)).isoformat(),
                })

            assert post(-5, -1).status_code == 422          # already over
            assert post(24 * 61, 24 * 61 + 5).status_code == 422  # too far ahead
            assert post(15, 25).status_code == 409          # overlaps
            sb.return_value.table.return_value.insert.return_value.execute.return_value.data = [
                {"id": str(uuid4()), "kind": "night",
                 "starts_at": (NOW + timedelta(hours=30)).isoformat(),
                 "ends_at": (NOW + timedelta(hours=40)).isoformat()}
            ]
            assert post(30, 40).status_code == 201
            inserted = sb.return_value.table.return_value.insert.call_args.args[0]
            assert "pharmacy_id" in inserted and inserted["created_by_account_id"]
    finally:
        app.dependency_overrides.clear()


def test_duty_shift_body_cannot_choose_pharmacy():
    app.dependency_overrides[require_active_pharmacist] = _identity
    try:
        r = client.post("/api/pharmacist/duty-shifts", json={
            "kind": "night", "starts_at": NOW.isoformat(),
            "ends_at": (NOW + timedelta(hours=2)).isoformat(), "pharmacy_id": str(uuid4()),
        })
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_observatory_csv_shape():
    with patch("app.routers.observatory._build") as build:
        from app.schemas.stock import ObservatoryResponse
        build.return_value = ObservatoryResponse(generated_at=NOW, weeks=12, max_age_days=14, medications=[])
        r = client.get("/api/observatory/export.csv")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert r.text.splitlines()[0].startswith("medication_slug,")
