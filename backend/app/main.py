from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, health, medications, observatory, pharmacies, pharmacist
from app.services.certificates import MAX_REGISTRATION_BODY_BYTES

app = FastAPI(
    title="Mawjoud API",
    version=settings.app_version,
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)

# Baseline hardening headers for a JSON API. The API never serves HTML a
# browser should render or frame, so the strictest values are safe.
_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
}


_REGISTRATION_PATH = "/api/pharmacist/registrations"


@app.middleware("http")
async def cap_registration_upload(request: Request, call_next):
    """The registration form carries a file. Refuse oversized or unsized
    bodies BEFORE Starlette parses (and spools to disk) the multipart
    stream — a 1 GB upload must not reach the handler."""
    if request.method == "POST" and request.url.path == _REGISTRATION_PATH:
        length = request.headers.get("content-length")
        if length is None:
            return JSONResponse(status_code=411, content={"detail": "content-length required"})
        try:
            too_big = int(length) > MAX_REGISTRATION_BODY_BYTES
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "invalid content-length"})
        if too_big:
            return JSONResponse(status_code=413, content={"detail": "certificate too large"})
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for name, value in _SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    # /docs needs to render (it loads Swagger UI from a CDN), everything
    # else is JSON and gets a deny-all CSP.
    if not request.url.path.startswith(("/docs", "/redoc")):
        response.headers.setdefault(
            "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
        )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=settings.allowed_origin_regex,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    # Explicit list instead of "*": the browser only ever sends these.
    allow_headers=["Authorization", "Content-Type", "X-Mawjoud-Client"],
    allow_credentials=False,
    max_age=600,
)

app.include_router(health.router)
app.include_router(pharmacies.router)
app.include_router(medications.router)
app.include_router(pharmacist.router)
app.include_router(observatory.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"service": "mawjoud-api", "docs": "/docs" if settings.docs_enabled else None}
