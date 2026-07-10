"""FastAPI backend for the web race replay.

This wraps your EXISTING src/f1_data.py pipeline unchanged — same caching,
same multiprocessing telemetry extraction, same pickle files in
computed_data/. It just exposes the result over HTTP instead of handing it
to an Arcade window.

SETUP: this backend expects your original `src/f1_data.py` (and the
`src/lib/` package it depends on: settings.py, time.py, tyres.py) to be
present alongside the new src/track_geometry.py and src/serialize.py files
in this project's src/ directory. Copy them over before running.

Run with:  uvicorn main:app --reload --port 8000
"""

import sys
from pathlib import Path
import time

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from src.f1_data import (
    enable_cache,
    load_session,
    get_race_telemetry,
    get_race_weekends_by_year,
    get_quali_telemetry,
)
from src.track_geometry import build_track_geometry, extract_race_events
from src.serialize import serialize_frames, serialize_driver_colors

app = FastAPI(title="F1 Race Replay API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before deploying publicly
    allow_methods=["*"],
    allow_headers=["*"],
)

SOURCE_FPS = 25  # must match DT = 1/FPS in f1_data.py


@app.on_event("startup")
def _startup():
    enable_cache()


@app.get("/api/schedule/{year}")
def schedule(year: int):
    """Race weekends for a season — powers the frontend's race picker."""
    try:
        return get_race_weekends_by_year(year)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Couldn't load {year} schedule: {e}")


def _get_example_lap(year: int, round_number: int, race_session):
    """Same fallback logic as your original main.py: prefer a qualifying
    lap for clean DRS-zone data, fall back to the fastest race lap.
    """
    try:
        quali_session = load_session(year, round_number, "Q")
        if quali_session is not None and len(quali_session.laps) > 0:
            fastest_quali = quali_session.laps.pick_fastest()
            if fastest_quali is not None:
                quali_telemetry = fastest_quali.get_telemetry()
                if "DRS" in quali_telemetry.columns:
                    return quali_telemetry
    except Exception as e:
        print(f"Could not load qualifying session for track layout: {e}")

    fastest_lap = race_session.laps.pick_fastest()
    if fastest_lap is None:
        raise HTTPException(status_code=502, detail="No valid laps found in session")
    return fastest_lap.get_telemetry()


@app.get(
    "/api/replay",
    response_class=JSONResponse,
    summary="Race Replay",
    description="""
Returns the complete replay payload required by the frontend.

Includes:

- Event metadata
- Driver colors
- Track geometry
- Circuit corners
- Race events
- Downsampled telemetry frames
""",
    responses={
        200: {
            "description": "Replay payload",
            "content": {
                "application/json": {
                    "example": {
                        "meta": {
                            "event_name": "British Grand Prix",
                            "circuit_name": "Silverstone",
                            "country": "United Kingdom",
                            "year": 2025,
                            "round": 12,
                            "date": "July 06, 2025",
                            "total_laps": 52,
                            "session_type": "R"
                        },
                        "driver_colors": {
                            "VER": "#3671C6",
                            "NOR": "#FF8700",
                            "LEC": "#E80020"
                        },
                        "max_tyre_life": {
                            "1": 28,
                            "2": 42
                        },
                        "track": {
                            "corners": [
                                {
                                    "number": 1,
                                    "letter": "",
                                    "angle": 180.0,
                                    "distance": 122.5
                                }
                            ]
                        },
                        "events": [],
                        "frames": [],
                        "frame_rate": 8
                    }
                }
            }
        }
    }
)
def replay(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("R", pattern="^(R|S)$"),
    fps: int = Query(8, ge=1, le=25),
):
    """
    Full replay payload containing track geometry, telemetry,
    race events and driver information.
    """

    try:
        session = load_session(year, round, session_type)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load session: {e}"
        )

    try:
        race_telemetry = get_race_telemetry(
            session,
            session_type=session_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build telemetry: {e}"
        )

    example_lap = _get_example_lap(year, round, session)
    track = build_track_geometry(example_lap)

    # FastF1 official circuit corners
    try:
        circuit_info = session.get_circuit_info()

        track["corners"] = []

        if (
            circuit_info is not None
            and hasattr(circuit_info, "corners")
            and circuit_info.corners is not None
        ):
            for _, corner in circuit_info.corners.iterrows():
                track["corners"].append(
                    {
                        "number": int(corner["Number"]),
                        "letter": ""
                        if str(corner["Letter"]) == "nan"
                        else str(corner["Letter"]),
                        "angle": float(corner["Angle"]),
                        "distance": float(corner["Distance"]),
                    }
                )

    except Exception as e:
        print("Corner data unavailable:", e)
        track["corners"] = []

    events = extract_race_events(
        race_telemetry["frames"],
        race_telemetry["track_statuses"],
    )

    frames = serialize_frames(
        race_telemetry["frames"],
        source_fps=SOURCE_FPS,
        target_fps=fps,
    )

    event_date = session.event.get("EventDate")

    return {
        "meta": {
            "event_name": session.event.get("EventName", ""),
            "circuit_name": session.event.get("Location", ""),
            "country": session.event.get("Country", ""),
            "year": year,
            "round": round,
            "date": event_date.strftime("%B %d, %Y")
            if event_date
            else "",
            "total_laps": race_telemetry["total_laps"],
            "session_type": session_type,
        },
        "driver_colors": serialize_driver_colors(
            race_telemetry["driver_colors"]
        ),
        "max_tyre_life": race_telemetry.get(
            "max_tyre_life",
            {},
        ),
        "track": track,
        "events": events,
        "frames": frames,
        "frame_rate": fps,
    }


@app.get(
    "/api/quali",
    summary="Qualifying Results",
    description="""
Returns qualifying (or sprint qualifying) session results as a results
table — NOT a car replay. Qualifying has no synced multi-car timeline the
way Race/Sprint do (each driver runs isolated flying laps, often at
different times), so /api/replay's frame-based approach doesn't apply here.
""",
)
def quali(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("Q", pattern="^(Q|SQ)$"),
):
    try:
        session = load_session(year, round, session_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load session: {e}")

    try:
        quali_data = get_quali_telemetry(session, session_type=session_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to build qualifying data: {e}")

    event_date = session.event.get("EventDate")
    return {
        "meta": {
            "event_name": session.event.get("EventName", ""),
            "circuit_name": session.event.get("Location", ""),
            "country": session.event.get("Country", ""),
            "year": year,
            "round": round,
            "date": event_date.strftime("%B %d, %Y") if event_date else "",
            "session_type": session_type,
        },
        "results": quali_data["results"],
    }


# Serve the frontend 
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@app.get("/")
def index():
    return FileResponse(FRONTEND_DIR / "index.html")


app.mount("/static", StaticFiles(directory=FRONTEND_DIR / "static"), name="static")