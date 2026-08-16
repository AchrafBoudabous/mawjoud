import hashlib
import hmac
import ipaddress
import logging

from fastapi import Request

from app.config import settings

logger = logging.getLogger(__name__)

FINGERPRINT_VERSION = "v1"


def resolve_client_ip(request: Request) -> tuple[str | None, str]:
    """Return (ip, source). `source` is for logging only: the configured
    header name, "socket", or "unavailable"."""
    header_name = (settings.client_ip_header or "").strip().lower()
    if header_name:
        raw = request.headers.get(header_name)
        if raw:
            candidate = raw.split(",")[0].strip()
            try:
                ipaddress.ip_address(candidate)
            except ValueError:
                logger.warning("unparseable client ip in header %s", header_name)
            else:
                return candidate, header_name
        logger.warning("configured client ip header %s missing", header_name)
    if request.client and request.client.host:
        return request.client.host, "socket"
    return None, "unavailable"


def normalise_ip(ip: str) -> str:
    """IPv4 -> exact address. IPv6 -> the /64 prefix, because a single
    residential or mobile subscriber is routinely handed a whole /64 and
    can rotate the host bits at will."""
    parsed = ipaddress.ip_address(ip)
    if parsed.version == 6:
        return str(ipaddress.ip_network(f"{parsed}/64", strict=False).network_address)
    return str(parsed)


def fingerprint_ip(ip: str) -> str:
    message = f"{FINGERPRINT_VERSION}|{normalise_ip(ip)}".encode()
    return hmac.new(
        settings.report_fingerprint_secret.encode(),
        message,
        hashlib.sha256,
    ).hexdigest()
