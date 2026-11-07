"""Public shortage observatory: aggregate, anonymous trends only.

Nothing here can identify a reporter, a viewer or a pharmacist: the
inputs are counts per (medication, governorate) and per (medication,
week). See supabase/migrations/20261104100000_national_scope.sql §7.
"""

import csv
import io
import logging
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Response

from app.schemas.medication import Medication
from app.schemas.stock import ObservatoryMedication, ObservatoryResponse, ObservatoryWeek
from app.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/observatory", tags=["observatory"])

OBSERVATORY_MAX_AGE_DAYS = 14


def _build(weeks: int) -> ObservatoryResponse:
    supabase = get_supabase()
    try:
        meds = (
            supabase.table("medications")
            .select("id,slug,name,generic_name,form,category")
            .eq("is_active", True)
            .order("category")
            .order("name")
            .execute()
        ).data
        current = (
            supabase.rpc(
                "availability_by_governorate",
                {"p_medication_id": None, "p_max_age_days": OBSERVATORY_MAX_AGE_DAYS},
            ).execute()
        ).data
        series = supabase.rpc("observatory_weekly", {"p_weeks": weeks}).execute().data
    except Exception:
        logger.exception("Failed to build observatory from Supabase")
        raise HTTPException(status_code=503, detail="observatory temporarily unavailable")

    now_by_med: dict[str, dict[str, int]] = defaultdict(
        lambda: {"in": 0, "out": 0, "unsure": 0, "govs": 0}
    )
    for row in current:
        agg = now_by_med[row["medication_id"]]
        agg["in"] += row["in_stock"]
        agg["out"] += row["out_of_stock"]
        agg["unsure"] += row["unsure"]
        agg["govs"] += 1

    weeks_by_med: dict[str, list[ObservatoryWeek]] = defaultdict(list)
    for row in series:
        weeks_by_med[row["medication_id"]].append(
            ObservatoryWeek(
                week_start=row["week_start"],
                in_stock_reports=row["in_stock_reports"],
                out_of_stock_reports=row["out_of_stock_reports"],
                viewers=row["viewers"],
            )
        )

    medications = []
    for m in meds:
        agg = now_by_med[m["id"]]
        medications.append(
            ObservatoryMedication(
                medication=Medication(**m),
                in_stock_pharmacies=agg["in"],
                out_of_stock_pharmacies=agg["out"],
                unsure_pharmacies=agg["unsure"],
                governorates_reporting=agg["govs"],
                weeks=sorted(weeks_by_med[m["id"]], key=lambda w: w.week_start),
            )
        )

    return ObservatoryResponse(
        generated_at=datetime.now(timezone.utc),
        weeks=weeks,
        max_age_days=OBSERVATORY_MAX_AGE_DAYS,
        medications=medications,
    )


@router.get("", response_model=ObservatoryResponse)
def get_observatory(
    response: Response, weeks: int = Query(12, ge=4, le=52)
) -> ObservatoryResponse:
    data = _build(weeks)
    response.headers["Cache-Control"] = "public, max-age=600"
    return data


@router.get("/export.csv", response_class=Response)
def export_observatory_csv(weeks: int = Query(12, ge=4, le=52)) -> Response:
    """The same weekly series as CSV, one row per (medication, week), for
    journalists and public-health researchers."""
    data = _build(weeks)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["medication_slug", "medication", "generic_name", "category", "week_start",
         "in_stock_reports", "out_of_stock_reports", "distinct_viewers"]
    )
    for med in data.medications:
        for w in med.weeks:
            writer.writerow(
                [med.medication.slug, med.medication.name, med.medication.generic_name,
                 med.medication.category, w.week_start.isoformat(), w.in_stock_reports,
                 w.out_of_stock_reports, w.viewers]
            )
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Cache-Control": "public, max-age=600",
            "Content-Disposition": 'attachment; filename="mawjoud-observatoire.csv"',
        },
    )
