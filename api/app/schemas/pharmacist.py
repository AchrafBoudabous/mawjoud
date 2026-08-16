from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.schemas.medication import Medication
from app.schemas.stock import ReportSource, StockStatus, StockStatusView
from app.services.phone import normalise_tn_phone

PharmacistAccountStatus = Literal["pending", "active", "rejected", "suspended"]


class PharmacistRegistrationCreate(BaseModel):
    # extra="forbid" is load-bearing: a client trying to send `status`
    # (or anything else trust-deciding) gets a 422 instead of having it
    # silently dropped (ARCHITECTURE.md 5.10.1, mirrors 4.15.7).
    model_config = ConfigDict(extra="forbid")

    pharmacy_id: UUID
    email: EmailStr
    full_name: str
    phone: str

    @field_validator("email", mode="after")
    @classmethod
    def _normalise_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("full_name", mode="before")
    @classmethod
    def _strip_full_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("full_name", mode="after")
    @classmethod
    def _validate_full_name(cls, value: str) -> str:
        if not (2 <= len(value) <= 120):
            raise ValueError("full_name must be between 2 and 120 characters")
        return value

    @field_validator("phone", mode="after")
    @classmethod
    def _normalise_phone(cls, value: str) -> str:
        normalised = normalise_tn_phone(value)
        if normalised is None:
            raise ValueError("phone is not a valid Tunisian phone number")
        return normalised


class PharmacistRegistrationCreated(BaseModel):
    id: UUID
    email: str
    full_name: str
    status: PharmacistAccountStatus
    pharmacy_id: UUID
    pharmacy_name: str


class PharmacistAccount(BaseModel):
    id: UUID
    email: str
    full_name: str
    status: PharmacistAccountStatus
    created_at: datetime


class PharmacistPharmacy(BaseModel):
    id: UUID
    name: str
    address: str
    city: str
    governorate: str
    phone: str | None
    verified: bool


class DashboardMedication(Medication):
    status: StockStatusView
    reported_at: datetime | None
    reported_by: ReportSource | None
    searches_last_7_days: int


class PharmacistDashboardResponse(BaseModel):
    account: PharmacistAccount
    pharmacy: PharmacistPharmacy
    medications: list[DashboardMedication]
    count: int
    stats_window_days: int


class PharmacistReportCreate(BaseModel):
    # extra="forbid": there is no `pharmacy_id` field here at all, by
    # design (ARCHITECTURE.md 5.10.3) — it is derived from the
    # authenticated identity, never accepted from the client.
    model_config = ConfigDict(extra="forbid")

    status: StockStatus


class PharmacistReportCreated(BaseModel):
    id: UUID
    medication_id: UUID
    medication_slug: str
    pharmacy_id: UUID
    status: StockStatus
    reported_at: datetime
    reported_by: ReportSource
