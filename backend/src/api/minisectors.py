from fastapi import APIRouter, HTTPException, Query

from src.domain.minisectors import build_minisectors


router = APIRouter(prefix="/api", tags=["Minisectors"])


@router.get("/minisectors", summary="Minisectors")
def minisectors(
    year: int = Query(...),
    round: int = Query(...),
    session_type: str = Query("R"),
):
    try:
        data = build_minisectors(year, round, session_type)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build minisectors: {e}",
        )
