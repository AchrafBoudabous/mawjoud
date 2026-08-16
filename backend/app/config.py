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


settings = Settings()
