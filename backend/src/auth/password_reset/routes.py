import secrets
from datetime import timedelta

from fastapi import APIRouter, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr

from src.auth.refresh_tokens.service import revoke_all_for_user
from src.auth.rate_limit.dependency import check_rate_limit, record_failed_attempt, clear_rate_limit
from src.auth.database import SessionLocal
from src.auth.models import User
from src.auth.security_log.logger import log_event
from src.auth.security import (
    SECRET_KEY,
    ALGORITHM,
    hash_password,
    create_access_token,
)
from src.auth.password_reset.email import send_password_reset_email
from src.auth.password_reset.used_tokens import is_used, mark_used

router = APIRouter(prefix="/auth", tags=["Password Reset"])

RESET_TOKEN_EXPIRE_MINUTES = 30
RESET_TOKEN_PURPOSE = "password_reset"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    check_rate_limit("forgot_password", payload.email, max_attempts=3, window_seconds=3600)
    record_failed_attempt("forgot_password", payload.email)

    db = SessionLocal()

    try:
        user = (
            db.query(User)
            .filter(User.email == payload.email)
            .first()
        )

        # Always return the same response whether or not the email exists,
        # so this endpoint can't be used to check which emails are registered.
        if user:
            reset_token = create_access_token(
                data={
                    "uid": str(user.id),
                    "purpose": RESET_TOKEN_PURPOSE,
                    "jti": secrets.token_urlsafe(16),
                },
                expires_delta=timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
            )

            try:
                send_password_reset_email(user.email, reset_token)
            except Exception as e:
                # Don't leak email-sending failures to the client either —
                # log it server-side instead.
                print(f"[password_reset] failed to send email: {e}")

        return {
            "message": (
                "If an account exists with that email, "
                "a reset link has been sent."
            )
        }

    finally:
        db.close()


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    try:
        decoded = jwt.decode(
            payload.token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired.",
        )

    if decoded.get("purpose") != RESET_TOKEN_PURPOSE:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid.",
        )

    jti = decoded.get("jti")
    if not jti:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid.",
        )

    user_id = decoded.get("uid")
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid.",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters.",
        )

    db = SessionLocal()

    try:
        if is_used(db, jti):
            raise HTTPException(
                status_code=400,
                detail="This reset link has already been used.",
            )

        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(
                status_code=400,
                detail="This reset link is invalid.",
            )

        if not mark_used(db, jti):
            raise HTTPException(
                status_code=400,
                detail="This reset link has already been used.",
            )

        user.hashed_password = hash_password(payload.new_password)
        db.commit()

        revoke_all_for_user(db, user.id)
        if user.email:
            clear_rate_limit("login", user.email)
        log_event("password_reset", user_id=user.id, email=user.email)

        return {"message": "Password reset successfully."}

    finally:
        db.close()