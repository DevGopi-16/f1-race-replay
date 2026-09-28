from fastapi import APIRouter, HTTPException

from src.domain.track_geometry import (
    get_track_outline,
    get_track_map_with_telemetry,
)


router = APIRouter(prefix="/api", tags=["Track"])


@router.get(
    "/track-outline/{year}/{round}",
    summary="Track Outline",
)
def track_outline(year: int, round: int):
    try:
        return get_track_outline(year, round)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build track outline: {e}",
        )


@router.get(
    "/track-map/{year}/{gp}/{session_type}/{driver_code}",
)
def track_map(
    year: int,
    gp: str,
    session_type: str,
    driver_code: str,
):
    try:
        return get_track_map_with_telemetry(
            year,
            gp,
            session_type,
            driver_code,
        )
    except Exception as e:
        return {"error": str(e)}
