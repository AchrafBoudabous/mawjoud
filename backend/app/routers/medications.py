import logging
from collections import Counter
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, Query, Request, Response

from app.schemas.medication import (
    Medication,
    MedicationListResponse,
    MedicationMatch,
    MedicationSearchResponse,
)
from app.schemas.pharmacy import GOVERNORATE_SLUG_PATTERN, Governorate
from app.schemas.stock import (
    GovernorateAvailability,
    MedicationAvailabilityResponse,
    MedicationStockResponse,
    PharmacyStock,
    StockReportCreate,
    StockReportCreated,
    StockSummary,
)
from app.services.report_rate_limit import (
    LOOKBACK_ROW_LIMIT,
    LOOKBACK_WINDOW,
    RecentReport,
    check_report_rate_limit,
)
from app.services.reporter_identity import fingerprint_ip, resolve_client_ip
from app.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/medications", tags=["medications"])

# Sent by frontend/src/lib/api.ts on every write. Not a secret — its only
# job is to make the request non-"simple" so the browser must preflight.
CLIENT_MARKER_HEADER = "x-mawjoud-client"
CLIENT_MARKER_VALUE = "web"

SLUG_PATTERN = r"^[a-z0-9]+(-[a-z0-9]+)*$"


@router.get("", response_model=MedicationListResponse)
def list_medications(response: Response) -> MedicationListResponse:
    """The full tracked-medication list. Powers the browse section on `/`
    and is the cold-start fallback when the typeahead cannot reach the API.
    """
    try:
        result = (
            get_supabase()
            .table("medications")
            .select("id,slug,name,generic_name,form,category")
            .eq("is_active", True)
            .order("category")
            .order("name")
            .execute()
        )
    except Exception:
        logger.exception("Failed to fetch medications from Supabase")
        raise HTTPException(
            status_code=503,
            detail="medication list temporarily unavailable",
        )

    medications = [Medication(**row) for row in result.data]

    response.headers["Cache-Control"] = "public, max-age=300"

    return MedicationListResponse(medications=medications, count=len(medications))


@router.get("/search", response_model=MedicationSearchResponse)
def search_medications(
    response: Response,
    q: str = Query(..., min_length=1, max_length=64),
    limit: int = Query(8, ge=1, le=25),
) -> MedicationSearchResponse:
    """Fuzzy typeahead search over tracked medications. Queries shorter than
    3 normalised characters are not an error — the RPC returns zero rows.
    """
    query = q.strip()

    try:
        result = (
            get_supabase()
            .rpc("search_medications", {"q": query, "max_results": limit})
            .execute()
        )
    except Exception:
        logger.exception("Failed to search medications via Supabase")
        raise HTTPException(
            status_code=503,
            detail="medication search temporarily unavailable",
        )

    medications = [MedicationMatch(**row) for row in result.data]

    response.headers["Cache-Control"] = "public, max-age=30"

    return MedicationSearchResponse(
        query=query, medications=medications, count=len(medications)
    )


@router.post("/{slug}/views", status_code=204)
def log_medication_view(
    request: Request,
    response: Response,
    slug: str = Path(..., min_length=1, max_length=80, pattern=SLUG_PATTERN),
    governorate: str | None = Query(None, max_length=40, pattern=GOVERNORATE_SLUG_PATTERN),
) -> Response:
    """Records one patient opening a medication page (optionally for a
    governorate). Backs the pharmacist dashboard's "N recherches près de
    chez vous" counter -- see docs/ARCHITECTURE.md 5.6 for why this is
    the only correct place to count a "search".

    Unlike every other write in this project, this endpoint FAILS OPEN:
    a metric must never break a patient's page. No body, no 404 for an
    unknown slug or governorate -- a probe learns nothing.
    """
    response.headers["Cache-Control"] = "no-store"

    # A bodyless POST is a CORS "simple request": browsers send it
    # cross-site WITHOUT a preflight, so any website on the internet could
    # make its visitors' browsers inflate these counters from thousands of
    # real IPs. Requiring a custom header forces a preflight, which only
    # ALLOWED_ORIGINS pass. Silently 204 (fail open) rather than 4xx.
    if request.headers.get(CLIENT_MARKER_HEADER) != CLIENT_MARKER_VALUE:
        return Response(status_code=204)

    ip, source = resolve_client_ip(request)
    if ip is None:
        logger.debug("no client ip available for medication view (source=%s)", source)
        fingerprint = None
    else:
        fingerprint = fingerprint_ip(ip)

    try:
        get_supabase().rpc(
            "log_medication_view",
            {"p_slug": slug, "p_fingerprint": fingerprint, "p_governorate": governorate},
        ).execute()
    except Exception:
        logger.exception("failed to log medication view for slug=%s", slug)
        raise HTTPException(status_code=503, detail="view logging temporarily unavailable")

    return Response(status_code=204)


_STATUS_PRIORITY = {"in_stock": 0, "unsure": 1, "none": 2, "out_of_stock": 3}


def _sort_key(row: PharmacyStock) -> tuple[int, int, float, str]:
    # In stock first; inside a status group, on-duty pharmacies first,
    # then freshest report; rows with no report sort last in their group.
    reported = row.reported_at.timestamp() if row.reported_at else float("-inf")
    on_duty = 0 if (row.on_duty_until or row.is_24h) else 1
    return (_STATUS_PRIORITY[row.status], on_duty, -reported, row.name)


def _resolve_medication(slug: str, unavailable_detail: str) -> Medication:
    """Slug resolution is the sole 404 authority, so "unknown slug" and
    "no pharmacies" are never conflated (ARCHITECTURE.md 3.6)."""
    try:
        rows = (
            get_supabase()
            .table("medications")
            .select("id,slug,name,generic_name,form,category")
            .eq("slug", slug)
            .eq("is_active", True)
            .limit(1)
            .execute()
        ).data
    except Exception:
        logger.exception("Failed to resolve medication slug from Supabase")
        raise HTTPException(status_code=503, detail=unavailable_detail)
    if not rows:
        raise HTTPException(status_code=404, detail="medication not found")
    return Medication(**rows[0])


def _resolve_governorate(slug: str, unavailable_detail: str) -> Governorate:
    try:
        rows = (
            get_supabase()
            .table("governorate_overview")
            .select("slug,iso_code,name_fr,name_ar,lat,lng,pharmacy_count")
            .eq("slug", slug)
            .limit(1)
            .execute()
        ).data
    except Exception:
        logger.exception("Failed to resolve governorate from Supabase")
        raise HTTPException(status_code=503, detail=unavailable_detail)
    if not rows:
        raise HTTPException(status_code=404, detail="governorate not found")
    return Governorate(**rows[0])


@router.get("/{slug}/pharmacies", response_model=MedicationStockResponse)
def get_medication_stock(
    response: Response,
    slug: str = Path(..., min_length=1, max_length=80, pattern=SLUG_PATTERN),
    governorate: str = Query(..., min_length=2, max_length=40, pattern=GOVERNORATE_SLUG_PATTERN),
) -> MedicationStockResponse:
    """The results endpoint: the medication plus every pharmacy of ONE
    governorate annotated with its current status, 24 h confidence and
    garde. The governorate is required — see list_pharmacies."""
    detail = "stock information temporarily unavailable"
    medication = _resolve_medication(slug, detail)
    gov = _resolve_governorate(governorate, detail)

    try:
        rows = (
            get_supabase()
            .table("pharmacy_medication_status")
            .select(
                "pharmacy_id,pharmacy_name,address,city,governorate,governorate_slug,"
                "lat,lng,phone,verified,is_24h,on_duty_until,status,reported_at,reported_by,"
                "confirmations_24h,contradictions_24h,pharmacist_confirmed_24h"
            )
            .eq("medication_id", str(medication.id))
            .eq("governorate_slug", gov.slug)
            .eq("pharmacy_is_public", True)
            .execute()
        ).data
    except Exception:
        logger.exception("Failed to fetch stock status from Supabase")
        raise HTTPException(status_code=503, detail=detail)

    pharmacies = [
        PharmacyStock(
            id=row["pharmacy_id"],
            name=row["pharmacy_name"],
            address=row["address"],
            city=row["city"],
            governorate=row["governorate"],
            governorate_slug=row["governorate_slug"],
            lat=row["lat"],
            lng=row["lng"],
            phone=row["phone"],
            verified=row["verified"],
            is_24h=row["is_24h"],
            on_duty_until=row["on_duty_until"],
            status=row["status"],
            reported_at=row["reported_at"],
            reported_by=row["reported_by"],
            confirmations_24h=row["confirmations_24h"],
            contradictions_24h=row["contradictions_24h"],
            pharmacist_confirmed_24h=row["pharmacist_confirmed_24h"],
        )
        for row in rows
    ]
    pharmacies.sort(key=_sort_key)

    counts = Counter(p.status for p in pharmacies)
    summary = StockSummary(
        in_stock=counts.get("in_stock", 0),
        out_of_stock=counts.get("out_of_stock", 0),
        unsure=counts.get("unsure", 0),
        none=counts.get("none", 0),
    )

    response.headers["Cache-Control"] = "public, max-age=60"
    return MedicationStockResponse(
        medication=medication,
        governorate=gov,
        pharmacies=pharmacies,
        count=len(pharmacies),
        summary=summary,
    )


AVAILABILITY_MAX_AGE_DAYS = 14


@router.get("/{slug}/availability", response_model=MedicationAvailabilityResponse)
def get_medication_availability(
    response: Response,
    slug: str = Path(..., min_length=1, max_length=80, pattern=SLUG_PATTERN),
) -> MedicationAvailabilityResponse:
    """National overview for one medication: per governorate, how many
    pharmacies' latest report (last 14 days) says in stock / out / unsure.
    Reads only stock_reports — never the medications x pharmacies view."""
    detail = "availability temporarily unavailable"
    medication = _resolve_medication(slug, detail)
    supabase = get_supabase()
    try:
        govs = (
            supabase.table("governorate_overview")
            .select("slug,name_fr,name_ar,pharmacy_count,sort_order")
            .order("sort_order")
            .execute()
        ).data
        stats = (
            supabase.rpc(
                "availability_by_governorate",
                {"p_medication_id": str(medication.id), "p_max_age_days": AVAILABILITY_MAX_AGE_DAYS},
            ).execute()
        ).data
    except Exception:
        logger.exception("Failed to fetch national availability from Supabase")
        raise HTTPException(status_code=503, detail=detail)

    by_gov = {row["governorate_slug"]: row for row in stats}
    governorates = []
    for g in govs:
        s = by_gov.get(g["slug"], {})
        governorates.append(
            GovernorateAvailability(
                slug=g["slug"],
                name_fr=g["name_fr"],
                name_ar=g["name_ar"],
                pharmacy_count=g["pharmacy_count"],
                in_stock=s.get("in_stock", 0),
                out_of_stock=s.get("out_of_stock", 0),
                unsure=s.get("unsure", 0),
                last_report_at=s.get("last_report_at"),
            )
        )

    in_stock = sum(g.in_stock for g in governorates)
    out = sum(g.out_of_stock for g in governorates)
    unsure = sum(g.unsure for g in governorates)
    total = sum(g.pharmacy_count for g in governorates)
    totals = StockSummary(
        in_stock=in_stock, out_of_stock=out, unsure=unsure, none=max(total - in_stock - out - unsure, 0)
    )

    response.headers["Cache-Control"] = "public, max-age=120"
    return MedicationAvailabilityResponse(
        medication=medication,
        governorates=governorates,
        totals=totals,
        max_age_days=AVAILABILITY_MAX_AGE_DAYS,
    )


def _parse_recent_report(row: dict) -> RecentReport | None:
    """PostgREST returns `created_at` as ISO 8601, sometimes with
    fractional seconds. Skip (never crash the request on) a row that fails
    to parse (docs/ARCHITECTURE.md 4.4)."""
    try:
        created_at = datetime.fromisoformat(row["created_at"])
    except (KeyError, ValueError):
        logger.warning("skipping unparseable stock_reports row in rate-limit lookup")
        return None
    return RecentReport(
        pharmacy_id=row["pharmacy_id"],
        medication_id=row["medication_id"],
        status=row["status"],
        created_at=created_at,
    )


@router.post(
    "/{slug}/pharmacies/{pharmacy_id}/reports",
    response_model=StockReportCreated,
    status_code=201,
)
def create_stock_report(
    request: Request,
    response: Response,
    body: StockReportCreate,
    slug: str = Path(..., min_length=1, max_length=80, pattern=SLUG_PATTERN),
    pharmacy_id: UUID = Path(...),
) -> StockReportCreated:
    """The public (no-auth) write path: a patient reports what they found
    at a pharmacy counter. See docs/ARCHITECTURE.md 4.5 for the exact
    handler-order rationale — an unknown medication/pharmacy must never
    consume a rate-limit slot, and the 429 body is uniform and numberless
    across all four abuse rules.
    """
    # 1. Resolve the medication -> 404. Same string as the GET endpoint.
    try:
        med_result = (
            get_supabase()
            .table("medications")
            .select("id,slug")
            .eq("slug", slug)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
    except Exception:
        logger.exception("Failed to resolve medication slug from Supabase")
        raise HTTPException(
            status_code=503,
            detail="stock reporting temporarily unavailable",
        )

    if not med_result.data:
        raise HTTPException(status_code=404, detail="medication not found")

    medication_id = med_result.data[0]["id"]

    # 2. Resolve the pharmacy -> 404.
    try:
        pharmacy_result = (
            get_supabase()
            .table("pharmacies")
            .select("id")
            .eq("id", str(pharmacy_id))
            .eq("is_public", True)
            .limit(1)
            .execute()
        )
    except Exception:
        logger.exception("Failed to resolve pharmacy from Supabase")
        raise HTTPException(
            status_code=503,
            detail="stock reporting temporarily unavailable",
        )

    if not pharmacy_result.data:
        raise HTTPException(status_code=404, detail="pharmacy not found")

    # 3. Resolve the reporter fingerprint. Failing closed is correct: an
    # unlimited write path is worse than a temporarily unavailable one.
    ip, source = resolve_client_ip(request)
    if ip is None:
        logger.error("no client ip available for stock report (source=%s)", source)
        raise HTTPException(
            status_code=503,
            detail="stock reporting temporarily unavailable",
        )
    fingerprint = fingerprint_ip(ip)

    # 4. Rate-limit check, against the append-only log, not process memory.
    now = datetime.now(timezone.utc)
    window_start = (now - LOOKBACK_WINDOW).isoformat()
    try:
        recent_rows = (
            get_supabase()
            .table("stock_reports")
            .select("pharmacy_id,medication_id,status,created_at")
            .eq("reporter_fingerprint", fingerprint)
            .gte("created_at", window_start)
            .order("created_at", desc=True)
            .limit(LOOKBACK_ROW_LIMIT)
            .execute()
        ).data
    except Exception:
        logger.exception("Failed to fetch recent stock reports for rate limiting")
        raise HTTPException(
            status_code=503,
            detail="stock reporting temporarily unavailable",
        )

    recent = [
        report
        for report in (_parse_recent_report(row) for row in recent_rows)
        if report is not None
    ]

    rejected_rule = check_report_rate_limit(
        recent,
        pharmacy_id=str(pharmacy_id),
        medication_id=str(medication_id),
        status=body.status,
        now=now,
    )
    if rejected_rule is not None:
        logger.warning(
            "stock report rejected rule=%s fp=%s", rejected_rule, fingerprint[:8]
        )
        raise HTTPException(
            status_code=429,
            detail="too many recent reports from this device",
        )

    # 5. Insert. reported_at / created_at are deliberately omitted so the
    # Postgres column defaults fire — see docs/ARCHITECTURE.md 4.5.
    try:
        inserted = (
            get_supabase()
            .table("stock_reports")
            .insert(
                {
                    "pharmacy_id": str(pharmacy_id),
                    "medication_id": str(medication_id),
                    "status": body.status,
                    "reported_by": "patient",
                    "reporter_fingerprint": fingerprint,
                }
            )
            .execute()
        ).data
    except Exception:
        logger.exception("Failed to insert stock report")
        raise HTTPException(
            status_code=503,
            detail="stock reporting temporarily unavailable",
        )

    if not inserted:
        logger.error("stock report insert returned no rows")
        raise HTTPException(
            status_code=503,
            detail="stock reporting temporarily unavailable",
        )

    row = inserted[0]
    response.headers["Cache-Control"] = "no-store"

    return StockReportCreated(
        id=row["id"],
        medication_id=row["medication_id"],
        medication_slug=slug,
        pharmacy_id=row["pharmacy_id"],
        status=row["status"],
        reported_at=row["reported_at"],
        reported_by=row["reported_by"],
    )
