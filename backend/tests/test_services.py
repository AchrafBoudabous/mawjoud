from datetime import datetime, timedelta, timezone

import pytest

from app.services.phone import normalise_tn_phone
from app.services.report_rate_limit import RecentReport, check_report_rate_limit
from app.services.reporter_identity import fingerprint_ip, normalise_ip


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("72 431 210", "+21672431210"),
        ("+216 72-431-210", "+21672431210"),
        ("0021672431210", "+21672431210"),
        ("21672431210", "+21672431210"),
        ("+33612345678", None),
        ("7243121", None),
        ("72+431210", None),
        ("", None),
    ],
)
def test_normalise_tn_phone(raw, expected):
    assert normalise_tn_phone(raw) == expected


def test_ipv6_is_bucketed_by_64():
    assert normalise_ip("2001:db8::1") == normalise_ip("2001:db8::ffff")
    assert fingerprint_ip("2001:db8::1") == fingerprint_ip("2001:db8::abcd")
    assert fingerprint_ip("1.2.3.4") != fingerprint_ip("1.2.3.5")


NOW = datetime(2026, 11, 4, 12, 0, tzinfo=timezone.utc)


def _r(minutes_ago, status="in_stock", pharmacy="p1", medication="m1"):
    return RecentReport(pharmacy, medication, status, NOW - timedelta(minutes=minutes_ago))


def _check(recent, status="in_stock", pharmacy="p1"):
    return check_report_rate_limit(
        recent, pharmacy_id=pharmacy, medication_id="m1", status=status, now=NOW
    )


def test_rate_limit_rules():
    assert _check([]) is None
    assert _check([_r(0.5, "out_of_stock")], "in_stock") == "pair_cooldown"
    assert _check([_r(10, "in_stock")], "in_stock") == "duplicate_status"
    assert _check([_r(10, "out_of_stock")], "in_stock") is None
    assert _check([_r(45, "in_stock")], "in_stock") is None
    hourly = [_r(1 + i * 0.5, pharmacy=f"x{i}") for i in range(20)]
    assert _check(hourly) == "hourly_cap"
    daily = [_r(61 + i * 20, pharmacy=f"y{i}") for i in range(60)]
    assert _check(daily) == "daily_cap"
