"""
Sends password reset emails via Resend.
"""

import resend
from src.config.settings import RESEND_API_KEY, FRONTEND_ORIGIN

resend.api_key = RESEND_API_KEY


def send_password_reset_email(to_email: str, reset_token: str) -> None:
    if not RESEND_API_KEY:
        raise RuntimeError(
            "RESEND_API_KEY must be set to send password reset emails"
        )

    reset_link = f"{FRONTEND_ORIGIN}/reset-password?token={reset_token}"

    resend.Emails.send({
        "from": "F1 Race Replay <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Reset your password",
        "html": f"""
            <p>Someone requested a password reset for your account.</p>
            <p><a href="{reset_link}">Click here to reset your password</a></p>
            <p>This link expires in 30 minutes. If you didn't request this,
            you can safely ignore this email.</p>
        """,
    })