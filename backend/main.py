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
    get_driver_lap_telemetry,
)
from src.driver_panel import build_driver_panel, get_season_stats_cached, warm_season_stats
from src.constructors_panel import build_constructors_panel, warm_constructor_history
from src.next_session import get_next_session
from src.serialize import serialize_frames, serialize_replay_frames, serialize_driver_colors

# --- Auth (Racer PRO signup/login) ---
from src.auth.routes import router as auth_router, get_current_active_user
from src.auth.database import Base, engine, SessionLocal
from src.auth.models import User
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
    session,
):
    key = _replay_cache_key(
        year,
        round_number,
        session_type,
    )

    cached = _REPLAY_TELEMETRY_CACHE.get(key)

    if cached is not None:
        return cached

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
def get_user_profile(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "picture_url": getattr(current_user, "picture_url", None),
        "is_pro": getattr(current_user, "is_pro", True),
        "favorite_driver": getattr(current_user, "favorite_driver", "Lewis Hamilton"),
        "favorite_team": getattr(current_user, "favorite_team", "Scuderia Ferrari"),
        "replays_watched": getattr(current_user, "replays_watched", 24),
    }

@app.put("/auth/profile", summary="Update User Profile Details")
def update_user_profile(payload: UserProfileUpdate, current_user: User = Depends(get_current_active_user)):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if payload.username:
            user.username = payload.username
        if payload.favorite_driver:
            user.favorite_driver = payload.favorite_driver
        if payload.favorite_team:
            user.favorite_team = payload.favorite_team
        
        db.commit()
        db.refresh(user)
        return {"message": "Profile updated successfully", "username": user.username}
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

    past = [w for w in weekends if w["date"] <= today_str]

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
        session = load_session(year, round_number, "R", telemetry=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load latest race session: {e}")

    fastest_lap = session.laps.pick_fastest()
    fastest_driver = None
    fastest_time_str = None
    fastest_compound = None

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

@app.get("/api/replay", response_class=JSONResponse, summary="Race Replay")
def replay(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
    session_type: str = Query("R", pattern="^(R|S|FP1|FP2|FP3)$"),
    fps: int = Query(8, ge=1, le=25),
):
    try:
        session = load_session(year, round, session_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load session: {e}")

    try:
        race_telemetry = get_race_telemetry(session, session_type=session_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to build telemetry: {e}")

    example_lap = _get_example_lap(year, round, session)
    track = build_track_geometry(example_lap)

    try:
        circuit_info = session.get_circuit_info()
        track["corners"] = []
        if circuit_info is not None and hasattr(circuit_info, "corners") and circuit_info.corners is not None:
            for _, corner in circuit_info.corners.iterrows():
                corner_pos = point_at_distance(example_lap, float(corner["Distance"]))
                track["corners"].append(
                    {
                        "number": int(corner["Number"]),
                        "letter": "" if str(corner["Letter"]) == "nan" else str(corner["Letter"]),
                        "angle": float(corner["Angle"]),
                        "distance": float(corner["Distance"]),
                        "x": corner_pos["x"],
                        "y": corner_pos["y"],
                    }
                )
    except Exception as e:
        print("Corner data unavailable:", e)
        track["corners"] = []

    events = extract_race_events(race_telemetry["frames"], race_telemetry["track_statuses"])
    frames = serialize_replay_frames(race_telemetry["frames"], source_fps=SOURCE_FPS, target_fps=fps)
    event_date = session.event.get("EventDate")

    return {
        "meta": {
            "event_name": session.event.get("EventName", ""),
            "circuit_name": session.event.get("Location", ""),
            "country": session.event.get("Country", ""),
            "year": year,
            "round": round,
            "date": event_date.strftime("%B %d, %Y") if event_date else "",
            "total_laps": race_telemetry["total_laps"],
            "session_type": session_type,
        },
        "driver_colors": serialize_driver_colors(race_telemetry["driver_colors"]),
        "max_tyre_life": race_telemetry.get("max_tyre_life", {}),
        "track": track,
        "events": events,
        "frames": frames,
        "frame_rate": fps,
    }


@app.get("/api/replay/chunk", response_class=JSONResponse, summary="Replay Telemetry Chunk")
def replay_chunk(
    year: int = Query(...),
    round: int = Query(..., alias="round"),
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

    try:
        session = load_session(year, round, session_type)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load session: {e}",
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
            detail=f"Failed to build telemetry: {e}",
        )

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
                            "angle": float(corner["Angle"]),
                            "distance": float(corner["Distance"]),
                            "x": corner_pos["x"],
                            "y": corner_pos["y"],
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