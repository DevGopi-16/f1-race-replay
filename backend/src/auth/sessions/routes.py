from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from src.auth.database import get_db
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.auth.refresh_tokens.models import RefreshToken, hash_token
from src.auth.refresh_tokens.routes import REFRESH_COOKIE_NAME
from src.auth.security_log.logger import log_event

router = APIRouter(prefix="/auth", tags=["Sessions"])


def describe_user_agent(ua: str | None) -> str:
    if not ua:
        return "Unknown device"

    if "Edg/" in ua:
        browser = "Edge"
    elif "OPR/" in ua or "Opera" in ua:
        browser = "Opera"
    elif "Firefox/" in ua:
        browser = "Firefox"
    elif "Chrome/" in ua or "CriOS/" in ua:
        browser = "Chrome"
    elif "Safari/" in ua:
        browser = "Safari"
    elif "curl" in ua.lower():
        browser = "curl"
    else:
        browser = "Browser"

    if "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"
    elif "Android" in ua:
        os_name = "Android"
    elif "Windows" in ua:
        os_name = "Windows"
    elif "Mac OS X" in ua or "Macintosh" in ua:
        os_name = "macOS"
    elif "Linux" in ua:
        os_name = "Linux"
    else:
        os_name = None

    return f"{browser} on {os_name}" if os_name else browser


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() + "Z" if dt else None


@router.get("/sessions")
def list_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    rows = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
        .order_by(RefreshToken.last_used_at.desc())
        .all()
    )

    raw = request.cookies.get(REFRESH_COOKIE_NAME)
    current_hash = hash_token(raw) if raw else None

    return [
        {
            "id": row.id,
            "device": describe_user_agent(row.user_agent),
            "ip_address": row.ip_address,
            "signed_in_at": _iso(row.session_started_at),
            "last_active_at": _iso(row.last_used_at),
            "is_current": row.token_hash == current_hash,
        }
        for row in rows
    ]


@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # user_id in the filter is what stops one user revoking another's session.
    updated = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.id == session_id,
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked_at.is_(None),
        )
        .update({"revoked_at": datetime.utcnow()})
    )
    db.commit()

    if not updated:
        raise HTTPException(status_code=404, detail="Session not found.")

    log_event("session_revoked", user_id=current_user.id, session_id=session_id)
    return {"message": "Session revoked."}