from pathlib import Path
import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
import requests

from src.domain.analytics import build_analytics


router = APIRouter(prefix="/api", tags=["Analytics"])


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


@router.get("/analytics", summary="Season Analytics")
def analytics(
    year: int = Query(...),
    round: Optional[int] = Query(None, alias="round"),
):
    drivers = _load_drivers()

    try:
        return build_analytics(
            year,
            drivers,
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
