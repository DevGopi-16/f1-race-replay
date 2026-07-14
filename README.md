# 🏎️ F1 Race Replay Web

### Full-stack Formula 1 telemetry replay & analysis platform — built with FastAPI, FastF1, and JavaScript

<!--![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python) -->
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)
![JavaScript](https://img.shields.io/badge/JavaScript-Frontend-yellow?logo=javascript)
![FastF1](https://img.shields.io/badge/FastF1-Telemetry-red)
![Canvas](https://img.shields.io/badge/Rendering-HTML5%20Canvas-orange)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Complete-brightgreen)

> Replay any Formula 1 session lap-by-lap in the browser — animated cars on an accurate track map, live telemetry, tyre strategy, weather, DRS zones, sector splits, and a full race leaderboard — reconstructed entirely from real FastF1 session data.

---

## 🎬 Demo

```
assets/demo/replay-demo.gif
```

> Example: replaying the 2025 Singapore Grand Prix at Marina Bay — lap 52/62, full leaderboard with tyre compounds and gaps, live telemetry for the selected driver, and DRS zone / sector overlays on the track map.

---

## 💡 Why I Built This

Formula 1 broadcasts show you *what* is happening. FastF1 gives you the raw telemetry that explains *why*. This project bridges the two — turning session-level timing and telemetry data into an interactive, replayable visualization anyone can explore in a browser, without writing a line of Python or touching a notebook.

It's also a real engineering exercise: large time-series datasets, client-side interpolation for smooth animation, payload optimization for the browser, and a full rendering pipeline built from scratch on HTML5 Canvas.

---
## 📸 Screenshots
 
> Add screenshots or GIFs here.
 
```
assets/screenshots/dashboard.png
assets/screenshots/leaderboard.png
assets/screenshots/weather.png
```
---

## ✨ Features

### 🏁 Race Replay
- Accurate track map with animated car positions
- Sector visualization (Sector 1 / 2 / 3) and toggleable DRS zone overlays
- Seekable timeline with race-incident markers (Yellow / Red / Safety Car / VSC)
- Variable playback speed (0.5x – 4x) with full keyboard control

### 📊 Live Telemetry
- Speed, gear, throttle %, brake %, DRS status per driver
- Tyre compound and remaining tyre life
- Live gap to the car ahead and behind, with distance in metres

### 🛞 Tyre Strategy
- Current compound (Soft / Medium / Hard) and stint age
- Per-driver tyre indicator on the leaderboard

### 🌦 Weather
- Track and air temperature, humidity, wind speed, rain status

### 🏆 Leaderboard
- Full running order with live time gaps
- Team-coloured driver tags, tyre compound, and DRS indicators
- Highlighted focus driver with quick stat panel

### 🔬 Multi-Driver Comparison
- Shift+click to select multiple drivers simultaneously
- Overlaid speed / throttle / brake traces for direct comparison
- Live delta readout between any two selected drivers

### 🎮 Playback Controls
| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `←` / `→` | Rewind / Forward |
| `↑` / `↓` | Speed +/- |
| `1`–`4` | Set speed (0.5x / 1x / 2x / 4x) |
| `R` | Restart |
| `D` | Toggle DRS zones |
| `S` | Toggle sectors |
| `B` | Toggle progress bar |
| `Shift + Click` | Select multiple drivers |
| `H` | Toggle panel visibility |

---

## 🏗 Architecture

```
┌─────────────┐        ┌──────────────────┐        ┌────────────────────┐
│   FastF1     │  --->  │  FastAPI Backend  │  --->  │   Browser Frontend  │
│ (session data)│        │ fetch, process,   │        │  Canvas rendering,  │
│               │        │ downsample,        │        │  interpolation,     │
│               │        │ serialize (JSON)   │        │  playback engine    │
└─────────────┘        └──────────────────┘        └────────────────────┘
```

Telemetry is fetched once per session via FastF1, cached locally, downsampled and serialized on the backend, then streamed to the browser where it's interpolated frame-by-frame for smooth playback — without shipping every raw data point over the wire.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Data Source | FastF1 |
| Frontend | HTML5, CSS3, JavaScript (vanilla) |
| Rendering | HTML5 Canvas / SVG overlays |

---

## 📂 Project Structure

```text
F1-RACE-REPLAY-WEB/
│
├── backend/
│   ├── .fastf1-cache/          # FastF1 local data cache
│   ├── computed_data/          # Precomputed/serialized race data
│   ├── src/
│   │   ├── lib/
│   │   ├── f1_data.py          # FastF1 data loading & processing
│   │   ├── serialize.py        # Telemetry serialization for the frontend
│   │   └── track_geometry.py   # Track map / coordinate generation
│   ├── main.py                 # FastAPI application entry point
│   └── requirements.txt
│
├── frontend/
│   ├── static/
│   │   ├── images/{controls,tyres,weather}/
│   │   ├── app.js              # Playback engine & UI logic
│   │   └── style.css
│   └── templates/
│       └── index.html
│
├── .gitignore
├── README.md
└── requirements.txt
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- pip
- Internet access on first run (FastF1 downloads and caches session data)

### Installation & Run

```bash
git clone https://github.com/DevGopi-16/f1-race-replay.git
cd F1-RACE-REPLAY-WEB/backend

python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open **http://localhost:8000**

> ℹ️ First load per race takes longer — FastF1 downloads and caches session data locally.

---

## ⚡ Performance

Telemetry is **downsampled server-side** before transmission, then **interpolated client-side** for smooth animation — keeping payloads small without sacrificing playback quality.

---

## 🗺 Possible Future Extensions

- Track dominance map (fastest driver per mini-sector)
- Pit stop strategy timeline
- 3D track view (Three.js)
- Exportable replay clips (GIF/MP4)
- Live session mode via WebSockets

---

## 🤝 Contributing

Contributions, ideas, and feature requests are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a Pull Request

---

## 📄 License

MIT License.

---

## ⭐ Support

If this project is useful or interesting to you, a ⭐ on GitHub goes a long way — and feel free to connect if you're working on anything similar with FastF1 or motorsport data.