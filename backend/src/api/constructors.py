from pathlib import Path
import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
import requests

from src.domain.driver_panel import build_driver_panel
from src.domain.constructors_panel import build_constructors_panel


router = APIRouter(prefix="/api", tags=["Constructors"])


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


@router.get("/constructors/panel", summary="Constructors Panel")
def constructors_panel(
    year: int = Query(...),
    round: Optional[int] = Query(None, alias="round"),
):
    drivers = _load_drivers()

    try:
        driver_data = build_driver_panel(
            year,
            drivers,
            round_=round,
        )

        return build_constructors_panel(
            year,
            driver_data,
            round_=round,
        )

    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't reach Jolpica API: {e}",
        )
