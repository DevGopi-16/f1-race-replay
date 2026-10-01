from datetime import datetime, timezone

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models
from .database import get_db
from .refresh_tokens.models import RefreshToken
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _has_active_session(db: Session, payload: dict, user_id: int) -> bool:
    session_id = payload.get("sid")
    if not isinstance(session_id, int) or isinstance(session_id, bool):
        return False

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    return (
        db.query(RefreshToken.id)
        .filter(
            RefreshToken.id == session_id,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
        .first()
        is not None
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    cookie_token: str | None = Cookie(
        default=None,
        alias="f1_access_token",
    ),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = token or cookie_token
    if token is None:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None or not _has_active_session(db, payload, user.id):
        raise credentials_exception

    return user


def get_current_user_optional(
    token: str = Depends(oauth2_scheme),
    cookie_token: str | None = Cookie(
        default=None,
        alias="f1_access_token",
    ),
    db: Session = Depends(get_db),
):
    token = token or cookie_token
    if token is None:
        return None
    payload = decode_access_token(token)
    if payload is None:
        return None

    user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
    if user is None or not _has_active_session(db, payload, user.id):
        return None

    return user
