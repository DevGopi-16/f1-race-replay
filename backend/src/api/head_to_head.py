import datetime

from fastapi import APIRouter, HTTPException, Query

from src.domain.driver_panel import build_driver_panel, build_driver_full
from src.api.drivers import _load_drivers  # see note below

router = APIRouter(prefix="/api", tags=["Head to Head"])


@router.get("/head-to-head", summary="Head-to-Head Comparison")
def head_to_head(
    driver_a: str = Query(..., alias="driverA"),
    driver_b: str = Query(..., alias="driverB"),
    year: int = Query(default_factory=lambda: datetime.date.today().year),
):
    static_drivers = _load_drivers()

    try:
        panel = build_driver_panel(year, static_drivers)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load driver panel: {e}",
        )

    def resolve_code(driver_id: str) -> str:
        entry = next(
            (
                d
                for d in panel
                if str(d.get("driverId", "")).lower() == driver_id.lower()
            ),
            None,
        )
        if not entry:
            raise HTTPException(
                status_code=404,
                detail=f"Driver '{driver_id}' not found in {year} standings",
            )
        return entry["code"]

    code_a = resolve_code(driver_a)
    code_b = resolve_code(driver_b)

    try:
        return {
            "driverA": build_driver_full(code_a, year, static_drivers),
            "driverB": build_driver_full(code_b, year, static_drivers),
        }
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build head-to-head comparison: {e}",
        )