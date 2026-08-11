"""
backend/src/constructors_panel.py

Constructors Championship — standings + team profile data.

- Jolpica (api.jolpi.ca): live constructor standings, plus round-by-round
  points/position history built by querying each completed round's
  standings snapshot (Jolpica's per-round standings are already
  cumulative, so no manual accumulation is needed).
- Podiums / poles / fastest laps at team level are summed from the
  already-cached per-driver season stats, grouped by each driver's
  current team — avoids a second full FastF1 pass.
- Season progress (races completed / total rounds) and next-round info
  reuse driver_panel.py's FastF1 schedule helpers.
"""

import os
import json
import time
import datetime

import requests
import fastf1

from .driver_panel import (
    JOLPICA_BASE,
    COMPUTED_DATA_DIR,
    STATS_CACHE_TTL_SECONDS,
    _completed_rounds,
    _upcoming_races,
)

TEAM_COLORS = {
    "Mercedes": "#27F4D2", "Red Bull": "#3671C6", "Ferrari": "#E8002D",
    "McLaren": "#FF8000", "Aston Martin": "#229971", "Alpine": "#FF87BC",
    "Williams": "#64C4FF", "Racing Bulls": "#6692FF", "Kick Sauber": "#52E252",
    "Haas": "#B6BABD", "Cadillac": "#003057",
}

CIRCUIT_TYPE_BY_COUNTRY = {
    "Monaco": "street", "Azerbaijan": "street", "Singapore": "street", "Saudi Arabia": "street",
    "Italy": "high_speed", "Belgium": "high_speed", "United Kingdom": "high_speed",
    "Netherlands": "technical", "Hungary": "technical", "Spain": "technical",
    "Japan": "technical", "Australia": "technical", "Austria": "high_speed",
    "Canada": "technical", "Mexico": "technical", "Brazil": "technical",
    "Qatar": "high_speed", "United Arab Emirates": "high_speed", "Bahrain": "technical",
    "United States": "high_speed",
}


def _pace_by_circuit_type(team_history: list[dict]) -> dict:
    buckets: dict[str, list[float]] = {"high_speed": [], "technical": [], "street": []}
    for h in team_history:
        ctype = CIRCUIT_TYPE_BY_COUNTRY.get(h.get("country", ""))
        if ctype not in buckets:
            continue
        buckets[ctype].append(h.get("points", 0) or 0)
    return {
        ctype: (round(sum(vals) / len(vals), 1) if vals else None)
        for ctype, vals in buckets.items()
    }


def fetch_constructor_standings(season: int, round_: int | None = None) -> list[dict]:
    if round_:
        url = f"{JOLPICA_BASE}/{season}/{round_}/constructorstandings/"
    else:
        url = f"{JOLPICA_BASE}/{season}/constructorstandings/"

    resp = requests.get(url, timeout=10)
    resp.raise_for_status()

    lists = resp.json()["MRData"]["StandingsTable"]["StandingsLists"]
    if not lists:
        return []
    return lists[0]["ConstructorStandings"]


def _disk_cache_path(season: int) -> str:
    return os.path.join(COMPUTED_DATA_DIR, f"constructor_history_{season}.json")


def _round_country_map(season: int) -> dict[int, str]:
    """
    Maps round number -> country name for the season, via the FastF1
    event schedule. Used to attach a flag/country to each round's
    history entry (round-by-round table, recent form, etc).
    """
    try:
        schedule = fastf1.get_event_schedule(season, include_testing=False)
    except Exception as e:
        print(f"[constructors_panel] couldn't load schedule for {season}: {e}")
        return {}
    mapping = {}
    for _, row in schedule.iterrows():
        try:
            mapping[int(row["RoundNumber"])] = row.get("Country", "")
        except (KeyError, ValueError, TypeError):
            continue
    return mapping


def _compute_constructor_history(season: int) -> dict[str, list[dict]]:
    history: dict[str, list[dict]] = {}
    country_map = _round_country_map(season)

    for round_ in sorted(_completed_rounds(season)):
        try:
            rows = fetch_constructor_standings(season, round_)
        except Exception as e:
            print(f"[constructors_panel] skipping round {round_} ({season}): {e}")
            continue

        for row in rows:
            c = row.get("Constructor", {})
            cid = c.get("constructorId")
            if not cid:
                continue
            entry = history.setdefault(cid, [])
            points = float(row.get("points", 0) or 0)
            entry.append({
                "round": round_,
                "points": points,
                "cumulative_points": points,
                "position": int(row["position"]) if row.get("position") else None,
                "wins": int(row.get("wins", 0) or 0),
                "country": country_map.get(round_, ""),
            })

    for cid, rounds in history.items():
        rounds.sort(key=lambda r: r["round"])

    return history


def get_constructor_history_cached(season: int) -> dict[str, list[dict]]:
    path = _disk_cache_path(season)
    if os.path.exists(path):
        try:
            with open(path) as f:
                cached = json.load(f)
            if isinstance(cached, dict):
                return cached
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def warm_constructor_history(season: int) -> None:
    path = _disk_cache_path(season)
    if os.path.exists(path):
        age = time.time() - os.path.getmtime(path)
        if age < STATS_CACHE_TTL_SECONDS:
            try:
                with open(path) as f:
                    cached = json.load(f)
                if isinstance(cached, dict) and cached:
                    return
            except (json.JSONDecodeError, OSError):
                pass

    history = _compute_constructor_history(season)
    os.makedirs(COMPUTED_DATA_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(history, f, indent=2)


def _total_rounds(season: int) -> int:
    schedule = fastf1.get_event_schedule(season, include_testing=False)
    return len(schedule)


def _next_round_info(season: int) -> dict | None:
    """
    Approximates the race weekend's start date as 2 days before the race
    itself (typical Fri-Sun GP weekend) since FastF1's schedule only gives
    the race day, not the full weekend span. Sprint weekends may be off
    by a day — acceptable approximation for a summary card.
    """
    races = _upcoming_races(season, count=1)
    if not races:
        return None
    race = races[0]
    date_range = race.get("display_date", "")
    try:
        event_date = datetime.datetime.strptime(race["date"], "%Y-%m-%d")
        start = event_date - datetime.timedelta(days=2)
        date_range = f"{start.strftime('%d')} - {event_date.strftime('%d %b')}"
    except (KeyError, ValueError):
        pass
    return {
        "name": race.get("name", ""),
        "country": race.get("country", ""),
        "date_range": date_range,
    }


def _drivers_for_team(team_name: str, live_drivers: list[dict]) -> list[dict]:
    return [d for d in live_drivers if d.get("team") == team_name]


def _team_race_stats(team_drivers: list[dict]) -> dict:
    """
    Aggregates points-finishes / DNFs / avg start / avg finish / best
    finish across both of a team's drivers' round-by-round history.
    """
    all_finishes = []
    all_quali = []
    dnf_count = 0
    points_finish_rounds = set()

    for d in team_drivers:
        for h in d.get("history", []) or []:
            if h.get("position") is not None:
                all_finishes.append(h["position"])
            else:
                dnf_count += 1
            if h.get("quali_position") is not None:
                all_quali.append(h["quali_position"])
            if (h.get("points") or 0) > 0:
                points_finish_rounds.add(h.get("round"))

    return {
        "points_finishes": len(points_finish_rounds),
        "dnfs": dnf_count,
        "avg_start": round(sum(all_quali) / len(all_quali), 1) if all_quali else None,
        "avg_finish": round(sum(all_finishes) / len(all_finishes), 1) if all_finishes else None,
        "best_finish": min(all_finishes) if all_finishes else None,
    }


def build_constructors_panel(
    season: int,
    live_drivers: list[dict],
    round_: int | None = None,
) -> dict:
    standings = fetch_constructor_standings(season, round_)
    history_by_id = get_constructor_history_cached(season) or {}

    merged = []
    for entry in standings:
        c = entry.get("Constructor", {})
        cid = c.get("constructorId", "")
        name = c.get("name", "")
        team_history = history_by_id.get(cid, [])

        team_drivers = _drivers_for_team(name, live_drivers)
        podiums = sum(d.get("podiums", 0) or 0 for d in team_drivers)
        poles = sum(d.get("poles", 0) or 0 for d in team_drivers)
        fastest_laps = sum(d.get("fastest_laps", 0) or 0 for d in team_drivers)
        team_logo = team_drivers[0].get("teamLogo") if team_drivers else None

        merged.append({
            "id": cid,
            "name": name,
            "nationality": c.get("nationality", ""),
            "color": TEAM_COLORS.get(name, "#888888"),
            "teamLogo": team_logo,
            "position": int(entry["position"]) if entry.get("position") else None,
            "points": float(entry.get("points", 0) or 0),
            "wins": int(entry.get("wins", 0) or 0),
            "podiums": podiums,
            "poles": poles,
            "fastest_laps": fastest_laps,
            "history": team_history,
            "team_stats": _team_race_stats(team_drivers),
            "pace_by_circuit_type": _pace_by_circuit_type(team_history),
            "drivers": [
                {
                    "code": d.get("code"),
                    "name": d.get("name"),
                    "number": d.get("number"),
                    "nationality": d.get("nationality"),
                    "image": d.get("image"),
                    "points": d.get("points"),
                    "position": d.get("position"),
                    "wins": d.get("wins"),
                    "podiums": d.get("podiums"),
                    "poles": d.get("poles"),
                    "fastest_laps": d.get("fastest_laps"),
                    "avg_finish": d.get("avg_finish"),
                    "history": d.get("history", []),
                }
                for d in team_drivers
            ],
        })

    merged.sort(key=lambda c: (c["position"] is None, c["position"] or 999))

    total_points = round(sum(t["points"] for t in merged), 1)

    return {
        "teams": merged,
        "total_points": total_points,
        "races_completed": len(_completed_rounds(season)),
        "total_rounds": _total_rounds(season),
        "next_round": _next_round_info(season),
    }
