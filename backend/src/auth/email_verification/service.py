"""Email verification: token creation and the verification email."""

from datetime import timedelta

import resend

from src.auth.security import create_access_token
from src.auth.security_log.logger import log_event
from src.config.settings import RESEND_API_KEY, FRONTEND_ORIGIN

resend.api_key = RESEND_API_KEY

VERIFY_TOKEN_EXPIRE_HOURS = 24
VERIFY_TOKEN_PURPOSE = "email_verify"


def create_verification_token(user_id: int, email: str) -> str:
    # "uid", not "sub", on purpose: get_current_user reads "sub", so this
    # token can never be accepted as a login token. The email claim binds
    # the token to the address it was sent to, so it dies if the email changes.
    return create_access_token(
        data={
            "uid": str(user_id),
            "email": email.lower(),
            "purpose": VERIFY_TOKEN_PURPOSE,
        },
        expires_delta=timedelta(hours=VERIFY_TOKEN_EXPIRE_HOURS),
    )


def send_verification_email(to_email: str, token: str) -> None:
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY must be set to send verification emails")

    link = f"{FRONTEND_ORIGIN}/verify-email?token={token}"

    resend.Emails.send({
        "from": "F1 Race Replay <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Verify your email",
        "html": f"""
            <p>Confirm this email address for your F1 Race Replay account.</p>
            <p><a href="{link}">Click here to verify your email</a></p>
            <p>This link expires in {VERIFY_TOKEN_EXPIRE_HOURS} hours. If you
            didn't create an account, you can ignore this email.</p>
        """,
    })


def send_verification_email_task(user_id: int, email: str) -> None:
    """For BackgroundTasks: never raises, so a mail failure can't break signup."""
    try:
        send_verification_email(email, create_verification_token(user_id, email))
        log_event("verification_sent", user_id=user_id)
    except Exception as e:
        log_event("verification_send_failed", user_id=user_id)
        print(f"[email_verification] failed to send: {e}")