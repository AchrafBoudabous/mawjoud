import logging
import re
from typing import Annotated, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, read from environment variables (and `.env` in
    local dev). Required fields raise a validation error at import time if
    missing, so the app fails fast instead of booting without credentials.
    """

    supabase_url: str
    supabase_service_role_key: str
    # Not secret (it ships in the browser bundle), but required: without it
    # no pharmacist can authenticate, and a deploy that boots green while
    # auth is impossible is worse than one that refuses to boot. Used ONLY
    # as the `apikey` header when verifying a pharmacist's token against
    # GoTrue's /auth/v1/user — never for data access (ARCHITECTURE.md 5.9).
    # min_length guards against a present-but-blank value (e.g. an unfilled
    # .env.example line) slipping past pydantic's bare "is the key present"
    # check — the same class of gap report_fingerprint_secret guards against
    # below. Real Supabase anon keys are JWTs of 200+ characters.
    supabase_anon_key: str = Field(min_length=20)
    # NoDecode: ALLOWED_ORIGINS is a comma-separated string, not JSON — skip
    # pydantic-settings' default JSON-list decoding and parse it ourselves
    # in the validator below.
    allowed_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]
    allowed_origin_regex: Optional[str] = None
    environment: str = "development"
    app_version: str = "0.1.0"
    # Keys the anonymous reporter-fingerprint HMAC (step 4). Required, and
    # must be long enough to be a real secret — missing or short must fail
    # the app at boot rather than serve an unlimited public write path.
    report_fingerprint_secret: str = Field(min_length=32)
    # Unset (default): trust only the socket peer address. Set (Render:
    # "cf-connecting-ip"): trust exactly that one header. Never sniffed,
    # never a fallback chain — see docs/ARCHITECTURE.md 4.3.
    client_ip_header: Optional[str] = None
    # Interactive API docs (/docs, /redoc, /openapi.json). Defaults to ON
    # outside production and OFF in production; set EXPOSE_DOCS=true to
    # force them on (e.g. temporarily, to test a token against prod).
    expose_docs: Optional[bool] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _parse_allowed_origins(cls, value):
        """ALLOWED_ORIGINS is a comma-separated string, not JSON — split it
        manually rather than relying on pydantic's default JSON-list parsing.
        """
        if isinstance(value, str):
            return [
                origin
                for origin in (item.strip().rstrip("/") for item in value.split(","))
                if origin
            ]
        return value

    @field_validator("supabase_url", mode="after")
    @classmethod
    def _strip_supabase_url(cls, value: str) -> str:
        # Every caller builds paths as f"{supabase_url}/rest/v1/..."; a
        # trailing slash would produce "//rest/v1".
        return value.strip().rstrip("/")

    @field_validator("allowed_origin_regex", mode="after")
    @classmethod
    def _reject_overbroad_origin_regex(cls, value: Optional[str]) -> Optional[str]:
        """Drop (and log) a CORS regex that admits origins we do not
        control. `https://.*\\.vercel\\.app` admits *every* Vercel site on
        the internet: any of them could then make its visitors' browsers
        file stock reports from thousands of distinct IPs, sidestepping
        the per-fingerprint rate limit entirely. In production, prefer no
        regex at all (list exact origins in ALLOWED_ORIGINS); if preview
        deployments must reach this API, anchor the regex on your Vercel
        team slug, e.g. `https://mawjoud-[a-z0-9]+-<team-slug>\\.vercel\\.app`.
        This probe list is a tripwire for the obvious mistake, not a proof
        that a given regex is safe.
        """
        if value is None or not value.strip():
            return None
        value = value.strip()
        try:
            pattern = re.compile(value)
        except re.error as exc:
            raise ValueError(f"ALLOWED_ORIGIN_REGEX is not a valid regex: {exc}") from exc
        for foreign_origin in _FOREIGN_ORIGIN_PROBES:
            if pattern.fullmatch(foreign_origin):
                # Fail SAFE, not fatal: drop the regex (exact
                # ALLOWED_ORIGINS keep working) instead of refusing to
                # boot, so a deploy carrying this fix cannot take the API
                # down while the env var still holds the old value.
                logging.getLogger(__name__).error(
                    "ALLOWED_ORIGIN_REGEX ignored: too broad, it matches %r. "
                    "Scope it to this project's own hostnames.",
                    foreign_origin,
                )
                return None
        return value

    @property
    def docs_enabled(self) -> bool:
        if self.expose_docs is not None:
            return self.expose_docs
        return self.environment.lower() != "production"


# Origins no legitimate ALLOWED_ORIGIN_REGEX may ever match.
_FOREIGN_ORIGIN_PROBES = (
    "https://attacker-controlled-site.vercel.app",
    "https://evil.example.com",
    "http://evil.example.com",
    "https://evil.onrender.com",
)


settings = Settings()
