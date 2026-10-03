import math
import re
from dotenv import load_dotenv
load_dotenv()

import json
import pickle
import sys
from pathlib import Path
import time
import requests
import datetime
import asyncio
import os
from urllib.parse import urlencode
from typing import Optional

from starlette.middleware.gzip import GZipMiddleware

from fastapi import FastAPI, HTTPException, Query, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from src.auth.database import get_db
from src.auth.dependencies import get_current_user
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, HTMLResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Internal Source Modules 
from src.domain.track_geometry import build_track_geometry, extract_race_events, point_at_distance, get_track_outline, get_cached_track_outline
from src.domain.f1_data import (
    load_session,
    get_race_telemetry,
    get_race_weekends_by_year,
    get_driver_statuses,
)
from src.domain.driver_panel import (
    get_season_stats_cached, warm_season_stats,
    warm_racecraft_stats,
)
from src.domain.constructors_panel import warm_constructor_history
from src.domain.next_session import get_next_session
from src.domain.serialize import serialize_frames, serialize_replay_frames, serialize_driver_colors
from src.api.head_to_head import router as h2h_router

from src.auth.routes import router as auth_router, get_current_active_user
from src.auth.database import Base, engine, SessionLocal
from src.auth.models import User
from src.auth.replay_history_routes import router as replay_history_router
from src.auth.replay_history import ReplayHistory
from src.auth.profile_routes import router as profile_router
from src.auth.password_reset.routes import router as password_reset_router
from src.auth.refresh_tokens.routes import router as refresh_tokens_router
from src.auth.sessions.routes import router as sessions_router
from src.auth.email_verification.routes import router as email_verification_router
from src.auth.contact.routes import router as contact_router
from src.auth.sessions.context import RequestContextMiddleware
from src.config.settings import CORS_ORIGINS
from src.live.session_watcher import run_forever as run_live_watcher
from src.live.state import live_state

from src.api.schedule import router as schedule_router
from src.api.session_detail import router as session_detail_router
from src.api.live import router as live_router
from src.api.replay import router as replay_router
from src.api.drivers import router as drivers_router
from src.api.analytics import router as analytics_router
from src.api.constructors import router as constructors_router
from src.api.driver_detail import router as driver_detail_router
from src.api.track import router as track_router
from src.api.race_control import router as race_control_router
from src.api.minisectors import router as minisectors_router
from src.api.timing import router as timing_router
from src.api.telemetry import router as telemetry_router
from src.api.profile_extra import router as profile_extra_router
from src.api.settings import router as settings_router

_REPLAY_TELEMETRY_CACHE = {}
_REPLAY_SERIALIZED_CACHE = {}

def _find_local_replay_cache(year, round_number, session_type="R"):
    computed_dir = (
        Path(__file__).resolve().parent
        / "computed_data"
    )

    if not computed_dir.exists():
        return None

    if session_type == "S":
        marker = "_sprint_v"
    elif session_type in ("FP1", "FP2", "FP3"):
        marker = f"_{session_type.lower()}_v"
    else:
        marker = "_race_v"

    prefix = f"{int(year)}_Season_Round_{int(round_number)}:"

    candidates = list(
        computed_dir.glob(
            f"{prefix}*{marker}*_telemetry.pkl"
        )
    )

    if not candidates:
        return None

    # Prefer the newest local cache file.
    candidates.sort(
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )

    selected = candidates[0]

    print(
        f"[ReplayCache] LOCAL HIT: {selected.name}"
    )

    return selected


def _replay_cache_key(year, round_number, session_type):
    return (
        int(year),
        int(round_number),
        str(session_type),
    )


def _get_cached_replay_telemetry(
    year,
    round_number,
    session_type,
    session=None,
):
    """
    Cache-first replay telemetry loader.

    Priority:
        1. Memory cache
        2. Local computed_data replay pickle
        3. FastF1 fallback

    A local replay pickle is already a complete replay dataset,
    so FastF1 is NOT loaded when the pickle exists.
    """

    key = _replay_cache_key(
        year,
        round_number,
        session_type,
    )

    # ============================================================
    # 1. MEMORY CACHE
    # ============================================================

    cached = _REPLAY_TELEMETRY_CACHE.get(key)

    if cached is not None:
        print(
            f"[ReplayCache] MEMORY HIT: "
            f"{year} R{round_number} {session_type}"
        )
        return cached

    # ============================================================
    # 2. LOCAL COMPUTED DATA
    # ============================================================

    cache_file = _find_local_replay_cache(
        year,
        round_number,
        session_type,
    )

    if cache_file is not None:
        print(
            f"[ReplayCache] LOCAL HIT: "
            f"{cache_file.name}"
        )

        try:
            with cache_file.open("rb") as f:
                telemetry = pickle.load(f)

            if not isinstance(telemetry, dict):
                raise ValueError(
                    "Replay cache is not a dictionary"
                )

            if "frames" not in telemetry:
                raise ValueError(
                    "Replay cache does not contain frames"
                )

            if not isinstance(telemetry["frames"], list):
                raise ValueError(
                    "Replay cache frames is not a list"
                )

            _REPLAY_TELEMETRY_CACHE[key] = telemetry

            print(
                f"[ReplayCache] LOCAL READY: "
                f"{cache_file.stat().st_size / (1024 * 1024):.1f} MB"
            )

            print(
                f"[ReplayCache] Frames: "
                f"{len(telemetry['frames']):,}"
            )

            print(
                f"[ReplayCache] Drivers: "
                f"{len(telemetry.get('driver_colors', {}))}"
            )

            return telemetry

        except Exception as e:
            print(
                f"[ReplayCache] LOCAL LOAD FAILED: {e}"
            )

    # ============================================================
    # 3. FASTF1 FALLBACK
    # ============================================================

    print(
        f"[ReplayCache] LOCAL MISS: "
        f"{year} R{round_number} {session_type}"
    )

    if session is None:
        print("[ReplayCache] Loading FastF1 session...")

        session = load_session(
            year,
            round_number,
            session_type,
        )

    # ============================================================
    # FASTF1 TELEMETRY LOAD
    # ============================================================
    # get_race_telemetry() accesses session.laps / car_data /
    # position_data. Make sure the FastF1 session has actually
    # loaded telemetry before the replay builder touches it.
    # ============================================================

    try:
        print(
            "[ReplayCache] Ensuring FastF1 session data is loaded..."
        )

        session.load(
            telemetry=True,
            laps=True,
            weather=False,
            messages=False,
            livedata=False,
        )

        print(
            "[ReplayCache] FastF1 session data loaded."
        )

    except Exception as e:
        raise RuntimeError(
            f"FastF1 session telemetry load failed: {e}"
        ) from e

    print(
        "[ReplayCache] Falling back to FastF1 telemetry build..."
    )

    telemetry = get_race_telemetry(
        session,
        session_type=session_type,
    )

    _REPLAY_TELEMETRY_CACHE[key] = telemetry

    return telemetry


def _get_cached_serialized_replay(
    year,
    round_number,
    session_type,
    fps,
    raw_frames,
):
    """
    Serialize the replay ONCE for a given session/FPS.

    /api/replay/chunk may be called dozens of times.
    Never rebuild the complete serialized replay for every chunk.
    """

    key = (
        int(year),
        int(round_number),
        str(session_type),
        int(fps),
    )

    cached = _REPLAY_SERIALIZED_CACHE.get(key)

    if cached is not None:
        print(
            f"[ReplayCache] serialized HIT: "
            f"{len(cached):,} frames @ {fps} FPS"
        )
        return cached

    print(
        f"[ReplayCache] serialized MISS: "
        f"building replay for {year} R{round_number} "
        f"{session_type} @ {fps} FPS..."
    )

    sampled = serialize_replay_frames(
        raw_frames,
        target_fps=fps,
    )

    _REPLAY_SERIALIZED_CACHE[key] = sampled

    print(
        f"[ReplayCache] serialized READY: "
        f"{len(sampled):,} frames"
    )

    return sampled

app = FastAPI(title="F1 Race Replay API")

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


app.add_middleware(RequestContextMiddleware)

Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(replay_history_router)
app.include_router(profile_router)
app.include_router(password_reset_router)
app.include_router(refresh_tokens_router)
app.include_router(sessions_router)
app.include_router(email_verification_router)
app.include_router(contact_router)
app.include_router(h2h_router)

# F1 API routers
app.include_router(schedule_router)
app.include_router(session_detail_router)
app.include_router(live_router)
app.include_router(replay_router)
app.include_router(drivers_router)
app.include_router(analytics_router)
app.include_router(constructors_router)
app.include_router(driver_detail_router)
app.include_router(track_router)
app.include_router(race_control_router)
app.include_router(minisectors_router)
app.include_router(timing_router)
app.include_router(telemetry_router)
app.include_router(profile_extra_router)
app.include_router(settings_router)


# --- Directory Config & Static Mounts ---

PROJECT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"

# New React + Vite production build
DIST_DIR = FRONTEND_DIR / "dist"
DIST_ASSETS_DIR = DIST_DIR / "assets"

# Vite production assets
# /assets/index-xxxxx.js
# /assets/index-xxxxx.css
if DIST_ASSETS_DIR.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=DIST_ASSETS_DIR),
        name="vite-assets",
    )

# Public images from frontend/public/images
DIST_IMAGES_DIR = DIST_DIR / "images"
if DIST_IMAGES_DIR.exists():
    app.mount(
        "/images",
        StaticFiles(directory=DIST_IMAGES_DIR),
        name="frontend-images",
    )

# Public driver images + React driver-detail routes
DIST_DRIVERS_DIR = DIST_DIR / "drivers"

@app.get("/drivers/{file_path:path}", include_in_schema=False)
async def driver_assets_or_spa(file_path: str):
    target = DIST_DRIVERS_DIR / file_path

    if target.is_file():
        return FileResponse(target)

    index_file = DIST_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Vite build not found. Run `npm run build` inside frontend/.",
        )

    return FileResponse(index_file)

# --- OAuth Routes ---

async def warm_driver_stats_cache():
    current_year = datetime.date.today().year

    def _compute():
        print(f"[startup] Warming driver stats cache for {current_year} (background)...")
        warm_season_stats(current_year)
        print("[startup] Driver stats cache ready.")

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _compute)

async def warm_track_outline_cache():
    current_year = datetime.date.today().year

    def _compute():
        print(f"[startup] Warming track-outline cache for {current_year} (background)...")
        try:
            weekends = get_race_weekends_by_year(current_year)
        except Exception as e:
            print(f"[startup] Could not load schedule for outline warm-up: {e}")
            return
        for w in weekends:
            try:
                get_track_outline(current_year, w["round_number"])
            except Exception as e:
                print(f"[startup] Track outline warm-up failed for round {w['round_number']}: {e}")
        print("[startup] Track outline cache warm-up complete.")

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _compute)

STATS_REFRESH_CHECK_INTERVAL = 60 * 60

async def _periodic_stats_refresh_loop():
    loop = asyncio.get_event_loop()
    while True:
        await asyncio.sleep(STATS_REFRESH_CHECK_INTERVAL)
        current_year = datetime.date.today().year

        def _compute():
            try:
                print(f"[stats-refresh] Checking driver stats cache for {current_year}...")
                warm_season_stats(current_year)
            except Exception as e:
                print(f"[stats-refresh] Failed to refresh driver stats cache: {e}")
            try:
                print(f"[stats-refresh] Checking constructor history cache for {current_year}...")
                warm_constructor_history(current_year)
            except Exception as e:
                print(f"[stats-refresh] Failed to refresh constructor history cache: {e}")

        loop.run_in_executor(None, _compute)

async def warm_constructor_history_cache():
    current_year = datetime.date.today().year

    def _compute():
        print(f"[startup] Warming constructor history cache for {current_year} (background)...")
        warm_constructor_history(current_year)
        print("[startup] Constructor history cache ready.")

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _compute)

@app.on_event("startup")
async def start_stats_refresh_loop():
    asyncio.create_task(_periodic_stats_refresh_loop())

async def start_live_watcher():
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, run_live_watcher)


# --- Core Telemetry & Session API Endpoints ---

def _get_example_lap(year: int, round_number: int, race_session):
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


def _safe_float(value, default=None):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return default

    if not math.isfinite(value):
        return default

    return value


def _sanitize_replay_json(value):
    if isinstance(value, dict):
        return {
            key: _sanitize_replay_json(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            _sanitize_replay_json(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return [
            _sanitize_replay_json(item)
            for item in value
        ]

    if isinstance(value, float):
        if not math.isfinite(value):
            return None
        return value

    return value


def _load_replay_cache_only(
    year: int,
    round_number: int,
    session_type: str,
):
    """
    Replay cache-only loader.

    IMPORTANT:
    Replay must NEVER try to build telemetry when no local
    computed_data cache exists.

    This prevents FastF1 from reaching multiprocessing with
    zero available drivers/processes for future/unpublished
    sessions.
    """

    cache_file = _find_local_replay_cache(
        year,
        round_number,
        session_type,
    )

    if cache_file is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Replay telemetry is not available locally for "
                f"{year} Round {round_number} {session_type}. "
                f"No computed replay cache exists yet."
            ),
        )

    print(
        f"[Replay] CACHE-ONLY HIT: "
        f"{cache_file}"
    )

    try:
        race_telemetry = _get_cached_replay_telemetry(
            year,
            round_number,
            session_type,
            None,
        )
    except TypeError:
        # Some versions of the existing helper expect a loaded
        # FastF1 session. In that case load the session only after
        # confirming that a local cache exists.
        try:
            session = load_session(
                year,
                round_number,
                session_type,
                telemetry=False,
            )
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to load cached replay session: {e}",
            )

        try:
            race_telemetry = _get_cached_replay_telemetry(
                year,
                round_number,
                session_type,
                session,
            )
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to read replay cache: {e}",
            )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to read replay cache: {e}",
        )

    return race_telemetry




# ============================================================================
# REPLAY GRAND PRIX RESOLUTION
# ============================================================================
#
# The frontend selects a Grand Prix name.
# FastF1 internally needs a round number.
#
# The round number is therefore resolved ONLY inside the backend.
# ============================================================================

def _normalise_grand_prix_name(value):
    if value is None:
        return ""

    return " ".join(
        str(value)
        .strip()
        .lower()
        .replace("-", " ")
        .replace("_", " ")
        .split()
    )


def _resolve_replay_round(year: int, grand_prix: str) -> int:
    """
    Resolve a user-facing Grand Prix name to the actual FastF1
    round number for the selected season.

    The frontend never needs to know this number.
    """

    requested = _normalise_grand_prix_name(grand_prix)

    if not requested:
        raise HTTPException(
            status_code=400,
            detail="Grand Prix is required.",
        )

    try:
        weekends = get_race_weekends_by_year(year)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load {year} Grand Prix calendar: {e}",
        )

    for index, weekend in enumerate(weekends, start=1):

        if hasattr(weekend, "to_dict"):
            item = weekend.to_dict()

        elif isinstance(weekend, dict):
            item = weekend

        else:
            item = {}

        event_name = (
            item.get("EventName")
            or item.get("event_name")
            or item.get("Name")
            or item.get("name")
            or ""
        )

        official_round = (
            item.get("RoundNumber")
            or item.get("round_number")
            or item.get("round")
            or item.get("Round")
            or index
        )

        candidates = [
            event_name,
            item.get("OfficialEventName", ""),
            item.get("EventFormat", ""),
            item.get("Location", ""),
            item.get("location", ""),
        ]

        for candidate in candidates:
            if not candidate:
                continue

            candidate_normalised = _normalise_grand_prix_name(
                candidate
            )

            if requested == candidate_normalised:
                return int(official_round)

            # Allow:
            # "Miami" -> "Miami Grand Prix"
            # "Miami Grand Prix" -> "Miami"
            if (
                requested in candidate_normalised
                or candidate_normalised in requested
            ):
                return int(official_round)

    raise HTTPException(
        status_code=404,
        detail=(
            f"Grand Prix '{grand_prix}' was not found "
            f"in the {year} calendar."
        ),
    )


def _replay_request_round(year: int, grand_prix: str) -> int:
    """
    Single resolver used by all replay endpoints.
    """
    resolved_round = _resolve_replay_round(
        year,
        grand_prix,
    )

    print(
        f"[Replay] {year} '{grand_prix}' "
        f"-> backend round {resolved_round}"
    )

    return resolved_round










# --- Frontend HTML Page Handlers ---

# --- React/Vite SPA Page Handler ---

@app.get("/", response_class=HTMLResponse, summary="Serve React Application")
def index():
    index_file = DIST_DIR / "index.html"

    if not index_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Vite build not found. Run `npm run build` inside frontend/."
        )

    return FileResponse(index_file)


async def warm_historical_seasons_cache():
    current_year = datetime.date.today().year

    def _compute():
        for year in range(current_year - 3, current_year + 1):
            print(f"[startup] Warming historical driver stats for {year} (background)...")
            try:
                warm_season_stats(year)
            except Exception as e:
                print(f"[startup] Failed to warm {year} stats: {e}")
        print("[startup] Historical driver stats ready.")

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _compute)



# ============================================================
# ACHIEVEMENTS
# Derived entirely from ReplayHistory — no separate table.
# ============================================================

# React Router SPA fallback.
#
# All frontend routes such as:
# /replay
# /sessions
# /drivers
# /constructors
# /telemetry
# /timing
# /settings
#
# must return the same Vite index.html.
#
# API routes are intentionally excluded because FastAPI routes are
# matched before this fallback.
@app.get("/{path:path}", response_class=HTMLResponse, include_in_schema=False)
def react_spa_fallback(path: str):
    # Never treat API requests as React routes.
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    # Vite assets should be handled by /assets.
    if (
        path.startswith("assets/")
        or path.startswith("images/")
        or path.startswith("drivers/")
    ):
        raise HTTPException(status_code=404, detail="Frontend asset not found")

    index_file = DIST_DIR / "index.html"

    if not index_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Vite build not found. Run `npm run build` inside frontend/."
        )

    return FileResponse(index_file)
