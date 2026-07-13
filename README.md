# 🏎️ F1 Race Replay Web

> A modern Formula 1 race replay and telemetry visualizer built with **FastAPI**, **FastF1**, and **JavaScript**. Replay any supported F1 race directly in your browser with interactive telemetry, weather, leaderboard, tyre information, and playback controls.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)
![JavaScript](https://img.shields.io/badge/JavaScript-Frontend-yellow?logo=javascript)
![FastF1](https://img.shields.io/badge/FastF1-Telemetry-red)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📖 Overview

F1 Race Replay Web transforms Formula 1 telemetry into an interactive browser experience.

Instead of watching static race data, users can replay an entire race with animated cars, telemetry overlays, live weather, tyre information, DRS status, and driver statistics—all rendered directly in the browser.

The backend processes telemetry using **FastF1** while the frontend provides smooth playback through interpolation and Canvas rendering.

---

## ✨ Features

### 🏁 Race Replay

- Smooth replay controls
- Variable playback speed
- Seek timeline
- Keyboard shortcuts

### 📊 Telemetry
- Speed
- Gear
- RPM
- Throttle
- Brake
- DRS
- Race position

### 🛞 Tyre Information
- Current tyre compound
- Tyre life indicator
- Stint visualization

### 🌦 Weather
- Air temperature
- Rain indicator
- Wind speed
- Track conditions

### 🏆 Leaderboard
- Live positions
- Driver abbreviations
- Team colours
- Tyre indicator
- DRS status
- OUT status

### 🎮 Playback Controls
- Play / Pause
- Forward
- Rewind
- Speed Control
- Timeline Seeking

---

# 🛠 Tech Stack

| Category | Technology |
|-----------|------------|
| Backend | FastAPI |
| Data | FastF1 |
| Language | Python |
| Frontend | HTML5 |
| Styling | CSS3 |
| Logic | JavaScript |
| Visualization | HTML5 Canvas |

---

# 📂 Project Structure

```text
F1-RACE-REPLAY-WEB/
│
├── backend/
│   ├── .fastf1-cache/
│   ├── computed_data/
│   ├── src/
│   │   ├── lib/
│   │   ├── f1_data.py
│   │   ├── serialize.py
│   │   └── track_geometry.py
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── static/
│   │   ├── images/
│   │   │   ├── controls/
│   │   │   ├── tyres/
│   │   │   └── weather/
│   │   ├── app.js
│   │   └── style.css
│   └── templates/
│       └── index.html
│
├── .gitignore
├── README.md
└── requirements.txt
```

---

# 🚀 Installation

Clone the repository

```bash
git clone https://github.com/USERNAME/F1-RACE-REPLAY-WEB.git
```

Go into the backend

```bash
cd backend
```

Create a virtual environment

```bash
python -m venv venv
```

Activate it

### Windows

```bash
venv\Scripts\activate
```

### macOS/Linux

```bash
source venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

---

# ▶️ Run

```bash
uvicorn main:app --reload --port 8000
```

Open

```
http://localhost:8000
```

---

# 🎮 Controls

| Key | Action |
|------|--------|
| Space | Play / Pause |
| ← | Rewind |
| → | Forward |
| ↑ | Increase Speed |
| ↓ | Decrease Speed |

---

# 📊 Implemented Features

| Feature | Status |
|----------|--------|
| Track Visualization | ✅ |
| Car Animation | ✅ |
| Weather Panel | ✅ |
| Driver Telemetry | ✅ |
| Tyre Information | ✅ |
| Leaderboard | ✅ |
| Progress Bar | ✅ |
| Playback Controls | ✅ |
| Team Colours | ✅ |
| Keyboard Shortcuts | ✅ |

---

# 🚧 Roadmap

- Qualifying Replay
- Live Telemetry
- Gap/Interval Leaderboard
- Multi-driver Comparison
- Pit Stop Analysis
- ERS Visualization
- Lap Delta Analysis
- Driver Radio Events

---

# ⚡ Performance

To reduce payload size, telemetry is downsampled before being sent to the browser.

The frontend performs interpolation between samples, providing smooth animation while minimizing bandwidth usage.

---

# 📸 Screenshots

> Add screenshots or GIFs here.

```
assets/screenshots/dashboard.png
assets/screenshots/leaderboard.png
assets/screenshots/weather.png
```

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.
