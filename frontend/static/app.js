// F1 Race Replay — frontend
//
// Data model: `raceData.frames` arrives pre-downsampled from the backend
// (see backend/src/serialize.py) at raceData.frame_rate fps. We keep an
// internal `playheadT` in seconds and interpolate between the two nearest
// frames every animation tick, so motion looks smooth at 60fps even
// though the underlying samples are much coarser.

const PLAYBACK_SPEEDS = [0.1, 0.2, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0, 128.0, 256.0];

const state = {
  raceData: null,
  playheadT: 0,
  playing: false,
  speedIndex: PLAYBACK_SPEEDS.indexOf(1.0),
  selectedDrivers: [], // was selectedDriver (single) — now a list, like desktop's window.selected_drivers
  lastTickMs: null,
  transform: null, // {scale, offsetX, offsetY, flipY}
  showDrsZones: true,    // toggled by 'D'
  showProgressBar: true, // toggled by 'B'
};

// ---------------------------------------------------------------------
// Picker screen
// ---------------------------------------------------------------------
const yearSelect = document.getElementById("yearSelect");
const roundSelect = document.getElementById("roundSelect");
const sessionTypeSelect = document.getElementById("sessionTypeSelect");
const pickerStatus = document.getElementById("pickerStatus");

function initPicker() {
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2018; y--) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }
  yearSelect.addEventListener("change", loadSchedule);
  loadSchedule();
}

async function loadSchedule() {
  roundSelect.innerHTML = "<option>Loading…</option>";
  try {
    const res = await fetch(`/api/schedule/${yearSelect.value}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const weekends = await res.json();
    roundSelect.innerHTML = "";
    for (const w of weekends) {
      const opt = document.createElement("option");
      opt.value = w.round_number;
      opt.textContent = `${w.round_number}: ${w.event_name}`;
      roundSelect.appendChild(opt);
    }
  } catch (e) {
    roundSelect.innerHTML = "<option>Failed to load</option>";
    pickerStatus.textContent = `Couldn't load schedule: ${e.message}`;
  }
}

document.getElementById("loadBtn").addEventListener("click", async () => {
  const year = yearSelect.value;
  const round = roundSelect.value;
  const sessionType = sessionTypeSelect.value;
  pickerStatus.textContent = "Loading replay data — this can take a while the first time (building telemetry cache)…";

  try {
    const res = await fetch(`/api/replay?year=${year}&round=${round}&session_type=${sessionType}&fps=8`);
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.detail || `HTTP ${res.status}`);
    }
    state.raceData = await res.json();
    startReplay();
  } catch (e) {
    pickerStatus.textContent = `Error: ${e.message}`;
  }
});

document.getElementById("backToPickerBtn").addEventListener("click", () => {
  state.playing = false;
  document.getElementById("replay").classList.add("hidden");
  document.getElementById("picker").classList.remove("hidden");
  pickerStatus.textContent = "";
});

// ---------------------------------------------------------------------
// Replay setup
// ---------------------------------------------------------------------
const canvas = document.getElementById("trackCanvas");
const ctx = canvas.getContext("2d");
const progressCanvas = document.getElementById("progressCanvas");
const progressCtx = progressCanvas.getContext("2d");

function startReplay() {
  document.getElementById("picker").classList.add("hidden");
  document.getElementById("replay").classList.remove("hidden");

  state.playheadT = 0;
  state.playing = true;
  state.selectedDrivers = [];
  state.lastTickMs = null;

  resizeCanvases();
  computeTransform();
  renderSessionBanner();
  requestAnimationFrame(tick);
}

function renderSessionBanner() {
  const m = state.raceData.meta;
  document.getElementById("sessionBanner").innerHTML =
    `<b>${m.event_name}</b> — ${m.circuit_name}, ${m.country}<br>` +
    `${m.date} · Round ${m.round} · ${m.total_laps} laps`;
}

function resizeCanvases() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  progressCanvas.width = progressCanvas.clientWidth;
  progressCanvas.height = progressCanvas.clientHeight;
}
window.addEventListener("resize", () => {
  resizeCanvases();
  if (state.raceData) computeTransform();
});

function computeTransform() {
  const { bounds } = state.raceData.track;
  const padding = 60;
  const availW = canvas.width - padding * 2;
  const availH = canvas.height - padding * 2 - 140; // leave room for banner/bottom bar
  const dataW = bounds.x_max - bounds.x_min;
  const dataH = bounds.y_max - bounds.y_min;
  const scale = Math.min(availW / dataW, availH / dataH);

  state.transform = {
    scale,
    offsetX: padding + (availW - dataW * scale) / 2 - bounds.x_min * scale,
    offsetY: padding + 80 + (availH - dataH * scale) / 2 - bounds.y_min * scale,
  };
}

function toCanvas([x, y]) {
  const t = state.transform;
  // Flip Y: FastF1's Y axis and canvas Y axis run opposite directions,
  // otherwise the track renders upside down.
  return [x * t.scale + t.offsetX, canvas.height - (y * t.scale + t.offsetY)];
}

// ---------------------------------------------------------------------
// Track drawing (static — only needs to run once per resize)
// ---------------------------------------------------------------------
function drawTrack() {
  const {
    inner,
    outer,
    centerline,
    drs_zones,
    sectors,
    start_finish
  } = state.raceData.track;

  // ==========================
  // Track Boundaries
  // ==========================
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 1;

  drawPolyline(inner, false);
  drawPolyline(outer, false);

  // ==========================
  // Center Line
  // ==========================
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;

  drawPolyline(centerline, true);

  // ==========================
  // DRS Zones (toggled with 'D')
  // ==========================
  if (state.showDrsZones) {
    ctx.strokeStyle = "#2ecc40";
    ctx.lineWidth = 5;

    drs_zones.forEach(zone => {

      const [x1, y1] = toCanvas([
        zone.start.x,
        zone.start.y
      ]);

      const [x2, y2] = toCanvas([
        zone.end.x,
        zone.end.y
      ]);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Label
      ctx.fillStyle = "#2ecc40";
      ctx.font = "bold 14px Arial";

      ctx.fillText(
        zone.label || `DRS ${zone.zone}`,
        (x1 + x2) / 2,
        (y1 + y2) / 2 - 8
      );

    });
  }

  // ==========================
  // Sector Labels
  // ==========================
  if (sectors) {
    sectors.forEach(sector => {

        // Hide Sector 3
        if (sector.label === "S3" || sector.label === "3") {
            return;
        }

        const [x, y] = toCanvas([
            sector.position.x,
            sector.position.y
        ]);

        ctx.beginPath();

        ctx.arc(x, y, 6, 0, Math.PI * 2);

        ctx.fillStyle = "#FFD700";
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            sector.label,
            x,
            y - 15
        );
    });
  }

  // ==========================
  // Start / Finish
  // ==========================

  if (start_finish) {

    const [sx, sy] = toCanvas([
      start_finish.x,
      start_finish.y
    ]);

    ctx.beginPath();

    ctx.arc(sx, sy, 8, 0, Math.PI * 2);

    ctx.fillStyle = "#ff0000";

    ctx.fill();

    ctx.fillStyle = "#ffffff";

    ctx.font = "bold 16px Arial";

    ctx.fillText("START", sx, sy - 15);

  }

}
function drawPolyline(points, dashed) {
  if (!points.length) return;
  ctx.save();
  if (dashed) ctx.setLineDash([6, 6]);
  ctx.beginPath();
  points.forEach((p, i) => {
    const [x, y] = toCanvas(p);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------
// Frame interpolation
// ---------------------------------------------------------------------
function findFrameIndex(t) {
  const frames = state.raceData.frames;
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (frames[mid].t <= t) lo = mid; else hi = mid - 1;
  }
  return lo;
}

function getInterpolatedDrivers(t) {
  const frames = state.raceData.frames;
  const i = findFrameIndex(t);
  const fA = frames[i];
  const fB = frames[Math.min(i + 1, frames.length - 1)];
  const span = fB.t - fA.t;
  const frac = span > 0 ? Math.max(0, Math.min(1, (t - fA.t) / span)) : 0;

  const result = {};
  for (const code of Object.keys(fA.drivers)) {
    const a = fA.drivers[code];
    const b = fB.drivers[code] || a;
    result[code] = {
      x: lerp(a.x, b.x, frac),
      y: lerp(a.y, b.y, frac),
      speed: lerp(a.speed, b.speed, frac),
      throttle: lerp(a.throttle, b.throttle, frac),
      brake: lerp(a.brake, b.brake, frac),
      dist: lerp(a.dist, b.dist, frac),
      // discrete fields: no interpolation, just use the earlier frame
      gear: a.gear, drs: a.drs, tyre: a.tyre, tyre_life: a.tyre_life,
      position: a.position, lap: a.lap, rel_dist: a.rel_dist,
    };
  }
  return { drivers: result, lap: fA.lap, weather: fA.weather };
}

function lerp(a, b, frac) { return a + (b - a) * frac; }

// // ---------------------------------------------------------------------
// // Main animation loop
// // ---------------------------------------------------------------------
// function tick(nowMs) {
//   if (!state.raceData) return;

//   if (state.lastTickMs === null) state.lastTickMs = nowMs;
//   const deltaS = (nowMs - state.lastTickMs) / 1000;
//   state.lastTickMs = nowMs;

//   const totalT = state.raceData.frames[state.raceData.frames.length - 1].t;
//   if (state.playing) {
//     state.playheadT = Math.min(totalT, state.playheadT + deltaS * PLAYBACK_SPEEDS[state.speedIndex]);
//     if (state.playheadT >= totalT) state.playing = false;
//   }

//   const frame = getInterpolatedDrivers(state.playheadT);

//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   drawTrack();
//   drawCars(frame);

//   updateLeaderboard(frame);
//   updateWeather(frame);
//   updateDriverInfo(frame);
//   updateTimeLabel(totalT);
//   drawProgressBar(totalT);

//   requestAnimationFrame(tick);
// }

// ---------------------------------------------------------------------
// Main animation loop
// ---------------------------------------------------------------------
function tick(nowMs) {

    if (!state.raceData) return;

    // First frame
    if (state.lastTickMs === null) {
        state.lastTickMs = nowMs;
    }

    // Delta time
    const deltaS = (nowMs - state.lastTickMs) / 1000;
    state.lastTickMs = nowMs;

    // Race duration
    const totalT =
        state.raceData.frames[
            state.raceData.frames.length - 1
        ].t;

    // -------------------------------------------------
    // Playback
    // -------------------------------------------------
    if (state.playing) {

        state.playheadT = Math.min(
            totalT,
            state.playheadT +
            deltaS * PLAYBACK_SPEEDS[state.speedIndex]
        );

        // Replay finished
        if (state.playheadT >= totalT) {

            state.playing = false;

            playPauseIcon.src =
                "/static/images/controls/play.png";

            playPauseIcon.alt = "Play";
        }
    }

    // -------------------------------------------------
    // Current Frame
    // -------------------------------------------------
    const frame =
        getInterpolatedDrivers(state.playheadT);

    // -------------------------------------------------
    // Render
    // -------------------------------------------------
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawTrack();

    drawCars(frame);

    // -------------------------------------------------
    // UI
    // -------------------------------------------------
    updateLeaderboard(frame);

    updateWeather(frame);

    updateDriverInfo(frame);

    updateTimeLabel(totalT);

    drawProgressBar(totalT);

    // -------------------------------------------------
    // Next Frame
    // -------------------------------------------------
    requestAnimationFrame(tick);
}

function drawCars(frame) {
  const colors = state.raceData.driver_colors;
  for (const [code, d] of Object.entries(frame.drivers)) {
    const [cx, cy] = toCanvas([d.x, d.y]);
    const color = colors[code] || "#888";
    const selected = state.selectedDrivers.includes(code);

    ctx.beginPath();
    ctx.arc(cx, cy, selected ? 8 : 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (selected) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    }

    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(code, cx, cy - 12);
  }
}

// ---------------------------------------------------------------------
// Leaderboard panel
// ---------------------------------------------------------------------
function updateLeaderboard(frame) {
  const rows = Object.entries(frame.drivers)
    .filter(([, d]) => d.position != null)
    .sort((a, b) => a[1].position - b[1].position);

  const colors = state.raceData.driver_colors;
  let html = `<div class="lb-title">Leaderboard</div>`;
  for (const [code, d] of rows) {
    const out = d.rel_dist === 1 ? "  OUT" : "";
    const drsOn = d.drs >= 10;
    const selected = state.selectedDrivers.includes(code) ? "selected" : "";
    html += `
      <div class="lb-row ${selected}" data-code="${code}">
        <span class="lb-pos">${d.position}.</span>
        <span class="lb-code" style="color:${selected ? "#000" : colors[code] || "#fff"}">${code}${out}</span>
        <span class="lb-tyre" style="background:${colors[code] || "#888"}">${d.tyre ?? "?"}</span>
        <span class="lb-drs ${drsOn ? "on" : ""}"></span>
      </div>`;
  }
  const panel = document.getElementById("leaderboardPanel");
  panel.innerHTML = html;
  panel.querySelectorAll(".lb-row").forEach(row => {
    row.addEventListener("click", (e) => {
      const code = row.dataset.code;
      if (e.shiftKey) {
        // Shift+click: toggle this driver in/out of the selection
        const idx = state.selectedDrivers.indexOf(code);
        if (idx >= 0) state.selectedDrivers.splice(idx, 1);
        else state.selectedDrivers.push(code);
      } else {
        // Plain click: select just this one (or deselect if it's the only one already selected)
        const onlyThisSelected = state.selectedDrivers.length === 1 && state.selectedDrivers[0] === code;
        state.selectedDrivers = onlyThisSelected ? [] : [code];
      }
    });
  });
}

// // ---------------------------------------------------------------------
// // Weather panel
// // ---------------------------------------------------------------------
// function updateWeather(frame) {
//   const panel = document.getElementById("weatherPanel");
//   if (!frame.weather) { panel.innerHTML = ""; return; }
//   const w = frame.weather;
//   const fmt = (v, suffix = "", p = 1) => (v == null ? "N/A" : `${v.toFixed(p)}${suffix}`);
//   panel.innerHTML = `
//     <div class="wp-title">Weather</div>
//     <div class="wp-row">Track: ${fmt(w.track_temp, "°C")}</div>
//     <div class="wp-row">Air: ${fmt(w.air_temp, "°C")}</div>
//     <div class="wp-row">Humidity: ${fmt(w.humidity, "%", 0)}</div>
//     <div class="wp-row">Wind: ${fmt(w.wind_speed, " km/h")}</div>
//     <div class="wp-row">Rain: ${w.rain_state || "N/A"}</div>
//   `;
// }

// ---------------------------------------------------------------------
// Weather panel
// ---------------------------------------------------------------------
function updateWeather(frame) {
  const panel = document.getElementById("weatherPanel");

  if (!frame.weather) {
    panel.innerHTML = "";
    return;
  }

  const w = frame.weather;
  const fmt = (v, suffix = "", p = 1) =>
    v == null ? "N/A" : `${v.toFixed(p)}${suffix}`;

  panel.innerHTML = `
    <div class="wp-title">Weather</div>

    <div class="wp-row">
      <img src="/static/images/weather/thermometer.png" class="weather-icon" alt="Track Temperature">
      Track: ${fmt(w.track_temp, "°C")}
    </div>

    <div class="wp-row">
      <img src="/static/images/weather/thermometer.png" class="weather-icon" alt="Air Temperature">
      Air: ${fmt(w.air_temp, "°C")}
    </div>

    <div class="wp-row">
      <img src="/static/images/weather/drop.png" class="weather-icon" alt="Humidity">
      Humidity: ${fmt(w.humidity, "%", 0)}
    </div>

    <div class="wp-row">
      <img src="/static/images/weather/wind.png" class="weather-icon" alt="Wind">
      Wind: ${fmt(w.wind_speed, " km/h")}
    </div>

    <div class="wp-row">
      <img src="/static/images/weather/rain.png" class="weather-icon" alt="Rain">
      Rain: ${w.rain_state || "N/A"}
    </div>
  `;
}
// ---------------------------------------------------------------------
// Driver info panel (multi-select — one box per selected driver)
// ---------------------------------------------------------------------

// Approximates the ahead/behind gap the same (rough) way the desktop
// DriverInfoComponent.get_gap_str does: uses race-distance difference
// between neighbors in the position order, converted via a fixed
// reference speed. This is NOT a precise physical gap — same known
// limitation as the desktop version.
function neighborGapLabel(sortedRows, idx, direction) {
  const neighborIdx = idx + direction;
  if (neighborIdx < 0 || neighborIdx >= sortedRows.length) return null;
  const [neighborCode, neighborD] = sortedRows[neighborIdx];
  const [, thisD] = sortedRows[idx];
  if (thisD.dist == null || neighborD.dist == null) return null;

  const distM = Math.abs(thisD.dist - neighborD.dist) / 10.0;
  const timeS = distM / 55.56; // ~200km/h reference speed, matches desktop's approximation
  const sign = direction === -1 ? "+" : "-";
  const label = direction === -1 ? "Ahead" : "Behind";
  return `${label} (${neighborCode}): ${sign}${timeS.toFixed(2)}s (${distM.toFixed(1)}m)`;
}

function updateDriverInfo(frame) {
  const wrapper = document.getElementById("driverInfoWrapper");

  if (state.selectedDrivers.length === 0) {
    wrapper.innerHTML = "";
    return;
  }

  const sortedRows = Object.entries(frame.drivers)
    .filter(([, d]) => d.position != null)
    .sort((a, b) => a[1].position - b[1].position);

  let html = "";
  for (const code of state.selectedDrivers) {
    const d = frame.drivers[code];
    if (!d) continue;

    const idx = sortedRows.findIndex(([c]) => c === code);
    const aheadLabel = neighborGapLabel(sortedRows, idx, -1) || "Ahead: N/A";
    const behindLabel = neighborGapLabel(sortedRows, idx, 1) || "Behind: N/A";

    const color = state.raceData.driver_colors[code] || "#888";
    const drsLabel = d.drs >= 10 ? ["DRS: ON", "#2ecc40"]
                    : d.drs === 8 ? ["DRS: AVAIL", "#f1c40f"]
                    : ["DRS: OFF", "#888"];

    const maxTyreLife = state.raceData.max_tyre_life[String(d.tyre)] || 30;
    const tyreHealth = Math.max(0, Math.min(1, 1 - d.tyre_life / maxTyreLife));
    const tyreColor = tyreHealth > 0.5 ? "#2ecc40" : tyreHealth > 0.25 ? "#f1c40f" : "#e74c3c";

    const thr = Math.max(0, Math.min(1, d.throttle / 100));
    const brk = Math.max(0, Math.min(1, d.brake > 1 ? d.brake / 100 : d.brake));

    html += `
      <div class="driver-info-box" style="border-color:${color}">
        <div class="dip-header" style="background:${color}; color:#000">
          <span>Driver: ${code}</span>
          <span class="dip-close" data-code="${code}">✕</span>
        </div>
        <div class="dip-body">
          <div class="dip-row">Speed: ${d.speed.toFixed(0)} km/h</div>
          <div class="dip-row">Gear: ${d.gear}</div>
          <div class="dip-row" style="color:${drsLabel[1]}; font-weight:bold">${drsLabel[0]}</div>
          <div class="dip-row dim">${aheadLabel}</div>
          <div class="dip-row dim">${behindLabel}</div>
          <div class="dip-tyre-health">
            <div class="dip-row">Tyre ${d.tyre} · Life ${Math.round(d.tyre_life)} laps</div>
            <div class="dip-tyre-bar-track"><div class="dip-tyre-bar-fill" style="width:${tyreHealth * 100}%; background:${tyreColor}"></div></div>
          </div>
          <div class="dip-bars">
            <div class="dip-bar-col">
              <div class="dip-bar-track"><div class="dip-bar-fill" style="height:${thr * 100}%"></div></div>
              <div class="dip-bar-label">THR</div>
            </div>
            <div class="dip-bar-col">
              <div class="dip-bar-track"><div class="dip-bar-fill brake" style="height:${brk * 100}%"></div></div>
              <div class="dip-bar-label">BRK</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  wrapper.innerHTML = html;
  wrapper.querySelectorAll(".dip-close").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      state.selectedDrivers = state.selectedDrivers.filter(c => c !== code);
    });
  });
}

// // ---------------------------------------------------------------------
// // Progress bar (timeline with lap ticks + flag/DNF markers)
// // ---------------------------------------------------------------------
// function drawProgressBar(totalT) {
//   const w = progressCanvas.width, h = progressCanvas.height;
//   progressCtx.clearRect(0, 0, w, h);

//   progressCtx.fillStyle = "#1a1a1a";
//   progressCtx.fillRect(0, h * 0.3, w, h * 0.4);

//   const progressW = (state.playheadT / totalT) * w;
//   progressCtx.fillStyle = "#2ecc40";
//   progressCtx.fillRect(0, h * 0.3, progressW, h * 0.4);

//   // Lap ticks (approximate — even spacing across race duration)
//   const totalLaps = state.raceData.meta.total_laps;
//   progressCtx.strokeStyle = "#555";
//   for (let lap = 1; lap <= totalLaps; lap++) {
//     const x = (lap / totalLaps) * w;
//     progressCtx.beginPath();
//     progressCtx.moveTo(x, h * 0.25);
//     progressCtx.lineTo(x, h * 0.75);
//     progressCtx.stroke();
//   }

//   // Event markers
//   const eventColors = {
//     yellow_flag: "#ffdc00", red_flag: "#dc1e1e", safety_car: "#ff8c00", vsc: "#ffa500",
//   };
//   for (const ev of state.raceData.events) {
//     const x1 = (ev.t / totalT) * w;
//     if (ev.type === "dnf") {
//       progressCtx.strokeStyle = "#dc1e1e";
//       progressCtx.lineWidth = 2;
//       progressCtx.beginPath();
//       progressCtx.moveTo(x1 - 3, 2); progressCtx.lineTo(x1 + 3, 8);
//       progressCtx.moveTo(x1 + 3, 2); progressCtx.lineTo(x1 - 3, 8);
//       progressCtx.stroke();
//     } else {
//       const x2 = ((ev.end_t ?? ev.t + 5) / totalT) * w;
//       progressCtx.fillStyle = eventColors[ev.type] || "#888";
//       progressCtx.fillRect(x1, 0, Math.max(2, x2 - x1), 6);
//     }
//   }

//   // Playhead
//   const playX = (state.playheadT / totalT) * w;
//   progressCtx.strokeStyle = "#fff";
//   progressCtx.lineWidth = 2;
//   progressCtx.beginPath();
//   progressCtx.moveTo(playX, 0);
//   progressCtx.lineTo(playX, h);
//   progressCtx.stroke();
// }

// progressCanvas.addEventListener("click", (e) => {
//   if (!state.raceData) return;
//   const rect = progressCanvas.getBoundingClientRect();
//   const frac = (e.clientX - rect.left) / rect.width;
//   const totalT = state.raceData.frames[state.raceData.frames.length - 1].t;
//   state.playheadT = Math.max(0, Math.min(totalT, frac * totalT));
// });

// function updateTimeLabel(totalT) {
//   const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
//   document.getElementById("timeLabel").textContent = `${fmt(state.playheadT)} / ${fmt(totalT)}`;
// }

// ---------------------------------------------------------------------
// Progress Bar (Centered Timeline)
// ---------------------------------------------------------------------
function drawProgressBar(totalT) {
    // Sync canvas resolution with displayed size
    const rect = progressCanvas.getBoundingClientRect();

    if (
        progressCanvas.width !== Math.floor(rect.width) ||
        progressCanvas.height !== Math.floor(rect.height)
    ) {
        progressCanvas.width = Math.floor(rect.width);
        progressCanvas.height = Math.floor(rect.height);
    }

    const w = progressCanvas.width;
    const h = progressCanvas.height;

    progressCtx.clearRect(0, 0, w, h);

    // -------------------------------------------------
    // Timeline occupies only middle 50% of canvas
    // -------------------------------------------------
    // const LEFT_PAD = w * 0.20;
    // const RIGHT_PAD = w * 0.20;
    // const BAR_W = w - LEFT_PAD - RIGHT_PAD;
    const LEFT_PAD = 0;
    const RIGHT_PAD = 0;
    const BAR_W = w;
    // -------------------------------------------------
    // Background Bar
    // -------------------------------------------------
    progressCtx.fillStyle = "#1a1a1a";
    progressCtx.fillRect(
        LEFT_PAD,
        h * 0.35,
        BAR_W,
        h * 0.30
    );

    // -------------------------------------------------
    // Progress Fill
    // -------------------------------------------------
    const progressW = (state.playheadT / totalT) * BAR_W;

    progressCtx.fillStyle = "#2ecc40";
    progressCtx.fillRect(
        LEFT_PAD,
        h * 0.35,
        progressW,
        h * 0.30
    );

    // -------------------------------------------------
    // Lap Ticks
    // -------------------------------------------------
    const totalLaps = state.raceData.meta.total_laps;

    progressCtx.strokeStyle = "#555";
    progressCtx.lineWidth = 1;

    for (let lap = 1; lap <= totalLaps; lap++) {

        const x =
            LEFT_PAD +
            (lap / totalLaps) * BAR_W;

        progressCtx.beginPath();
        progressCtx.moveTo(x, h * 0.30);
        progressCtx.lineTo(x, h * 0.70);
        progressCtx.stroke();
    }

    // -------------------------------------------------
    // Event Markers
    // -------------------------------------------------
    const eventColors = {
        yellow_flag: "#ffdc00",
        red_flag: "#ff3030",
        safety_car: "#ff8c00",
        vsc: "#ffa500"
    };

    for (const ev of state.raceData.events) {

        const x1 =
            LEFT_PAD +
            (ev.t / totalT) * BAR_W;

        if (ev.type === "dnf") {

            progressCtx.strokeStyle = "#ff3030";
            progressCtx.lineWidth = 2;

            progressCtx.beginPath();

            progressCtx.moveTo(x1 - 4, 4);
            progressCtx.lineTo(x1 + 4, 10);

            progressCtx.moveTo(x1 + 4, 4);
            progressCtx.lineTo(x1 - 4, 10);

            progressCtx.stroke();

        } else {

            const x2 =
                LEFT_PAD +
                ((ev.end_t ?? ev.t + 5) / totalT) * BAR_W;

            progressCtx.fillStyle =
                eventColors[ev.type] || "#888";

            progressCtx.fillRect(
                x1,
                0,
                Math.max(2, x2 - x1),
                6
            );
        }
    }

    // -------------------------------------------------
    // Playhead
    // -------------------------------------------------
    const playX =
        LEFT_PAD +
        (state.playheadT / totalT) * BAR_W;

    progressCtx.strokeStyle = "#ffffff";
    progressCtx.lineWidth = 2;

    progressCtx.beginPath();
    progressCtx.moveTo(playX, 0);
    progressCtx.lineTo(playX, h);
    progressCtx.stroke();
}
// ---------------------------------------------------------------------
// Click to Seek
// ---------------------------------------------------------------------
progressCanvas.addEventListener("click", (e) => {

    if (!state.raceData) return;

    const rect = progressCanvas.getBoundingClientRect();

    const x = e.clientX - rect.left;

    const fraction = Math.max(
        0,
        Math.min(1, x / rect.width)
    );

    const totalT =
        state.raceData.frames[
            state.raceData.frames.length - 1
        ].t;

    state.playheadT = fraction * totalT;
});

// ---------------------------------------------------------------------
// Time Label
// ---------------------------------------------------------------------
function updateTimeLabel(totalT) {

    const fmt = (s) => {

        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);

        return `${mins}:${String(secs).padStart(2, "0")}`;
    };

    document.getElementById("timeLabel").textContent =
        `${fmt(state.playheadT)} / ${fmt(totalT)}`;
}














// // ---------------------------------------------------------------------
// // Controls
// // ---------------------------------------------------------------------
// const playPauseBtn = document.getElementById("playPauseBtn");
// function togglePlay() {
//   state.playing = !state.playing;
//   playPauseBtn.textContent = state.playing ? "⏸" : "▶";
// }
// playPauseBtn.addEventListener("click", togglePlay);

// document.getElementById("rewindBtn").addEventListener("click", () => {
//   state.playheadT = Math.max(0, state.playheadT - 10);
// });
// document.getElementById("forwardBtn").addEventListener("click", () => {
//   const totalT = state.raceData.frames[state.raceData.frames.length - 1].t;
//   state.playheadT = Math.min(totalT, state.playheadT + 10);
// });

// function setSpeedIndex(i) {
//   state.speedIndex = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, i));
//   document.getElementById("speedLabel").textContent = `${PLAYBACK_SPEEDS[state.speedIndex]}x`;
// }
// document.getElementById("speedUpBtn").addEventListener("click", () => setSpeedIndex(state.speedIndex + 1));
// document.getElementById("speedDownBtn").addEventListener("click", () => setSpeedIndex(state.speedIndex - 1));

// window.addEventListener("keydown", (e) => {
//   if (!state.raceData) return;
//   const totalT = state.raceData.frames[state.raceData.frames.length - 1].t;
//   switch (e.code) {
//     case "Space": e.preventDefault(); togglePlay(); break;
//     case "ArrowLeft": state.playheadT = Math.max(0, state.playheadT - 5); break;
//     case "ArrowRight": state.playheadT = Math.min(totalT, state.playheadT + 5); break;
//     case "ArrowUp": setSpeedIndex(state.speedIndex + 1); break;
//     case "ArrowDown": setSpeedIndex(state.speedIndex - 1); break;
//     case "Digit1": setSpeedIndex(PLAYBACK_SPEEDS.indexOf(0.5)); break;
//     case "Digit2": setSpeedIndex(PLAYBACK_SPEEDS.indexOf(1.0)); break;
//     case "Digit3": setSpeedIndex(PLAYBACK_SPEEDS.indexOf(2.0)); break;
//     case "Digit4": setSpeedIndex(PLAYBACK_SPEEDS.indexOf(4.0)); break;
//     case "KeyR": state.playheadT = 0; break;
//     case "KeyD": state.showDrsZones = !state.showDrsZones; break;
//     case "KeyB":
//       state.showProgressBar = !state.showProgressBar;
//       document.querySelector(".bottom-bar").classList.toggle("hidden", !state.showProgressBar);
//       break;
//     case "KeyH":
//       document.getElementById("controlsLegend").classList.toggle("hidden");
//       break;
//   }
// });

// ---------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------

const playPauseBtn = document.getElementById("playPauseBtn");
const playPauseIcon = document.getElementById("playPauseIcon");

// ----------------------------------------------------
// Play / Pause
// ----------------------------------------------------
function togglePlay() {

    state.playing = !state.playing;

    if (state.playing) {

        playPauseIcon.src = "/static/images/controls/pause.png";
        playPauseIcon.alt = "Pause";

    } else {

        playPauseIcon.src = "/static/images/controls/play.png";
        playPauseIcon.alt = "Play";

    }
}

playPauseBtn.addEventListener("click", togglePlay);

// ----------------------------------------------------
// Rewind
// ----------------------------------------------------
document.getElementById("rewindBtn").addEventListener("click", () => {

    state.playheadT = Math.max(0, state.playheadT - 10);

});

// ----------------------------------------------------
// Forward
// ----------------------------------------------------
document.getElementById("forwardBtn").addEventListener("click", () => {

    const totalT =
        state.raceData.frames[state.raceData.frames.length - 1].t;

    state.playheadT =
        Math.min(totalT, state.playheadT + 10);

});

// ----------------------------------------------------
// Playback Speed
// ----------------------------------------------------
function setSpeedIndex(i) {

    state.speedIndex = Math.max(
        0,
        Math.min(PLAYBACK_SPEEDS.length - 1, i)
    );

    document.getElementById("speedLabel").textContent =
        `${PLAYBACK_SPEEDS[state.speedIndex]}x`;
}

document.getElementById("speedUpBtn").addEventListener("click", () => {

    setSpeedIndex(state.speedIndex + 1);

});

document.getElementById("speedDownBtn").addEventListener("click", () => {

    setSpeedIndex(state.speedIndex - 1);

});

// ----------------------------------------------------
// Keyboard Shortcuts
// ----------------------------------------------------
window.addEventListener("keydown", (e) => {

    if (!state.raceData) return;

    const totalT =
        state.raceData.frames[state.raceData.frames.length - 1].t;

    switch (e.code) {
        case "Space":
            e.preventDefault();
            togglePlay();

            break;

        case "ArrowLeft":
            state.playheadT =
                Math.max(0, state.playheadT - 5);

            break;

        case "ArrowRight":
            state.playheadT =
                Math.min(totalT, state.playheadT + 5);

            break;

        case "ArrowUp":
            setSpeedIndex(state.speedIndex + 1);

            break;

        case "ArrowDown":
            setSpeedIndex(state.speedIndex - 1);

            break;

        case "Digit1":
            setSpeedIndex(PLAYBACK_SPEEDS.indexOf(0.5));

            break;

        case "Digit2":
            setSpeedIndex(PLAYBACK_SPEEDS.indexOf(1));

            break;

        case "Digit3":
            setSpeedIndex(PLAYBACK_SPEEDS.indexOf(2));

            break;

        case "Digit4":
            setSpeedIndex(PLAYBACK_SPEEDS.indexOf(4));

            break;

        case "KeyR":
            state.playheadT = 0;

            break;

        case "KeyD":
            state.showDrsZones = !state.showDrsZones;

            break;

        case "KeyB":
            state.showProgressBar = !state.showProgressBar;

            document
                .querySelector(".bottom-bar")
                .classList.toggle(
                    "hidden",
                    !state.showProgressBar
                );

            break;

        case "KeyH":
            document
                .getElementById("controlsLegend")
                .classList.toggle("hidden");

            break;
    }

});

initPicker();
setSpeedIndex(state.speedIndex);