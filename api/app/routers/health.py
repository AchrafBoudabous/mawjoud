import logging
import time

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas.health import ClientIdentityResponse
from app.services.reporter_identity import fingerprint_ip, resolve_client_ip
from app.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()

# Fixed allowlist of proxy/forwarding header NAMES the diagnostic route may
# report as present. Never the values, never an IP — see
# docs/ARCHITECTURE.md 4.3.
_FORWARDING_HEADER_ALLOWLIST = (
    "x-forwarded-for",
    "cf-connecting-ip",
    "true-client-ip",
    "x-real-ip",
    "forwarded",
)


@router.get("/health")
def health():
    """Liveness check. Touches nothing external; always fast; never returns
    non-200 while the process is alive.
    """
    return {
        "status": "ok",
        "service": "mawjoud-api",
        "version": settings.app_version,
        "environment": settings.environment,
    }


@router.get("/health/db")
def health_db():
    """Readiness check for the Supabase connection. Works against an empty
    database — PostgREST's root endpoint returns 200 with no tables needed.
    """
    try:
        get_supabase()  # proves the credentials parse and a client can be constructed

        start = time.perf_counter()
        response = httpx.get(
            f"{settings.supabase_url}/rest/v1/",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            timeout=10.0,
        )
        latency_ms = round((time.perf_counter() - start) * 1000)

        if 200 <= response.status_code < 300:
            return {
                "status": "ok",
                "supabase": "reachable",
                "latency_ms": latency_ms,
            }

        logger.error(
            "Supabase health check returned unexpected status %s", response.status_code
        )
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "supabase": "unreachable",
                "detail": "unexpected response from Supabase",
            },
        )
    except httpx.TimeoutException:
        logger.exception("Supabase health check timed out")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "supabase": "unreachable",
                "detail": "connection timeout",
            },
        )
    except httpx.HTTPError:
        logger.exception("Supabase health check failed")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "supabase": "unreachable",
                "detail": "connection error",
            },
        )
    except Exception:
        logger.exception("Supabase health check failed unexpectedly")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "supabase": "unreachable",
                "detail": "unexpected error",
            },
        )


@router.get("/health/client", response_model=ClientIdentityResponse)
def health_client(request: Request) -> ClientIdentityResponse:
    """Diagnostic route to verify the proxy/IP configuration in production
    (docs/ARCHITECTURE.md 4.3). Two devices on two different networks must
    return two different `fingerprint_prefix` values, or `CLIENT_IP_HEADER`
    is wrong and every user shares one rate-limit bucket.

    Never returns a raw IP address or a header value — only a fingerprint
    prefix and header NAMES.
    """
    ip, source = resolve_client_ip(request)
    fingerprint_prefix = fingerprint_ip(ip)[:8] if ip is not None else None

    present = [
        name for name in _FORWARDING_HEADER_ALLOWLIST if request.headers.get(name)
    ]

    return ClientIdentityResponse(
        ip_source=source,
        fingerprint_prefix=fingerprint_prefix,
        forwarding_headers_present=present,
    )
