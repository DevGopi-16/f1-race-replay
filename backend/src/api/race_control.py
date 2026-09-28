from fastapi import APIRouter, HTTPException, Query

from src.domain.race_control import build_race_control_feed


router = APIRouter(prefix="/api", tags=["Race Control"])


@router.get("/race-control", summary="Race Control Messages")
def race_control(
    year: int = Query(...),
    round: int = Query(...),
    session_type: str = Query("R"),
):
    try:
        rows = build_race_control_feed(year, round, session_type)
        return rows
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build race control feed: {e}",
        )
