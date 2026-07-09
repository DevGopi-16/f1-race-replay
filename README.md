# F1 Race Replay — Web

A browser port of your Arcade-based race replay app. Same data pipeline
(`f1_data.py`, unchanged), same telemetry/pickle caching — just an HTTP API
+ Canvas frontend instead of a desktop window.

## Setup

**1. Copy your existing pipeline files into this project:**

```
backend/src/
├── f1_data.py              # ← copy from your original project
├── lib/
│   ├── settings.py         # ← copy
│   ├── time.py              # ← copy
│   └── tyres.py             # ← copy
├── track_geometry.py        # already here (new — arcade-free port)
├── serialize.py             # already here (new)
└── __init__.py
```

Your original `bayesian_tyre_model.py` and `tyre_degradation_integration.py`
are **not** required for this v1 — the web driver-info panel uses the
simpler `max_tyre_life` ratio fallback (same one `LeaderboardComponent`
already used when no degradation integrator was present). You can wire the
Bayesian model in later if you want it on the web too.

**2. Install dependencies:**

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

**3. Run:**

```bash
uvicorn main:app --reload --port 8000
```

Open `http://localhost:8000`.

## What's implemented vs. your desktop app

| Feature | Status |
|---|---|
| Track outline + inner/outer boundary + DRS zones | ✅ ported (`track_geometry.py`) |
| Animated cars, team colors | ✅ |
| Leaderboard (position, tyre, DRS dot, OUT flag) | ✅ |
| Weather panel | ✅ |
| Driver info panel (speed/gear/DRS/throttle/brake bars) | ✅ |
| Tyre health bar | ✅ (simple ratio, not the Bayesian model) |
| Progress bar w/ lap ticks, flag/SC/VSC/DNF markers, click-to-seek | ✅ |
| Playback controls (play/pause, ±10s, speed cycling, keyboard shortcuts) | ✅ |
| Gap-to-leader / interval toggle in leaderboard | ❌ not ported yet |
| Qualifying replay (`interfaces/qualifying.py`) | ❌ not ported — race/sprint only for now |
| Live telemetry stream viewer (websocket) | ❌ not ported |
| Settings dialog | ❌ not needed — no desktop settings to configure |
| Multi-driver selection in driver info panel | ❌ web version is single-select for now |

## Key architectural difference from the desktop version

Your desktop app renders frames live from the full 25fps (`DT = 1/FPS`)
array. Shipping that much data to a browser as JSON would be enormous for
a full race (100k+ frames × ~20 drivers). `backend/src/serialize.py`
downsamples to a configurable fps (`?fps=8` in the `/api/replay` query,
default 8) before sending, and the frontend (`app.js`) linearly
interpolates between samples every animation frame — so playback still
looks smooth even though far fewer frames cross the wire. If you want
higher fidelity, raise `fps` in the query string (up to 25); payload size
scales roughly linearly with it.

## Known simplifications / things worth tightening next

- **Lap tick positions on the progress bar are evenly spaced**, not based
  on actual lap boundary times (your desktop version does the same
  approximation — see the comment in `RaceProgressBarComponent`).
- **Tyre compound is shown as a raw int** in the leaderboard/driver panel,
  not a compound name or colored icon — `get_tyre_compound_int`'s mapping
  wasn't available when this was built. Once you copy `lib/tyres.py` over,
  it'd be easy to add a small `TYRE_INT_TO_NAME`/color map in
  `serialize.py` and send the name across instead.
- **DNF detection samples every 25th original frame** (mirrors your
  desktop `extract_race_events`), so it's accurate to within ~1 second.
- **No websocket/live mode** — this reads pre-computed session data, same
  as your desktop app already does via the pickle cache. Wiring in the
  live telemetry viewer would be a separate, bigger follow-up.
