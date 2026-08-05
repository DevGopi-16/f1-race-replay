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
    hashed_password = Column(String(255), nullable=False)

    # "Racer PRO" tier flag. Defaults to free tier on signup.
    is_pro = Column(Boolean, default=False, nullable=False)

    # Hex color used for the avatar circle in the account badge (see screenshot).
    avatar_color = Column(String(7), default="#E10600", nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)