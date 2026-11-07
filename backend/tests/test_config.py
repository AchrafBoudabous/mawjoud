import pytest
from pydantic import ValidationError

from app.config import Settings, settings

BASE = dict(
    supabase_url="https://p.supabase.co",
    supabase_service_role_key="k",
    supabase_anon_key="a" * 30,
    report_fingerprint_secret="s" * 40,
)


def test_supabase_url_trailing_slash_is_stripped():
    assert settings.supabase_url == "https://example-project.supabase.co"


@pytest.mark.parametrize(
    "regex",
    [r"https://.*\.vercel\.app", r".*", r"https?://.*", r"https://[a-z0-9-]+\.vercel\.app"],
)
def test_overbroad_origin_regex_is_dropped(regex):
    assert Settings(**BASE, allowed_origin_regex=regex).allowed_origin_regex is None


def test_invalid_origin_regex_refuses_to_boot():
    with pytest.raises(ValidationError):
        Settings(**BASE, allowed_origin_regex="https://(unclosed")


def test_scoped_origin_regex_is_accepted():
    s = Settings(**BASE, allowed_origin_regex=r"https://mawjoud-[a-z0-9]+-achraf\.vercel\.app")
    assert s.allowed_origin_regex is not None


def test_blank_origin_regex_means_disabled():
    assert Settings(**BASE, allowed_origin_regex="  ").allowed_origin_regex is None


def test_docs_off_in_production_unless_forced():
    assert Settings(**BASE, environment="production").docs_enabled is False
    assert Settings(**BASE, environment="production", expose_docs=True).docs_enabled is True
    assert Settings(**BASE, environment="development").docs_enabled is True
