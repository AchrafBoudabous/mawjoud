from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.medication import Medication

# What the database stores.
StockStatus = Literal["in_stock", "out_of_stock", "unsure"]
# What the API returns: the same values plus the synthetic "none",
# meaning "no report exists for this pharmacy + medication".
StockStatusView = Literal["in_stock", "out_of_stock", "unsure", "none"]
ReportSource = Literal["patient", "pharmacist"]

# What an unauthenticated patient is allowed to assert (4.0). Deliberately
# narrower than StockStatus: 'unsure' is pharmacist-only.
PatientReportStatus = Literal["in_stock", "out_of_stock"]


class PharmacyStock(BaseModel):
    # Superset of schemas.pharmacy.Pharmacy: `id` is the PHARMACY id.
    id: UUID
    name: str
    address: str
    city: str
    governorate: str
    lat: float
    lng: float
    phone: str | None
    verified: bool
    status: StockStatusView
    reported_at: datetime | None
    reported_by: ReportSource | None


class StockSummary(BaseModel):
    in_stock: int
    out_of_stock: int
    unsure: int
    none: int


class MedicationStockResponse(BaseModel):
    medication: Medication
    pharmacies: list[PharmacyStock]
    count: int
    summary: StockSummary


class StockReportCreate(BaseModel):
    # extra="forbid" is load-bearing, not tidiness: a client that tries to
    # send reported_by / reported_at / reporter_fingerprint gets a 422
    # instead of having it silently dropped. The rejection is testable.
    model_config = ConfigDict(extra="forbid")

    status: PatientReportStatus


class StockReportCreated(BaseModel):
    id: UUID
    medication_id: UUID
    medication_slug: str
    pharmacy_id: UUID
    status: StockStatus
    reported_at: datetime
    reported_by: ReportSource  # always "patient" in this step
