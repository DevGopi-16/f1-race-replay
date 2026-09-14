from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from src.auth.database import Base


class ReplayHistory(Base):
    __tablename__ = "replay_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    year = Column(
        Integer,
        nullable=False,
        index=True,
    )

    round = Column(
        Integer,
        nullable=False,
    )

    session_type = Column(
        String(10),
        nullable=False,
    )

    progress = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    duration_seconds = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_watched_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "year",
            "round",
            "session_type",
            name="uq_replay_history_user_replay",
        ),
    )
