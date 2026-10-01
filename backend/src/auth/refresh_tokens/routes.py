from fastapi import APIRouter, HTTPException, Depends, Request, Response
from sqlalchemy.orm import Session

from src.auth.database import get_db
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.auth import security
from src.auth.security import create_access_token, set_auth_cookie, clear_auth_cookie, AUTH_COOKIE_NAME
from src.auth.security_log.logger import log_event
from src.auth.refresh_tokens.service import (
    issue_refresh_token,
    rotate_refresh_token,
    revoke_one,
    revoke_all_for_user,
)

router = APIRouter(prefix="/auth", tags=["Refresh Tokens"])

REFRESH_COOKIE_NAME = "f1_refresh_token"


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=security.AUTH_COOKIE_SECURE,
        samesite=security.AUTH_COOKIE_SAMESITE,
        path="/auth",
        max_age=60 * 60 * 24 * 30,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=security.AUTH_COOKIE_SECURE,
        samesite=security.AUTH_COOKIE_SAMESITE,
        path="/auth",
    )


@router.post("/refresh")
def refresh_access_token(request: Request, response: Response, db: Session = Depends(get_db)):
    old_refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if not old_refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided.")

    new_token = rotate_refresh_token(db, old_refresh_token)

    if not new_token:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    new_access_token = create_access_token(
        data={"sub": str(new_token.user_id), "sid": new_token.id}
    )

    set_auth_cookie(response, new_access_token)
    set_refresh_cookie(response, new_token.token)

    return {"message": "Token refreshed."}


@router.post("/logout-all")
def logout_all_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    revoke_all_for_user(db, current_user.id)
    log_event("logout_all", user_id=current_user.id)
    return {"message": "Logged out of all devices."}