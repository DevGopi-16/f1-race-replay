"""
Session detail + circuit legends.

Data source: Jolpica (Ergast-compatible), the same JOLPICA_BASE already used
in driver_panel.py. Everything is cached on disk under backend/cache/ so the
500 calls/hour limit is only spent once per race / circuit.

Cost of an uncached request:
  /api/session-detail   ~3 calls (results, qualifying, [sprint]) + 1 per new circuit
  /api/circuit-legends  4 calls, once per circuit (refreshed weekly)
"""

import json
import re
import time
from collections import Counter
from datetime import date, datetime
from pathlib import Path

import pandas as pd
import requests
from fastapi import APIRouter, HTTPException, Query

from src.domain.driver_panel import JOLPICA_BASE


router = APIRouter(prefix="/api", tags=["Session Detail"])

# backend/cache/session_detail/
CACHE_DIR = Path(__file__).resolve().parents[2] / "cache" / "session_detail"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

LIVE_TTL = 10 * 60              # unfinished / empty race: re-check every 10 min
CIRCUIT_YEARS_TTL = 24 * 3600   # which seasons a circuit hosted
LEGENDS_TTL = 7 * 24 * 3600     # all-time records

QUALI_FIRST_YEAR = 1994         # Jolpica has qualifying from 1994


class UpstreamRateLimit(Exception):
    pass


# ---------------------------------------------------------------- cache ---

def _path(name: str) -> Path:
    return CACHE_DIR / f"{name}.json"


def _load(name: str):
    path = _path(name)
    if not path.exists():
        return None
    try:
        raw = json.loads(path.read_text())
        raw["_age"] = time.time() - path.stat().st_mtime
        return raw
    except Exception:
        return None


def _save(name: str, data, final: bool = True) -> None:
    try:
        _path(name).write_text(json.dumps({"final": final, "data": data}))
    except Exception:
        pass  # cache problems must never break a request


def _fresh(raw, ttl: int) -> bool:
    return bool(raw) and (raw.get("final") or raw["_age"] < ttl)


# -------------------------------------------------------------- jolpica ---

def _jolpica(path: str, **params) -> dict:
    params.setdefault("limit", 100)
    response = requests.get(
        f"{JOLPICA_BASE}/{path}.json",
        params=params,
        timeout=15,
    )
    if response.status_code == 429:
        raise UpstreamRateLimit()
    response.raise_for_status()
    return response.json().get("MRData", {})


def _races(path: str) -> list[dict]:
    return _jolpica(path).get("RaceTable", {}).get("Races", [])


# -------------------------------------------------------------- helpers ---

def _driver(d: dict) -> dict:
    return {
        "id": d.get("driverId", ""),
        "code": (d.get("code") or d.get("familyName", "").replace(" ", "")[:3].upper()).strip(),
        "name": f"{d.get('givenName', '')} {d.get('familyName', '')}".strip(),
    }


def _number(value):
    try:
        n = float(value)
        return int(n) if n.is_integer() else n
    except (TypeError, ValueError):
        return None


def _race_rows(results: list[dict]) -> list[dict]:
    rows = []
    for r in results:
        finished = str(r.get("positionText", "")).isdigit()
        lap_time = (r.get("Time") or {}).get("time")

        if r.get("position") == "1":
            gap = "—"
        elif finished and lap_time:
            gap = lap_time
        else:
            gap = r.get("status", "")

        grid = _number(r.get("grid"))

        rows.append({
            "position": int(r["position"]) if finished else None,
            **_driver(r["Driver"]),
            "team": r.get("Constructor", {}).get("name", ""),
            "grid": grid if grid else None,  # 0 = pit lane start
            "gap": gap,
            "points": _number(r.get("points")) or 0,
            "fastest_lap": (r.get("FastestLap") or {}).get("rank") == "1",
        })
    return rows


def _quali_rows(results: list[dict]) -> list[dict]:
    return [
        {
            "position": _number(r.get("position")),
            **_driver(r["Driver"]),
            "team": r.get("Constructor", {}).get("name", ""),
            "q1": r.get("Q1") or None,
            "q2": r.get("Q2") or None,
            "q3": r.get("Q3") or None,
        }
        for r in results
    ]


def _circuit_races(circuit_id: str) -> list[dict]:
    """Every (year, round) this circuit hosted a race, newest first."""
    name = f"circuit_races_{circuit_id}"
    raw = _load(name)
    if _fresh(raw, CIRCUIT_YEARS_TTL):
        return raw["data"]

    races = sorted(
        (
            {"year": int(r["season"]), "round": int(r["round"])}
            for r in _races(f"circuits/{circuit_id}/races")
        ),
        key=lambda r: r["year"],
        reverse=True,
    )
    if races:
        _save(name, races, final=False)
    return races


def _http_error(e: Exception) -> HTTPException:
    if isinstance(e, UpstreamRateLimit):
        return HTTPException(
            status_code=429,
            detail="Jolpica rate limit reached. Try again later.",
        )
    return HTTPException(
        status_code=502,
        detail=f"Couldn't reach Jolpica API: {e}",
    )


# --------------------------------------------- sprint qualifying (FastF1) ---

def _fmt_lap(value) -> str | None:
    """Timedelta -> '1:31.234' (None if missing)."""
    try:
        if pd.isna(value):
            return None
        total = value.total_seconds()
    except Exception:
        return None
    minutes = int(total // 60)
    return f"{minutes}:{total - minutes * 60:06.3f}"


def _best_lap(segment, abbr):
    """Fastest valid lap of one driver inside a qualifying segment (or None)."""
    if segment is None or len(segment) == 0:
        return None
    mine = segment[segment["Driver"] == abbr]
    if "Deleted" in mine.columns:
        mine = mine[mine["Deleted"] != True]  # noqa: E712  (deleted = track limits)
    times = mine["LapTime"].dropna()
    return times.min() if len(times) else None


def _quali_rows_from_laps(session) -> list[dict]:
    """
    FastF1 has no official results for sprint qualifying, so rebuild the
    classification from lap times: Q3 order, then Q2 leftovers, then Q1.
    """
    try:
        segments = list(session.laps.split_qualifying_sessions())
    except Exception:
        segments = [session.laps]
    q1s, q2s, q3s = (segments + [None, None, None])[:3]

    entries = []
    for _, r in session.results.iterrows():
        abbr = r.get("Abbreviation")
        t1, t2, t3 = _best_lap(q1s, abbr), _best_lap(q2s, abbr), _best_lap(q3s, abbr)

        if t3 is not None:
            stage, ref = 0, t3
        elif t2 is not None:
            stage, ref = 1, t2
        elif t1 is not None:
            stage, ref = 2, t1
        else:
            stage, ref = 3, None

        driver_id = r.get("DriverId")
        if not isinstance(driver_id, str) or not driver_id:
            driver_id = str(r.get("LastName", "")).lower().replace(" ", "_")

        entries.append((
            (stage, ref.total_seconds() if ref is not None else 0.0),
            {
                "position": None,
                "id": driver_id,
                "code": abbr if isinstance(abbr, str) else "",
                "name": r.get("FullName") if isinstance(r.get("FullName"), str) else "",
                "team": r.get("TeamName") if isinstance(r.get("TeamName"), str) else "",
                "q1": _fmt_lap(t1),
                "q2": _fmt_lap(t2),
                "q3": _fmt_lap(t3),
                "_has_time": ref is not None,
            },
        ))

    entries.sort(key=lambda e: e[0])

    rows = []
    place = 1
    for _, row in entries:
        if row.pop("_has_time"):
            row["position"] = place
            place += 1
        rows.append(row)
    return rows


def _sprint_quali_rows(year: int, round_: int) -> list[dict]:
    """
    Sprint Shootout (2023) / Sprint Qualifying (2024+) results via FastF1.
    Slow the first time (FastF1 downloads the timing data), cached afterwards.
    Raises if the session can't be loaded so the caller can retry later.
    """
    import fastf1
    from src.domain.f1_data import enable_cache

    enable_cache()

    identifiers = ["SS", "SQ"] if year == 2023 else ["SQ", "SS"]
    session = None
    last_error: Exception | None = None

    for ident in identifiers:
        try:
            candidate = fastf1.get_session(year, round_, ident)
            # laps + messages are needed to rebuild the classification
            candidate.load(laps=True, telemetry=False, weather=False, messages=True)
            if candidate.results is not None and len(candidate.results):
                session = candidate
                break
        except Exception as e:
            last_error = e

    if session is None:
        raise last_error or RuntimeError("Sprint qualifying session not found")

    results = session.results

    # If FastF1 has real positions use them, otherwise rebuild from lap times
    if "Position" in results.columns and results["Position"].notna().any():
        rows = []
        for _, r in results.iterrows():
            pos = r.get("Position")
            driver_id = r.get("DriverId")
            if not isinstance(driver_id, str) or not driver_id:
                driver_id = str(r.get("LastName", "")).lower().replace(" ", "_")
            rows.append({
                "position": int(pos) if pd.notna(pos) else None,
                "id": driver_id,
                "code": r.get("Abbreviation") if isinstance(r.get("Abbreviation"), str) else "",
                "name": r.get("FullName") if isinstance(r.get("FullName"), str) else "",
                "team": r.get("TeamName") if isinstance(r.get("TeamName"), str) else "",
                "q1": _fmt_lap(r.get("Q1")),
                "q2": _fmt_lap(r.get("Q2")),
                "q3": _fmt_lap(r.get("Q3")),
            })
        rows.sort(key=lambda x: (x["position"] is None, x["position"] or 0))
        # Some sessions have positions but no times: fill them from laps
        if all(r["q1"] is None and r["q2"] is None and r["q3"] is None for r in rows):
            return _quali_rows_from_laps(session)
        return rows

    return _quali_rows_from_laps(session)


# ------------------------------------------------------- session detail ---

@router.get("/session-detail", summary="Race weekend detail")
def session_detail(
    year: int = Query(..., ge=1950),
    round: int = Query(..., ge=1),
    sprint: bool = Query(False, description="Weekend has a sprint race"),
):
    key = f"v5_{year}_{round}_{int(sprint)}"
    raw = _load(key)
    if _fresh(raw, LIVE_TTL):
        return raw["data"]

    try:
        race_list = _races(f"{year}/{round}/results")
        if not race_list:
            # Race not run yet: still return the event info
            race_list = _races(f"{year}/{round}")
            if not race_list:
                raise HTTPException(status_code=404, detail="Round not found")

        race = race_list[0]
        circuit = race.get("Circuit", {})
        location = circuit.get("Location", {})
        circuit_id = circuit.get("circuitId", "")

        race_rows = _race_rows(race.get("Results", []))

        quali_rows = None
        if year >= QUALI_FIRST_YEAR and race_rows:
            q = _races(f"{year}/{round}/qualifying")
            if q:
                quali_rows = _quali_rows(q[0].get("QualifyingResults", []))

        sprint_rows = None
        if sprint and year >= 2021 and race_rows:
            s = _races(f"{year}/{round}/sprint")
            if s:
                sprint_rows = _race_rows(s[0].get("SprintResults", []))

        sprint_quali_rows = None
        sq_failed = False
        # Only sprint weekends (sprint results exist) have a sprint qualifying session
        if sprint_rows and year >= 2023:
            try:
                sprint_quali_rows = _sprint_quali_rows(year, round)
            except Exception:
                sq_failed = True  # don't cache permanently; retry later

        circuit_races = _circuit_races(circuit_id) if circuit_id else []
    except HTTPException:
        raise
    except Exception as e:
        # Serve stale data rather than an error if we have any
        if raw:
            return raw["data"]
        raise _http_error(e)

    winner = next((r for r in race_rows if r["position"] == 1), None)
    fastest = next((r for r in race_rows if r["fastest_lap"]), None)

    pole = None
    if quali_rows:
        pole = next((r for r in quali_rows if r["position"] == 1), None)
    if pole is None:
        pole = next((r for r in race_rows if r["grid"] == 1), None)

    def pick(r):
        return {"id": r["id"], "code": r["code"], "name": r["name"], "team": r["team"]} if r else None

    data = {
        "meta": {
            "year": year,
            "round": round,
            "event_name": race.get("raceName", ""),
            "circuit_id": circuit_id,
            "circuit_name": circuit.get("circuitName", ""),
            "locality": location.get("locality", ""),
            "country": location.get("country", ""),
            "date": race.get("date", ""),
            "time_utc": race.get("time", ""),   # e.g. "07:00:00Z", empty for old races
        },
        "highlights": {
            "winner": pick(winner),
            "pole": pick(pole),
            "fastest_lap": pick(fastest),       # None before ~2004
        },
        "results": {
            "race": race_rows,
            "qualifying": quali_rows,           # None before 1994
            "sprint": sprint_rows,              # None unless a sprint weekend (2021+)
            "sprint_quali": sprint_quali_rows,  # Sprint Shootout / Sprint Qualifying (2023+)
        },
        "circuit_years": [r["year"] for r in circuit_races],
        "circuit_races": circuit_races,
    }

    finished = False
    try:
        finished = (
            bool(race_rows)
            and not sq_failed
            and date.fromisoformat(race["date"]) < date.today()
        )
    except Exception:
        pass

    _save(key, data, final=finished)
    return data


# ------------------------------------------------------ circuit legends ---

def _tally(races: list[dict], by: str) -> Counter:
    counter: Counter = Counter()
    for race in races:
        for r in race.get("Results", []):
            if by == "driver":
                d = r["Driver"]
                counter[(d["driverId"], _driver(d)["code"], _driver(d)["name"])] += 1
            else:
                c = r["Constructor"]
                counter[(c["constructorId"], "", c["name"])] += 1
    return counter


def _top(counter: Counter, n: int = 5) -> list[dict]:
    return [
        {"id": id_, "code": code, "name": name, "count": count}
        for (id_, code, name), count in counter.most_common(n)
    ]


@router.get("/circuit-legends", summary="All-time records for a circuit")
def circuit_legends(circuit: str = Query(..., min_length=2, max_length=60)):
    if not re.fullmatch(r"[a-z0-9_]+", circuit):
        raise HTTPException(status_code=400, detail="Invalid circuit id")

    name = f"legends_v2_{circuit}"
    raw = _load(name)
    if _fresh(raw, LEGENDS_TTL):
        return raw["data"]

    try:
        wins = _races(f"circuits/{circuit}/results/1")
        seconds = _races(f"circuits/{circuit}/results/2")
        thirds = _races(f"circuits/{circuit}/results/3")
        poles = _races(f"circuits/{circuit}/grid/1/results")
    except Exception as e:
        if raw:
            return raw["data"]
        raise _http_error(e)

    if not wins:
        raise HTTPException(status_code=404, detail="No races found for circuit")

    podiums = wins + seconds + thirds

    data = {
        "circuit_id": circuit,
        "races_held": len(wins),
        "drivers": {
            "wins": _top(_tally(wins, "driver")),
            "poles": _top(_tally(poles, "driver")),
            "podiums": _top(_tally(podiums, "driver")),
        },
        "constructors": {
            "wins": _top(_tally(wins, "team")),
            "poles": _top(_tally(poles, "team")),
            "podiums": _top(_tally(podiums, "team")),
        },
        "winners": sorted(
            [
                {
                    "year": int(w["season"]),
                    "round": int(w["round"]),
                    "driver": _driver(w["Results"][0]["Driver"])["name"],
                    "id": _driver(w["Results"][0]["Driver"])["id"],
                    "code": _driver(w["Results"][0]["Driver"])["code"],
                    "team": w["Results"][0]["Constructor"]["name"],
                }
                for w in wins
                if w.get("Results")
            ],
            key=lambda x: x["year"],
            reverse=True,
        ),
    }

    _save(name, data, final=False)
    return data