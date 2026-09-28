import json
from pathlib import Path

import requests
from fastapi import APIRouter, HTTPException, Query

from src.domain.driver_panel import build_driver_full


router = APIRouter(prefix="/api", tags=["Driver Detail"])


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DRIVERS_FILE = DATA_DIR / "drivers.json"


def _load_drivers():
    if not DRIVERS_FILE.exists():
        return []

    try:
        with open(DRIVERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return []


@router.get("/driver/{code}")
def get_driver(code: str):
    code = code.lower()

    for driver in _load_drivers():
        if driver.get("id") == code:
            return driver

    raise HTTPException(status_code=404, detail="Driver not found")


@router.get(
    "/drivers/{code}/full",
    summary="Full Driver Detail Page Data",
)
def driver_full(code: str, year: int = Query(default=None)):
    import datetime

    season = year or datetime.date.today().year
    drivers = _load_drivers()

    try:
        data = build_driver_full(
            code.upper(),
            season,
            drivers,
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't reach Jolpica API: {e}",
        )

    if not data:
        raise HTTPException(
            status_code=404,
            detail="Driver not found",
        )

    return data
