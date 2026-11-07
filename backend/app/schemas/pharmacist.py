from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, EmailStr, field_validator, model_validator

from app.schemas.medication import Medication
from app.schemas.stock import ReportSource, StockStatus, StockStatusView
from app.services.phone import normalise_tn_phone

PharmacistAccountStatus = Literal["pending", "active", "rejected", "suspended"]


GOVERNORATE_SLUG_RE = r"^[a-z]+(-[a-z]+)*$"


class NewPharmacyProposal(BaseModel):
    """A pharmacy missing from the directory, proposed by the registrant.
    Created hidden (is_public = false) and published only on approval."""

    model_config = ConfigDict(extra="forbid")

    name: str
    address: str
    city: str
    governorate_slug: str
    lat: float
    lng: float
    phone: str | None = None

    @field_validator("name", "address", "city", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("name", "address", "city", mode="after")
    @classmethod
    def _length(cls, value: str) -> str:
        if not (2 <= len(value) <= 160):
            raise ValueError("must be between 2 and 160 characters")
        return value

    @field_validator("governorate_slug", mode="after")
    @classmethod
    def _gov(cls, value: str) -> str:
        import re

        if not re.fullmatch(GOVERNORATE_SLUG_RE, value) or len(value) > 40:
            raise ValueError("invalid governorate")
        return value

    @model_validator(mode="after")
    def _inside_tunisia(self) -> "NewPharmacyProposal":
        # Same bounds as the pharmacies_lat/lng_tunisia DB checks.
        if not (30 <= self.lat <= 38 and 7 <= self.lng <= 12):
            raise ValueError("location must be in Tunisia")
        return self

    @field_validator("phone", mode="after")
    @classmethod
    def _phone(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalised = normalise_tn_phone(value)
        if normalised is None:
            raise ValueError("phone is not a valid Tunisian phone number")
        return normalised


class PharmacistRegistrationCreate(BaseModel):
    # extra="forbid" is load-bearing: a client trying to send `status`
    # (or anything else trust-deciding) gets a 422 instead of having it
    # silently dropped (ARCHITECTURE.md 5.10.1, mirrors 4.15.7).
    model_config = ConfigDict(extra="forbid")

    # Exactly one of the two: claim a listed pharmacy, or propose one.
    pharmacy_id: UUID | None = None
    new_pharmacy: NewPharmacyProposal | None = None
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

    @model_validator(mode="after")
    def _exactly_one_pharmacy(self) -> "PharmacistRegistrationCreate":
        if (self.pharmacy_id is None) == (self.new_pharmacy is None):
            raise ValueError("provide either pharmacy_id or new_pharmacy, not both")
        return self


class PharmacistRegistrationCreated(BaseModel):
    id: UUID
    email: str
    full_name: str
    status: PharmacistAccountStatus
    pharmacy_id: UUID
    pharmacy_name: str
    new_pharmacy: bool = False


class PharmacistAccount(BaseModel):
    id: UUID
    email: str
    full_name: str
    status: PharmacistAccountStatus
    created_at: datetime
    # The admin's reason, shown when rejected or suspended.
    review_note: str | None = None


class PharmacistPharmacy(BaseModel):
    id: UUID
    name: str
    address: str
    city: str
    governorate: str
    governorate_slug: str
    phone: str | None
    verified: bool
    is_24h: bool = False


DutyKind = Literal["night", "weekend", "holiday"]

# A garde is a night or a weekend/holiday block (DB check: <= 72 h).
DUTY_MAX_HOURS = 72
DUTY_MAX_DAYS_AHEAD = 60
DUTY_MAX_UPCOMING = 30


class DutyShift(BaseModel):
    id: UUID
    kind: DutyKind
    starts_at: datetime
    ends_at: datetime


class DutyShiftCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: DutyKind
    # Aware datetimes only: a naive "20:00" is ambiguous; the frontend
    # always sends an explicit +01:00 (Tunis) offset.
    starts_at: AwareDatetime
    ends_at: AwareDatetime

    @model_validator(mode="after")
    def _check_window(self) -> "DutyShiftCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        if (self.ends_at - self.starts_at).total_seconds() > DUTY_MAX_HOURS * 3600:
            raise ValueError(f"a duty shift cannot exceed {DUTY_MAX_HOURS} hours")
        return self


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
    # searches_last_7_days is scoped to this governorate.
    stats_governorate: str
    duty_shifts: list[DutyShift]


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


# ---------------------------------------------------------------------
# Admin review
# ---------------------------------------------------------------------

AdminAction = Literal["approve", "reject", "suspend", "reactivate"]


class AdminPharmacy(BaseModel):
    id: UUID
    name: str
    address: str
    city: str
    governorate: str
    governorate_slug: str | None
    lat: float
    lng: float
    phone: str | None
    is_public: bool
    source: str
    verified: bool


class AdminRegistration(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: str
    status: PharmacistAccountStatus
    created_at: datetime
    reviewed_at: datetime | None
    review_note: str | None
    has_certificate: bool
    certificate_content_type: str | None
    certificate_uploaded_at: datetime | None
    # true when the pharmacy itself was proposed with this request.
    new_pharmacy: bool
    pharmacy: AdminPharmacy


class AdminRegistrationList(BaseModel):
    registrations: list[AdminRegistration]
    count: int


class AdminDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: AdminAction
    note: str | None = None

    @field_validator("note", mode="before")
    @classmethod
    def _strip_note(cls, value: object) -> object:
        return value.strip() or None if isinstance(value, str) else value

    @model_validator(mode="after")
    def _note_rules(self) -> "AdminDecision":
        if self.note is not None and len(self.note) > 1000:
            raise ValueError("note must be at most 1000 characters")
        if self.action in ("reject", "suspend") and not self.note:
            raise ValueError("a reason is required to reject or suspend")
        return self


class CertificateLink(BaseModel):
    url: str
    content_type: str | None
    expires_in: int
