from pathlib import Path
import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
import requests

from src.domain.f1_data import (
    load_session,
    get_quali_telemetry,
    get_tyre_strategy,
    get_session_drivers,
)
from src.domain.driver_panel import build_driver_panel


router = APIRouter(prefix="/api", tags=["Drivers"])


def _load_drivers():
    data_file = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "drivers.json"
    )

    if not data_file.exists():
        return []

    try:
        with data_file.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


@router.get("/quali", summary="Qualifying Results")
def quali(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("Q", pattern="^(Q|SQ)$"),
):
    try:
        session = load_session(year, round, session_type)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load session: {e}",
        )

    try:
        quali_data = get_quali_telemetry(
            session,
            session_type=session_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build qualifying data: {e}",
        )

    event_date = session.event.get("EventDate")

    return {
        "meta": {
            "event_name": session.event.get("EventName", ""),
            "circuit_name": session.event.get("Location", ""),
            "country": session.event.get("Country", ""),
            "year": year,
            "round": round,
            "date": (
                event_date.strftime("%B %d, %Y")
                if event_date
                else ""
            ),
            "session_type": session_type,
        },
        "results": quali_data["results"],
    }


@router.get("/strategy", summary="Tyre Strategy")
def strategy(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("R", pattern="^(R|S)$"),
):
    try:
        session = load_session(
            year,
            round,
            session_type,
            telemetry=False,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load session: {e}",
        )

    try:
        strategy_data = get_tyre_strategy(session)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build tyre strategy: {e}",
        )

    event_date = session.event.get("EventDate")

    return {
        "meta": {
            "event_name": session.event.get("EventName", ""),
            "circuit_name": session.event.get("Location", ""),
            "country": session.event.get("Country", ""),
            "year": year,
            "round": round,
            "date": (
                event_date.strftime("%B %d, %Y")
                if event_date
                else ""
            ),
            "session_type": session_type,
        },
        "total_laps": strategy_data["total_laps"],
        "total_pit_stops": strategy_data["total_pit_stops"],
        "drivers": strategy_data["drivers"],
    }


@router.get("/drivers", summary="Session Driver List")
def drivers_list(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query(
        "R",
        pattern="^(R|S|Q|SQ|FP1|FP2|FP3)$",
    ),
):
    try:
        session = load_session(
            year,
            round,
            session_type,
            telemetry=False,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load session: {e}",
        )

    try:
        return get_session_drivers(session)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to list drivers: {e}",
        )


@router.get("/drivers/panel", summary="Driver Panel")
def drivers_panel(
    year: int = Query(...),
    round: Optional[int] = Query(None, alias="round"),
):
    drivers = _load_drivers()

    try:
        return build_driver_panel(
            year,
            drivers,
            round_=round,
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't reach Jolpica API: {e}",
        )
