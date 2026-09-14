from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from src.domain.f1_data import (
    get_race_weekends_by_year,
    load_session,
    get_driver_statuses,
)
from src.domain.track_geometry import (
    build_track_geometry,
    extract_race_events,
    point_at_distance,
)
from src.domain.serialize import serialize_driver_colors

from src.services.replay import (
    _find_local_replay_cache,
    replay_cache_key,
    get_cached_replay_telemetry,
    get_cached_serialized_replay,
)


router = APIRouter(
    prefix="/api",
    tags=["Replay"],
)


# ============================================================================
# Replay Grand Prix resolver
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
    Resolve a frontend Grand Prix name to the internal FastF1 round number.
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
    resolved_round = _resolve_replay_round(
        year,
        grand_prix,
    )

    print(
        f"[Replay] {year} '{grand_prix}' "
        f"-> backend round {resolved_round}"
    )

    return resolved_round


# ============================================================================
# Temporary replay-local helpers
# ============================================================================
# These are intentionally kept here for this migration step.
# We will consolidate them after the router is verified.
# ============================================================================

def get_example_lap(year: int, round_number: int, race_session):
    try:
        quali_session = load_session(
            year,
            round_number,
            "Q",
        )

        if (
            quali_session is not None
            and len(quali_session.laps) > 0
        ):
            fastest_quali = quali_session.laps.pick_fastest()

            if fastest_quali is not None:
                quali_telemetry = fastest_quali.get_telemetry()

                if "DRS" in quali_telemetry.columns:
                    return quali_telemetry

    except Exception as e:
        print(
            f"Could not load qualifying session "
            f"for track layout: {e}"
        )

    fastest_lap = race_session.laps.pick_fastest()

    if fastest_lap is None:
        raise HTTPException(
            status_code=502,
            detail="No valid laps found in session",
        )

    return fastest_lap.get_telemetry()


def safe_float(value, default=None):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return default

    import math

    if not math.isfinite(value):
        return default

    return value


def sanitize_replay_json(value):
    import math

    if isinstance(value, dict):
        return {
            key: sanitize_replay_json(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            sanitize_replay_json(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return [
            sanitize_replay_json(item)
            for item in value
        ]

    if isinstance(value, float):
        if not math.isfinite(value):
            return None

        return value

    return value


@router.get(
    "/replay/events",
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


@router.get("/replay", response_class=JSONResponse, summary="Race Replay")
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
        race_telemetry = get_cached_replay_telemetry(
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
        example_lap = get_example_lap(
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
                corner_distance = safe_float(
                    corner["Distance"],
                    0.0,
                )

                corner_pos = point_at_distance(
                    example_lap,
                    corner_distance,
                )

                track["corners"].append(
                    {
                        "number": int(corner["Number"]),
                        "letter": (
                            ""
                            if str(corner["Letter"]) == "nan"
                            else str(corner["Letter"])
                        ),
                        "angle": safe_float(
                            corner["Angle"],
                            0.0,
                        ),
                        "distance": safe_float(
                            corner["Distance"],
                            0.0,
                        ),
                        "x": safe_float(corner_pos.get("x"), 0.0),
                        "y": safe_float(corner_pos.get("y"), 0.0),
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
        frames = get_cached_serialized_replay(
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


@router.get("/replay/chunk", response_class=JSONResponse, summary="Replay Telemetry Chunk")
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
        race_telemetry = get_cached_replay_telemetry(
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

    validation_key = replay_cache_key(
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

    sampled_frames = get_cached_serialized_replay(
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
            example_lap = get_example_lap(
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
                            "angle": safe_float(corner["Angle"], 0.0),
                            "distance": safe_float(corner["Distance"], 0.0),
                            "x": safe_float(corner_pos.get("x"), 0.0),
                            "y": safe_float(corner_pos.get("y"), 0.0),
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

    response = sanitize_replay_json(response)

    return response


