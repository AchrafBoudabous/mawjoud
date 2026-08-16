from uuid import UUID

from pydantic import BaseModel


class Pharmacy(BaseModel):
    id: UUID
    name: str
    address: str
    city: str
    governorate: str
    lat: float
    lng: float
    phone: str | None
    verified: bool


class PharmacyListResponse(BaseModel):
    pharmacies: list[Pharmacy]
    count: int
