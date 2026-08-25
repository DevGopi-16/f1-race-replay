"""
Analytics data builder.

Combines the existing driver/season statistics from driver_panel.py
into a single API-friendly payload for the React Analytics page.

Important:
- Do NOT calculate telemetry here.
- Do NOT duplicate season statistics.
- Reuse the existing cached driver statistics.
"""

from typing import Optional

from src.driver_panel import (
    build_driver_panel,
    get_season_stats_cached,
    get_racecraft_stats,
    get_performance_index,
    get_teammate_battle,
)


def _safe_number(value, default=0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value, default=0):
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _driver_summary(driver: dict) -> dict:
    return {
        "code": driver.get("code"),
        "name": driver.get("name"),
        "team": driver.get("team"),
        "country": driver.get("country"),
        "position": driver.get("position"),
        "points": _safe_number(driver.get("points")),
        "wins": _safe_int(driver.get("wins")),
        "podiums": _safe_int(driver.get("podiums")),
        "poles": _safe_int(driver.get("poles")),
    }


def build_analytics(
    season: int,
    static_drivers: list,
    round_: Optional[int] = None,
) -> dict:
    """
    Build the complete Analytics payload.

    Uses the existing driver panel and cached season/racecraft
    statistics instead of recomputing them.
    """

    # ------------------------------------------------------------
    # Driver championship data
    # ------------------------------------------------------------

    driver_panel = build_driver_panel(
        season,
        static_drivers,
        round_=round_,
    )

    # ------------------------------------------------------------
    # Cached detailed statistics
    # ------------------------------------------------------------

    season_stats = get_season_stats_cached(season) or {}
    racecraft_stats = get_racecraft_stats(season) or {}

    # ------------------------------------------------------------
    # Championship standings
    # ------------------------------------------------------------

    standings = [
        _driver_summary(driver)
        for driver in driver_panel
    ]

    standings.sort(
        key=lambda d: (
            d["position"] is None,
            d["position"] if d["position"] is not None else 999,
        )
    )

    # ------------------------------------------------------------
    # Driver analytics
    # ------------------------------------------------------------

    drivers = []

    for driver in driver_panel:
        code = driver.get("code")

        if not code:
            continue

        season_entry = season_stats.get(code, {})
        racecraft_entry = racecraft_stats.get(code, {})

        performance = get_performance_index(
            season_entry,
            racecraft_entry,
        )

        history = season_entry.get("history", [])

        drivers.append(
            {
                "code": code,
                "name": driver.get("name"),
                "team": driver.get("team"),
                "country": driver.get("country"),

                "championship": {
                    "position": driver.get("position"),
                    "points": _safe_number(driver.get("points")),
                    "wins": _safe_int(driver.get("wins")),
                    "podiums": _safe_int(driver.get("podiums")),
                    "poles": _safe_int(driver.get("poles")),
                },

                "performance": performance,

                "racecraft": {
                    "overtakes": _safe_int(
                        racecraft_entry.get("overtakes")
                    ),
                    "positions_gained": _safe_int(
                        racecraft_entry.get("positions_gained")
                    ),
                    "positions_lost": _safe_int(
                        racecraft_entry.get("positions_lost")
                    ),
                    "pit_stops": _safe_int(
                        racecraft_entry.get("pit_stops")
                    ),
                },

                "history": history,
            }
        )

    # ------------------------------------------------------------
    # Teammate battles
    # ------------------------------------------------------------

    teammate_battles = []

    for driver in driver_panel:
        code = driver.get("code")

        if not code:
            continue

        battle = get_teammate_battle(
            code,
            driver_panel,
        )

        if battle:
            teammate_battles.append(battle)

    # Avoid duplicate A/B teammate pairs.
    unique_battles = []
    seen_pairs = set()

    for battle in teammate_battles:
        driver = battle.get("driver", {}).get("code")
        teammate = battle.get("teammate", {}).get("code")

        if not driver or not teammate:
            continue

        pair = tuple(sorted((driver, teammate)))

        if pair in seen_pairs:
            continue

        seen_pairs.add(pair)
        unique_battles.append(battle)

    # ------------------------------------------------------------
    # Season overview
    # ------------------------------------------------------------

    total_points = sum(
        _safe_number(driver.get("points"))
        for driver in driver_panel
    )

    total_wins = sum(
        _safe_int(driver.get("wins"))
        for driver in driver_panel
    )

    total_podiums = sum(
        _safe_int(driver.get("podiums"))
        for driver in driver_panel
    )

    total_poles = sum(
        _safe_int(driver.get("poles"))
        for driver in driver_panel
    )

    return {
        "meta": {
            "season": season,
            "round": round_,
        },

        "overview": {
            "drivers": len(driver_panel),
            "total_points": round(total_points, 3),
            "total_wins": total_wins,
            "total_podiums": total_podiums,
            "total_poles": total_poles,
        },

        "standings": standings,

        "drivers": drivers,

        "teammate_battles": unique_battles,
    }