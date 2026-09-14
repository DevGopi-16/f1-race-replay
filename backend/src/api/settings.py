from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from src.auth.database import SessionLocal
from src.auth.routes import get_current_active_user
from src.auth.models import User


router = APIRouter(prefix="/auth", tags=["Settings"])


class UserSettingsUpdate(BaseModel):
    telemetry_preferences: Optional[str] = None
    default_driver_comp: Optional[str] = None
    units: Optional[str] = None
    theme: Optional[str] = None
    accent_color: Optional[str] = None
    notifications_enabled: Optional[bool] = None


@router.get("/settings", summary="Get User Settings")
def get_user_settings(
    current_user: User = Depends(get_current_active_user),
):
    return {
        "telemetry_preferences": getattr(
            current_user,
            "telemetry_preferences",
            "speed,throttle,brake",
        ),
        "default_driver_comp": getattr(
            current_user,
            "default_driver_comp",
            "VER",
        ),
        "units": getattr(current_user, "units", None) or "metric",
        "theme": getattr(current_user, "theme", "dark"),
        "accent_color": getattr(
            current_user,
            "accent_color",
            "#e10600",
        ),
        "notifications_enabled": bool(
            getattr(current_user, "notifications_enabled", 1)
        ),
    }


@router.put("/settings", summary="Update User Settings")
def update_user_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
):
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.id == current_user.id).first()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found",
            )

        if payload.telemetry_preferences is not None:
            user.telemetry_preferences = payload.telemetry_preferences

        if payload.default_driver_comp is not None:
            user.default_driver_comp = payload.default_driver_comp

        if payload.units is not None:
            user.units = payload.units

        if payload.theme is not None:
            user.theme = payload.theme

        if payload.accent_color is not None:
            user.accent_color = payload.accent_color

        if payload.notifications_enabled is not None:
            user.notifications_enabled = (
                1 if payload.notifications_enabled else 0
            )

        db.commit()
        db.refresh(user)

        return {
            "message": "Settings updated successfully",
            "units": user.units,
        }

    finally:
        db.close()
