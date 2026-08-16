"""FastAPI auth dependencies. HTTP-layer concerns (bearer extraction,
status codes, HTTPException) live here rather than in `services/`, per
decision 4.15.8. See docs/ARCHITECTURE.md 5.9.
"""

import logging
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import settings
from app.schemas.pharmacist import PharmacistAccountStatus
from app.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# A single HTTPBearer instance, reused by the dependency below. Puts an
# "Authorize" button on /docs, which is how the developer tests these
# endpoints.
_bearer_scheme = HTTPBearer(auto_error=False)

_ACCOUNT_COLUMNS = "id,pharmacy_id,email,status,auth_user_id"


class PharmacistIdentity(BaseModel):
    account_id: UUID
    pharmacy_id: UUID
    email: str
    status: PharmacistAccountStatus
    auth_user_id: UUID


def _verify_supabase_token(token: str) -> dict:
    """Verify a pharmacist's access token remotely against Supabase's
    GoTrue `/auth/v1/user`, rather than validating a JWT signature
    locally.

    See docs/ARCHITECTURE.md 5.9.1: whether a given project signs its
    tokens HS256 or ES256 depends on when it was created and whether keys
    were rotated, so a hard-coded local verification is a silent-401-storm
    risk. The remote call is also *authoritative* -- a signed-out or
    deleted Supabase user is rejected immediately instead of remaining
    valid until token expiry, which matters for a credential that can
    publish "Confirmé par la pharmacie".

    Note the split in the error handling: a *rejected* token is 401, an
    *unreachable verifier* is 503. Collapsing the two would tell a
    pharmacist to sign in again during a Supabase outage, and they would
    fail again.
    """
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    try:
        response = httpx.get(
            url,
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {token}",
            },
            timeout=10.0,
        )
    except httpx.HTTPError:
        # Never log the token itself, not even truncated.
        logger.exception("failed to reach Supabase Auth for token verification")
        raise HTTPException(
            status_code=503, detail="authentication temporarily unavailable"
        )

    if response.status_code in (401, 403):
        raise HTTPException(status_code=401, detail="invalid or expired session")
    if response.status_code >= 400:
        logger.error(
            "unexpected response from Supabase Auth: status=%s", response.status_code
        )
        raise HTTPException(
            status_code=503, detail="authentication temporarily unavailable"
        )

    try:
        return response.json()
    except ValueError:
        logger.error("Supabase Auth returned a non-JSON body")
        raise HTTPException(
            status_code=503, detail="authentication temporarily unavailable"
        )


def get_current_pharmacist(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> PharmacistIdentity:
    """Resolve the caller's `pharmacist_accounts` row from a Supabase
    bearer token. Any account status is accepted here -- the read
    (dashboard) endpoint needs a `pending` account to render its own
    read-only state, which is why this dependency does not itself gate on
    `status` (that is `require_active_pharmacist`, below).

    `status` is read from the database on *every* request, never cached
    in the token, so revocation (suspension) takes effect on the very
    next call.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="authentication required")

    user = _verify_supabase_token(credentials.credentials)

    user_id = user.get("id")
    email = (user.get("email") or "").strip()
    if not user_id or not email or not user.get("email_confirmed_at"):
        # This is what makes the e-mail-matching fallback below sound:
        # matching an account by e-mail is only safe because GoTrue has
        # confirmed that address belongs to this caller.
        raise HTTPException(status_code=401, detail="email address not confirmed")

    normalised_email = email.lower()
    supabase = get_supabase()

    # 4a — the fast path, used by every call after the first.
    try:
        rows = (
            supabase.table("pharmacist_accounts")
            .select(_ACCOUNT_COLUMNS)
            .eq("auth_user_id", user_id)
            .limit(1)
            .execute()
        ).data
    except Exception:
        logger.exception("failed to resolve pharmacist account by auth_user_id")
        raise HTTPException(status_code=503, detail="dashboard temporarily unavailable")

    account_row: dict | None = rows[0] if rows else None

    if account_row is None:
        # 4b — first sign-in of this account's life: fall back to e-mail.
        try:
            rows = (
                supabase.table("pharmacist_accounts")
                .select(_ACCOUNT_COLUMNS)
                .eq("email", normalised_email)
                .limit(1)
                .execute()
            ).data
        except Exception:
            logger.exception("failed to resolve pharmacist account by email")
            raise HTTPException(
                status_code=503, detail="dashboard temporarily unavailable"
            )

        if not rows:
            raise HTTPException(status_code=404, detail="pharmacist account not found")

        account_row = rows[0]
        existing_auth_user_id = account_row.get("auth_user_id")

        if existing_auth_user_id is None:
            # First-sign-in binding. Guarded by `auth_user_id is null` in
            # the WHERE clause so a concurrent double-bind is a no-op
            # rather than a race (ARCHITECTURE.md 5.9.3).
            try:
                bound_rows = (
                    supabase.table("pharmacist_accounts")
                    .update({"auth_user_id": user_id})
                    .eq("id", account_row["id"])
                    .is_("auth_user_id", None)
                    .execute()
                ).data
            except Exception:
                logger.exception("failed to bind auth_user_id to pharmacist account")
                raise HTTPException(
                    status_code=503, detail="dashboard temporarily unavailable"
                )
            if bound_rows:
                account_row = bound_rows[0]
            else:
                # A concurrent request bound it first (or the row changed
                # under us). Either way the account belongs to this user
                # by the time we get here -- proceed with the id we have.
                account_row["auth_user_id"] = user_id
        elif existing_auth_user_id != user_id:
            # Only reachable if someone hand-edits rows: both auth_user_id
            # and email are unique.
            raise HTTPException(
                status_code=403,
                detail="pharmacist account is linked to another user",
            )

    logger.info(
        "pharmacist identity resolved account_id=%s status=%s",
        account_row["id"],
        account_row["status"],
    )

    return PharmacistIdentity(
        account_id=account_row["id"],
        pharmacy_id=account_row["pharmacy_id"],
        email=account_row["email"],
        status=account_row["status"],
        auth_user_id=user_id,
    )


def require_active_pharmacist(
    identity: PharmacistIdentity = Depends(get_current_pharmacist),
) -> PharmacistIdentity:
    """Gate for every write endpoint. `pending` gets the dashboard; only
    `active` may write."""
    if identity.status != "active":
        raise HTTPException(status_code=403, detail="pharmacist account is not active")
    return identity
