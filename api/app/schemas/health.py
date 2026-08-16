from pydantic import BaseModel


class ClientIdentityResponse(BaseModel):
    """Diagnostic response for GET /health/client (docs/ARCHITECTURE.md
    4.3). Never carries a raw IP address or a raw header value — only a
    non-reversible fingerprint prefix and header NAMES.
    """

    ip_source: str
    fingerprint_prefix: str | None
    forwarding_headers_present: list[str]
