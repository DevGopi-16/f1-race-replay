import html
import os

import resend
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field


router = APIRouter(prefix="/api/contact", tags=["Contact"])


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=10, max_length=5000)


@router.post("")
def send_contact_message(payload: ContactRequest):
    api_key = os.getenv("RESEND_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured.",
        )

    from_email = os.getenv(
        "CONTACT_FROM_EMAIL",
        "onboarding@resend.dev",
    )
    to_email = os.getenv(
        "CONTACT_TO_EMAIL",
        "f1racevision.contact@gmail.com",
    )

    resend.api_key = api_key

    name = payload.name.strip()
    email = str(payload.email)
    subject = payload.subject.strip()
    message = payload.message.strip()

    safe_name = html.escape(name)
    safe_email = html.escape(email)
    safe_subject = html.escape(subject)
    safe_message = html.escape(message).replace("\n", "<br>")

    try:
        resend.Emails.send(
            {
                "from": from_email,
                "to": [to_email],
                "reply_to": [email],
                "subject": f"[F1 Race Vision] {subject} — {name}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h2>New Contact Message</h2>

                        <p>
                            <strong>Name:</strong>
                            {safe_name}
                        </p>

                        <p>
                            <strong>Email:</strong>
                            {safe_email}
                        </p>

                        <p>
                            <strong>Subject:</strong>
                            {safe_subject}
                        </p>

                        <hr />

                        <p><strong>Message:</strong></p>

                        <p>{safe_message}</p>
                    </div>
                """,
            }
        )
    except Exception as exc:
        print(f"[contact] failed to send email: {exc}")

        raise HTTPException(
            status_code=500,
            detail="Unable to send your message right now. Please try again later.",
        )

    return {
        "message": "Your message has been sent successfully."
    }
