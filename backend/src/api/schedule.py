from fastapi import APIRouter, HTTPException, Query

from src.domain.f1_data import get_race_weekends_by_year
from src.domain.next_session import get_next_session
from src.domain.track_geometry import get_cached_track_outline


router = APIRouter(prefix="/api", tags=["Schedule"])


@router.get("/next-session")
def next_session(year: int = Query(...)):
    try:
        result = get_next_session(year)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to find next session: {e}",
        )

    return result or {}


@router.get("/schedule/{year}")
def schedule(year: int):
    try:
        weekends = get_race_weekends_by_year(year)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't load {year} schedule: {e}",
        )

    for weekend in weekends:
        weekend["track_outline"] = get_cached_track_outline(
            year,
            weekend["round_number"],
        )

    return weekends
