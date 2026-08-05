import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)

    # Nullable because Google-signup users have no password of their own.
    hashed_password = Column(String(255), nullable=True)

    # Set only for accounts created/linked via "Sign in with Google".
    google_id = Column(String(255), unique=True, nullable=True, index=True)

    # Google's profile photo URL when available. Falls back to a colored
    # initial circle in the UI when this is null.
    picture_url = Column(String(500), nullable=True)

    # "Racer PRO" tier flag. Defaults to free tier on signup.
    is_pro = Column(Boolean, default=False, nullable=False)

    # Hex color used for the fallback avatar circle when there's no photo.
    avatar_color = Column(String(7), default="#E10600", nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
