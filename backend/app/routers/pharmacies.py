import logging

from fastapi import APIRouter, HTTPException, Response

from app.schemas.pharmacy import Pharmacy, PharmacyListResponse
from app.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pharmacies", tags=["pharmacies"])


@router.get("", response_model=PharmacyListResponse)
def list_pharmacies(response: Response) -> PharmacyListResponse:
    """Public, read-only list of every seeded pharmacy, alphabetical by
    name. No auth, no query params, no pagination — 12 rows do not need
    them yet (see docs/ARCHITECTURE.md, step 2, section 2.4).
    """
    try:
        result = (
            get_supabase()
            .table("pharmacies")
            .select("id,name,address,city,governorate,lat,lng,phone,verified")
            .order("name")
            .execute()
        )
    except Exception:
        logger.exception("Failed to fetch pharmacies from Supabase")
        raise HTTPException(
            status_code=503,
            detail="pharmacy directory temporarily unavailable",
        )

    pharmacies = [Pharmacy(**row) for row in result.data]

    response.headers["Cache-Control"] = "public, max-age=300"

    return PharmacyListResponse(pharmacies=pharmacies, count=len(pharmacies))
