"""Admin review of pharmacist registrations (docs: supabase/README.md).

Every endpoint requires a row in public.admin_users (get_current_admin),
re-checked on each request. Responses are never cached.
"""

import logging
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response

from app.dependencies import AdminIdentity, get_current_admin
from app.schemas.pharmacist import (
    AdminDecision,
    AdminPharmacy,
    AdminRegistration,
    AdminRegistrationList,
    CertificateLink,
)
from app.services.certificates import CERTIFICATE_BUCKET
from app.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

SIGNED_URL_SECONDS = 120

_ACCOUNT_SELECT = (
    "id,email,full_name,phone,status,created_at,reviewed_at,review_note,"
    "certificate_path,certificate_content_type,certificate_uploaded_at,"
    "pharmacy:pharmacies(id,name,address,city,governorate,governorate_slug,lat,lng,phone,is_public,source,verified)"
)

# (current status, action) -> new status. Anything else is a 409.
_TRANSITIONS = {
    ("pending", "approve"): "active",
    ("pending", "reject"): "rejected",
    ("active", "suspend"): "suspended",
    ("suspended", "reactivate"): "active",
    ("rejected", "approve"): "active",  # a mistaken rejection can be undone
}


def _unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="admin temporarily unavailable")


def _to_model(row: dict) -> AdminRegistration:
    p = row["pharmacy"]
    return AdminRegistration(
        id=row["id"],
        email=row["email"],
        full_name=row["full_name"],
        phone=row["phone"],
        status=row["status"],
        created_at=row["created_at"],
        reviewed_at=row["reviewed_at"],
        review_note=row["review_note"],
        has_certificate=bool(row["certificate_path"]),
        certificate_content_type=row["certificate_content_type"],
        certificate_uploaded_at=row["certificate_uploaded_at"],
        new_pharmacy=not p["is_public"],
        pharmacy=AdminPharmacy(**p),
    )


def _fetch_account(account_id: UUID) -> dict:
    try:
        rows = (
            get_supabase().table("pharmacist_accounts").select(_ACCOUNT_SELECT)
            .eq("id", str(account_id)).limit(1).execute()
        ).data
    except Exception:
        logger.exception("failed to fetch registration")
        raise _unavailable()
    if not rows:
        raise HTTPException(status_code=404, detail="registration not found")
    return rows[0]


@router.get("/me")
def whoami(response: Response, admin: AdminIdentity = Depends(get_current_admin)) -> dict:
    response.headers["Cache-Control"] = "no-store"
    return {"email": admin.email}


@router.get("/registrations", response_model=AdminRegistrationList)
def list_registrations(
    response: Response,
    status: Literal["pending", "active", "rejected", "suspended", "all"] = Query("pending"),
    admin: AdminIdentity = Depends(get_current_admin),
) -> AdminRegistrationList:
    response.headers["Cache-Control"] = "no-store"
    try:
        query = get_supabase().table("pharmacist_accounts").select(_ACCOUNT_SELECT)
        if status != "all":
            query = query.eq("status", status)
        # Oldest pending first: first come, first served.
        rows = query.order("created_at", desc=status != "pending").limit(200).execute().data
    except Exception:
        logger.exception("failed to list registrations")
        raise _unavailable()
    items = [_to_model(r) for r in rows]
    return AdminRegistrationList(registrations=items, count=len(items))


@router.get("/registrations/{account_id}/certificate", response_model=CertificateLink)
def certificate_link(
    response: Response,
    account_id: UUID = Path(...),
    admin: AdminIdentity = Depends(get_current_admin),
) -> CertificateLink:
    """A 2-minute signed URL. The bucket is private; nothing else can read it."""
    response.headers["Cache-Control"] = "no-store"
    row = _fetch_account(account_id)
    if not row["certificate_path"]:
        raise HTTPException(status_code=404, detail="no certificate for this registration")
    try:
        signed = get_supabase().storage.from_(CERTIFICATE_BUCKET).create_signed_url(
            row["certificate_path"], SIGNED_URL_SECONDS
        )
    except Exception:
        logger.exception("failed to sign certificate url")
        raise _unavailable()
    url = signed.get("signedURL") or signed.get("signedUrl")
    if not url:
        raise HTTPException(status_code=404, detail="certificate file missing from storage")
    logger.info("admin %s viewed certificate of account %s", admin.admin_id, account_id)
    return CertificateLink(url=url, content_type=row["certificate_content_type"], expires_in=SIGNED_URL_SECONDS)


@router.post("/registrations/{account_id}/decision", response_model=AdminRegistration)
def decide(
    body: AdminDecision,
    response: Response,
    account_id: UUID = Path(...),
    admin: AdminIdentity = Depends(get_current_admin),
) -> AdminRegistration:
    response.headers["Cache-Control"] = "no-store"
    row = _fetch_account(account_id)
    new_status = _TRANSITIONS.get((row["status"], body.action))
    if new_status is None:
        raise HTTPException(status_code=409, detail=f"cannot {body.action} a {row['status']} account")
    if new_status == "active" and not row["certificate_path"]:
        raise HTTPException(status_code=409, detail="cannot approve without a certificate")

    supabase = get_supabase()
    try:
        # Guarded on the status we read, so two admins clicking at once
        # cannot both apply a decision.
        updated = (
            supabase.table("pharmacist_accounts").update({
                "status": new_status,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by_admin_id": str(admin.admin_id),
                "review_note": body.note,
            }).eq("id", str(account_id)).eq("status", row["status"]).execute()
        ).data
        if not updated:
            raise HTTPException(status_code=409, detail="registration changed meanwhile; reload")
        # Approving a proposed pharmacy publishes it.
        if new_status == "active" and not row["pharmacy"]["is_public"]:
            supabase.table("pharmacies").update({"is_public": True}).eq("id", row["pharmacy"]["id"]).execute()
    except HTTPException:
        raise
    except Exception as exc:
        if "one_per_pharmacy" in str(exc).lower():
            raise HTTPException(status_code=409, detail="this pharmacy already has a live account")
        logger.exception("failed to apply admin decision")
        raise _unavailable()

    logger.info("admin %s %s account %s -> %s", admin.admin_id, body.action, account_id, new_status)
    return _to_model(_fetch_account(account_id))


@router.delete("/registrations/{account_id}", status_code=204)
def delete_registration(
    account_id: UUID = Path(...),
    admin: AdminIdentity = Depends(get_current_admin),
) -> Response:
    """Remove a REJECTED request: its certificate, the row, and the
    pharmacy too if it was a never-approved proposal."""
    row = _fetch_account(account_id)
    if row["status"] != "rejected":
        raise HTTPException(status_code=409, detail="only rejected registrations can be deleted")

    supabase = get_supabase()
    try:
        if row["certificate_path"]:
            supabase.storage.from_(CERTIFICATE_BUCKET).remove([row["certificate_path"]])
        supabase.table("pharmacist_accounts").delete().eq("id", str(account_id)).eq("status", "rejected").execute()
        if not row["pharmacy"]["is_public"]:
            others = (
                supabase.table("pharmacist_accounts").select("id")
                .eq("pharmacy_id", row["pharmacy"]["id"]).limit(1).execute()
            ).data
            if not others:
                supabase.table("pharmacies").delete().eq("id", row["pharmacy"]["id"]).eq("is_public", False).execute()
    except Exception:
        logger.exception("failed to delete registration")
        raise _unavailable()

    logger.info("admin %s deleted rejected account %s", admin.admin_id, account_id)
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
