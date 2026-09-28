import hashlib
import secrets
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from src.auth.database import Base
from src.auth import models as _user_models  # noqa: F401  (registers User for relationship("User"))

REFRESH_TOKEN_EXPIRE_DAYS = 30


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class RefreshToken(Base):
    """Only the SHA-256 hash of the token is stored. The raw value exists
    in the user's cookie, and briefly as the in-memory `.token` attribute
    that issue_refresh_token() sets on the returned object (not a column).
    """

    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    session_started_at = Column(DateTime, nullable=True)

    user = relationship("User")

    @staticmethod
    def generate_token() -> str:
        return secrets.token_urlsafe(48)

    def is_valid(self) -> bool:
        return self.revoked_at is None and self.expires_at > datetime.utcnow()