import json
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, Request, Response, UploadFile
from pydantic import ValidationError

from app.dependencies import PharmacistIdentity, get_current_pharmacist, require_active_pharmacist
from app.schemas.pharmacist import (
    DUTY_MAX_DAYS_AHEAD,
    DUTY_MAX_UPCOMING,
    DashboardMedication,
    DutyShift,
    DutyShiftCreate,
    PharmacistAccount,
    PharmacistDashboardResponse,
    PharmacistPharmacy,
    PharmacistRegistrationCreate,
    PharmacistRegistrationCreated,
    PharmacistReportCreate,
    PharmacistReportCreated,
)
from app.services.certificates import (
    CERTIFICATE_BUCKET,
    MAX_CERTIFICATE_BYTES,
    certificate_extension,
    sniff_certificate_type,
)
from app.services.reporter_identity import fingerprint_ip, resolve_client_ip
from app.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pharmacist", tags=["pharmacist"])

# Generous for a legitimate device (a pharmacy laptop registering the
# titulaire and two assistants in one sitting), low enough that
# account-table flooding is pointless. A single constant, deliberately, so
# it can be raised without a redesign (ARCHITECTURE.md 5.10.1).
REGISTRATION_MAX_PER_FINGERPRINT_PER_DAY = 3

STATS_WINDOW_DAYS = 7

_CATEGORY_ORDER = {"thyroid": 0, "insulin": 1, "psychiatric": 2, "cancer_pain": 3}


def _no_store(response: Response) -> None:
    # Authenticated payloads must never enter a shared cache.
    response.headers["Cache-Control"] = "no-store"


def _registration_unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="registration temporarily unavailable")


def _parse_registration(
    pharmacy_id: str | None,
    new_pharmacy_json: str | None,
    email: str,
    full_name: str,
    phone: str,
) -> PharmacistRegistrationCreate:
    """Multipart fields -> the same strict model as before (extra fields,
    a client-chosen status etc. cannot get in: they are not parameters)."""
    try:
        proposal = json.loads(new_pharmacy_json) if new_pharmacy_json else None
        return PharmacistRegistrationCreate(
            pharmacy_id=pharmacy_id or None,
            new_pharmacy=proposal,
            email=email,
            full_name=full_name,
            phone=phone,
        )
    except (ValidationError, ValueError) as exc:
        errors = exc.errors() if isinstance(exc, ValidationError) else [{"msg": str(exc)}]
        raise HTTPException(
            status_code=422,
            detail=[{"loc": e.get("loc"), "msg": e.get("msg")} for e in errors],
        )


def _read_certificate(certificate: UploadFile) -> tuple[bytes, str]:
    data = certificate.file.read(MAX_CERTIFICATE_BYTES + 1)
    if len(data) == 0:
        raise HTTPException(status_code=422, detail="certificate is empty")
    if len(data) > MAX_CERTIFICATE_BYTES:
        raise HTTPException(status_code=413, detail="certificate too large")
    content_type = sniff_certificate_type(data[:16])
    if content_type is None:
        raise HTTPException(status_code=415, detail="certificate must be a PDF, JPEG, PNG or WEBP file")
    return data, content_type


@router.post(
    "/registrations",
    response_model=PharmacistRegistrationCreated,
    status_code=201,
)
def register_pharmacist(
    request: Request,
    response: Response,
    email: str = Form(..., max_length=254),
    full_name: str = Form(..., max_length=200),
    phone: str = Form(..., max_length=40),
    certificate: UploadFile = File(...),
    pharmacy_id: str | None = Form(None, max_length=40),
    new_pharmacy: str | None = Form(None, max_length=4000),
) -> PharmacistRegistrationCreated:
    """Unauthenticated, multipart. Claims a listed pharmacy OR proposes a
    missing one, always with a certificate, and creates a `pending`
    request for an admin to review on /admin. One live account per
    pharmacy (shared pharmacy e-mail). The body size is capped by
    middleware in main.py before it is ever parsed.
    """
    _no_store(response)
    supabase = get_supabase()
    body = _parse_registration(pharmacy_id, new_pharmacy, email, full_name, phone)

    # 1. Fingerprint + rate limit. Fails CLOSED.
    ip, source = resolve_client_ip(request)
    if ip is None:
        logger.error("no client ip available for pharmacist registration (source=%s)", source)
        raise _registration_unavailable()
    fingerprint = fingerprint_ip(ip)

    window_start = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    try:
        recent = (
            supabase.table("pharmacist_accounts").select("id")
            .eq("registration_fingerprint", fingerprint).gte("created_at", window_start)
            .limit(REGISTRATION_MAX_PER_FINGERPRINT_PER_DAY + 1).execute()
        ).data
    except Exception:
        logger.exception("failed to check registration rate limit")
        raise _registration_unavailable()
    if len(recent) >= REGISTRATION_MAX_PER_FINGERPRINT_PER_DAY:
        logger.warning("registration rejected fp=%s", fingerprint[:8])
        raise HTTPException(status_code=429, detail="too many registration requests from this device")

    # 2. The certificate is mandatory and checked by content.
    cert_bytes, cert_type = _read_certificate(certificate)

    # 3. Pharmacy: a listed one with no live account, or a valid proposal.
    pharmacy_name: str
    if body.pharmacy_id is not None:
        try:
            pharmacy_rows = (
                supabase.table("pharmacies").select("id,name")
                .eq("id", str(body.pharmacy_id)).eq("is_public", True).limit(1).execute()
            ).data
            live = (
                supabase.table("pharmacist_accounts").select("id")
                .eq("pharmacy_id", str(body.pharmacy_id)).neq("status", "rejected").limit(1).execute()
            ).data
        except Exception:
            logger.exception("failed to resolve pharmacy for registration")
            raise _registration_unavailable()
        if not pharmacy_rows:
            raise HTTPException(status_code=404, detail="pharmacy not found")
        if live:
            raise HTTPException(status_code=409, detail="pharmacy already has an account")
        pharmacy_name = pharmacy_rows[0]["name"]
    else:
        try:
            gov = (
                supabase.table("governorates").select("slug")
                .eq("slug", body.new_pharmacy.governorate_slug).limit(1).execute()
            ).data
        except Exception:
            logger.exception("failed to resolve governorate for registration")
            raise _registration_unavailable()
        if not gov:
            raise HTTPException(status_code=422, detail="unknown governorate")
        pharmacy_name = body.new_pharmacy.name

    # 4. E-mail must be free (the unique constraint is the real guard).
    try:
        taken = (
            supabase.table("pharmacist_accounts").select("id")
            .eq("email", body.email).limit(1).execute()
        ).data
    except Exception:
        logger.exception("failed to check for an existing pharmacist account")
        raise _registration_unavailable()
    if taken:
        raise HTTPException(status_code=409, detail="email already registered")

    # 5. Upload, then insert; undo the upload (and a proposed pharmacy) if
    # anything after it fails, so no orphan file or hidden row is left.
    object_path = f"{uuid4()}.{certificate_extension(cert_type)}"
    bucket = supabase.storage.from_(CERTIFICATE_BUCKET)
    try:
        bucket.upload(object_path, cert_bytes, {"content-type": cert_type, "upsert": "false"})
    except Exception:
        logger.exception("failed to upload pharmacy certificate")
        raise _registration_unavailable()

    created_pharmacy_id: str | None = None
    created_account_id: str | None = None
    try:
        if body.new_pharmacy is not None:
            p = body.new_pharmacy
            try:
                created = (
                    supabase.table("pharmacies").insert({
                        "name": p.name, "address": p.address, "city": p.city,
                        "governorate_slug": p.governorate_slug, "lat": p.lat, "lng": p.lng,
                        "phone": p.phone, "source": "manual", "is_public": False, "verified": False,
                    }).execute()
                ).data
            except Exception as exc:
                if "unique" in str(exc).lower() or "duplicate" in str(exc).lower():
                    raise HTTPException(status_code=409, detail="pharmacy already exists")
                raise
            created_pharmacy_id = created[0]["id"]
            target_pharmacy_id = created_pharmacy_id
        else:
            target_pharmacy_id = str(body.pharmacy_id)

        try:
            inserted = (
                supabase.table("pharmacist_accounts").insert({
                    "pharmacy_id": target_pharmacy_id,
                    "email": body.email,
                    "full_name": body.full_name,
                    "phone": body.phone,
                    "registration_fingerprint": fingerprint,
                    "certificate_path": object_path,
                    "certificate_content_type": cert_type,
                    "certificate_uploaded_at": datetime.now(timezone.utc).isoformat(),
                }).execute()
            ).data
        except Exception as exc:
            message = str(exc).lower()
            if "one_per_pharmacy" in message:
                raise HTTPException(status_code=409, detail="pharmacy already has an account")
            if "unique" in message or "duplicate" in message:
                raise HTTPException(status_code=409, detail="email already registered")
            raise
        if not inserted:
            raise RuntimeError("pharmacist account insert returned no rows")
        created_account_id = inserted[0]["id"]

        # 6. The Supabase login user, created HERE rather than by the
        # browser's first magic-link request. Two reasons: (a) if that
        # e-mail step failed, the request existed with no login user, and
        # login (shouldCreateUser: false) could never recover it; (b) it
        # lets the project switch OFF public sign-ups entirely.
        # email_confirm=True only skips GoTrue's separate "confirm sign-up"
        # mail: proof of the inbox still comes from the sign-in code/link,
        # which is the only way to obtain a session.
        _ensure_auth_user(supabase, body.email)
    except Exception as exc:
        _cleanup_failed_registration(supabase, object_path, created_pharmacy_id, created_account_id)
        if isinstance(exc, HTTPException):
            raise
        logger.exception("failed to create pharmacist registration")
        raise _registration_unavailable()

    row = inserted[0]
    return PharmacistRegistrationCreated(
        id=row["id"],
        email=row["email"],
        full_name=row["full_name"],
        status=row["status"],
        pharmacy_id=row["pharmacy_id"],
        pharmacy_name=pharmacy_name,
        new_pharmacy=created_pharmacy_id is not None,
    )


def _ensure_auth_user(supabase, email: str) -> None:
    """Create the Supabase Auth user for a registration; an existing one
    (re-registration after a rejection, or an admin who is also a
    pharmacist) is fine."""
    try:
        supabase.auth.admin.create_user({"email": email, "email_confirm": True})
    except Exception as exc:
        code = str(getattr(exc, "code", "") or "").lower()
        message = str(exc).lower()
        if code in ("email_exists", "user_already_exists") or "already" in message:
            return
        logger.exception("failed to create the Supabase auth user for a registration")
        raise


def _cleanup_failed_registration(
    supabase, object_path: str, pharmacy_id: str | None, account_id: str | None = None
) -> None:
    if account_id:
        try:
            supabase.table("pharmacist_accounts").delete().eq("id", account_id).execute()
        except Exception:
            logger.exception("failed to remove orphan pharmacist account %s", account_id)
    try:
        supabase.storage.from_(CERTIFICATE_BUCKET).remove([object_path])
    except Exception:
        logger.exception("failed to remove orphan certificate %s", object_path)
    if pharmacy_id:
        try:
            supabase.table("pharmacies").delete().eq("id", pharmacy_id).eq("is_public", False).execute()
        except Exception:
            logger.exception("failed to remove orphan proposed pharmacy %s", pharmacy_id)


@router.get("/dashboard", response_model=PharmacistDashboardResponse)
def get_dashboard(
    response: Response,
    identity: PharmacistIdentity = Depends(get_current_pharmacist),
) -> PharmacistDashboardResponse:
    """Any account status: a `pending` account gets 200 with real data, so
    the frontend can render its own read-only waiting state instead of an
    error (decision 2.12.8). See docs/ARCHITECTURE.md 5.10.2.
    """
    _no_store(response)
    supabase = get_supabase()

    try:
        pharmacy_rows = (
            supabase.table("pharmacies")
            .select("id,name,address,city,governorate,governorate_slug,phone,verified,is_24h")
            .eq("id", str(identity.pharmacy_id))
            .limit(1)
            .execute()
        ).data
    except Exception:
        logger.exception("failed to fetch pharmacy for dashboard")
        raise HTTPException(status_code=503, detail="dashboard temporarily unavailable")

    if not pharmacy_rows:
        logger.error("pharmacist account references a missing pharmacy id=%s", identity.pharmacy_id)
        raise HTTPException(status_code=503, detail="dashboard temporarily unavailable")

    pharmacy = pharmacy_rows[0]

    try:
        board_rows = (
            supabase.table("pharmacy_medication_status")
            .select(
                "medication_id,medication_slug,medication_name,generic_name,form,"
                "category,status,reported_at,reported_by"
            )
            .eq("pharmacy_id", str(identity.pharmacy_id))
            .execute()
        ).data
    except Exception:
        logger.exception("failed to fetch medication board for dashboard")
        raise HTTPException(status_code=503, detail="dashboard temporarily unavailable")

    # "N recherches près de chez vous": scoped to this pharmacy's
    # governorate, which is what makes the number about *their* patients.
    try:
        stats_rows = (
            supabase.table("medication_search_stats_7d_by_governorate")
            .select("medication_id,viewers_7d")
            .eq("governorate_slug", pharmacy["governorate_slug"])
            .execute()
        ).data
    except Exception:
        logger.exception("failed to fetch search stats for dashboard")
        raise HTTPException(status_code=503, detail="dashboard temporarily unavailable")

    viewers_by_medication = {row["medication_id"]: row["viewers_7d"] for row in stats_rows}

    medications = [
        DashboardMedication(
            id=row["medication_id"],
            slug=row["medication_slug"],
            name=row["medication_name"],
            generic_name=row["generic_name"],
            form=row["form"],
            category=row["category"],
            status=row["status"],
            reported_at=row["reported_at"],
            reported_by=row["reported_by"],
            searches_last_7_days=viewers_by_medication.get(row["medication_id"], 0),
        )
        for row in board_rows
    ]

    medications.sort(key=lambda m: (_CATEGORY_ORDER.get(m.category, 99), m.name))

    # PharmacistIdentity deliberately carries only the fields the auth
    # dependency needs (ARCHITECTURE.md 5.9.3); full_name/created_at are
    # display-only, so they are fetched here with a single by-id lookup
    # rather than widening every authenticated request's identity query.
    try:
        account_rows = (
            supabase.table("pharmacist_accounts")
            .select("full_name,created_at,review_note")
            .eq("id", str(identity.account_id))
            .limit(1)
            .execute()
        ).data
    except Exception:
        logger.exception("failed to fetch account details for dashboard")
        raise HTTPException(status_code=503, detail="dashboard temporarily unavailable")

    if not account_rows:
        logger.error("pharmacist account disappeared between identity resolution and dashboard read")
        raise HTTPException(status_code=404, detail="pharmacist account not found")

    account_details = account_rows[0]

    duty_shifts = _fetch_upcoming_shifts(str(identity.pharmacy_id))

    return PharmacistDashboardResponse(
        account=PharmacistAccount(
            id=identity.account_id,
            email=identity.email,
            full_name=account_details["full_name"],
            status=identity.status,
            created_at=account_details["created_at"],
            review_note=account_details.get("review_note") if identity.status in ("rejected", "suspended") else None,
        ),
        pharmacy=PharmacistPharmacy(
            id=pharmacy["id"],
            name=pharmacy["name"],
            address=pharmacy["address"],
            city=pharmacy["city"],
            governorate=pharmacy["governorate"],
            governorate_slug=pharmacy["governorate_slug"],
            phone=pharmacy["phone"],
            verified=pharmacy["verified"],
            is_24h=pharmacy["is_24h"],
        ),
        medications=medications,
        count=len(medications),
        stats_window_days=STATS_WINDOW_DAYS,
        stats_governorate=pharmacy["governorate"],
        duty_shifts=duty_shifts,
    )


@router.post(
    "/medications/{slug}/reports",
    response_model=PharmacistReportCreated,
    status_code=201,
)
def create_pharmacist_report(
    response: Response,
    body: PharmacistReportCreate,
    slug: str = Path(..., min_length=1, max_length=80, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$"),
    identity: PharmacistIdentity = Depends(require_active_pharmacist),
) -> PharmacistReportCreated:
    """The authenticated counterpart of step 4's public report endpoint.
    There is no `pharmacy_id` anywhere in the request -- it is read from
    `identity.pharmacy_id`, server-side, exactly as step 4 never accepted
    a client-supplied `reported_by`. See docs/ARCHITECTURE.md 5.10.3.
    """
    _no_store(response)
    supabase = get_supabase()

    try:
        med_rows = (
            supabase.table("medications")
            .select("id")
            .eq("slug", slug)
            .eq("is_active", True)
            .limit(1)
            .execute()
        ).data
    except Exception:
        logger.exception("failed to resolve medication slug for pharmacist report")
        raise HTTPException(
            status_code=503, detail="stock reporting temporarily unavailable"
        )

    if not med_rows:
        raise HTTPException(status_code=404, detail="medication not found")

    medication_id = med_rows[0]["id"]

    # reported_at / created_at are deliberately omitted so the Postgres
    # defaults fire -- kills backdating and future-dating by construction.
    # reporter_fingerprint is omitted -> NULL: this is not the public path.
    try:
        inserted = (
            supabase.table("stock_reports")
            .insert(
                {
                    "pharmacy_id": str(identity.pharmacy_id),
                    "medication_id": medication_id,
                    "status": body.status,
                    "reported_by": "pharmacist",
                    "reported_by_account_id": str(identity.account_id),
                }
            )
            .execute()
        ).data
    except Exception:
        logger.exception("failed to insert pharmacist stock report")
        raise HTTPException(
            status_code=503, detail="stock reporting temporarily unavailable"
        )

    if not inserted:
        logger.error("pharmacist stock report insert returned no rows")
        raise HTTPException(
            status_code=503, detail="stock reporting temporarily unavailable"
        )

    row = inserted[0]

    return PharmacistReportCreated(
        id=row["id"],
        medication_id=row["medication_id"],
        medication_slug=slug,
        pharmacy_id=row["pharmacy_id"],
        status=row["status"],
        reported_at=row["reported_at"],
        reported_by=row["reported_by"],
    )


# ---------------------------------------------------------------------
# Pharmacies de garde
# ---------------------------------------------------------------------

_SHIFT_COLUMNS = "id,kind,starts_at,ends_at"


def _fetch_upcoming_shifts(pharmacy_id: str) -> list[DutyShift]:
    """Current and future gardes of one pharmacy, soonest first."""
    now = datetime.now(timezone.utc).isoformat()
    try:
        rows = (
            get_supabase()
            .table("pharmacy_duty_shifts")
            .select(_SHIFT_COLUMNS)
            .eq("pharmacy_id", pharmacy_id)
            .gt("ends_at", now)
            .order("starts_at")
            .limit(DUTY_MAX_UPCOMING + 1)
            .execute()
        ).data
    except Exception:
        logger.exception("failed to fetch duty shifts")
        raise HTTPException(status_code=503, detail="dashboard temporarily unavailable")
    return [DutyShift(**row) for row in rows]


@router.post("/duty-shifts", response_model=DutyShift, status_code=201)
def create_duty_shift(
    response: Response,
    body: DutyShiftCreate,
    identity: PharmacistIdentity = Depends(require_active_pharmacist),
) -> DutyShift:
    """Declare a garde for the caller's own pharmacy. As with stock
    reports, the pharmacy is taken from the identity, never the body."""
    _no_store(response)
    now = datetime.now(timezone.utc)

    if body.ends_at <= now:
        raise HTTPException(status_code=422, detail="duty shift is already over")
    if body.starts_at > now + timedelta(days=DUTY_MAX_DAYS_AHEAD):
        raise HTTPException(
            status_code=422, detail=f"duty shift starts more than {DUTY_MAX_DAYS_AHEAD} days ahead"
        )

    pharmacy_id = str(identity.pharmacy_id)
    upcoming = _fetch_upcoming_shifts(pharmacy_id)
    if len(upcoming) >= DUTY_MAX_UPCOMING:
        raise HTTPException(status_code=429, detail="too many upcoming duty shifts")
    if any(s.starts_at < body.ends_at and body.starts_at < s.ends_at for s in upcoming):
        raise HTTPException(status_code=409, detail="overlaps an existing duty shift")

    try:
        inserted = (
            get_supabase()
            .table("pharmacy_duty_shifts")
            .insert(
                {
                    "pharmacy_id": pharmacy_id,
                    "kind": body.kind,
                    "starts_at": body.starts_at.isoformat(),
                    "ends_at": body.ends_at.isoformat(),
                    "created_by_account_id": str(identity.account_id),
                }
            )
            .execute()
        ).data
    except Exception:
        logger.exception("failed to insert duty shift")
        raise HTTPException(status_code=503, detail="duty shifts temporarily unavailable")
    if not inserted:
        raise HTTPException(status_code=503, detail="duty shifts temporarily unavailable")
    return DutyShift(**inserted[0])


@router.delete("/duty-shifts/{shift_id}", status_code=204)
def delete_duty_shift(
    shift_id: UUID = Path(...),
    identity: PharmacistIdentity = Depends(require_active_pharmacist),
) -> Response:
    """Remove one of the caller's own gardes. Filtering on pharmacy_id in
    the DELETE itself means another pharmacy's shift id is a no-op 404,
    never a cross-account delete."""
    try:
        deleted = (
            get_supabase()
            .table("pharmacy_duty_shifts")
            .delete()
            .eq("id", str(shift_id))
            .eq("pharmacy_id", str(identity.pharmacy_id))
            .execute()
        ).data
    except Exception:
        logger.exception("failed to delete duty shift")
        raise HTTPException(status_code=503, detail="duty shifts temporarily unavailable")
    if not deleted:
        raise HTTPException(status_code=404, detail="duty shift not found")
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
