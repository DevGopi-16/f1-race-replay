"""Parses raw F1 live-timing SignalR messages into the same row shape
build_timing_tower() already produces from FastF1 session data — so
main.py's /api/timing-tower endpoint can serve either source through
one identical response format.

This mirrors the TimingProcessor logic from the mateenunez/f1-telemetry
project (MIT licensed), translated from TypeScript to Python and merged
with DriverList/TimingAppData so we get driver codes, team colors, and
tyre compound in the same row — not just gaps and sectors.

Three raw topics feed this:
  - "DriverList"    -> driver_number -> {code, name, team, team_color}
  - "TimingData"    -> driver_number -> {position, gap, interval, last_lap, sectors, pits, in_pit}
  - "TimingAppData" -> driver_number -> {compound, tyre_laps}

The raw feed sends PARTIAL updates (only the fields that changed), so
this module keeps its own running state per driver and merges each
incoming message into it — same pattern the TS version used with its
`existing` merge, just without React state.
"""

import re
from typing import Optional

_LAPPED_GAP_RE = re.compile(r"^\d+\s*L$", re.IGNORECASE)


class TimingFeedParser:
    def __init__(self):
        self._drivers: dict[str, dict] = {}   # driver_number -> driver info
        self._timing: dict[str, dict] = {}    # driver_number -> timing info

    # ---------- DriverList ----------

    def apply_driver_list(self, data: dict):
        """data shape: { "<driver_number>": {"Tla": "VER", "TeamName": "...", "TeamColour": "..."}, ... }"""
        for num, info in data.items():
            if not isinstance(info, dict):
                continue
            existing = self._drivers.get(num, {})
            self._drivers[num] = {
                "code": info.get("Tla", existing.get("code")),
                "name": info.get("FullName", existing.get("name")),
                "team": info.get("TeamName", existing.get("team")),
                "team_color": (
                    f"#{info['TeamColour']}"
                    if info.get("TeamColour")
                    else existing.get("team_color")
                ),
            }

    # ---------- TimingData ----------

    def apply_timing_data(self, data: dict):
        """data shape: { "Lines": { "<driver_number>": {...} } }"""
        lines = data.get("Lines")
        if not isinstance(lines, dict):
            return

        for num, line in lines.items():
            if not isinstance(line, dict):
                continue
            existing = self._timing.get(num, {})

            sectors_raw = line.get("Sectors")
            sectors = existing.get("sectors", {})
            if isinstance(sectors_raw, (list, dict)):
                sector_items = (
                    enumerate(sectors_raw)
                    if isinstance(sectors_raw, list)
                    else sectors_raw.items()
                )
                for idx, sector in sector_items:
                    idx = int(idx)
                    if not isinstance(sector, dict):
                        continue
                    key = f"s{idx + 1}"
                    sectors[key] = {
                        "time": _safe_float(sector.get("Value"), sectors.get(key, {}).get("time")),
                        "is_personal_best": bool(sector.get("PersonalFastest", False)),
                        "is_session_best": bool(sector.get("OverallFastest", False)),
                    }

            self._timing[num] = {
                "position": _safe_int(line.get("Position"), existing.get("position")),
                "gap": line.get("GapToLeader", existing.get("gap", "")),
                "interval": _extract_interval(line.get("IntervalToPositionAhead"), existing.get("interval", "")),
                "last_lap": _extract_value(line.get("LastLapTime"), existing.get("last_lap", "")),
                "pit_count": _safe_int(line.get("NumberOfPitStops"), existing.get("pit_count")),
                "in_pit": bool(line.get("InPit", existing.get("in_pit", False))),
                "retired": bool(line.get("Retired", existing.get("retired", False))),
                "stopped": bool(line.get("Stopped", existing.get("stopped", False))),
                "sectors": sectors,
            }

    # ---------- TimingAppData ----------

    def apply_timing_app_data(self, data: dict):
        """data shape: { "Lines": { "<driver_number>": {"Stints": {...}} } }"""
        lines = data.get("Lines")
        if not isinstance(lines, dict):
            return

        for num, line in lines.items():
            if not isinstance(line, dict):
                continue
            stints = line.get("Stints")
            if not stints:
                continue
            stint_values = list(stints.values()) if isinstance(stints, dict) else stints
            if not stint_values:
                continue
            latest = stint_values[-1]
            if not isinstance(latest, dict):
                continue

            existing = self._timing.get(num, {})
            existing["compound"] = latest.get("Compound", existing.get("compound"))
            existing["tyre_laps"] = _safe_int(latest.get("TotalLaps"), existing.get("tyre_laps"))
            self._timing[num] = existing

    # ---------- Output ----------

    def build_rows(self) -> list[dict]:
        """Merges driver info + timing info into the exact row shape
        build_timing_tower() produces, sorted by position."""
        rows = []
        for num, timing in self._timing.items():
            driver = self._drivers.get(num, {})
            position = timing.get("position")

            pit_status = "PIT" if timing.get("in_pit") else None

            rows.append({
                "position": position,
                "driver_code": driver.get("code", "-"),
                "team_color": driver.get("team_color"),
                "compound": timing.get("compound"),
                "tyre_laps": timing.get("tyre_laps"),
                "pit_status": pit_status,
                "pit_count": timing.get("pit_count"),
                "gap": timing.get("gap", ""),
                "interval": timing.get("interval", ""),
                "last_lap": timing.get("last_lap", ""),
                "sectors": {
                    "s1": timing.get("sectors", {}).get("s1"),
                    "s2": timing.get("sectors", {}).get("s2"),
                    "s3": timing.get("sectors", {}).get("s3"),
                },
                "retired": timing.get("retired", False),
                "stopped": timing.get("stopped", False),
                "knocked_out": False,
                "lapped": bool(_LAPPED_GAP_RE.match(str(timing.get("gap", "")).strip())),
            })

        rows.sort(key=lambda r: (r["position"] is None, r["position"]))
        return rows


def _safe_int(value, fallback=None) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _safe_float(value, fallback=None) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _extract_value(field, fallback=""):
    """Some fields arrive as {"Value": "1:23.456"}, others as a bare string."""
    if isinstance(field, dict):
        return field.get("Value", fallback)
    return field if field is not None else fallback


def _extract_interval(field, fallback=""):
    if isinstance(field, dict):
        return field.get("Value", fallback)
    return field if field is not None else fallback
