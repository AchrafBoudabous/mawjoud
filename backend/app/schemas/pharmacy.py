from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

# Path/query pattern for a governorate slug (public.governorates.slug).
GOVERNORATE_SLUG_PATTERN = r"^[a-z]+(-[a-z]+)*$"


class Pharmacy(BaseModel):
    id: UUID
    name: str
    name_ar: str | None = None
    address: str
    city: str
    governorate: str
    governorate_slug: str
    lat: float
    lng: float
    phone: str | None
    verified: bool
    is_24h: bool = False
    # Set while a declared garde is in progress; the end of that garde.
    on_duty_until: datetime | None = None


class PharmacyListResponse(BaseModel):
    pharmacies: list[Pharmacy]
    count: int
    governorate: str | None = None


class Governorate(BaseModel):
    slug: str
    iso_code: str
    name_fr: str
    name_ar: str
    lat: float
    lng: float
    pharmacy_count: int


class GovernorateListResponse(BaseModel):
    governorates: list[Governorate]
    count: int
