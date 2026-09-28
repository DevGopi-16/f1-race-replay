import datetime

from fastapi import APIRouter, HTTPException, Query

from src.domain.driver_panel import (
    build_driver_panel,
    build_driver_full,
    get_head_to_head_record,
    _safe_int,
)
from src.api.drivers import _load_drivers  # see note below

router = APIRouter(prefix="/api", tags=["Head to Head"])


@router.get("/head-to-head", summary="Head-to-Head Comparison")
def head_to_head(
    driver_a: str = Query(..., alias="driverA"),
    driver_b: str = Query(..., alias="driverB"),
    year: int = Query(default_factory=lambda: datetime.date.today().year),
):
    if driver_a.lower() == driver_b.lower():
        raise HTTPException(
            status_code=400,
            detail="driverA and driverB must be different drivers.",
        )

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
        full_a = build_driver_full(code_a, year, static_drivers)
        full_b = build_driver_full(code_b, year, static_drivers)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to build driver profiles: {e}",
        )

    if not full_a or not full_b:
        raise HTTPException(
            status_code=404,
            detail="Could not build a full profile for one or both drivers.",
        )

    career_alltime_a = full_a.get("career_alltime", {})
    career_alltime_b = full_b.get("career_alltime", {})

    debut_a = _safe_int(full_a.get("debut")) or year
    debut_b = _safe_int(full_b.get("debut")) or year
    start_year = min(debut_a, debut_b, year)

    try:
        h2h_record = get_head_to_head_record(code_a, code_b, start_year, year)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to compute head-to-head record: {e}",
        )

    performance_a = full_a.get("performance_index", {})
    performance_b = full_b.get("performance_index", {})
    circuit_dna_a = full_a.get("circuit_dna", {})
    circuit_dna_b = full_b.get("circuit_dna", {})

    return {
        "driverA": full_a,
        "driverB": full_b,
        "careerStats": {
            "driverA": career_alltime_a,
            "driverB": career_alltime_b,
            # TODO: career_alltime has no total championship points field yet.
            # Add one to get_alltime_career_stats if "career points" is needed
            # on the frontend (careerRecords currently shows 5209.5 pts etc.
            # from mock data — that field doesn't exist in the backend yet).
        },
        "headToHeadRecord": h2h_record,
        "driverDna": {
            "driverA": {
                "performanceIndex": performance_a,
                "bestCircuit": circuit_dna_a.get("best"),
                "weakestCircuit": circuit_dna_a.get("weakest"),
            },
            "driverB": {
                "performanceIndex": performance_b,
                "bestCircuit": circuit_dna_b.get("best"),
                "weakestCircuit": circuit_dna_b.get("weakest"),
            },
        },
        "relativePerformance": {
            "driverA": full_a.get("teammate_battle"),
            "driverB": full_b.get("teammate_battle"),
            # Each driver is compared to their own current teammate, not to
            # each other — there's no shared-team data for A vs B unless
            # they're teammates this season. teammate_battle will be null
            # for a driver with no current teammate match.
        },
        "allTimeRankings": {
            "driverA": career_alltime_a,
            "driverB": career_alltime_b,
        },
        "careerTrajectory": {
            "driverA": full_a.get("season_journey"),
            "driverB": full_b.get("season_journey"),
        },
    }