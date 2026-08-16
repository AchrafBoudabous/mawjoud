from typing import Literal
from uuid import UUID

from pydantic import BaseModel

MedicationCategory = Literal["thyroid", "insulin", "psychiatric", "cancer_pain"]


class Medication(BaseModel):
    id: UUID
    slug: str
    name: str
    generic_name: str
    form: str | None
    category: MedicationCategory


class MedicationMatch(Medication):
    # Relevance score from public.search_medications. Informational and
    # useful when tuning; the frontend must not display it.
    score: float


class MedicationListResponse(BaseModel):
    medications: list[Medication]
    count: int


class MedicationSearchResponse(BaseModel):
    query: str
    medications: list[MedicationMatch]
    count: int
