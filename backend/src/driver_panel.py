"""
backend/src/driver_panel.py

Pulls live driver championship standings from the Jolpica F1 API
(https://api.jolpi.ca/ergast/f1) — the community-maintained successor to
Ergast — and merges them with static per-driver metadata (team color,
banner, description) stored in data/drivers.json.

Calling the standings endpoint WITHOUT a round number returns the
standings as of the most recently completed race automatically, so no
round needs to be chosen or guessed by the caller.
"""

import requests

JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"


def fetch_driver_standings(season: int, round_: int | None = None) -> list[dict]:
    """
    Calls Jolpica for driver championship standings. This is just the
    standings table — no session telemetry, no timing data — so it's
    fast and available the same day as a race, unlike FastF1 session data.
    """
    if round_:
        url = f"{JOLPICA_BASE}/{season}/{round_}/driverstandings/"
    else:
        url = f"{JOLPICA_BASE}/{season}/driverstandings/"

    resp = requests.get(url, timeout=10)
    resp.raise_for_status()

    standings_lists = resp.json()["MRData"]["StandingsTable"]["StandingsLists"]
    if not standings_lists:
        return []

    return standings_lists[0]["DriverStandings"]


def _static_lookup(static_drivers: list) -> dict:
    """
    Index static driver entries (from drivers.json) by driverId, lowercased.
    Jolpica's Driver.driverId (e.g. "max_verstappen") matches the driverId
    field already used in drivers.json — direct join, no fuzzy matching.
    """
    lookup = {}
    for entry in static_drivers:
        key = entry.get("driverId") or entry.get("id")
        if key:
            lookup[str(key).lower()] = entry
    return lookup


def build_driver_panel(season: int, static_drivers: list, round_: int | None = None) -> list[dict]:
    """
    season, round_: which championship standings to fetch from Jolpica.
                    round_=None returns the latest available standings —
                    no need to know or guess which round is "safe" to use.
    static_drivers: contents of data/drivers.json (a list of dicts).

    Returns one merged list, sorted by championship position.
    """
    standings = fetch_driver_standings(season, round_)
    static_by_key = _static_lookup(static_drivers)

    merged = []
    for entry in standings:
        driver = entry.get("Driver", {})
        constructors = entry.get("Constructors", [])
        driver_id = driver.get("driverId", "")
        static_entry = static_by_key.get(driver_id.lower(), {})

        merged.append({
            **static_entry,  # teamColor, banner, description, image, flag, etc.
            "code": driver.get("code") or static_entry.get("code", ""),
            "name": f"{driver.get('givenName', '')} {driver.get('familyName', '')}".strip(),
            "team": constructors[0]["name"] if constructors else static_entry.get("team", ""),
            "position": int(entry["position"]) if entry.get("position") else None,
            "points": float(entry["points"]) if entry.get("points") else 0.0,
            "wins": int(entry["wins"]) if entry.get("wins") else 0,
            "color": static_entry.get("teamColor", "#888888"),
        })

    merged.sort(key=lambda d: (d["position"] is None, d["position"] or 999))
    return merged