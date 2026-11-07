import logging

from fastapi import APIRouter, HTTPException, Query, Response

from app.schemas.pharmacy import (
    GOVERNORATE_SLUG_PATTERN,
    Governorate,
    GovernorateListResponse,
    Pharmacy,
    PharmacyListResponse,
)
from app.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(tags=["pharmacies"])

PHARMACY_COLUMNS = (
    "id,name,name_ar,address,city,governorate,governorate_slug,lat,lng,phone,"
    "verified,is_24h,on_duty_until"
)


@router.get("/api/governorates", response_model=GovernorateListResponse)
def list_governorates(response: Response) -> GovernorateListResponse:
    """The 24 governorates with their pharmacy counts — powers every
    governorate picker and the client-side "nearest governorate"."""
    try:
        rows = (
            get_supabase()
            .table("governorate_overview")
            .select("slug,iso_code,name_fr,name_ar,lat,lng,pharmacy_count")
            .order("sort_order")
            .execute()
        ).data
    except Exception:
        logger.exception("Failed to fetch governorates from Supabase")
        raise HTTPException(status_code=503, detail="governorates temporarily unavailable")

    governorates = [Governorate(**row) for row in rows]
    response.headers["Cache-Control"] = "public, max-age=3600"
    return GovernorateListResponse(governorates=governorates, count=len(governorates))


@router.get("/api/pharmacies", response_model=PharmacyListResponse)
def list_pharmacies(
    response: Response,
    governorate: str = Query(..., min_length=2, max_length=40, pattern=GOVERNORATE_SLUG_PATTERN),
    on_duty: bool = Query(False, description="Only pharmacies whose garde is in progress"),
) -> PharmacyListResponse:
    """Public, read-only directory for ONE governorate, alphabetical. The
    governorate is required: the national list (~2,000 rows) is never
    shipped to a phone in one response."""
    try:
        query = (
            get_supabase()
            .table("pharmacy_directory")
            .select(PHARMACY_COLUMNS)
            .eq("governorate_slug", governorate)
            # Pharmacies proposed at registration stay hidden until approved.
            .eq("is_public", True)
        )
        if on_duty:
            query = query.not_.is_("on_duty_until", "null")
        rows = query.order("name").execute().data
    except Exception:
        logger.exception("Failed to fetch pharmacies from Supabase")
        raise HTTPException(status_code=503, detail="pharmacy directory temporarily unavailable")

    pharmacies = [Pharmacy(**row) for row in rows]
    # Shorter than before: on-duty status changes at shift boundaries.
    response.headers["Cache-Control"] = "public, max-age=120"
    return PharmacyListResponse(pharmacies=pharmacies, count=len(pharmacies), governorate=governorate)
