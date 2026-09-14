import pickle
from pathlib import Path

from src.domain.f1_data import load_session, get_race_telemetry
from src.domain.serialize import serialize_replay_frames


SOURCE_FPS = 25

_REPLAY_TELEMETRY_CACHE = {}
_REPLAY_SERIALIZED_CACHE = {}


def _find_local_replay_cache(year, round_number, session_type="R"):
    """
    Find an existing computed replay telemetry pickle without
    contacting FastF1 for telemetry.
    """
    computed_dir = (
        Path(__file__).resolve().parent.parent.parent
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

    candidates.sort(
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )

    selected = candidates[0]

    print(
        f"[ReplayCache] LOCAL HIT: {selected.name}"
    )

    return selected


def replay_cache_key(year, round_number, session_type):
    return (
        int(year),
        int(round_number),
        str(session_type),
    )


def get_cached_replay_telemetry(
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
    """

    key = replay_cache_key(
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


def get_cached_serialized_replay(
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
