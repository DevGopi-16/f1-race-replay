"""
App-wide configuration: environment variables, constants, feature flags.
"""
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]

FASTF1_CACHE_DIR = os.getenv(
    "FASTF1_CACHE_DIR", str(BACKEND_DIR / ".fastf1-cache")
)
DATA_DIR = os.getenv("DATA_DIR", str(BACKEND_DIR / "data"))
FRONTEND_BASE_URL = os.getenv(
    "FRONTEND_BASE_URL",
    os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
).rstrip("/")
CORS_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        os.getenv(
            "FRONTEND_BASE_URL",
            os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
        ),
    ).split(",")
    if origin.strip()
]
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv(
    "EMAIL_FROM"
) or os.getenv("CONTACT_FROM_EMAIL") or "F1 Race Replay <onboarding@resend.dev>"
CONTACT_TO_EMAIL = os.getenv(
    "CONTACT_TO_EMAIL", "f1racevision.contact@gmail.com"
)
SECURITY_LOG_FILE = os.getenv(
    "SECURITY_LOG_FILE",
    str(BACKEND_DIR / "logs" / "security_events.log"),
)


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return "postgresql://" + database_url[len("postgres://"):]
    return database_url


def validate_production_environment() -> None:
    if os.getenv("ENV", "development").strip().lower() != "production":
        return

    required = (
        "DATABASE_URL",
        "RESEND_API_KEY",
        "FRONTEND_BASE_URL",
        "JWT_SECRET",
    )
    missing = [name for name in required if not os.getenv(name, "").strip()]
    if missing:
        raise RuntimeError(
            "Missing required production environment variable(s): "
            + ", ".join(missing)
        )

    jwt_secret = os.environ["JWT_SECRET"].strip().lower()
    development_secrets = {
        "secret",
        "dev",
        "development",
        "changeme",
        "change-me",
        "your-secret",
        "your-secret-key",
        "your-secret-key-here",
    }
    if jwt_secret in development_secrets:
        raise RuntimeError(
            "JWT_SECRET must not use a development placeholder in production"
        )
