<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:E10600,100:15151E&height=220&section=header&text=F1%20Race%20Replay%20Web&fontSize=42&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Lap-by-lap%20Formula%201%20telemetry%2C%20reconstructed%20from%20real%20session%20data&descAlignY=58&descSize=16" width="100%"/>

<a href="https://github.com/DevGopi-16/f1-race-replay">
  <img src="https://readme-typing-svg.demolab.com/?lines=Replay+any+F1+session+lap-by-lap+in+your+browser;Live+telemetry+%E2%80%A2+Tyre+strategy+%E2%80%A2+DRS+zones;Built+with+FastAPI+%2B+FastF1+%2B+HTML5+Canvas&font=Fira+Code&center=true&width=650&height=40&color=E10600&vCenter=true&size=20&pause=1500&duration=3000" alt="Typing SVG" />
</a>

<br/>

<img src="https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white&style=for-the-badge" />
<img src="https://img.shields.io/badge/FastF1-Telemetry-E10600?style=for-the-badge" />
<img src="https://img.shields.io/badge/JavaScript-Frontend-F7DF1E?logo=javascript&logoColor=black&style=for-the-badge" />
<img src="https://img.shields.io/badge/Canvas-Rendering-FF6B00?style=for-the-badge" />
<img src="https://img.shields.io/badge/License-MIT-4CAF50?style=for-the-badge" />
<img src="https://img.shields.io/badge/Status-Complete-brightgreen?style=for-the-badge" />

<br/><br/>

<img src="https://github.com/DevGopi-16/f1-race-replay/raw/main/assets/demo/replay-demo.gif" width="85%" alt="F1 Race Replay demo — animated cars on track with live leaderboard and telemetry"/>

<sub>2025 Singapore GP · Marina Bay · Lap 52/62 — full leaderboard, tyre compounds, live telemetry & DRS overlays</sub>

<br/><br/>

<a href="#-getting-started"><img src="https://img.shields.io/badge/🚀_Quick_Start-15151E?style=for-the-badge"/></a>
<a href="#-features"><img src="https://img.shields.io/badge/✨_Features-15151E?style=for-the-badge"/></a>
<a href="#-architecture"><img src="https://img.shields.io/badge/🏗_Architecture-15151E?style=for-the-badge"/></a>
<a href="#-contributing"><img src="https://img.shields.io/badge/🤝_Contribute-15151E?style=for-the-badge"/></a>

</div>

[![divider](https://raw.githubusercontent.com/HiradEmami/readme-ux-kit/master/assets/dividers/animated/unique_effects/divider_cyber_cycle.svg)](https://github.com/DevGopi-16)

## 💡 Why This Exists

> F1 broadcasts show you *what* is happening. FastF1 gives you the raw telemetry that explains *why*.

This project bridges the two — turning session-level timing and telemetry data into an interactive, replayable visualization anyone can explore in a browser, with zero Python or notebooks required on the viewer's end.

It's also a real engineering exercise in its own right: large time-series datasets, client-side interpolation for smooth animation, payload optimization for the browser, and a full rendering pipeline built from scratch on HTML5 Canvas.

[![divider](https://raw.githubusercontent.com/HiradEmami/readme-ux-kit/master/assets/dividers/animated/bars/divider_circuit_pulse_bar.svg)](https://github.com/DevGopi-16)

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🏁 Race Replay
- Accurate track map with animated car positions
- Sector visualization (S1 / S2 / S3) & toggleable DRS zones
- Seekable timeline with incident markers (🟡 Yellow / 🔴 Red / 🚨 SC / VSC)
- Variable playback speed (0.5x – 4x)

### 📊 Live Telemetry
- Speed, gear, throttle %, brake %, DRS status per driver
- Tyre compound & remaining stint life
- Live gap ahead/behind, in metres

</td>
<td width="50%" valign="top">

### 🛞 Tyre Strategy
- Current compound (Soft / Medium / Hard) & stint age
- Per-driver tyre indicator on the leaderboard

### 🌦 Weather
- Track/air temperature, humidity, wind speed, rain status

### 🏆 Leaderboard
- Full running order with live time gaps
- Team-coloured driver tags + DRS indicators
- Highlighted focus driver with quick stat panel

</td>
</tr>
</table>

### 🔬 Multi-Driver Comparison
Shift+click to select multiple drivers → overlaid speed / throttle / brake traces, with a live delta readout between any two selected drivers.

<br/>

### 🎮 Playback Controls

<div align="center">

| Key | Action | Key | Action |
|:---:|:---|:---:|:---|
| `Space` | Play / Pause | `1`–`4` | Set speed (0.5x/1x/2x/4x) |
| `←` `→` | Rewind / Forward | `R` | Restart |
| `↑` `↓` | Speed +/− | `D` | Toggle DRS zones |
| `S` | Toggle sectors | `B` | Toggle progress bar |
| `H` | Toggle panel visibility | `Shift+Click` | Select multiple drivers |

</div>

[![divider](https://raw.githubusercontent.com/HiradEmami/readme-ux-kit/master/assets/dividers/animated/unique_effects/divider_cyber_cycle_mirrored.svg)](https://github.com/DevGopi-16)

## 🏗 Architecture

```mermaid
flowchart LR
    A[("🏎️ FastF1<br/>Session Data")] -->|fetch & cache| B["⚙️ FastAPI Backend<br/>process · downsample · serialize"]
    B -->|JSON over HTTP| C["🖥️ Browser Frontend<br/>Canvas rendering · interpolation · playback engine"]
    C -->|render loop| D[("🎬 Animated Replay")]

    style A fill:#E10600,stroke:#15151E,color:#fff
    style B fill:#009688,stroke:#15151E,color:#fff
    style C fill:#F7DF1E,stroke:#15151E,color:#000
    style D fill:#15151E,stroke:#E10600,color:#fff
```

Telemetry is fetched once per session via FastF1, cached locally, downsampled and serialized on the backend, then streamed to the browser — where it's interpolated frame-by-frame for smooth playback without shipping every raw data point over the wire.

[![divider](https://raw.githubusercontent.com/HiradEmami/readme-ux-kit/master/assets/dividers/animated/bars/divider_dual_energy_tracks.svg)](https://github.com/DevGopi-16)

## 🛠 Tech Stack

<div align="center">

| Layer | Technology |
|:---|:---|
| **Backend** | ![FastAPI](https://img.shields.io/badge/-FastAPI-009688?logo=fastapi&logoColor=white) Python |
| **Data Source** | ![FastF1](https://img.shields.io/badge/-FastF1-E10600) |
| **Frontend** | ![HTML5](https://img.shields.io/badge/-HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/-CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=black) |
| **Rendering** | HTML5 Canvas / SVG overlays |

</div>

<br/>

## 📂 Project Structure

<details>
<summary><b>Click to expand full directory tree</b></summary>

```text
F1-RACE-REPLAY-WEB/
│
├── assets/
│   ├── banners.md
│   ├── dividers/
│   ├── file_headers/
│   ├── headers/
│   ├── icons/
│   ├── loadings/
│   ├── progress_bars/
│   └── visuals/
│
├── backend/
│   ├── .fastf1-cache/          # FastF1 local data cache
│   ├── computed_data/          # Precomputed/serialized race data
│   ├── data/
│   │   └── drivers.json
│   ├── src/
│   │   ├── lib/
│   │   │   ├── settings.py
│   │   │   ├── time.py
│   │   │   └── tyres.py
│   │   ├── f1_data.py          # FastF1 data loading & processing
│   │   ├── serialize.py        # Telemetry serialization for the frontend
│   │   └── track_geometry.py   # Track map / coordinate generation
│   ├── main.py                 # FastAPI application entry point
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── static/
│   │   ├── images/
│   │   │   ├── banners/
│   │   │   ├── controls/
│   │   │   ├── drivers/
│   │   │   ├── teams/
│   │   │   ├── tyres/
│   │   │   └── weather/
│   │   ├── app.js              # Playback engine & UI logic
│   │   └── style.css
│
├── .gitignore
├── README.md
└── requirements.txt
```

</details>

[![divider](https://raw.githubusercontent.com/HiradEmami/readme-ux-kit/master/assets/dividers/animated/unique_effects/divider_cyber_cycle.svg)](https://github.com/DevGopi-16)

## 🚀 Getting Started

### Prerequisites

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![pip](https://img.shields.io/badge/pip-required-blue)
![Internet](https://img.shields.io/badge/Internet-first%20run%20only-lightgrey)

### Installation & Run

```bash
git clone https://github.com/DevGopi-16/f1-race-replay.git
cd F1-RACE-REPLAY-WEB/backend

python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

<div align="center">

**➜ Open [http://localhost:8000](http://localhost:8000)**

</div>

> ℹ️ First load per race takes longer — FastF1 downloads and caches session data locally.

<br/>

## ⚡ Performance

Telemetry is **downsampled server-side** before transmission, then **interpolated client-side** for smooth animation — keeping payloads small without sacrificing playback quality.

[![divider](https://raw.githubusercontent.com/HiradEmami/readme-ux-kit/master/assets/dividers/animated/bars/divider_circuit_pulse_bar.svg)](https://github.com/DevGopi-16)

## 🗺 Roadmap

- [ ] Track dominance map (fastest driver per mini-sector)
- [ ] Pit stop strategy timeline
- [ ] 3D track view (Three.js)
- [ ] Exportable replay clips (GIF/MP4)
- [ ] Live session mode via WebSockets

<br/>

## 🤝 Contributing

Contributions, ideas, and feature requests are welcome!

```bash
# 1. Fork the repository
# 2. Create a feature branch
git checkout -b feature/my-feature

# 3. Commit your changes
git commit -m "Add my feature"

# 4. Open a Pull Request
```

<br/>

## 📄 License

Released under the **MIT License** — see [LICENSE](LICENSE) for details.

<br/>

<div align="center">

## ⭐ Support

If this project is useful or interesting to you, a star on GitHub goes a long way — and feel free to connect if you're working on anything similar with FastF1 or motorsport data.

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:15151E,100:E10600&height=120&section=footer" width="100%"/>

</div>