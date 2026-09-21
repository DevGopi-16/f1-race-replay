import json
import time
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.encoders import jsonable_encoder

from src.domain.f1_data import get_race_weekends_by_year
from src.domain.next_session import get_next_session


router = APIRouter(prefix="/api", tags=["Schedule"])

MIN_YEAR = 1950
CURRENT_YEAR_TTL = 60 * 60  # seconds; current season can change

# backend/cache/schedules/<year>.json
CACHE_DIR = Path(__file__).resolve().parents[2] / "cache" / "schedules"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

_memory: dict[int, tuple[float, object]] = {}


def _is_fresh(year: int, saved_at: float) -> bool:
    # Finished seasons never change, so they never expire.
    if year < datetime.now().year:
        return True
    return (time.time() - saved_at) < CURRENT_YEAR_TTL


def _read_cache(year: int):
    if year in _memory:
        saved_at, data = _memory[year]
        if _is_fresh(year, saved_at):
            return data

    path = CACHE_DIR / f"{year}.json"
    if path.exists():
        try:
            saved_at = path.stat().st_mtime
            if _is_fresh(year, saved_at):
                data = json.loads(path.read_text())
                _memory[year] = (saved_at, data)
                return data
        except Exception:
            pass  # corrupt file, refetch
    return None


def _write_cache(year: int, data) -> None:
    payload = jsonable_encoder(data)
    _memory[year] = (time.time(), payload)
    try:
        (CACHE_DIR / f"{year}.json").write_text(json.dumps(payload))
    except Exception:
        pass  # cache failure should never break the request


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
    max_year = datetime.now().year + 1
    if not (MIN_YEAR <= year <= max_year):
        raise HTTPException(
            status_code=400,
            detail=f"Year must be between {MIN_YEAR} and {max_year}",
        )

    cached = _read_cache(year)
    if cached is not None:
        return cached

    try:
        weekends = get_race_weekends_by_year(year)
    except Exception as e:
        msg = str(e)
        if "calls/h" in msg or "rate" in msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Upstream F1 data API rate limit reached. Try again later.",
            )
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't load {year} schedule: {e}",
        )

    if weekends:  # never cache empty results
        _write_cache(year, weekends)

    return weekends