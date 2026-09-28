from fastapi import APIRouter, HTTPException, Query

from src.domain.f1_data import load_session
from src.domain.timing_tower import build_timing_tower


router = APIRouter(prefix="/api", tags=["Timing"])


@router.get("/timing-tower", summary="Timing Tower")
def timing_tower(
    year: int = Query(...),
    round: int = Query(...),
    session_type: str = Query("R"),
):
    try:
        session = load_session(year, round, session_type, telemetry=False)
        rows = build_timing_tower(session)
        return rows
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build timing tower: {e}",
        )
