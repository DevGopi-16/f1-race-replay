import time
from datetime import datetime, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.auth.refresh_tokens.models import (
    RefreshToken,
    REFRESH_TOKEN_EXPIRE_DAYS,
    hash_token,
)
from src.auth.security_log.logger import log_event
from src.auth.sessions.context import get_user_agent, get_ip_address

REVOKED_RETENTION_DAYS = 7
PURGE_INTERVAL_SECONDS = 60 * 60

_last_purge = 0.0


def purge_expired_tokens(db: Session) -> int:
    """Deletes expired tokens, and tokens revoked more than
    REVOKED_RETENTION_DAYS ago. Returns the number of rows deleted."""
    now = datetime.utcnow()
    deleted = (
        db.query(RefreshToken)
        .filter(
            or_(
                RefreshToken.expires_at < now,
                RefreshToken.revoked_at
                < now - timedelta(days=REVOKED_RETENTION_DAYS),
            )
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted


def _maybe_purge(db: Session) -> None:
    global _last_purge
    now = time.time()
    if now - _last_purge < PURGE_INTERVAL_SECONDS:
        return
    _last_purge = now
    try:
        purge_expired_tokens(db)
    except Exception as e:
        db.rollback()
        print(f"[refresh_tokens] purge failed: {e}")


def issue_refresh_token(
    db: Session,
    user_id: int,
    session_started_at: datetime | None = None,
) -> RefreshToken:
    _maybe_purge(db)

    is_new_session = session_started_at is None
    now = datetime.utcnow()
    raw_token = RefreshToken.generate_token()
    record = RefreshToken(
        user_id=user_id,
        token_hash=hash_token(raw_token),
        expires_at=now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=get_user_agent(),
        ip_address=get_ip_address(),
        last_used_at=now,
        session_started_at=session_started_at or now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    if is_new_session:
        log_event("session_created", user_id=user_id, session_id=record.id)

    # In-memory only, never stored. Callers read `.token` to set the cookie.
    record.token = raw_token
    return record


def rotate_refresh_token(db: Session, old_token_value: str) -> RefreshToken | None:
    """Validates the old token, revokes it, and issues a new one that keeps
    the same session_started_at. Returns None if the old token is invalid,
    expired, or already used (and logs why)."""
    old_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hash_token(old_token_value))
        .first()
    )

    if not old_token:
        log_event("refresh_rejected", reason="unknown_token")
        return None

    if not old_token.is_valid():
        reason = "revoked" if old_token.revoked_at else "expired"
        log_event("refresh_rejected", reason=reason, user_id=old_token.user_id)
        return None

    old_token.revoked_at = datetime.utcnow()
    new_token = issue_refresh_token(
        db,
        old_token.user_id,
        session_started_at=old_token.session_started_at,
    )
    db.commit()

    return new_token


def revoke_all_for_user(db: Session, user_id: int) -> None:
    """Used on logout-all-devices, or password change/reset."""
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": datetime.utcnow()})
    db.commit()


def revoke_one(db: Session, token_value: str) -> None:
    """Used on normal logout. Skips already-revoked rows so their
    original revocation time isn't overwritten."""
    row = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == hash_token(token_value),
            RefreshToken.revoked_at.is_(None),
        )
        .first()
    )
    if not row:
        return

    row.revoked_at = datetime.utcnow()
    db.commit()
    log_event("logout", user_id=row.user_id, session_id=row.id)