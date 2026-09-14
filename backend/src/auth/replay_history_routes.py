from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .database import get_db
from .dependencies import get_current_user
from .models import User
from .replay_history import ReplayHistory


router = APIRouter(
    prefix="/auth/replay-history",
    tags=["replay-history"],
)


ReplaySessionType = Literal[
    "R",
    "S",
    "FP1",
    "FP2",
    "FP3",
]


class ReplayHistoryUpsert(BaseModel):
    year: int = Field(..., ge=1950, le=2100)
    round: int = Field(..., ge=1, le=100)
    session_type: ReplaySessionType

    progress: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    duration_seconds: float = Field(
        default=0.0,
        ge=0.0,
    )

    completed: bool = False


class ReplayHistoryOut(BaseModel):
    id: int
    year: int
    round: int
    session_type: str
    progress: float
    duration_seconds: float
    started_at: Optional[datetime]
    last_watched_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


def _serialize_history(item: ReplayHistory) -> ReplayHistoryOut:
    return ReplayHistoryOut(
        id=item.id,
        year=item.year,
        round=item.round,
        session_type=item.session_type,
        progress=float(item.progress or 0.0),
        duration_seconds=float(item.duration_seconds or 0.0),
        started_at=item.started_at,
        last_watched_at=item.last_watched_at,
        completed_at=item.completed_at,
    )


@router.post(
    "",
    response_model=ReplayHistoryOut,
    status_code=status.HTTP_200_OK,
)
def save_replay_history(
    payload: ReplayHistoryUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    history = (
        db.query(ReplayHistory)
        .filter(
            ReplayHistory.user_id == current_user.id,
            ReplayHistory.year == payload.year,
            ReplayHistory.round == payload.round,
            ReplayHistory.session_type == payload.session_type,
        )
        .first()
    )

    if history is None:
        history = ReplayHistory(
            user_id=current_user.id,
            year=payload.year,
            round=payload.round,
            session_type=payload.session_type,
            progress=payload.progress,
            duration_seconds=payload.duration_seconds,
            started_at=now,
            last_watched_at=now,
            completed_at=now if payload.completed else None,
        )

        db.add(history)

    else:
        history.progress = payload.progress

        # Watching time should never move backwards.
        history.duration_seconds = max(
            float(history.duration_seconds or 0.0),
            float(payload.duration_seconds),
        )

        history.last_watched_at = now

        if history.started_at is None:
            history.started_at = now

        if payload.completed:
            history.completed_at = (
                history.completed_at or now
            )

    db.commit()
    db.refresh(history)

    return _serialize_history(history)


@router.get(
    "",
    response_model=List[ReplayHistoryOut],
)
def get_replay_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    history = (
        db.query(ReplayHistory)
        .filter(ReplayHistory.user_id == current_user.id)
        .order_by(
            ReplayHistory.last_watched_at.desc()
        )
        .all()
    )

    return [
        _serialize_history(item)
        for item in history
    ]


@router.get(
    "/continue",
    response_model=Optional[ReplayHistoryOut],
)
def get_continue_replay(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    history = (
        db.query(ReplayHistory)
        .filter(
            ReplayHistory.user_id == current_user.id,
            ReplayHistory.progress > 0.0,
            ReplayHistory.completed_at.is_(None),
        )
        .order_by(
            ReplayHistory.last_watched_at.desc()
        )
        .first()
    )

    if history is None:
        return None

    return _serialize_history(history)


@router.delete(
    "/{history_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_replay_history(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    history = (
        db.query(ReplayHistory)
        .filter(
            ReplayHistory.id == history_id,
            ReplayHistory.user_id == current_user.id,
        )
        .first()
    )

    if history is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Replay history entry not found",
        )

    db.delete(history)
    db.commit()

    return None
