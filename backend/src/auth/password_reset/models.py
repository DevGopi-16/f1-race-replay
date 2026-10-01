from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from src.auth.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class UsedResetToken(Base):
    __tablename__ = "used_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String, unique=True, index=True, nullable=False)
    used_at = Column(DateTime, default=_utcnow, nullable=False)
