import time
from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.auth.password_reset.models import UsedResetToken

USED_TOKEN_RETENTION_HOURS = 24
PURGE_INTERVAL_SECONDS = 60 * 60

_last_purge = 0.0


def purge_used_tokens(db: Session) -> int:
    """Delete used reset-token records older than their replay window."""
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
        hours=USED_TOKEN_RETENTION_HOURS
    )
    deleted = (
        db.query(UsedResetToken)
        .filter(UsedResetToken.used_at < cutoff)
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
        purge_used_tokens(db)
    except Exception as e:
        db.rollback()
        print(f"[password_reset] used-token purge failed: {e}")


def is_used(db: Session, jti: str) -> bool:
    return (
        db.query(UsedResetToken.id)
        .filter(UsedResetToken.jti == jti)
        .first()
        is not None
    )


def mark_used(db: Session, jti: str) -> bool:
    """Reserve a reset token atomically; the caller commits with its reset."""
    _maybe_purge(db)
    db.add(UsedResetToken(jti=jti))
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return False
    return True
