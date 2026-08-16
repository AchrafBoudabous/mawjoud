from dataclasses import dataclass
from datetime import datetime, timedelta

PAIR_COOLDOWN = timedelta(seconds=60)  # rule A
DUPLICATE_STATUS_WINDOW = timedelta(minutes=30)  # rule B
HOURLY_WINDOW = timedelta(hours=1)  # rule C
HOURLY_MAX = 20
DAILY_WINDOW = timedelta(hours=24)  # rule D
DAILY_MAX = 60

LOOKBACK_WINDOW = DAILY_WINDOW
LOOKBACK_ROW_LIMIT = 100  # > DAILY_MAX, so a cap is always detectable


@dataclass(frozen=True)
class RecentReport:
    pharmacy_id: str
    medication_id: str
    status: str
    created_at: datetime  # timezone-aware, UTC


def check_report_rate_limit(
    recent: list[RecentReport],
    *,
    pharmacy_id: str,
    medication_id: str,
    status: str,
    now: datetime,
) -> str | None:
    """None = allow. Otherwise a short rule name for the server log.
    The rule name is NEVER returned to the client (4.5).

    `recent` must already be filtered to one fingerprint and ordered
    newest-first (exactly what the `stock_reports_fingerprint_recent`
    index query returns). Evaluated in order A -> B -> C -> D; the first
    rule that trips wins.
    """
    # Rules A and B both look only at reports on this exact (pharmacy,
    # medication) pair. `recent` is newest-first, so once a pair-matching
    # report is older than the wider of the two windows (B's 30 minutes),
    # every remaining pair-matching report is older still and cannot
    # satisfy A (60s) or B (30min) either -- safe to stop scanning there.
    # Every pair-matching report inside that window must be checked
    # individually: the most recent one can fail to match B's status
    # check while an older-but-still-in-window one matches it.
    for report in recent:
        if report.pharmacy_id != pharmacy_id or report.medication_id != medication_id:
            continue
        age = now - report.created_at
        if age > DUPLICATE_STATUS_WINDOW:
            break
        if age <= PAIR_COOLDOWN:
            return "pair_cooldown"
        if report.status == status:
            return "duplicate_status"

    hourly_count = sum(1 for report in recent if now - report.created_at <= HOURLY_WINDOW)
    if hourly_count >= HOURLY_MAX:
        return "hourly_cap"

    daily_count = sum(1 for report in recent if now - report.created_at <= DAILY_WINDOW)
    if daily_count >= DAILY_MAX:
        return "daily_cap"

    return None
