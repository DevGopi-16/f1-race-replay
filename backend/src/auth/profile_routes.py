import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.auth.database import get_db
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.auth.replay_history import ReplayHistory
from src.auth.security import hash_password, verify_password
from src.auth.refresh_tokens.service import revoke_all_for_user
from src.auth.security_log.logger import log_event

router = APIRouter(
    prefix="/auth",
    tags=["profile"],
)


# =========================================================
# PROFILE SCHEMAS
# =========================================================

class ProfileUpdate(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=50,
    )

    favorite_driver: str | None = Field(
        default=None,
        max_length=10,
    )

    favorite_team: str | None = Field(
        default=None,
        max_length=100,
    )

    units: str | None = Field(
        default=None,
        max_length=20,
    )

    accent_color: str | None = Field(
        default=None,
        max_length=20,
    )

    notifications_enabled: bool | None = None

class ChangePasswordRequest(BaseModel):
    current_password: str | None = None
    new_password: str = Field(
        min_length=8,
        max_length=128,
    )
    confirm_password: str = Field(
        min_length=8,
        max_length=128,
    )


class ProfileStats(BaseModel):
    replays_watched: int
    replays_started: int
    watch_time_seconds: float
    completion_rate: float

class ProfileResponse(BaseModel):
    id: int
    username: str
    email: str | None
    picture_url: str | None
    is_pro: bool
    has_password: bool
    favorite_driver: str | None
    favorite_team: str | None
    replays_watched: int
    connected_accounts: dict[str, bool]


# =========================================================
# PROFILE
# =========================================================

@router.get(
    "/profile",
    response_model=ProfileResponse,
)
def get_profile(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    histories = (
        db.query(ReplayHistory)
        .filter(
            ReplayHistory.user_id == current_user.id
        )
        .all()
    )

    replays_watched = sum(
        1
        for history in histories
        if history.completed_at is not None
        or history.progress >= 0.999
    )

    return ProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        picture_url=current_user.picture_url,
        is_pro=bool(current_user.is_pro),
        has_password=bool(current_user.hashed_password),
        favorite_driver=current_user.favorite_driver,
        favorite_team=current_user.favorite_team,
        replays_watched=replays_watched,
        connected_accounts={
            "google": bool(current_user.google_id),
            "discord": bool(current_user.discord_id),
            "x": bool(current_user.x_id),
        },
    )


# =========================================================
# PROFILE UPDATE
# =========================================================

@router.put(
    "/profile",
)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if payload.username is not None:
        username = payload.username.strip()

        if not username:
            raise HTTPException(
                status_code=400,
                detail="Username cannot be empty.",
            )

        if len(username) < 3:
            raise HTTPException(
                status_code=400,
                detail="Username must be at least 3 characters.",
            )

        if len(username) > 50:
            raise HTTPException(
                status_code=400,
                detail="Username must be 50 characters or fewer.",
            )

        if not re.fullmatch(r"[A-Za-z0-9_]+", username):
            raise HTTPException(
                status_code=400,
                detail="Username can contain only letters, numbers, and underscores.",
            )

        existing_user = (
            db.query(User)
            .filter(
                User.username == username,
                User.id != current_user.id,
            )
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="Username is already taken.",
            )

        current_user.username = username

    if payload.favorite_driver is not None:
        current_user.favorite_driver = (
            payload.favorite_driver.strip() or None
        )

    if payload.favorite_team is not None:
        current_user.favorite_team = (
            payload.favorite_team.strip() or None
        )

    if payload.units is not None:
        current_user.units = payload.units.strip() or None

    if payload.accent_color is not None:
        current_user.accent_color = (
            payload.accent_color.strip() or None
        )

    if payload.notifications_enabled is not None:
        current_user.notifications_enabled = int(
            payload.notifications_enabled
        )

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully.",
        "username": current_user.username,
    }


# =========================================================
# CHANGE PASSWORD
# =========================================================
@router.put(
    "/profile/password",
)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    has_password = bool(current_user.hashed_password)

    # Existing password account:
    # current password is required and must be correct.
    if has_password:
        if not payload.current_password:
            raise HTTPException(
                status_code=400,
                detail="Enter your current password.",
            )

        if not verify_password(
            payload.current_password,
            current_user.hashed_password,
        ):
            raise HTTPException(
                status_code=400,
                detail="Current password is incorrect.",
            )

        if payload.new_password == payload.current_password:
            raise HTTPException(
                status_code=400,
                detail="New password must be different from your current password.",
            )

    # Both new-password fields must always match.
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="New passwords do not match.",
        )

    current_user.hashed_password = hash_password(
        payload.new_password,
    )

    db.commit()
    db.refresh(current_user)

    revoke_all_for_user(db, current_user.id)
    log_event("password_changed", user_id=current_user.id, email=current_user.email)

    return {
        "message": (
            "Password changed successfully."
            if has_password
            else "Password set successfully."
        ),
    }


# =========================================================
# REAL PROFILE STATS
# =========================================================

@router.get(
    "/profile/stats",
    response_model=ProfileStats,
)
def get_profile_stats(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    histories = (
        db.query(ReplayHistory)
        .filter(
            ReplayHistory.user_id == current_user.id
        )
        .all()
    )

    replays_started = len(histories)

    replays_watched = sum(
        1
        for history in histories
        if history.completed_at is not None
        or history.progress >= 0.999
    )

    watch_time_seconds = sum(
        float(history.duration_seconds or 0)
        for history in histories
    )

    completion_rate = (
        (replays_watched / replays_started) * 100
        if replays_started
        else 0.0
    )

    return ProfileStats(
        replays_watched=replays_watched,
        replays_started=replays_started,
        watch_time_seconds=watch_time_seconds,
        completion_rate=round(completion_rate, 1),
    )
