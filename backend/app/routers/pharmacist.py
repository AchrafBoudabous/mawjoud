import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Request, Response

from app.dependencies import PharmacistIdentity, get_current_pharmacist, require_active_pharmacist
from app.schemas.pharmacist import (
    DashboardMedication,
    PharmacistAccount,
    PharmacistDashboardResponse,
    PharmacistPharmacy,
    PharmacistRegistrationCreate,
    PharmacistRegistrationCreated,
    PharmacistReportCreate,
    PharmacistReportCreated,
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


@router.post(
    "/registrations",
    response_model=PharmacistRegistrationCreated,
    status_code=201,
)
def register_pharmacist(
    request: Request,
    response: Response,
    body: PharmacistRegistrationCreate,
) -> PharmacistRegistrationCreated:
    """Unauthenticated. Claims one of the seeded pharmacies; never creates
    one. The second anonymous write path in the project -- step 4's threat
    model applies unchanged and its machinery is reused rather than
    reinvented. See docs/ARCHITECTURE.md 5.10.1.
    """
    _no_store(response)
    supabase = get_supabase()

    # 1. Resolve the reporter fingerprint. Fails CLOSED: a write that
    # creates accounts must be limitable, unlike the view-logging endpoint.
    ip, source = resolve_client_ip(request)
    if ip is None:
        logger.error("no client ip available for pharmacist registration (source=%s)", source)
        raise HTTPException(
            status_code=503, detail="registration temporarily unavailable"
        )
    fingerprint = fingerprint_ip(ip)

    # 2. Rate limit, evaluated against the table, not process memory
    # (decision 4.15.5 -- Render restarts).
    window_start = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    try:
        recent = (
            supabase.table("pharmacist_accounts")
            .select("id")
            .eq("registration_fingerprint", fingerprint)
            .gte("created_at", window_start)
            .limit(REGISTRATION_MAX_PER_FINGERPRINT_PER_DAY + 1)
            .execute()
        ).data
    except Exception:
        logger.exception("failed to check registration rate limit")
        raise HTTPException(
            status_code=503, detail="registration temporarily unavailable"
        )

    if len(recent) >= REGISTRATION_MAX_PER_FINGERPRINT_PER_DAY:
        logger.warning("registration rejected fp=%s", fingerprint[:8])
        raise HTTPException(
            status_code=429,
            detail="too many registration requests from this device",
        )

    # 3. Pharmacy must exist.
    try:
        pharmacy_rows = (
            supabase.table("pharmacies")
            .select("id,name")
            .eq("id", str(body.pharmacy_id))
            .limit(1)
            .execute()
        ).data
    except Exception:
        logger.exception("failed to resolve pharmacy for registration")
        raise HTTPException(
            status_code=503, detail="registration temporarily unavailable"
        )

    if not pharmacy_rows:
        raise HTTPException(status_code=404, detail="pharmacy not found")

    pharmacy = pharmacy_rows[0]

    # 4. E-mail must be free. The unique constraint is the real guard;
    # this check exists to produce a clean 409 instead of a driver error.
    try:
        existing = (
            supabase.table("pharmacist_accounts")
            .select("id")
            .eq("email", body.email)
            .limit(1)
            .execute()
        ).data
    except Exception:
        logger.exception("failed to check for an existing pharmacist account")
        raise HTTPException(
            status_code=503, detail="registration temporarily unavailable"
        )

    if existing:
        raise HTTPException(status_code=409, detail="email already registered")

    # 5. Insert. `status` is never accepted from the client -- extra="forbid"
    # on the request model already rejects an attempt to supply it.
    try:
        inserted = (
            supabase.table("pharmacist_accounts")
            .insert(
                {
                    "pharmacy_id": str(body.pharmacy_id),
                    "email": body.email,
                    "full_name": body.full_name,
                    "phone": body.phone,
                    "registration_fingerprint": fingerprint,
                }
            )
            .execute()
        ).data
    except Exception as exc:
        # A concurrent duplicate that slipped past the check above must
        # still map to a clean 409, not a 500.
        message = str(exc).lower()
        if "unique" in message or "duplicate" in message:
            raise HTTPException(status_code=409, detail="email already registered")
        logger.exception("failed to insert pharmacist account")
        raise HTTPException(
            status_code=503, detail="registration temporarily unavailable"
        )

    if not inserted:
        logger.error("pharmacist account insert returned no rows")
        raise HTTPException(
            status_code=503, detail="registration temporarily unavailable"
        )

    row = inserted[0]

    return PharmacistRegistrationCreated(
        id=row["id"],
        email=row["email"],
        full_name=row["full_name"],
        status=row["status"],
        pharmacy_id=row["pharmacy_id"],
        pharmacy_name=pharmacy["name"],
    )


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
            .select("id,name,address,city,governorate,phone,verified")
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

    try:
        stats_rows = (
            supabase.table("medication_search_stats_7d")
            .select("medication_id,viewers_7d")
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
            .select("full_name,created_at")
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

    return PharmacistDashboardResponse(
        account=PharmacistAccount(
            id=identity.account_id,
            email=identity.email,
            full_name=account_details["full_name"],
            status=identity.status,
            created_at=account_details["created_at"],
        ),
        pharmacy=PharmacistPharmacy(
            id=pharmacy["id"],
            name=pharmacy["name"],
            address=pharmacy["address"],
            city=pharmacy["city"],
            governorate=pharmacy["governorate"],
            phone=pharmacy["phone"],
            verified=pharmacy["verified"],
        ),
        medications=medications,
        count=len(medications),
        stats_window_days=STATS_WINDOW_DAYS,
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
