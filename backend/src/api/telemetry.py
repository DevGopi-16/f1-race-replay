from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from src.domain.f1_data import get_driver_lap_telemetry, load_session


router = APIRouter(prefix="/api", tags=["Telemetry"])


@router.get("/telemetry/compare", summary="Driver Telemetry Comparison")
def telemetry_compare(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query(
        "R",
        pattern="^(R|S|Q|SQ|FP1|FP2|FP3)$",
    ),
    driver_a: str = Query(...),
    driver_b: str = Query(...),
    lap_a: Optional[int] = Query(None),
    lap_b: Optional[int] = Query(None),
):
    try:
        session = load_session(
            year,
            round,
            session_type,
            telemetry=True,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load session: {e}",
        )

    try:
        data_a = get_driver_lap_telemetry(
            session,
            driver_a,
            lap_a,
        )
        data_b = get_driver_lap_telemetry(
            session,
            driver_b,
            lap_b,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build telemetry comparison: {e}",
        )

    event_date = session.event.get("EventDate")

    return {
        "meta": {
            "event_name": session.event.get("EventName", ""),
            "year": year,
            "round": round,
            "date": (
                event_date.strftime("%B %d, %Y")
                if event_date
                else ""
            ),
            "session_type": session_type,
        },
        "driver_a": data_a,
        "driver_b": data_b,
    }
