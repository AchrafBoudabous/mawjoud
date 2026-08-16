from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, medications, pharmacies, pharmacist

app = FastAPI(title="Mawjoud API", version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=settings.allowed_origin_regex,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)

app.include_router(health.router)
app.include_router(pharmacies.router)
app.include_router(medications.router)
app.include_router(pharmacist.router)


@app.get("/")
def root():
    return {"service": "mawjoud-api", "docs": "/docs"}
