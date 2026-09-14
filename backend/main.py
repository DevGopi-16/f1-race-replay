import math
import re
from dotenv import load_dotenv
load_dotenv()

"""FastAPI backend for the web race replay.

This wraps your EXISTING src/f1_data.py pipeline unchanged — same caching,
same multiprocessing telemetry extraction, same pickle files in
computed_data/. It just exposes the result over HTTP instead of handing it
to an Arcade window.

uvicorn main:app --reload --port 8000
"""

import json
import pickle
import sys
from pathlib import Path
import time
import requests
import datetime
import asyncio
import os
import shutil
from urllib.parse import urlencode
from typing import Optional

from starlette.middleware.gzip import GZipMiddleware

from fastapi import FastAPI, HTTPException, Query, Depends, File, UploadFile
from sqlalchemy.orm import Session
from src.auth.database import get_db
from src.auth.dependencies import get_current_user
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, HTMLResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


# --- Internal Source Modules ---
from src.track_geometry import get_track_map_with_telemetry, build_track_geometry, extract_race_events, point_at_distance, get_track_outline, get_cached_track_outline, build_track_overview
from src.f1_data import (
    enable_cache,
    load_session,
    get_race_telemetry,
    get_race_weekends_by_year,
    get_quali_telemetry,
    get_tyre_strategy,
    get_session_drivers,
    get_driver_statuses,
    get_driver_lap_telemetry,
)
from src.driver_panel import (
    build_driver_panel, get_season_stats_cached, warm_season_stats,
    build_driver_full, warm_racecraft_stats,
)
from src.analytics import build_analytics

from src.constructors_panel import build_constructors_panel, warm_constructor_history
from src.next_session import get_next_session
from src.serialize import serialize_frames, serialize_replay_frames, serialize_driver_colors

# --- Auth (Racer PRO signup/login) ---
from src.auth.routes import router as auth_router, get_current_active_user
from src.auth.database import Base, engine, SessionLocal
from src.auth.models import User
from src.auth.replay_history_routes import router as replay_history_router
from src.auth.replay_history import ReplayHistory
from src.auth.profile_routes import router as profile_router
from src.timing_tower import build_timing_tower
from src.race_control import build_race_control_feed
from src.minisectors import build_minisectors
from src.live.session_watcher import run_forever as run_live_watcher
from src.live.state import live_state

# --- Circuit SVG lookup (Track Overview card shape) ---
# Maps FastF1's event Location (a city name) to the circuit slug used in
# frontend/static/images/circuits/minimal/{color}/{slug}.svg — picking the
# latest layout revision available for tracks currently on the calendar.
CIRCUIT_SVG_SLUGS = {
    "Sakhir": "bahrain-3",
    "Jeddah": "jeddah-1",
    "Melbourne": "melbourne-2",
    "Suzuka": "suzuka-2",
    "Shanghai": "shanghai-1",
    "Miami": "miami-1",
    "Imola": "imola-3",
    "Monaco": "monaco-6",
    "Barcelona": "catalunya-6",
    "Montreal": "montreal-6",
    "Montréal": "montreal-6",
    "Spielberg": "spielberg-3",
    "Silverstone": "silverstone-8",
    "Budapest": "hungaroring-3",
    "Spa-Francorchamps": "spa-francorchamps-4",
    "Zandvoort": "zandvoort-5",
    "Monza": "monza-7",
    "Baku": "baku-1",
    "Singapore": "marina-bay-4",
    "Austin": "austin-1",
    "Mexico City": "mexico-city-3",
    "São Paulo": "interlagos-2",
    "Sao Paulo": "interlagos-2",
    "Las Vegas": "las-vegas-1",
    "Lusail": "lusail-1",
    "Abu Dhabi": "yas-marina-2",
}


def get_circuit_svg_path(location: str, variant: str = "white-outline", style: str = "minimal") -> Optional[str]:
    """Returns the frontend static path for a circuit's SVG shape, or None
    if we don't have a mapping for this location."""
    slug = CIRCUIT_SVG_SLUGS.get(location)
    if not slug:
        return None
    return f"/static/images/circuits/{style}/{variant}/{slug}.svg"



# ============================================================================
# REPLAY TELEMETRY MEMORY CACHE
# ============================================================================
# Prevents /api/replay/chunk from repeatedly loading and rebuilding the same
# large telemetry dataset for every 500-frame request.

_REPLAY_TELEMETRY_CACHE = {}
_REPLAY_SERIALIZED_CACHE = {}



def _find_local_replay_cache(year, round_number, session_type="R"):
    """
    Find an existing computed replay telemetry pickle without
    contacting FastF1 for telemetry.
    """
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
        source_fps=SOURCE_FPS,
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
    allow_origins=["*"],  # tighten before deploying publicly
    allow_methods=["*"],
    allow_headers=["*"],
)

# Creates the `users` table if it doesn't exist yet.
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(replay_history_router)
app.include_router(profile_router)


# --- Directory Config & Static Mounts ---

PROJECT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"

# New React + Vite production build
DIST_DIR = FRONTEND_DIR / "dist"
DIST_ASSETS_DIR = DIST_DIR / "assets"

# Existing F1 static assets
STATIC_DIR = FRONTEND_DIR / "static"
UPLOADS_DIR = STATIC_DIR / "uploads"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Existing assets:
# /static/images/...
# /static/uploads/...
app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)

# Vite production assets:
# /assets/index-xxxxx.js
# /assets/index-xxxxx.css
if DIST_ASSETS_DIR.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=DIST_ASSETS_DIR),
        name="vite-assets",
    )

# --- OAuth Routes ---

@app.get("/auth/discord", summary="Discord OAuth Login")
def login_discord():
    """Redirect the user to Discord OAuth2."""
    client_id = os.getenv("DISCORD_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="DISCORD_CLIENT_ID is not configured.")

    redirect_uri = os.getenv("DISCORD_REDIRECT_URI", "http://127.0.0.1:8000/auth/discord/callback")
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "identify email",
    }
    discord_url = "https://discord.com/api/oauth2/authorize?" + urlencode(params)
    return RedirectResponse(url=discord_url)


@app.get("/auth/x", summary="X (Twitter) OAuth Login")
def login_x():
    """Redirects the user to X's OAuth2 authorization portal."""
    client_id = os.getenv("X_CLIENT_ID", "")
    redirect_uri = os.getenv("X_REDIRECT_URI", "")

    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="X OAuth environment variables not configured.")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "tweet.read users.read",
        "state": "f1_replay_secure_state",
        "code_challenge": "challenge",
        "code_challenge_method": "plain",
    }
    x_url = "https://twitter.com/i/oauth2/authorize?" + urlencode(params)
    return RedirectResponse(url=x_url)


# --- Driver Profile & Settings Endpoints ---

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    favorite_driver: Optional[str] = None
    favorite_team: Optional[str] = None

@app.get("/auth/profile", summary="Get User Profile Details")
def get_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    # Replay history is the source of truth for watched replays.
    db = SessionLocal()
    try:
        histories = (
            db.query(ReplayHistory)
            .filter(ReplayHistory.user_id == current_user.id)
            .all()
        )

        replays_watched = sum(
            1
            for history in histories
            if history.completed_at is not None
            or float(history.progress or 0.0) >= 0.999
        )

        return {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "picture_url": current_user.picture_url,
            "is_pro": bool(current_user.is_pro),
            "favorite_driver": current_user.favorite_driver,
            "favorite_team": current_user.favorite_team,
            "replays_watched": replays_watched,
            "connected_accounts": {
                "google": current_user.google_id is not None,
                "discord": current_user.discord_id is not None,
                "x": current_user.x_id is not None,
            },
        }
    finally:
        db.close()


@app.put("/auth/profile", summary="Update User Profile Details")
def update_user_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == current_user.id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if payload.username is not None:
            username = payload.username.strip()

            if not username:
                raise HTTPException(
                    status_code=400,
                    detail="Username cannot be empty",
                )

            existing_user = (
                db.query(User)
                .filter(
                    User.username == username,
                    User.id != current_user.id,
                )
                .first()
            )

            if existing_user:
                raise HTTPException(
                    status_code=409,
                    detail="Username is already taken",
                )

            user.username = username

        if payload.favorite_driver is not None:
            user.favorite_driver = (
                payload.favorite_driver.strip() or None
            )

        if payload.favorite_team is not None:
            user.favorite_team = (
                payload.favorite_team.strip() or None
            )

        db.commit()
        db.refresh(user)

        return {
            "message": "Profile updated successfully",
            "username": user.username,
        }
    finally:
        db.close()


@app.get("/auth/profile/season-summary", summary="Get 2026 Season Summary")
def get_profile_season_summary(
    current_user: User = Depends(get_current_active_user),
):
    db = SessionLocal()
    try:
        histories = (
            db.query(ReplayHistory)
            .filter(
                ReplayHistory.user_id == current_user.id,
                ReplayHistory.year == 2026,
            )
            .order_by(ReplayHistory.last_watched_at.desc())
            .all()
        )

        total_sessions = len(histories)

        completed_sessions = sum(
            1
            for history in histories
            if history.completed_at is not None
            or float(history.progress or 0.0) >= 0.999
        )

        unique_races = len({
            (history.year, history.round)
            for history in histories
        })

        watch_time_seconds = sum(
            float(history.duration_seconds or 0.0)
            for history in histories
        )

        completion_rate = (
            (completed_sessions / total_sessions) * 100
            if total_sessions
            else 0.0
        )

        # 2026 currently has 24 scheduled Grands Prix.
        season_progress = min(
            (unique_races / 24) * 100,
            100.0,
        )

        race_watch_times = {}

        for history in histories:
            race_key = (history.year, history.round)
            race_watch_times[race_key] = (
                race_watch_times.get(race_key, 0.0)
                + float(history.duration_seconds or 0.0)
            )

        most_watched = None

        if race_watch_times:
            race_key = max(
                race_watch_times,
                key=race_watch_times.get,
            )

            most_watched = {
                "year": race_key[0],
                "round": race_key[1],
                "watch_time_seconds": race_watch_times[race_key],
            }

        latest_replay = None

        if histories:
            latest = histories[0]

            latest_replay = {
                "year": latest.year,
                "round": latest.round,
                "session_type": latest.session_type,
                "progress": float(latest.progress or 0.0),
                "last_watched_at": latest.last_watched_at,
            }

        return {
            "year": 2026,
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "unique_races": unique_races,
            "watch_time_seconds": watch_time_seconds,
            "completion_rate": round(completion_rate, 1),
            "season_progress": round(season_progress, 1),
            "most_watched": most_watched,
            "latest_replay": latest_replay,
        }

    finally:
        db.close()


@app.get("/auth/profile/stats", summary="Get Real Profile Statistics")
def get_profile_stats(
    current_user: User = Depends(get_current_active_user),
):
    db = SessionLocal()
    try:
        histories = (
            db.query(ReplayHistory)
            .filter(ReplayHistory.user_id == current_user.id)
            .all()
        )

        replays_started = len(histories)

        replays_watched = sum(
            1
            for history in histories
            if history.completed_at is not None
            or float(history.progress or 0.0) >= 0.999
        )

        watch_time_seconds = sum(
            float(history.duration_seconds or 0.0)
            for history in histories
        )

        completion_rate = (
            (replays_watched / replays_started) * 100
            if replays_started
            else 0.0
        )

        return {
            "replays_watched": replays_watched,
            "replays_started": replays_started,
            "watch_time_seconds": watch_time_seconds,
            "completion_rate": round(completion_rate, 1),
        }
    finally:
        db.close()


@app.post("/auth/profile/avatar", summary="Upload User Avatar")
async def upload_user_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Saves uploaded avatar image to static/uploads and updates user record."""
    extension = file.filename.split(".")[-1].lower() if "." in file.filename else "png"
    if extension not in ["jpg", "jpeg", "png", "webp", "gif", "avif"]:
        raise HTTPException(status_code=400, detail="Invalid image file format")

    filename = f"avatar_user_{current_user.id}.{extension}"
    file_path = UPLOADS_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    avatar_url = f"/static/uploads/{filename}"

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if user:
            user.picture_url = avatar_url
            db.commit()
    finally:
        db.close()

    return {"message": "Avatar uploaded successfully", "picture_url": avatar_url}


# --- Settings & Extended Tier Profile ---

class UserSettingsUpdate(BaseModel):
    telemetry_preferences: Optional[str] = None
    default_driver_comp: Optional[str] = None
    units: Optional[str] = None
    theme: Optional[str] = None
    accent_color: Optional[str] = None
    notifications_enabled: Optional[bool] = None

@app.get("/auth/settings", summary="Get User Settings")
def get_user_settings(current_user: User = Depends(get_current_active_user)):
    return {
        "telemetry_preferences": getattr(current_user, "telemetry_preferences", "speed,throttle,brake"),
        "default_driver_comp": getattr(current_user, "default_driver_comp", "VER"),
        "units": getattr(current_user, "units", None) or "metric",
        "theme": getattr(current_user, "theme", "dark"),
        "accent_color": getattr(current_user, "accent_color", "#e10600"),
        "notifications_enabled": bool(getattr(current_user, "notifications_enabled", 1))
    }

@app.put("/auth/settings", summary="Update User Settings")
def update_user_settings(payload: UserSettingsUpdate, current_user: User = Depends(get_current_active_user)):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
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
            user.notifications_enabled = 1 if payload.notifications_enabled else 0
            
        db.commit()
        db.refresh(user)
        return {"message": "Settings updated successfully", "units": user.units}
    finally:
        db.close()

@app.get("/profile/extended", summary="Get Extended Tier 2 Profile Data")
def get_extended_profile(current_user: User = Depends(get_current_active_user)):
    return {
        "xp": getattr(current_user, "xp", 1250),
        "level": getattr(current_user, "level", 4),
        "next_milestone_xp": 2000,
        "circuits_visited": getattr(current_user, "circuits_visited", 12),
        "most_watched_circuit": getattr(current_user, "most_watched_circuit", "Silverstone"),
        "circuit_completion": getattr(current_user, "circuit_completion_rate", 86.0),
        "season_stats": {
            "sessions": getattr(current_user, "replays_watched", 24),
            "laps": 128,
            "watch_time": f"{getattr(current_user, 'watch_time_hours', 18.5)} hrs"
        },
        "achievements": [
            {"id": "first_lap", "name": "First Lap", "unlocked": True},
            {"id": "telemetry_eng", "name": "Telemetry Engineer", "unlocked": True},
            {"id": "hot_lap", "name": "Hot Lap Hunter", "unlocked": True},
            {"id": "race_eng", "name": "Race Engineer", "unlocked": False},
            {"id": "speed_demon", "name": "Speed Demon", "unlocked": True},
            {"id": "paddock_reg", "name": "Paddock Regular", "unlocked": True}
        ]
    }


# --- Cache Warming & Startup Tasks ---

SOURCE_FPS = 25
DATA_DIR = Path(__file__).parent / "data"

if (DATA_DIR / "drivers.json").exists():
    with open(DATA_DIR / "drivers.json", "r", encoding="utf-8") as f:
        DRIVERS = json.load(f)
else:
    DRIVERS = []

@app.on_event("startup")
async def warm_driver_stats_cache():
    current_year = datetime.date.today().year

    def _compute():
        print(f"[startup] Warming driver stats cache for {current_year} (background)...")
        warm_season_stats(current_year)
        print("[startup] Driver stats cache ready.")

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _compute)

@app.on_event("startup")
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

@app.on_event("startup")
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

@app.on_event("startup")
async def start_live_watcher():
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, run_live_watcher)


# --- Core Telemetry & Session API Endpoints ---

@app.get("/api/live/status")
def live_status():
    return live_state.snapshot()

@app.get("/api/next-session")
def next_session(year: int = Query(...)):
    try:
        result = get_next_session(year)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to find next session: {e}")
    return result or {}

@app.get("/api/schedule/{year}")
def schedule(year: int):
    try:
        weekends = get_race_weekends_by_year(year)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Couldn't load {year} schedule: {e}")

    for w in weekends:
        w["track_outline"] = get_cached_track_outline(year, w["round_number"])

    return weekends

import datetime as _dt

_HOME_OVERVIEW_CACHE: dict = {}


def _find_latest_completed_weekend():
    """Most recent race weekend whose date has already passed. Checks the
    current year first, falls back to the previous year's last round if
    the current season hasn't had a race yet (e.g. early January)."""
    today_str = str(_dt.date.today())
    year = _dt.date.today().year

    try:
        weekends = get_race_weekends_by_year(year)
    except Exception:
        weekends = []

    past = [w for w in weekends if w["date"] < today_str]

    if not past:
        year -= 1
        try:
            weekends = get_race_weekends_by_year(year)
        except Exception:
            weekends = []
        past = weekends

    if not past:
        return None

    past.sort(key=lambda w: w["date"])
    return year, past[-1]

@app.get("/api/home-overview", summary="Live homepage hero + track overview data")
def home_overview():
    found = _find_latest_completed_weekend()
    if not found:
        raise HTTPException(status_code=404, detail="No completed race weekends found")

    year, weekend = found
    round_number = weekend["round_number"]
    cache_key = (year, round_number)

    if cache_key in _HOME_OVERVIEW_CACHE:
        return _HOME_OVERVIEW_CACHE[cache_key]

    try:
        # Homepage only needs race laps/results initially.
        # Full telemetry/weather is unnecessary here and can make the
        # homepage fail when FastF1 telemetry resources are unavailable.
        session = load_session(year, round_number, "R", telemetry=False)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load latest race session: {e}")

    fastest_lap = None
    fastest_driver = None
    fastest_time_str = None
    fastest_compound = None

    try:
        if session.laps is not None and not session.laps.empty:
            fastest_lap = session.laps.pick_fastest()
    except Exception as e:
        print(f"[home-overview] fastest lap unavailable: {e}")

    if fastest_lap is not None:
        try:
            driver_row = session.get_driver(fastest_lap["DriverNumber"])
            fastest_driver = driver_row.get("FullName") or driver_row.get("Abbreviation")
        except Exception:
            fastest_driver = fastest_lap.get("Driver")

        lap_time = fastest_lap.get("LapTime")
        if lap_time is not None and not (hasattr(lap_time, "isnull") and lap_time.isnull()):
            total_seconds = lap_time.total_seconds()
            minutes = int(total_seconds // 60)
            seconds = total_seconds % 60
            fastest_time_str = f"{minutes}:{seconds:06.3f}"

        compound_val = fastest_lap.get("Compound")
        if compound_val is not None and str(compound_val) != "nan":
            fastest_compound = str(compound_val).upper()

    track_overview = {"length_km": None, "turns": None, "longest_straight_km": None, "lap_record": fastest_time_str}
    try:
        if fastest_lap is not None:
            example_lap = fastest_lap.get_telemetry()
            circuit_info = session.get_circuit_info()
            track_overview = build_track_overview(example_lap, circuit_info, fastest_time_str)
    except Exception as e:
        print(f"[home-overview] track overview computation failed: {e}")

    circuit_svg = get_circuit_svg_path(session.event.get("Location", ""))

    event_date = session.event.get("EventDate")
    result = {
        "meta": {
            "event_name": session.event.get("EventName", ""),
            "circuit_name": session.event.get("Location", ""),
            "country": session.event.get("Country", ""),
            "year": year,
            "round": round_number,
            "date": event_date.strftime("%B %d, %Y") if event_date else "",
            "circuit_svg": circuit_svg,
        },
        "fastest_lap": {
            "time": fastest_time_str,
            "driver": fastest_driver,
            "compound": fastest_compound,
        },
        "track_overview": track_overview,
    }

    _HOME_OVERVIEW_CACHE.clear()
    _HOME_OVERVIEW_CACHE[cache_key] = result
    return result

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

@app.get("/api/driver/{code}")
def get_driver(code: str):
    code = code.lower()
    for driver in DRIVERS:
        if driver.get("id") == code:
            return driver
    raise HTTPException(status_code=404, detail="Driver not found")



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




@app.get(
    "/api/replay/events",
    response_class=JSONResponse,
    summary="Replay Grand Prix Calendar",
)
def replay_events(
    year: int = Query(...),
):
    """Return Grand Prix options for the selected season."""

    try:
        weekends = get_race_weekends_by_year(year)

        events = []

        for index, weekend in enumerate(weekends, start=1):

            if hasattr(weekend, "to_dict"):
                item = weekend.to_dict()
            elif isinstance(weekend, dict):
                item = weekend
            else:
                item = {}

            round_number = (
                item.get("RoundNumber")
                or item.get("round_number")
                or item.get("round")
                or item.get("Round")
                or index
            )

            event_name = (
                item.get("EventName")
                or item.get("event_name")
                or item.get("Name")
                or f"Round {round_number}"
            )

            location = (
                item.get("Location")
                or item.get("location")
                or ""
            )

            country = (
                item.get("Country")
                or item.get("country")
                or ""
            )

            events.append({
                "name": str(event_name),
                "location": str(location),
                "country": str(country),
            })

        return {
            "year": year,
            "events": events,
        }

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load {year} Grand Prix calendar: {e}",
        )


@app.get("/api/replay", response_class=JSONResponse, summary="Race Replay")
def replay(
    year: int = Query(...),
    grand_prix: str = Query(...),
    session_type: str = Query("R", pattern="^(R|S|FP1|FP2|FP3)$"),
    fps: int = Query(8, ge=1, le=25),
):
    """
    Load a complete replay.

    This endpoint uses the same cache-first replay system as
    /api/replay/chunk.

    Priority:
        1. Memory cache
        2. computed_data replay pickle
        3. FastF1 fallback
    """

    # ============================================================
    # RESOLVE GRAND PRIX -> INTERNAL FASTF1 ROUND
    # ============================================================

    round = _replay_request_round(
        year,
        grand_prix,
    )

    # ============================================================
    # LOAD SESSION METADATA
    # ============================================================

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

    # ============================================================
    # LOAD REPLAY TELEMETRY
    # ============================================================

    cache_file = _find_local_replay_cache(
        year,
        round,
        session_type,
    )

    if cache_file is None:
        try:
            driver_count = len(session.drivers)
        except Exception:
            driver_count = 0

        try:
            result_count = len(session.results)
        except Exception:
            result_count = 0

        if driver_count == 0 or result_count == 0:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Replay telemetry is not available yet for "
                    f"{year} Round {round} {session_type}. "
                    f"FastF1 currently has no timing/driver data "
                    f"for this session."
                ),
            )

    try:
        race_telemetry = _get_cached_replay_telemetry(
            year,
            round,
            session_type,
            session,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load replay telemetry: {e}",
        )

    # ============================================================
    # OFFICIAL DRIVER RESULT STATUS
    # ============================================================
    #
    # Keep this separate from telemetry. DNS/DNF/DSQ drivers may
    # have incomplete or missing replay frames, but their official
    # race-result status is available from session.results.
    #
    try:
        driver_statuses = get_driver_statuses(session)
    except Exception as e:
        print(
            f"[Replay] Failed to build driver statuses: {e}"
        )
        driver_statuses = {}

    race_telemetry["driver_statuses"] = driver_statuses

    # ============================================================
    # TRACK
    # ============================================================

    try:
        example_lap = _get_example_lap(
            year,
            round,
            session,
        )

        track = build_track_geometry(
            example_lap
        )

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build track geometry: {e}",
        )

    # ============================================================
    # CORNERS
    # ============================================================

    try:
        circuit_info = session.get_circuit_info()

        track["corners"] = []

        if (
            circuit_info is not None
            and hasattr(circuit_info, "corners")
            and circuit_info.corners is not None
        ):
            for _, corner in circuit_info.corners.iterrows():
                corner_pos = point_at_distance(
                    example_lap,
                    float(corner["Distance"]),
                )

                track["corners"].append(
                    {
                        "number": int(corner["Number"]),
                        "letter": (
                            ""
                            if str(corner["Letter"]) == "nan"
                            else str(corner["Letter"])
                        ),
                        "angle": float(
                            corner["Angle"]
                        ),
                        "distance": float(
                            corner["Distance"]
                        ),
                        "x": _safe_float(corner_pos.get("x"), 0.0),
                        "y": _safe_float(corner_pos.get("y"), 0.0),
                    }
                )

    except Exception as e:
        print(
            "[Replay] Corner data unavailable:",
            e,
        )
        track["corners"] = []

    # ============================================================
    # SERIALIZED FRAMES
    # ============================================================

    try:
        frames = _get_cached_serialized_replay(
            year,
            round,
            session_type,
            fps,
            race_telemetry["frames"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to serialize replay: {e}",
        )

    # ============================================================
    # EVENTS
    # ============================================================

    events = extract_race_events(
        race_telemetry["frames"],
        race_telemetry["track_statuses"],
    )

    event_date = session.event.get(
        "EventDate"
    )

    return {
        "meta": {
            "event_name": session.event.get(
                "EventName",
                "",
            ),
            "circuit_name": session.event.get(
                "Location",
                "",
            ),
            "country": session.event.get(
                "Country",
                "",
            ),
            "year": year,
            "round": round,
            "date": (
                event_date.strftime(
                    "%B %d, %Y"
                )
                if event_date
                else ""
            ),
            "total_laps": race_telemetry[
                "total_laps"
            ],
            "session_type": session_type,
        },

        "driver_colors": serialize_driver_colors(
            race_telemetry[
                "driver_colors"
            ]
        ),

        "max_tyre_life": race_telemetry.get(
            "max_tyre_life",
            {},
        ),

        "track": track,

        "events": events,

        "frames": frames,

        "frame_rate": fps,

        "total_frames": len(frames),
    }


@app.get("/api/replay/chunk", response_class=JSONResponse, summary="Replay Telemetry Chunk")
def replay_chunk(
    year: int = Query(...),
    grand_prix: str = Query(...),
    session_type: str = Query("R", pattern="^(R|S|FP1|FP2|FP3)$"),
    fps: int = Query(8, ge=1, le=25),
    start: int = Query(0, ge=0),
    count: int = Query(500, ge=1, le=500),
):
    """
    Return a progressive chunk of replay telemetry.

    The first chunk also returns replay metadata, track geometry,
    events and driver colors so the frontend can render immediately.
    """

    # ============================================================
    # RESOLVE GRAND PRIX -> INTERNAL FASTF1 ROUND
    # ============================================================

    round = _replay_request_round(
        year,
        grand_prix,
    )

    # ============================================================
    # LOAD SESSION
    # ============================================================

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

    # ============================================================
    # REPLAY DATA AVAILABILITY CHECK
    # ============================================================
    #
    # A FastF1 session can exist in the calendar while its timing
    # data has not been published yet. In that situation FastF1
    # returns zero drivers/results.
    #
    # The replay builder now performs driver telemetry extraction
    # in the current process because FastF1 Session objects should
    # not be passed through multiprocessing.
    # ============================================================

    cache_file = _find_local_replay_cache(
        year,
        round,
        session_type,
    )

    if cache_file is None:
        try:
            driver_count = len(session.drivers)
        except Exception:
            driver_count = 0

        try:
            result_count = len(session.results)
        except Exception:
            result_count = 0

        if driver_count == 0 or result_count == 0:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Replay telemetry is not available yet for "
                    f"{year} Round {round} {session_type}. "
                    f"FastF1 currently has no timing/driver data "
                    f"for this session."
                ),
            )

    try:
        # Cache-first loader:
        # 1. memory cache
        # 2. local computed replay cache
        # 3. FastF1 fallback to BUILD the replay
        #
        # This allows a user to select any available
        # year / Grand Prix / session and generate the
        # replay cache automatically when it does not
        # already exist locally.
        race_telemetry = _get_cached_replay_telemetry(
            year,
            round,
            session_type,
            session,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        print(
            "[ReplayCache] FATAL replay telemetry build error:"
        )
        traceback.print_exc()

        raise HTTPException(
            status_code=502,
            detail=f"Failed to build/load replay telemetry: {e}",
        )

    # ============================================================
    # OFFICIAL DRIVER RESULT STATUS
    # ============================================================

    try:
        race_telemetry["driver_statuses"] = get_driver_statuses(session)
    except Exception as e:
        print(
            f"[Replay] Failed to build driver statuses: {e}"
        )
        race_telemetry["driver_statuses"] = {}

    all_frames = race_telemetry["frames"]

    # ============================================================
    # REPLAY FRAME ORDER VALIDATION
    # ============================================================
    # Validate the raw replay only once per telemetry cache key.
    # Do NOT scan tens of thousands of frames for every chunk.
    # ============================================================

    validation_key = _replay_cache_key(
        year,
        round,
        session_type,
    )

    validation_cache = getattr(
        replay_chunk,
        "_frame_validation_cache",
        None,
    )

    if validation_cache is None:
        validation_cache = {}
        replay_chunk._frame_validation_cache = validation_cache

    if validation_key not in validation_cache:
        previous_t = None
        bad_time_indices = []

        for idx, frame in enumerate(all_frames):
            t = frame.get("t")

            if not isinstance(t, (int, float)):
                continue

            if previous_t is not None and t < previous_t:
                bad_time_indices.append(
                    (idx - 1, previous_t, idx, t)
                )

            previous_t = t

        validation_cache[validation_key] = bad_time_indices

        if bad_time_indices:
            print(
                "[Replay] WARNING: frame time moved backwards:",
                bad_time_indices[:10],
            )
        else:
            print(
                f"[Replay] Frame order OK: {len(all_frames)} frames"
            )

    sampled_frames = _get_cached_serialized_replay(
        year,
        round,
        session_type,
        fps,
        all_frames,
    )

    total = len(sampled_frames)

    end = min(
        start + count,
        total,
    )

    response = {
        "start": start,
        "end": end,
        "total": total,
        "total_frames": total,
        "frame_rate": fps,
        "frames": sampled_frames[start:end],
    }

    # Only send large/static metadata with the first chunk.
    if start == 0:
        try:
            example_lap = _get_example_lap(
                year,
                round,
                session,
            )

            track = build_track_geometry(example_lap)

            circuit_info = session.get_circuit_info()

            track["corners"] = []

            if (
                circuit_info is not None
                and hasattr(circuit_info, "corners")
                and circuit_info.corners is not None
            ):
                for _, corner in circuit_info.corners.iterrows():
                    corner_pos = point_at_distance(
                        example_lap,
                        float(corner["Distance"]),
                    )

                    track["corners"].append(
                        {
                            "number": int(corner["Number"]),
                            "letter": (
                                ""
                                if str(corner["Letter"]) == "nan"
                                else str(corner["Letter"])
                            ),
                            "angle": _safe_float(corner["Angle"], 0.0),
                            "distance": _safe_float(corner["Distance"], 0.0),
                            "x": _safe_float(corner_pos.get("x"), 0.0),
                            "y": _safe_float(corner_pos.get("y"), 0.0),
                        }
                    )

        except Exception as e:
            print("Corner data unavailable:", e)

            track = build_track_geometry(example_lap)
            track["corners"] = []

        event_date = session.event.get("EventDate")

        response["meta"] = {
            "event_name": session.event.get(
                "EventName",
                "",
            ),
            "circuit_name": session.event.get(
                "Location",
                "",
            ),
            "country": session.event.get(
                "Country",
                "",
            ),
            "year": year,
            "round": round,
            "date": (
                event_date.strftime("%B %d, %Y")
                if event_date
                else ""
            ),
            "total_laps": race_telemetry["total_laps"],
            "session_type": session_type,
        }

        response["driver_colors"] = (
            serialize_driver_colors(
                race_telemetry["driver_colors"]
            )
        )

        response["driver_statuses"] = (
            race_telemetry.get(
                "driver_statuses",
                {}
            )
        )

        response["max_tyre_life"] = (
            race_telemetry.get(
                "max_tyre_life",
                {},
            )
        )

        response["track"] = track

        response["events"] = extract_race_events(
            race_telemetry["frames"],
            race_telemetry["track_statuses"],
        )

    response = _sanitize_replay_json(response)

    return response


@app.get("/api/quali", summary="Qualifying Results")
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

@app.get("/api/strategy", summary="Tyre Strategy")
def strategy(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("R", pattern="^(R|S)$"),
):
    try:
        session = load_session(year, round, session_type, telemetry=False)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load session: {e}")

    try:
        strategy_data = get_tyre_strategy(session)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to build tyre strategy: {e}")

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
        "total_laps": strategy_data["total_laps"],
        "total_pit_stops": strategy_data["total_pit_stops"],
        "drivers": strategy_data["drivers"],
    }

@app.get("/api/drivers", summary="Session Driver List")
def drivers_list(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("R", pattern="^(R|S|Q|SQ|FP1|FP2|FP3)$"),
):
    try:
        session = load_session(year, round, session_type, telemetry=False)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load session: {e}")

    try:
        return get_session_drivers(session)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to list drivers: {e}")

@app.get("/api/drivers/panel", summary="Driver Panel")
def drivers_panel(year: int = Query(...), round: Optional[int] = Query(None, alias="round")):
    try:
        return build_driver_panel(year, DRIVERS, round_=round)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Couldn't reach Jolpica API: {e}")

@app.get("/api/analytics", summary="Season Analytics")
def analytics(
    year: int = Query(...),
    round: Optional[int] = Query(None, alias="round"),
):
    try:
        return build_analytics(
            year,
            DRIVERS,
            round_=round,
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't reach Jolpica API: {e}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build analytics: {e}",
        )
    
    
@app.get("/api/constructors/panel", summary="Constructors Panel")
def constructors_panel(year: int = Query(...), round: Optional[int] = Query(None, alias="round")):
    try:
        driver_data = build_driver_panel(year, DRIVERS, round_=round)
        return build_constructors_panel(year, driver_data, round_=round)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Couldn't reach Jolpica API: {e}")

@app.get("/api/telemetry/compare", summary="Driver Telemetry Comparison")
def telemetry_compare(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("R", pattern="^(R|S|Q|SQ|FP1|FP2|FP3)$"),
    driver_a: str = Query(...),
    driver_b: str = Query(...),
    lap_a: Optional[int] = Query(None),
    lap_b: Optional[int] = Query(None),
):
    try:
        session = load_session(year, round, session_type, telemetry=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load session: {e}")

    try:
        data_a = get_driver_lap_telemetry(session, driver_a, lap_a)
        data_b = get_driver_lap_telemetry(session, driver_b, lap_b)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to build telemetry comparison: {e}")

    event_date = session.event.get("EventDate")
    return {
        "meta": {
            "event_name": session.event.get("EventName", ""),
            "year": year,
            "round": round,
            "date": event_date.strftime("%B %d, %Y") if event_date else "",
            "session_type": session_type,
        },
        "driver_a": data_a,
        "driver_b": data_b,
    }

@app.get("/api/race-control", summary="Race Control Messages")
def race_control(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("R", pattern="^(R|S|Q|SQ|FP1|FP2|FP3)$"),
):
    try:
        rows = build_race_control_feed(year, round, session_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load race control messages: {e}")
    return {"messages": rows}



@app.get("/api/minisectors", summary="Minisectors")
def minisectors(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("R", pattern="^(R|S|Q|SQ|FP1|FP2|FP3)$"),
):
    try:
        data = build_minisectors(year, round, session_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to build minisectors: {e}")
    return data

@app.get("/api/track-outline/{year}/{round}", summary="Track Outline")
def track_outline(year: int, round: int):
    try:
        return get_track_outline(year, round)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to build track outline: {e}")

@app.get("/api/track-map/{year}/{gp}/{session_type}/{driver_code}")
def track_map(year: int, gp: str, session_type: str, driver_code: str):
    try:
        return get_track_map_with_telemetry(year, gp, session_type, driver_code)
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/timing-tower", summary="Timing Tower")
def timing_tower(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("R", pattern="^(R|S|Q|SQ|FP1|FP2|FP3)$"),
):
    if live_state.matches(year, round, session_type):
        snap = live_state.snapshot()
        return {
            "meta": {
                "event_name": snap["meta"].get("event_name", ""),
                "circuit_name": "",
                "country": snap["meta"].get("country", ""),
                "year": year,
                "round": round,
                "date": "",
                "session_type": session_type,
            },
            "rows": snap["rows"],
            "is_live": True,
        }

    try:
        session = load_session(year, round, session_type, telemetry=False)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load session: {e}")

    try:
        rows = build_timing_tower(session)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to build timing tower: {e}")

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
        "rows": rows,
        "is_live": False,
    }


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

@app.get("/api/drivers/{code}/full", summary="Full Driver Detail Page Data")
def driver_full(code: str, year: int = Query(default=None)):
    season = year or datetime.date.today().year
    try:
        data = build_driver_full(code.upper(), season, DRIVERS)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Couldn't reach Jolpica API: {e}")
    if not data:
        raise HTTPException(status_code=404, detail="Driver not found")
    return data


@app.on_event("startup")
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

@app.get("/auth/achievements")
def get_achievements(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    histories = (
        db.query(ReplayHistory)
        .filter(ReplayHistory.user_id == current_user.id)
        .all()
    )

    def is_completed(history):
        return (
            history.completed_at is not None
            or float(history.progress or 0.0) >= 0.999
        )

    completed = [
        history
        for history in histories
        if is_completed(history)
    ]

    distinct_races = {
        (history.year, history.round)
        for history in histories
    }

    race_session_types = {}

    for history in histories:
        race_key = (history.year, history.round)

        race_session_types.setdefault(
            race_key,
            set(),
        ).add(history.session_type)

    race_weekends = sum(
        1
        for session_types in race_session_types.values()
        if len(session_types) >= 2
    )

    watch_time_seconds = sum(
        float(history.duration_seconds or 0.0)
        for history in histories
    )

    achievements = [
        {
            "key": "first_replay",
            "title": "FIRST REPLAY",
            "description": "Start your first replay session.",
            "icon": "play",
            "progress": min(len(histories), 1),
            "target": 1,
            "unlocked": len(histories) >= 1,
            "progress_label": f"{min(len(histories), 1)} / 1",
        },
        {
            "key": "first_finish",
            "title": "FIRST FINISH",
            "description": "Complete your first replay from start to finish.",
            "icon": "trophy",
            "progress": min(len(completed), 1),
            "target": 1,
            "unlocked": len(completed) >= 1,
            "progress_label": f"{min(len(completed), 1)} / 1",
        },
        {
            "key": "three_finishes",
            "title": "THREE FINISHES",
            "description": "Complete three replay sessions.",
            "icon": "medal",
            "progress": min(len(completed), 3),
            "target": 3,
            "unlocked": len(completed) >= 3,
            "progress_label": f"{min(len(completed), 3)} / 3",
        },
        {
            "key": "race_explorer",
            "title": "RACE EXPLORER",
            "description": "Watch five different races.",
            "icon": "flag",
            "progress": min(len(distinct_races), 5),
            "target": 5,
            "unlocked": len(distinct_races) >= 5,
            "progress_label": f"{min(len(distinct_races), 5)} / 5",
        },
        {
            "key": "time_served",
            "title": "TIME SERVED",
            "description": "Spend one hour watching F1 replays.",
            "icon": "clock",
            "progress": min(watch_time_seconds, 3600),
            "target": 3600,
            "unlocked": watch_time_seconds >= 3600,
            "progress_label": (
                f"{int(min(watch_time_seconds, 3600) // 60)} / 60 min"
            ),
        },
        {
            "key": "replay_addict",
            "title": "REPLAY ADDICT",
            "description": "Spend five hours watching F1 replays.",
            "icon": "flame",
            "progress": min(watch_time_seconds, 18000),
            "target": 18000,
            "unlocked": watch_time_seconds >= 18000,
            "progress_label": (
                f"{int(min(watch_time_seconds, 18000) // 60)} / 300 min"
            ),
        },
        {
            "key": "race_weekend",
            "title": "RACE WEEKEND",
            "description": "Watch at least two session types from one race weekend.",
            "icon": "calendar",
            "progress": min(race_weekends, 1),
            "target": 1,
            "unlocked": race_weekends >= 1,
            "progress_label": f"{min(race_weekends, 1)} / 1",
        },
        {
            "key": "completionist",
            "title": "COMPLETIONIST",
            "description": "Complete ten replay sessions.",
            "icon": "crown",
            "progress": min(len(completed), 10),
            "target": 10,
            "unlocked": len(completed) >= 10,
            "progress_label": f"{min(len(completed), 10)} / 10",
        },
    ]

    return achievements


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

    # Existing static files should be handled by /static.
    if path.startswith("static/"):
        raise HTTPException(status_code=404, detail="Static file not found")

    # Vite assets should be handled by /assets.
    if path.startswith("assets/"):
        raise HTTPException(status_code=404, detail="Vite asset not found")

    index_file = DIST_DIR / "index.html"

    if not index_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Vite build not found. Run `npm run build` inside frontend/."
        )

    return FileResponse(index_file)
