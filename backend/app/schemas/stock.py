from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.medication import Medication
from app.schemas.pharmacy import Governorate

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
    governorate_slug: str
    lat: float
    lng: float
    phone: str | None
    verified: bool
    is_24h: bool
    on_duty_until: datetime | None
    status: StockStatusView
    reported_at: datetime | None
    reported_by: ReportSource | None
    # Distinct reporters in the last 24 h who agree / disagree with
    # `status`. The frontend turns these into a confidence level.
    confirmations_24h: int
    contradictions_24h: int
    pharmacist_confirmed_24h: bool


class StockSummary(BaseModel):
    in_stock: int
    out_of_stock: int
    unsure: int
    none: int


class MedicationStockResponse(BaseModel):
    medication: Medication
    governorate: Governorate
    pharmacies: list[PharmacyStock]
    count: int
    summary: StockSummary


class GovernorateAvailability(BaseModel):
    slug: str
    name_fr: str
    name_ar: str
    pharmacy_count: int
    in_stock: int
    out_of_stock: int
    unsure: int
    last_report_at: datetime | None


class MedicationAvailabilityResponse(BaseModel):
    """National overview: one row per governorate, from reports made in
    the last `max_age_days` days."""

    medication: Medication
    governorates: list[GovernorateAvailability]
    totals: StockSummary
    max_age_days: int


class ObservatoryWeek(BaseModel):
    week_start: date
    in_stock_reports: int
    out_of_stock_reports: int
    viewers: int


class ObservatoryMedication(BaseModel):
    medication: Medication
    in_stock_pharmacies: int
    out_of_stock_pharmacies: int
    unsure_pharmacies: int
    governorates_reporting: int
    weeks: list[ObservatoryWeek]


class ObservatoryResponse(BaseModel):
    generated_at: datetime
    weeks: int
    max_age_days: int
    medications: list[ObservatoryMedication]


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
