from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.auth.database import get_db
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.auth.rate_limit.dependency import check_rate_limit, record_failed_attempt
from src.auth.security import SECRET_KEY, ALGORITHM
from src.auth.security_log.logger import log_event
from src.auth.email_verification.service import (
    VERIFY_TOKEN_PURPOSE,
    create_verification_token,
    send_verification_email,
)

router = APIRouter(prefix="/auth", tags=["Email Verification"])


class VerifyEmailRequest(BaseModel):
    token: str


@router.get("/verification-status")
def verification_status(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "email_verified": bool(current_user.email_verified),
    }


@router.post("/send-verification")
def send_verification(current_user: User = Depends(get_current_user)):
    if not current_user.email:
        raise HTTPException(
            status_code=400,
            detail="Your account has no email address to verify.",
        )

    if current_user.email_verified:
        return {"message": "Your email is already verified."}

    check_rate_limit(
        "send_verification", current_user.email, max_attempts=3, window_seconds=3600
    )
    record_failed_attempt("send_verification", current_user.email)

    try:
        token = create_verification_token(current_user.id, current_user.email)
        send_verification_email(current_user.email, token)
    except Exception as e:
        log_event("verification_send_failed", user_id=current_user.id)
        print(f"[email_verification] failed to send: {e}")
        raise HTTPException(
            status_code=502,
            detail="Couldn't send the verification email. Please try again later.",
        )

    log_event("verification_sent", user_id=current_user.id)
    return {"message": "Verification email sent."}


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    invalid = HTTPException(
        status_code=400,
        detail="This verification link is invalid or has expired.",
    )

    try:
        decoded = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise invalid

    if decoded.get("purpose") != VERIFY_TOKEN_PURPOSE:
        raise invalid

    token_email = decoded.get("email")
    try:
        user_id = int(decoded.get("uid"))
    except (TypeError, ValueError):
        raise invalid

    user = db.query(User).filter(User.id == user_id).first()

    # The email in the token must still be the account's email.
    if not user or not user.email or not token_email or user.email.lower() != token_email:
        raise invalid

    # Idempotent: replaying a link just returns success again.
    if not user.email_verified:
        user.email_verified = True
        db.commit()
        log_event("email_verified", user_id=user.id)

    return {"message": "Email verified."}