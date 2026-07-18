// // F1 Race Replay — frontend
// //
// // Data model: `raceData.frames` arrives pre-downsampled from the backend
// // (see backend/src/serialize.py) at raceData.frame_rate fps. We keep an
// // internal `playheadT` in seconds and interpolate between the two nearest
// // frames every animation tick, so motion looks smooth at 60fps even
// // though the underlying samples are much coarser.

// const PLAYBACK_SPEEDS = [0.1, 0.2, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0, 128.0, 256.0];

// // Turns raw backend/network error text into a plain-English message for
// // the picker screen. The original error is still shown, smaller, below —
// // useful for you to debug, without confusing anyone else using this.

// function friendlyErrorMessage(rawMessage) {
//   const msg = rawMessage || "";

//   let friendly;
//   if (/does not exist for this event/i.test(msg)) {
//     friendly = "This session isn't available for the selected round — try a different session type or round.";
//   } else if (/No valid laps found|No valid telemetry data found/i.test(msg)) {
//     friendly = "This practice session doesn't have enough data to replay — it may have been rained off, cancelled, or too short. Try a different session.";
//   } else if (/Failed to load session/i.test(msg)) {
//     friendly = "Couldn't load this session. It may not have happened yet, or FastF1 doesn't have data for it.";
//   } else if (/Failed to build telemetry|Failed to build qualifying data/i.test(msg)) {
//     friendly = "Something went wrong processing this session's data. Try again, or pick a different round.";
//   } else if (/HTTP 404/i.test(msg)) {
//     friendly = "That wasn't found. Double check the year and round.";
//   } else if (/HTTP 502/i.test(msg)) {
//     friendly = "The server had trouble reaching F1's data source. Try again in a moment.";
//   } else if (/Failed to fetch|NetworkError/i.test(msg)) {
//     friendly = "Couldn't reach the server — check that it's running.";
//   } else {
//     friendly = "Something went wrong loading this session.";
//   }

//   return `${friendly}<br><span class="error-detail">${msg}</span>`;
// }
// const state = {
//   raceData: null,
//   playheadT: 0,
//   playing: false,
//   speedIndex: PLAYBACK_SPEEDS.indexOf(1.0),
//   selectedDrivers: [], // was selectedDriver (single) — now a list, like desktop's window.selected_drivers
//   lastTickMs: null,
//   transform: null, // {scale, offsetX, offsetY, flipY}
//   showDrsZones: true,    // toggled by 'D'
//   showProgressBar: true, // toggled by 'B'
//   showSectors: true,
//   leaderboardGapMode: 'off',  // ← ADD THIS LINE. 'off' | 'leader' | 'interval'
// };

// // Picker screen
// const yearSelect = document.getElementById("yearSelect");
// const roundSelect = document.getElementById("roundSelect");
// const sessionTypeSelect = document.getElementById("sessionTypeSelect");
// const pickerStatus = document.getElementById("pickerStatus");

// // ---------------------------------------------------------------------
// // Home dashboard
// // ---------------------------------------------------------------------
// function showToast(message) {
//   const toast = document.getElementById("homeToast");
//   toast.textContent = message;
//   toast.classList.remove("hidden");
//   clearTimeout(showToast._t);
//   showToast._t = setTimeout(() => toast.classList.add("hidden"), 2200);
// }

// function goToPickerScreen() {
//   document.getElementById("homePage").classList.add("hidden");
//   document.getElementById("picker").classList.remove("hidden");
// }

// function goToHomeScreen() {
//   document.getElementById("picker").classList.add("hidden");
//   document.getElementById("homePage").classList.remove("hidden");
//   pickerStatus.textContent = "";
// }

// document.getElementById("heroStartBtn").addEventListener("click", goToPickerScreen);
// document.getElementById("pickerHomeBtn").addEventListener("click", goToHomeScreen);

// document.getElementById("heroBrowseBtn").addEventListener("click", () => {
//   document.getElementById("recentSessionsSection").scrollIntoView({ behavior: "smooth" });
// });

// // document.querySelectorAll(".nav-item").forEach(btn => {
// //   btn.addEventListener("click", () => {
// //     const target = btn.dataset.nav;
// //     if (target === "home") return;
// //     if (target === "replay") { goToPickerScreen(); return; }
// //     if (target === "sessions") {
// //       document.getElementById("recentSessionsSection").scrollIntoView({ behavior: "smooth" });
// //       return;
// //     }
// //     showToast(`${btn.textContent.trim()} isn't built yet — coming soon.`);
// //   });
// // });

// const NAV_LABELS = {
//   sessions: "Sessions",
//   drivers: "Drivers",
//   telemetry: "Telemetry",
//   results: "Results",
//   compare: "Compare",
//   settings: "Settings",
//   help: "Help",
// };


// document.querySelectorAll(".nav-item").forEach(btn => {
//   btn.addEventListener("click", () => {
//     const target = btn.dataset.nav;
//     if (target === "home") return;
//     if (target === "replay") { goToPickerScreen(); return; }
//     if (target === "sessions") {
//       document.getElementById("recentSessionsSection").scrollIntoView({ behavior: "smooth" });
//       return;
//     }
//     if (target === "telemetry") {
//       document.getElementById("homePage").classList.add("hidden");
//       document.getElementById("telemetryPanel").classList.remove("hidden");
//       initTelemetryPanel();
//       return;
//     }
//     if (target === "drivers") {
//     document.getElementById("homePage").classList.add("hidden");
//     document.getElementById("telemetryPanel").classList.remove("hidden");
//     initTelemetryPanel();
//     return;
// }
//     const label = NAV_LABELS[target] || target;
//     showToast(`${label} isn't built yet — coming soon.`);
//   });
// });

// document.getElementById("telemetryBackBtn").addEventListener("click", () => {
//   document.getElementById("telemetryPanel").classList.add("hidden");
//   document.getElementById("homePage").classList.remove("hidden");
// });


// const FLAG_EMOJI = {
//   "Australia": "🇦🇺", "China": "🇨🇳", "Japan": "🇯🇵", "United States": "🇺🇸",
//   "Canada": "🇨🇦", "Monaco": "🇲🇨", "Spain": "🇪🇸", "Austria": "🇦🇹",
//   "United Kingdom": "🇬🇧", "Belgium": "🇧🇪", "Hungary": "🇭🇺", "Netherlands": "🇳🇱",
//   "Italy": "🇮🇹", "Azerbaijan": "🇦🇿", "Singapore": "🇸🇬", "Mexico": "🇲🇽",
//   "Brazil": "🇧🇷", "Qatar": "🇶🇦", "United Arab Emirates": "🇦🇪",
// };

// async function loadRecentSessions(year) {
//   const grid = document.getElementById("recentSessionsGrid");
//   grid.innerHTML = `<p class="sessions-loading">Loading recent sessions…</p>`;

//   try {
//     const res = await fetch(`/api/schedule/${year}`);
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     const weekends = await res.json();

//     const today = new Date();
//     const past = weekends
//       .filter(w => new Date(w.date) <= today)
//       .sort((a, b) => new Date(b.date) - new Date(a.date))
//       .slice(0, 8);

//     if (past.length === 0) {
//       grid.innerHTML = `<p class="sessions-loading">No completed sessions yet for ${year} — try a different year above.</p>`;
//       return;
//     }

//     grid.innerHTML = past.map(w => `
//       <div class="session-card" data-round="${w.round_number}" data-year="${year}">
//         <span class="session-card-play">▶</span>
//         <div class="session-card-flag">${FLAG_EMOJI[w.country] || "🏁"}</div>
//         <div class="session-card-title">${w.event_name}</div>
//         <div class="session-card-sub">${w.country}</div>
//         <div class="session-card-meta">
//           <span>${w.date}</span>
//           <span class="session-card-type">RACE</span>
//         </div>
//       </div>`).join("");

//     grid.querySelectorAll(".session-card").forEach(card => {
//       card.addEventListener("click", async () => {
//         const y = card.dataset.year;
//         const r = card.dataset.round;
//         goToPickerScreen();
//         yearSelect.value = y;
//         await loadSchedule();
//         roundSelect.value = r;
//         updateSessionOptions();
//         sessionTypeSelect.value = "R";
//         submitLoadSession();
//       });
//     });
//   } catch (e) {
//     grid.innerHTML = `<p class="sessions-loading">Couldn't load sessions: ${e.message}</p>`;
//   }
// }

// function initHomePage() {
//   const homeYearSelect = document.getElementById("homeYearSelect");
//   const thisYear = new Date().getFullYear();
//   for (let y = thisYear; y >= 2018; y--) {
//     const opt = document.createElement("option");
//     opt.value = y;
//     opt.textContent = y;
//     homeYearSelect.appendChild(opt);
//   }
//   homeYearSelect.addEventListener("change", () => loadRecentSessions(homeYearSelect.value));
//   loadRecentSessions(thisYear);

//   const updateClocks = () => {
//     const t = new Date().toLocaleTimeString();
//     document.getElementById("homeTopClock").textContent = t;
//     document.getElementById("homeLocalTime").textContent = t;
//   };
//   updateClocks();
//   setInterval(updateClocks, 1000);
// }

// initHomePage();

// function initPicker() {
//   const thisYear = new Date().getFullYear();
//   for (let y = thisYear; y >= 2018; y--) {
//     const opt = document.createElement("option");
//     opt.value = y;
//     opt.textContent = y;
//     yearSelect.appendChild(opt);
//   }
//   yearSelect.addEventListener("change", loadSchedule);
//   loadSchedule();
// }

// function updateLocalTimeDisplay() {
//   const el = document.getElementById("localTimeValue");
//   if (!el) return;
//   el.textContent = new Date().toLocaleTimeString();
// }
// updateLocalTimeDisplay();
// setInterval(updateLocalTimeDisplay, 1000);

// // Keyed by round_number, holds each weekend's raw FastF1 EventFormat
// // string (e.g. "conventional", "sprint_qualifying", "sprint_shootout",
// // "sprint") — used to filter which sessions are selectable per round.
// let currentSchedule = {};

// // FastF1 has used different EventFormat names for the sprint session
// // across seasons (see f1_data.py's list_sprints, which handles the same
// // variation). Any of these means the weekend has a sprint race + some
// // form of sprint qualifying/shootout.
// const SPRINT_FORMATS = new Set(["sprint", "sprint_qualifying", "sprint_shootout"]);

// async function loadSchedule() {
//   roundSelect.innerHTML = "<option>Loading…</option>";
//   try {
//     const res = await fetch(`/api/schedule/${yearSelect.value}`);
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     const weekends = await res.json();
//     roundSelect.innerHTML = "";
//     currentSchedule = {};
//     for (const w of weekends) {
//       currentSchedule[w.round_number] = w.type;
//       const opt = document.createElement("option");
//       opt.value = w.round_number;
//       opt.textContent = `${w.round_number}: ${w.event_name}`;
//       roundSelect.appendChild(opt);
//     }
//     updateSessionOptions();
//   } catch (e) {
//     roundSelect.innerHTML = "<option>Failed to load</option>";
//     pickerStatus.textContent = friendlyErrorMessage(`Couldn't load schedule: ${e.message}`);
//   }
// }

// const COMPOUND_COLORS = {
//   SOFT: "#ff3333",
//   MEDIUM: "#ffd400",
//   HARD: "#e8e8e8",
//   INTERMEDIATE: "#2ecc40",
//   WET: "#00aeef",
//   UNKNOWN: "#888888",
// };

// function renderStrategy(data) {
//   const totalLaps = data.total_laps;

//   let html = `
//     <div class="strategy-header-row">
//       <div class="strategy-header">${data.meta.event_name} — Pit Stops</div>
//       <div class="strategy-total-stops">
//         TOTAL PIT STOPS<br><span>${data.total_pit_stops}</span>
//       </div>
//     </div>`;

//   for (const drv of data.drivers) {
//     html += `<div class="strategy-row">
//       <span class="strategy-code" style="color:${drv.color}">${drv.code}</span>
//       <div class="strategy-bar">`;

//     for (const stint of drv.stints) {
//       const widthPct = (stint.lap_count / totalLaps) * 100;
//       const color = COMPOUND_COLORS[stint.compound] || COMPOUND_COLORS.UNKNOWN;
//       const freshClass = stint.fresh ? "" : "strategy-used";

//       html += `<div class="strategy-segment ${freshClass}"
//                     style="width:${widthPct}%; ${stint.fresh ? `background:${color}` : `--used-color:${color}`}"
//                     title="${stint.compound} · Laps ${stint.start_lap}-${stint.end_lap} (${stint.lap_count} laps) · ${stint.fresh ? "New" : "Used"}">
//                   <span class="strategy-segment-label">${stint.end_lap}</span>
//                 </div>`;
//     }

//     html += `</div><span class="strategy-total-laps">${drv.laps_completed}</span></div>`;
//   }

//   html += `
//     <div class="strategy-legend">
//       <span><i class="strategy-legend-swatch" style="background:#e8e8e8"></i>New</span>
//       <span><i class="strategy-legend-swatch strategy-used" style="--used-color:#e8e8e8"></i>Used</span>
//     </div>`;

//   document.getElementById("strategyContent").innerHTML = html;
// }

// // Show/hide Sprint + Sprint Qualifying depending on whether the selected
// // round actually has a sprint format — prevents picking a combination
// // FastF1 will reject (e.g. "Session type 'SQ' does not exist for this
// // event" for a normal race weekend).
// function updateSessionOptions() {
//   const format = currentSchedule[roundSelect.value];
//   const isSprintWeekend = SPRINT_FORMATS.has(format);

//   const sprintOption = sessionTypeSelect.querySelector('option[value="S"]');
//   const sprintQualiOption = sessionTypeSelect.querySelector('option[value="SQ"]');

//   sprintOption.disabled = !isSprintWeekend;
//   sprintQualiOption.disabled = !isSprintWeekend;
//   sprintOption.textContent = isSprintWeekend ? "Sprint" : "Sprint (not available this weekend)";
//   sprintQualiOption.textContent = isSprintWeekend ? "Sprint Qualifying" : "Sprint Qualifying (not available this weekend)";

//   // If the currently-selected session is now invalid for this round,
//   // fall back to Race rather than leaving an invalid option selected.
//   if (sessionTypeSelect.value === "S" && !isSprintWeekend) sessionTypeSelect.value = "R";
//   if (sessionTypeSelect.value === "SQ" && !isSprintWeekend) sessionTypeSelect.value = "R";
// }

// roundSelect.addEventListener("change", updateSessionOptions);

// async function submitLoadSession() {
//   const year = yearSelect.value;
//   const round = roundSelect.value;
//   const sessionType = sessionTypeSelect.value;

//   if (!round || isNaN(Number(round))) {
//     pickerStatus.textContent = "Please wait for the round list to finish loading, then pick one.";
//     return;
//   }

//   const isQuali = sessionType === "Q" || sessionType === "SQ";
//   pickerStatus.textContent = isQuali
//     ? "Loading qualifying results…"
//     : "Loading replay data — this can take a while the first time (building telemetry cache)…";

//   try {
//     if (isQuali) {
//       const res = await fetch(`/api/quali?year=${year}&round=${round}&session_type=${sessionType}`);
//       if (!res.ok) {
//         const detail = await res.json().catch(() => ({}));
//         throw new Error(detail.detail || `HTTP ${res.status}`);
//       }
//       const data = await res.json();
//       showQualiResults(data);
//     } else {
//       const res = await fetch(`/api/replay?year=${year}&round=${round}&session_type=${sessionType}&fps=8`);
//       if (!res.ok) {
//         const detail = await res.json().catch(() => ({}));
//         throw new Error(detail.detail || `HTTP ${res.status}`);
//       }
//       state.raceData = await res.json();
//       startReplay();
//     }
//   } catch (e) {
//     pickerStatus.innerHTML = friendlyErrorMessage(e.message);
//   }
// }

// document.getElementById("loadBtn").addEventListener("click", submitLoadSession);

// function showQualiResults(data) {
//   document.getElementById("picker").classList.add("hidden");
//   document.getElementById("qualiResults").classList.remove("hidden");

//   const m = data.meta;
//   document.getElementById("qualiBanner").innerHTML =
//     `<b>${m.event_name} — ${m.session_type === "SQ" ? "Sprint Qualifying" : "Qualifying"}</b><br>` +
//     `${m.circuit_name}, ${m.country} · ${m.date}`;

//   const fmt = (s) => {
//     if (s == null) return "-";
//     const sec = parseFloat(s);
//     const mins = Math.floor(sec / 60);
//     const rem = (sec % 60).toFixed(3);
//     return mins > 0 ? `${mins}:${rem.padStart(6, "0")}` : `${rem}s`;
//   };

//   let html = `
//     <table class="quali-results-table">
//       <thead>
//         <tr><th>Pos</th><th>Driver</th><th>Q1</th><th>Q2</th><th>Q3</th></tr>
//       </thead>
//       <tbody>`;

//   for (const row of data.results) {
//     const [r, g, b] = row.color || [136, 136, 136];
//     html += `
//       <tr>
//         <td>${row.position}</td>
//         <td style="color:rgb(${r},${g},${b}); font-weight:700">${row.code}</td>
//         <td>${fmt(row.Q1)}</td>
//         <td>${fmt(row.Q2)}</td>
//         <td>${fmt(row.Q3)}</td>
//       </tr>`;
//   }

//   html += `</tbody></table>`;
//   document.getElementById("qualiTable").innerHTML = html;
// }

// document.getElementById("backToPickerBtn2").addEventListener("click", () => {
//   document.getElementById("qualiResults").classList.add("hidden");
//   document.getElementById("picker").classList.remove("hidden");
//   pickerStatus.textContent = "";
// });


// document.getElementById("backToPickerBtn").addEventListener("click", () => {
//   state.playing = false;
//   document.getElementById("replay").classList.add("hidden");
//   document.getElementById("picker").classList.remove("hidden");
//   pickerStatus.textContent = "";
// });

// document.getElementById("strategyBtn").addEventListener("click", async () => {
//   const m = state.raceData.meta;
//   document.getElementById("replay").classList.add("hidden");
//   document.getElementById("strategyPanel").classList.remove("hidden");
//   document.getElementById("strategyContent").innerHTML = "Loading…";

//   try {
//     const res = await fetch(`/api/strategy?year=${m.year}&round=${m.round}&session_type=${m.session_type}`);
//     if (!res.ok) {
//       const detail = await res.json().catch(() => ({}));
//       throw new Error(detail.detail || `HTTP ${res.status}`);
//     }
//     const data = await res.json();
//     renderStrategy(data);
//   } catch (e) {
//     document.getElementById("strategyContent").innerHTML = friendlyErrorMessage(e.message);
//   }
// });

// document.getElementById("strategyBackBtn").addEventListener("click", () => {
//   document.getElementById("strategyPanel").classList.add("hidden");
//   document.getElementById("replay").classList.remove("hidden");
// });

// // Replay setup
// const canvas = document.getElementById("trackCanvas");
// const ctx = canvas.getContext("2d");
// const progressCanvas = document.getElementById("progressCanvas");
// const progressCtx = progressCanvas.getContext("2d");

// function startReplay() {
//   document.getElementById("picker").classList.add("hidden");
//   document.getElementById("replay").classList.remove("hidden");

//   state.playheadT = 0;
//   state.playing = true;
//   state.selectedDrivers = [];
//   state.lastTickMs = null;

//   resizeCanvases();
//   computeTransform();
//   renderSessionBanner();
//   requestAnimationFrame(tick);
// }

// function renderSessionBanner() {
//   const m = state.raceData.meta;
//   document.getElementById("sessionBanner").innerHTML =
//     `<b>${m.event_name}</b> — ${m.circuit_name}, ${m.country}<br>` +
//     `${m.date} · Round ${m.round} · ${m.total_laps} laps`;
// }

// function resizeCanvases() {
//   canvas.width = window.innerWidth;
//   canvas.height = window.innerHeight;
//   progressCanvas.width = progressCanvas.clientWidth;
//   progressCanvas.height = progressCanvas.clientHeight;
// }
// window.addEventListener("resize", () => {
//   resizeCanvases();
//   if (state.raceData) computeTransform();
// });

// function computeTransform() {
//   const { bounds } = state.raceData.track;
//   const padding = 60;
//   const availW = canvas.width - padding * 2;
//   const availH = canvas.height - padding * 2 - 140; // leave room for banner/bottom bar
//   const dataW = bounds.x_max - bounds.x_min;
//   const dataH = bounds.y_max - bounds.y_min;
//   const scale = Math.min(availW / dataW, availH / dataH);

//   state.transform = {
//     scale,
//     offsetX: padding + (availW - dataW * scale) / 2 - bounds.x_min * scale,
//     offsetY: padding + 80 + (availH - dataH * scale) / 2 - bounds.y_min * scale,
//   };
// }

// function toCanvas([x, y]) {
//   const t = state.transform;
//   // Flip Y: FastF1's Y axis and canvas Y axis run opposite directions,
//   // otherwise the track renders upside down.
//   return [x * t.scale + t.offsetX, canvas.height - (y * t.scale + t.offsetY)];
// }

// // Track drawing (static — only needs to run once per resize)
// function drawTrack() {
//   const {
//     inner,
//     outer,
//     centerline,
//     drs_zones,
//     sectors,
//     sector_segments,
//     start_finish,
//     corners
//   } = state.raceData.track;

//   // Track Boundaries
//   ctx.strokeStyle = "#3a3a3a";
//   ctx.lineWidth = 1;

//   drawPolyline(inner, false);
//   drawPolyline(outer, false);

//   // Center Line
//   ctx.strokeStyle = "#666";
//   ctx.lineWidth = 2;

//   drawPolyline(centerline, true);

//   // DRS Zones (toggled with 'D') — dashed green, matches broadcast style
//   if (state.showDrsZones) {
//     ctx.save();
//     ctx.strokeStyle = "#00ff66";
//     ctx.lineWidth = 4;
//     ctx.setLineDash([10, 8]);

//     drs_zones.forEach(zone => {
//       const [x1, y1] = toCanvas([zone.start_offset.x, zone.start_offset.y]);
//       const [x2, y2] = toCanvas([zone.end_offset.x, zone.end_offset.y]);
      

//       ctx.beginPath();
//       ctx.moveTo(x1, y1);
//       ctx.lineTo(x2, y2);
//       ctx.stroke();

//       ctx.fillStyle = "#00ff66";
//       ctx.font = "bold 14px Arial";
//       ctx.fillText(
//         zone.label || `DRS ${zone.zone}`,
//         (x1 + x2) / 2,
//         (y1 + y2) / 2 - 8
//       );
//     });

//     ctx.restore(); // undo setLineDash so it doesn't leak into later drawing
//   }

//   // Sector-colored segments + rotated labels (toggled with 'S')
//   if (state.showSectors) {
//     if (sector_segments) {
//       sector_segments.forEach(seg => {
//         ctx.strokeStyle = seg.color;
//         ctx.lineWidth = 6;
//         drawPolyline(seg.centerline, false);
//       });
//     }

//     if (sectors) {
//       sectors.forEach(sector => {
//         const [x, y] = toCanvas([sector.position.x, sector.position.y]);
//         const [tx, ty] = toCanvas([sector.tangent_point.x, sector.tangent_point.y]);
//         const angle = Math.atan2(ty - y, tx - x);

//         ctx.save();
//         ctx.translate(x, y);
//         ctx.rotate(angle);
//         ctx.fillStyle = sector.color || "#FFD700";
//         ctx.font = "bold 15px Arial";
//         ctx.textAlign = "center";
//         ctx.fillText(`SECTOR ${sector.id}`, 0, -10);
//         ctx.restore();
//       });
//     }
//   }


//   // Start / Finish
//   if (start_finish) {
//     const [sx, sy] = toCanvas([start_finish.x, start_finish.y]);

//     ctx.beginPath();
//     ctx.arc(sx, sy, 8, 0, Math.PI * 2);
//     ctx.fillStyle = "#ff0000";
//     ctx.fill();

//     ctx.fillStyle = "#ffffff";
//     ctx.font = "bold 16px Arial";
//     ctx.textAlign = "center";
//     ctx.fillText("START", sx, sy - 15);
//   }
// }

// function drawPolyline(points, dashed) {
//   if (!points.length) return;
//   ctx.save();
//   if (dashed) ctx.setLineDash([6, 6]);
//   ctx.beginPath();
//   points.forEach((p, i) => {
//     const [x, y] = toCanvas(p);
//     if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
//   });
//   ctx.stroke();
//   ctx.restore();
// }

// // Frame interpolation
// function findFrameIndex(t) {
//   const frames = state.raceData.frames;
//   let lo = 0, hi = frames.length - 1;
//   while (lo < hi) {
//     const mid = (lo + hi + 1) >> 1;
//     if (frames[mid].t <= t) lo = mid; else hi = mid - 1;
//   }
//   return lo;
// }

// function getInterpolatedDrivers(t) {
//   const frames = state.raceData.frames;
//   const i = findFrameIndex(t);
//   const fA = frames[i];
//   const fB = frames[Math.min(i + 1, frames.length - 1)];
//   const span = fB.t - fA.t;
//   const frac = span > 0 ? Math.max(0, Math.min(1, (t - fA.t) / span)) : 0;

//   const result = {};
//   for (const code of Object.keys(fA.drivers)) {
//     const a = fA.drivers[code];
//     const b = fB.drivers[code] || a;
//     result[code] = {
//       x: lerp(a.x, b.x, frac),
//       y: lerp(a.y, b.y, frac),
//       speed: lerp(a.speed, b.speed, frac),
//       throttle: lerp(a.throttle, b.throttle, frac),
//       brake: lerp(a.brake, b.brake, frac),
//       dist: lerp(a.dist, b.dist, frac),
//       // discrete/object fields: no interpolation, just use the earlier frame
//       gear: a.gear, drs: a.drs, tyre: a.tyre, tyre_life: a.tyre_life,
//       position: a.position, lap: a.lap, rel_dist: a.rel_dist,
//       in_pit: a.in_pit, ahead: a.ahead, behind: a.behind,
//     };
//   }
//   return { drivers: result, lap: fA.lap, weather: fA.weather };
// }

// function lerp(a, b, frac) { return a + (b - a) * frac; }



// // Main animation loop
// function tick(nowMs) {

//     if (!state.raceData) return;

//     // First frame
//     if (state.lastTickMs === null) {
//         state.lastTickMs = nowMs;
//     }

//     // Delta time
//     const deltaS = (nowMs - state.lastTickMs) / 1000;
//     state.lastTickMs = nowMs;

//     // Race duration
//     const totalT =
//         state.raceData.frames[
//             state.raceData.frames.length - 1
//         ].t;

//     // Playback
//     if (state.playing) {

//         state.playheadT = Math.min(
//             totalT,
//             state.playheadT +
//             deltaS * PLAYBACK_SPEEDS[state.speedIndex]
//         );

//         // Replay finished
//         if (state.playheadT >= totalT) {

//             state.playing = false;

//             playPauseIcon.src =
//                 "/static/images/controls/play.png";

//             playPauseIcon.alt = "Play";
//         }
//     }

//     // Current Frame
//     const frame =
//         getInterpolatedDrivers(state.playheadT);

//     // Render
//     ctx.clearRect(
//         0,
//         0,
//         canvas.width,
//         canvas.height
//     );

//     drawTrack();

//     drawCars(frame);

//     // UI
//     updateLapCounter(frame);

//     updateLeaderboard(frame);

//     updateWeather(frame);

//     updateDriverInfo(frame);

//     updateTimeLabel(totalT);

//     drawProgressBar(totalT);

//     // Next Frame
//     requestAnimationFrame(tick);
// }

// function drawCars(frame) {
//   const colors = state.raceData.driver_colors;
//   for (const [code, d] of Object.entries(frame.drivers)) {
//     const [cx, cy] = toCanvas([d.x, d.y]);
//     const color = colors[code] || "#888";
//     const selected = state.selectedDrivers.includes(code);

//     ctx.beginPath();
//     ctx.arc(cx, cy, selected ? 8 : 6, 0, Math.PI * 2);
//     ctx.fillStyle = color;
//     ctx.fill();
//     if (selected) {
//       ctx.lineWidth = 2;
//       ctx.strokeStyle = "#fff";
//       ctx.stroke();
//     }

//     ctx.fillStyle = "#fff";
//     ctx.font = "11px sans-serif";
//     ctx.textAlign = "center";
//     ctx.fillText(code, cx, cy - 12);
//   }
// }

// // Same distance→time approximation used everywhere else in this app
// // (neighborGapLabel, driver info panel) — not a precise physical gap.
// function computeGapSeconds(distA, distB) {
//   if (distA == null || distB == null) return null;
//   const distM = Math.abs(distA - distB) / 10.0;
//   return distM / 55.56;
// }

// function buildStatusBadges(d) {
//   const badges = [];
//   if (d.rel_dist === 1) badges.push('<span class="lb-badge out">OUT</span>');
//   if (d.in_pit) badges.push('<span class="lb-badge pit">PIT</span>');
//   if (d.drs >= 10) badges.push('<span class="lb-badge drs">DRS</span>');
//   return badges.join("");
// }

// function updateLapCounter(frame) {
//   const totalLaps = state.raceData.meta.total_laps;
//   const currentLap = Math.min(frame.lap ?? 1, totalLaps);
//   document.getElementById("lapCounter").textContent = `Lap: ${currentLap}/${totalLaps}`;
// }

// // Tyre compound → single-letter badge + color, matching common F1
// // broadcast graphics convention (not official FIA colors, just widely
// // recognized: red=soft, yellow=medium, white=hard, green=inter, blue=wet).
// const TYRE_BADGE = {
//   0: { letter: "C5", color: "#a349a4" },
//   1: { letter: "S", color: "#ff3333" },
//   2: { letter: "M", color: "#ffd400" },
//   3: { letter: "H", color: "#e8e8e8" },
//   4: { letter: "I", color: "#2ecc40" },
//   5: { letter: "W", color: "#00aeef" },
// };

// function buildTyreBadge(d) {
//   const info = TYRE_BADGE[d.tyre] || { letter: "?", color: "#888" };
//   const textColor = info.color === "#e8e8e8" || info.color === "#ffd400" ? "#000" : "#fff";
//   return `
//     <span class="lb-tyre-badge" style="background:${info.color}; color:${textColor}" title="Tyre life: ${Math.round(d.tyre_life)} laps">
//       ${info.letter}<span class="lb-tyre-life">${Math.round(d.tyre_life)}</span>
//     </span>`;
// }

// // Leaderboard panel
// function updateLeaderboard(frame) {
//   const rows = Object.entries(frame.drivers)
//     .filter(([, d]) => d.position != null)
//     .sort((a, b) => a[1].position - b[1].position);

//   const colors = state.raceData.driver_colors;
//   const mode = state.leaderboardGapMode;

//   let html = `
//     <div class="lb-header">
//       <span class="lb-title">Leaderboard</span>
//       <span class="lb-toggles">
//         <button class="lb-toggle-btn ${mode === "interval" ? "active" : ""}" data-mode="interval" title="Interval — gap to car ahead">I</button>
//         <button class="lb-toggle-btn ${mode === "leader" ? "active" : ""}" data-mode="leader" title="Gap to leader">L</button>
//       </span>
//     </div>`;

//   for (let i = 0; i < rows.length; i++) {
//     const [code, d] = rows[i];
//     const selected = state.selectedDrivers.includes(code) ? "selected" : "";

//     let gapText = "";
//     if (mode === "leader") {
//       gapText = i === 0 ? "-" : `+${computeGapSeconds(rows[0][1].dist, d.dist)?.toFixed(1) ?? "?"}s`;
//     } else if (mode === "interval") {
//       gapText = i === 0 ? "-" : `+${computeGapSeconds(rows[i - 1][1].dist, d.dist)?.toFixed(1) ?? "?"}s`;
//     }

//     html += `
//       <div class="lb-row ${selected}" data-code="${code}">
//         <span class="lb-pos">${d.position}.</span>
//         <span class="lb-code" style="color:${selected ? "#000" : colors[code] || "#fff"}">${code}</span>
//         ${mode !== "off" ? `<span class="lb-gap">${gapText}</span>` : ""}
//         ${buildTyreBadge(d)}
//         <span class="lb-status">${buildStatusBadges(d)}</span>
//       </div>`;
//   }

//   const panel = document.getElementById("leaderboardPanel");
//   panel.innerHTML = html;

//   panel.querySelectorAll(".lb-row").forEach(row => {
//     row.addEventListener("click", (e) => {
//       const code = row.dataset.code;
//       if (e.shiftKey) {
//         const idx = state.selectedDrivers.indexOf(code);
//         if (idx >= 0) state.selectedDrivers.splice(idx, 1);
//         else state.selectedDrivers.push(code);
//       } else {
//         const onlyThisSelected = state.selectedDrivers.length === 1 && state.selectedDrivers[0] === code;
//         state.selectedDrivers = onlyThisSelected ? [] : [code];
//       }
//     });
//   });

//   panel.querySelectorAll(".lb-toggle-btn").forEach(btn => {
//     btn.addEventListener("click", (e) => {
//       e.stopPropagation();
//       const clickedMode = btn.dataset.mode;
//       state.leaderboardGapMode = state.leaderboardGapMode === clickedMode ? "off" : clickedMode;
//     });
//   });
// }
// // Weather panel
// function updateWeather(frame) {
//   const panel = document.getElementById("weatherPanel");

//   if (!frame.weather) {
//     panel.innerHTML = "";
//     return;
//   }

//   const w = frame.weather;
//   const fmt = (v, suffix = "", p = 1) =>
//     v == null ? "N/A" : `${v.toFixed(p)}${suffix}`;

//   panel.innerHTML = `
//     <div class="wp-title">Weather</div>

//     <div class="wp-row">
//       <img src="/static/images/weather/thermometer.png" class="weather-icon" alt="Track Temperature">
//       Track: ${fmt(w.track_temp, "°C")}
//     </div>

//     <div class="wp-row">
//       <img src="/static/images/weather/thermometer.png" class="weather-icon" alt="Air Temperature">
//       Air: ${fmt(w.air_temp, "°C")}
//     </div>

//     <div class="wp-row">
//       <img src="/static/images/weather/drop.png" class="weather-icon" alt="Humidity">
//       Humidity: ${fmt(w.humidity, "%", 0)}
//     </div>

//     <div class="wp-row">
//       <img src="/static/images/weather/wind.png" class="weather-icon" alt="Wind">
//       Wind: ${fmt(w.wind_speed, " km/h")}
//     </div>

//     <div class="wp-row">
//       <img src="/static/images/weather/rain.png" class="weather-icon" alt="Rain">
//       Rain: ${w.rain_state || "N/A"}
//     </div>
//   `;
// }
// // Driver info panel (multi-select — one box per selected driver)

// // Approximates the ahead/behind gap the same (rough) way the desktop
// // DriverInfoComponent.get_gap_str does: uses race-distance difference
// // between neighbors in the position order, converted via a fixed
// // reference speed. This is NOT a precise physical gap — same known
// // limitation as the desktop version.
// function neighborGapLabel(sortedRows, idx, direction) {
//   const neighborIdx = idx + direction;
//   if (neighborIdx < 0 || neighborIdx >= sortedRows.length) return null;
//   const [neighborCode, neighborD] = sortedRows[neighborIdx];
//   const [, thisD] = sortedRows[idx];
//   if (thisD.dist == null || neighborD.dist == null) return null;

//   const distM = Math.abs(thisD.dist - neighborD.dist) / 10.0;
//   const timeS = distM / 55.56; // ~200km/h reference speed, matches desktop's approximation
//   const sign = direction === -1 ? "+" : "-";
//   const label = direction === -1 ? "Ahead" : "Behind";
//   return `${label} (${neighborCode}): ${sign}${timeS.toFixed(2)}s (${distM.toFixed(1)}m)`;
// }

// function updateDriverInfo(frame) {

//     const wrapper = document.getElementById("driverInfoWrapper");

//     if (state.selectedDrivers.length === 0) {
//         wrapper.innerHTML = "";
//         return;
//     }

//     wrapper.innerHTML = "";

//     const tyreNames = {
//         0: "🟣 C5",
//         1: "🔴 SOFT",
//         2: "🟡 MED",
//         3: "⚪ HARD",
//         4: "🟢 INT",
//         5: "🔵 WET"
//     };

//     const sortedRows = Object.entries(frame.drivers)
//         .filter(([, d]) => d.position != null)
//         .sort((a, b) => a[1].position - b[1].position);

//     for (const code of state.selectedDrivers) {

//         const d = frame.drivers[code];

//         if (!d) continue;

//         const color =
//             state.raceData.driver_colors[code] || "#888";

//         const tyre =
//             tyreNames[d.tyre] || d.tyre;

//         const throttle =
//             Math.round(d.throttle);

//         const brake =
//             Math.round(d.brake > 1 ? d.brake : d.brake * 100);


//         const drs =
//             d.drs >= 10
//                 ? '<span style="color:#2ecc40">DRS ●</span>'
//                 : '<span style="color:#888">DRS ○</span>';

//         const ahead = d.ahead
//           ? `Ahead (${d.ahead.driver}): +${d.ahead.gap.toFixed(2)}s (${d.ahead.distance.toFixed(1)}m)`
//           : "Ahead: N/A";
//         const behind = d.behind
//           ? `Behind (${d.behind.driver}): -${d.behind.gap.toFixed(2)}s (${d.behind.distance.toFixed(1)}m)`
//           : "Behind: N/A";

//         // Tyre life as a bar, same row style as THR/BRK/ERS —
//         // % remaining, color-coded green/yellow/red.
//         const maxTyreLife = state.raceData.max_tyre_life[String(d.tyre)] || 30;
//         const tyreHealth = Math.max(0, Math.min(1, 1 - d.tyre_life / maxTyreLife));
//         const tyrePct = Math.round(tyreHealth * 100);
//         const tyreColor = tyreHealth > 0.5 ? "#2ecc40" : tyreHealth > 0.25 ? "#f1c40f" : "#e74c3c";

//         wrapper.innerHTML += `

// <div class="driver-panel">

//     <div class="driver-header">

//         <div class="team-strip"
//              style="background:${color}">
//         </div>

//         <div class="driver-code">
//             ${code}
//         </div>

//         <div class="driver-position">
//             P${d.position}
//         </div>

//     </div>

//     <div class="driver-speed">
//         ${Math.round(d.speed)} km/h
//     </div>

//     <div class="driver-status">

//         <span>${tyre}</span>

//         <span>Gear ${d.gear}</span>

//         <span>${drs}</span>

//     </div>

//     <div class="telemetry-row">

//         <span>THR</span>

//         <div class="telemetry-track">

//             <div class="telemetry-fill throttle"
//                  style="width:${throttle}%">
//             </div>

//         </div>

//         <span>${throttle}%</span>

//     </div>

//     <div class="telemetry-row">

//         <span>BRK</span>

//         <div class="telemetry-track">

//             <div class="telemetry-fill brake"
//                  style="width:${brake}%">
//             </div>

//         </div>

//         <span>${brake}%</span>

//     </div>

//     <div class="telemetry-row">

//         <span>TYRE</span>

//         <div class="telemetry-track">

//             <div class="telemetry-fill"
//                  style="width:${tyrePct}%; background:${tyreColor}">
//             </div>

//         </div>

//         <span>${Math.round(d.tyre_life)} laps</span>

//     </div>

//     <div class="gap-row ahead">
//         ${ahead}
//     </div>

//     <div class="gap-row behind">
//         ${behind}
//     </div>

// </div>

// `;
//     }
// }


// // Progress Bar (Centered Timeline)
// function drawProgressBar(totalT) {
//     // Sync canvas resolution with displayed size
//     const rect = progressCanvas.getBoundingClientRect();

//     if (
//         progressCanvas.width !== Math.floor(rect.width) ||
//         progressCanvas.height !== Math.floor(rect.height)
//     ) {
//         progressCanvas.width = Math.floor(rect.width);
//         progressCanvas.height = Math.floor(rect.height);
//     }

//     const w = progressCanvas.width;
//     const h = progressCanvas.height;

//     progressCtx.clearRect(0, 0, w, h);


//     const LEFT_PAD = 0;
//     const RIGHT_PAD = 0;
//     const BAR_W = w;

//     // Background Bar
//     progressCtx.fillStyle = "#1a1a1a";
//     progressCtx.fillRect(
//         LEFT_PAD,
//         h * 0.35,
//         BAR_W,
//         h * 0.30
//     );

//     // Progress Fill
//     const progressW = (state.playheadT / totalT) * BAR_W;

//     progressCtx.fillStyle = "#2ecc40";
//     progressCtx.fillRect(
//         LEFT_PAD,
//         h * 0.35,
//         progressW,
//         h * 0.30
//     );

//     // Lap Ticks
//     const totalLaps = state.raceData.meta.total_laps;

//     progressCtx.strokeStyle = "#555";
//     progressCtx.lineWidth = 1;

//     for (let lap = 1; lap <= totalLaps; lap++) {

//         const x =
//             LEFT_PAD +
//             (lap / totalLaps) * BAR_W;

//         progressCtx.beginPath();
//         progressCtx.moveTo(x, h * 0.30);
//         progressCtx.lineTo(x, h * 0.70);
//         progressCtx.stroke();
//     }

//     // Event Markers
//     const eventColors = {
//         yellow_flag: "#ffdc00",
//         red_flag: "#ff3030",
//         safety_car: "#ff8c00",
//         vsc: "#ffa500"
//     };

//     for (const ev of state.raceData.events) {

//         const x1 =
//             LEFT_PAD +
//             (ev.t / totalT) * BAR_W;

//         if (ev.type === "dnf") {

//             progressCtx.strokeStyle = "#ff3030";
//             progressCtx.lineWidth = 2;

//             progressCtx.beginPath();

//             progressCtx.moveTo(x1 - 4, 4);
//             progressCtx.lineTo(x1 + 4, 10);

//             progressCtx.moveTo(x1 + 4, 4);
//             progressCtx.lineTo(x1 - 4, 10);

//             progressCtx.stroke();

//         } else {

//             const x2 =
//                 LEFT_PAD +
//                 ((ev.end_t ?? ev.t + 5) / totalT) * BAR_W;

//             progressCtx.fillStyle =
//                 eventColors[ev.type] || "#888";

//             progressCtx.fillRect(
//                 x1,
//                 0,
//                 Math.max(2, x2 - x1),
//                 6
//             );
//         }
//     }

//     // Playhead
//     const playX =
//         LEFT_PAD +
//         (state.playheadT / totalT) * BAR_W;

//     progressCtx.strokeStyle = "#ffffff";
//     progressCtx.lineWidth = 2;

//     progressCtx.beginPath();
//     progressCtx.moveTo(playX, 0);
//     progressCtx.lineTo(playX, h);
//     progressCtx.stroke();
// }
// // Click to Seek
// progressCanvas.addEventListener("click", (e) => {

//     if (!state.raceData) return;

//     const rect = progressCanvas.getBoundingClientRect();

//     const x = e.clientX - rect.left;

//     const fraction = Math.max(
//         0,
//         Math.min(1, x / rect.width)
//     );

//     const totalT =
//         state.raceData.frames[
//             state.raceData.frames.length - 1
//         ].t;

//     state.playheadT = fraction * totalT;
// });


// // Time Label
// function updateTimeLabel(totalT) {

//     const fmt = (s) => {

//         const mins = Math.floor(s / 60);
//         const secs = Math.floor(s % 60);

//         return `${mins}:${String(secs).padStart(2, "0")}`;
//     };

//     document.getElementById("timeLabel").textContent =
//         `${fmt(state.playheadT)} / ${fmt(totalT)}`;
// }


// // Controls
// const playPauseBtn = document.getElementById("playPauseBtn");
// const playPauseIcon = document.getElementById("playPauseIcon");

// // Play / Pause
// function togglePlay() {

//     state.playing = !state.playing;

//     if (state.playing) {

//         playPauseIcon.src = "/static/images/controls/pause.png";
//         playPauseIcon.alt = "Pause";

//     } else {

//         playPauseIcon.src = "/static/images/controls/play.png";
//         playPauseIcon.alt = "Play";

//     }
// }

// playPauseBtn.addEventListener("click", togglePlay);

// // Rewind
// document.getElementById("rewindBtn").addEventListener("click", () => {

//     state.playheadT = Math.max(0, state.playheadT - 10);

// });

// // Forward
// document.getElementById("forwardBtn").addEventListener("click", () => {

//     const totalT =
//         state.raceData.frames[state.raceData.frames.length - 1].t;

//     state.playheadT =
//         Math.min(totalT, state.playheadT + 10);

// });

// // Playback Speed
// function setSpeedIndex(i) {

//     state.speedIndex = Math.max(
//         0,
//         Math.min(PLAYBACK_SPEEDS.length - 1, i)
//     );

//     document.getElementById("speedLabel").textContent =
//         `${PLAYBACK_SPEEDS[state.speedIndex]}x`;
// }

// document.getElementById("speedUpBtn").addEventListener("click", () => {

//     setSpeedIndex(state.speedIndex + 1);

// });

// document.getElementById("speedDownBtn").addEventListener("click", () => {

//     setSpeedIndex(state.speedIndex - 1);

// });


// //Keyboard shortcuts
// window.addEventListener("keydown", (e) => {

//     if (!state.raceData) return;

//     const totalT =
//         state.raceData.frames[state.raceData.frames.length - 1].t;

//     switch (e.code) {
//         case "Space":
//             e.preventDefault();
//             togglePlay();

//             break;

//         case "ArrowLeft":
//             state.playheadT =
//                 Math.max(0, state.playheadT - 5);

//             break;

//         case "ArrowRight":
//             state.playheadT =
//                 Math.min(totalT, state.playheadT + 5);

//             break;

//         case "ArrowUp":
//             setSpeedIndex(state.speedIndex + 1);

//             break;

//         case "ArrowDown":
//             setSpeedIndex(state.speedIndex - 1);

//             break;

//         case "Digit1":
//             setSpeedIndex(PLAYBACK_SPEEDS.indexOf(0.5));

//             break;

//         case "Digit2":
//             setSpeedIndex(PLAYBACK_SPEEDS.indexOf(1));

//             break;

//         case "Digit3":
//             setSpeedIndex(PLAYBACK_SPEEDS.indexOf(2));

//             break;

//         case "Digit4":
//             setSpeedIndex(PLAYBACK_SPEEDS.indexOf(4));

//             break;

//         case "KeyR":
//             state.playheadT = 0;

//             break;

//         case "KeyD":
//             state.showDrsZones = !state.showDrsZones;

//             break;

//         case "KeyS":
//             state.showSectors = !state.showSectors;

//             break;

//         case "KeyB":
//             state.showProgressBar = !state.showProgressBar;

//             document
//                 .querySelector(".bottom-bar")
//                 .classList.toggle(
//                     "hidden",
//                     !state.showProgressBar
//                 );

//             break;

//         case "KeyH":
//             document
//                 .getElementById("controlsLegend")
//                 .classList.toggle("hidden");

//             break;
//     }

// });

// // Telemetry comparison panel
// let teleInitialized = false;
// let teleSchedule = {};

// function initTelemetryPanel() {
//   if (teleInitialized) return;
//   teleInitialized = true;

//   const yearSel = document.getElementById("teleYearSelect");
//   const thisYear = new Date().getFullYear();
//   for (let y = thisYear; y >= 2018; y--) {
//     const opt = document.createElement("option");
//     opt.value = y; opt.textContent = y;
//     yearSel.appendChild(opt);
//   }

//   yearSel.addEventListener("change", teleLoadSchedule);
//   document.getElementById("teleRoundSelect").addEventListener("change", teleLoadDrivers);
//   document.getElementById("teleSessionSelect").addEventListener("change", teleLoadDrivers);
//   document.getElementById("teleCompareBtn").addEventListener("click", teleRunCompare);

//   teleLoadSchedule();
// }

// async function teleLoadSchedule() {
//   const roundSel = document.getElementById("teleRoundSelect");
//   roundSel.innerHTML = "<option>Loading…</option>";
//   try {
//     const year = document.getElementById("teleYearSelect").value;
//     const res = await fetch(`/api/schedule/${year}`);
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     const weekends = await res.json();
//     roundSel.innerHTML = "";
//     for (const w of weekends) {
//       const opt = document.createElement("option");
//       opt.value = w.round_number;
//       opt.textContent = `${w.round_number}: ${w.event_name}`;
//       roundSel.appendChild(opt);
//     }
//     teleLoadDrivers();
//   } catch (e) {
//     roundSel.innerHTML = "<option>Failed to load</option>";
//   }
// }

// async function teleLoadDrivers() {
//   const driverASel = document.getElementById("teleDriverASelect");
//   const driverBSel = document.getElementById("teleDriverBSelect");
//   const status = document.getElementById("telemetryStatus");
//   driverASel.innerHTML = "<option>Loading…</option>";
//   driverBSel.innerHTML = "<option>Loading…</option>";
//   status.innerHTML = "";

//   const year = document.getElementById("teleYearSelect").value;
//   const round = document.getElementById("teleRoundSelect").value;
//   const sessionType = document.getElementById("teleSessionSelect").value;
//   if (!round || isNaN(Number(round))) return;

//   try {
//     const res = await fetch(`/api/drivers?year=${year}&round=${round}&session_type=${sessionType}`);
//     if (!res.ok) {
//       const detail = await res.json().catch(() => ({}));
//       throw new Error(detail.detail || `HTTP ${res.status}`);
//     }
//     const drivers = await res.json();
//     const optionsHtml = drivers.map(d => `<option value="${d.code}">${d.code} — ${d.name}</option>`).join("");
//     driverASel.innerHTML = optionsHtml;
//     driverBSel.innerHTML = optionsHtml;
//     if (drivers.length > 1) driverBSel.selectedIndex = 1;
//   } catch (e) {
//     driverASel.innerHTML = "<option>Failed to load</option>";
//     driverBSel.innerHTML = "<option>Failed to load</option>";
//     status.innerHTML = friendlyErrorMessage(e.message);
//   }
// }

// async function teleRunCompare() {
//   const status = document.getElementById("telemetryStatus");
//   const resultsEl = document.getElementById("telemetryResults");
//   status.textContent = "Loading telemetry…";
//   resultsEl.classList.add("hidden");

//   const year = document.getElementById("teleYearSelect").value;
//   const round = document.getElementById("teleRoundSelect").value;
//   const sessionType = document.getElementById("teleSessionSelect").value;
//   const driverA = document.getElementById("teleDriverASelect").value;
//   const driverB = document.getElementById("teleDriverBSelect").value;

//   if (!driverA || !driverB) {
//     status.textContent = "Pick two drivers to compare.";
//     return;
//   }
//   if (driverA === driverB) {
//     status.textContent = "Pick two different drivers.";
//     return;
//   }

//   try {
//     const res = await fetch(`/api/telemetry/compare?year=${year}&round=${round}&session_type=${sessionType}&driver_a=${driverA}&driver_b=${driverB}`);
//     if (!res.ok) {
//       const detail = await res.json().catch(() => ({}));
//       throw new Error(detail.detail || `HTTP ${res.status}`);
//     }
//     const data = await res.json();
//     status.textContent = "";
//     renderTelemetryCompare(data);
//   } catch (e) {
//     status.innerHTML = friendlyErrorMessage(e.message);
//   }
// }

// function fmtLapTime(seconds) {
//   if (seconds == null) return "-";
//   const mins = Math.floor(seconds / 60);
//   const rem = (seconds % 60).toFixed(3);
//   return `${mins}:${rem.padStart(6, "0")}`;
// }

// function drawTelemetryLine(canvasId, seriesA, seriesB, colorA, colorB, minY, maxY) {
//   const canvas = document.getElementById(canvasId);
//   const rect = canvas.getBoundingClientRect();
//   canvas.width = Math.floor(rect.width);
//   canvas.height = Math.floor(rect.height);
//   const c = canvas.getContext("2d");
//   const w = canvas.width, h = canvas.height;
//   c.clearRect(0, 0, w, h);

//   const range = maxY - minY || 1;
//   const toY = (v) => h - ((v - minY) / range) * h;
//   const toX = (i, len) => (i / (len - 1)) * w;

//   const drawSeries = (series, color) => {
//     c.strokeStyle = color;
//     c.lineWidth = 2;
//     c.beginPath();
//     series.forEach((v, i) => {
//       const x = toX(i, series.length);
//       const y = toY(v);
//       if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
//     });
//     c.stroke();
//   };

//   drawSeries(seriesA, colorA);
//   drawSeries(seriesB, colorB);
// }

// function renderTelemetryCompare(data) {
//   const a = data.driver_a, b = data.driver_b;
//   const colorA = state.raceData?.driver_colors?.[a.driver] || "#00aeef";
//   const colorB = state.raceData?.driver_colors?.[b.driver] || "#ff3333";

//   document.getElementById("teleAInfo").innerHTML =
//     `<b style="color:${colorA}">${a.driver}</b> · Lap ${a.lap_number} · ${fmtLapTime(a.lap_time)} · ${a.compound}`;
//   document.getElementById("teleBInfo").innerHTML =
//     `<b style="color:${colorB}">${b.driver}</b> · Lap ${b.lap_number} · ${fmtLapTime(b.lap_time)} · ${b.compound}`;

//   document.getElementById("telemetryResults").classList.remove("hidden");

//   const speedMax = Math.max(...a.speed, ...b.speed) * 1.05;
//   drawTelemetryLine("teleSpeedCanvas", a.speed, b.speed, colorA, colorB, 0, speedMax);
//   drawTelemetryLine("teleThrottleCanvas", a.throttle, b.throttle, colorA, colorB, 0, 100);
//   drawTelemetryLine("teleBrakeCanvas", a.brake, b.brake, colorA, colorB, 0, 100);

//   const sectorRows = ["sector1", "sector2", "sector3"].map((key, i) => {
//     const ta = a.sector_times[key], tb = b.sector_times[key];
//     const delta = (ta != null && tb != null) ? (ta - tb) : null;
//     const deltaText = delta == null ? "-" : `${delta >= 0 ? "+" : ""}${delta.toFixed(3)}s`;
//     const deltaColor = delta == null ? "#999" : delta < 0 ? "#2ecc40" : "#ff4444";
//     return `<div class="telemetry-sector-row">
//       <span>Sector ${i + 1}</span>
//       <span style="color:${colorA}">${ta != null ? ta.toFixed(3) + "s" : "-"}</span>
//       <span style="color:${colorB}">${tb != null ? tb.toFixed(3) + "s" : "-"}</span>
//       <span style="color:${deltaColor}">${deltaText}</span>
//     </div>`;
//   }).join("");

//   document.getElementById("teleSectorTable").innerHTML = `
//     <div class="telemetry-sector-row" style="font-weight:700; color:#9aa1ad;">
//       <span>Sector</span><span>${a.driver}</span><span>${b.driver}</span><span>Delta (A − B)</span>
//     </div>
//     ${sectorRows}`;
// }

// initPicker();
// setSpeedIndex(state.speedIndex);









// F1 Race Replay — frontend
//
// Data model: `raceData.frames` arrives pre-downsampled from the backend
// (see backend/src/serialize.py) at raceData.frame_rate fps. We keep an
// internal `playheadT` in seconds and interpolate between the two nearest
// frames every animation tick, so motion looks smooth at 60fps even
// though the underlying samples are much coarser.

const PLAYBACK_SPEEDS = [0.1, 0.2, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0, 128.0, 256.0];

// Turns raw backend/network error text into a plain-English message for
// the picker screen. The original error is still shown, smaller, below —
// useful for you to debug, without confusing anyone else using this.

function friendlyErrorMessage(rawMessage) {
  const msg = rawMessage || "";

  let friendly;
  if (/does not exist for this event/i.test(msg)) {
    friendly = "This session isn't available for the selected round — try a different session type or round.";
  } else if (/No valid laps found|No valid telemetry data found/i.test(msg)) {
    friendly = "This practice session doesn't have enough data to replay — it may have been rained off, cancelled, or too short. Try a different session.";
  } else if (/Failed to load session/i.test(msg)) {
    friendly = "Couldn't load this session. It may not have happened yet, or FastF1 doesn't have data for it.";
  } else if (/Failed to build telemetry|Failed to build qualifying data/i.test(msg)) {
    friendly = "Something went wrong processing this session's data. Try again, or pick a different round.";
  } else if (/HTTP 404/i.test(msg)) {
    friendly = "That wasn't found. Double check the year and round.";
  } else if (/HTTP 502/i.test(msg)) {
    friendly = "The server had trouble reaching F1's data source. Try again in a moment.";
  } else if (/Failed to fetch|NetworkError/i.test(msg)) {
    friendly = "Couldn't reach the server — check that it's running.";
  } else {
    friendly = "Something went wrong loading this session.";
  }

  return `${friendly}<br><span class="error-detail">${msg}</span>`;
}

// Reads an error response body and returns a readable string message,
// regardless of what shape `detail` comes back as. FastAPI can send:
//   - a plain string:      {"detail": "No valid laps found"}
//   - a validation array:  {"detail": [{"msg": "...", "loc": [...]}, ...]}
//   - some other object:   {"detail": {...}}
// Passing a non-string straight into `new Error(...)` silently stringifies
// it to "[object Object]", which is what was showing up on the picker
// screen — this normalizes it into something actually readable instead.
async function extractApiErrorMessage(res) {
  const body = await res.json().catch(() => ({}));
  const detail = body.detail;

  if (!detail) return `HTTP ${res.status}`;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map(item => (typeof item === "string" ? item : item?.msg || JSON.stringify(item)))
      .join("; ");
  }

  if (typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return String(detail);
}

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
  showSectors: true,
  leaderboardGapMode: 'off',  // ← ADD THIS LINE. 'off' | 'leader' | 'interval'
};

// Picker screen
const yearSelect = document.getElementById("yearSelect");
const roundSelect = document.getElementById("roundSelect");
const sessionTypeSelect = document.getElementById("sessionTypeSelect");
const pickerStatus = document.getElementById("pickerStatus");

// ---------------------------------------------------------------------
// Home dashboard
// ---------------------------------------------------------------------
function showToast(message) {
  const toast = document.getElementById("homeToast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function goToPickerScreen() {
  document.getElementById("homePage").classList.add("hidden");
  document.getElementById("picker").classList.remove("hidden");
}

function goToHomeScreen() {
  document.getElementById("picker").classList.add("hidden");
  document.getElementById("homePage").classList.remove("hidden");
  pickerStatus.textContent = "";
}

document.getElementById("heroStartBtn").addEventListener("click", goToPickerScreen);
document.getElementById("pickerHomeBtn").addEventListener("click", goToHomeScreen);

document.getElementById("heroBrowseBtn").addEventListener("click", () => {
  document.getElementById("recentSessionsSection").scrollIntoView({ behavior: "smooth" });
});

const NAV_LABELS = {
  sessions: "Sessions",
  drivers: "Drivers",
  telemetry: "Telemetry",
  results: "Results",
  compare: "Compare",
  settings: "Settings",
  help: "Help",
};


document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.nav;
    if (target === "home") return;
    if (target === "replay") { goToPickerScreen(); return; }
    if (target === "sessions") {
      document.getElementById("recentSessionsSection").scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (target === "telemetry") {
      document.getElementById("homePage").classList.add("hidden");
      document.getElementById("telemetryPanel").classList.remove("hidden");
      initTelemetryPanel();
      return;
    }
    const label = NAV_LABELS[target] || target;
    showToast(`${label} isn't built yet — coming soon.`);
  });
});

document.getElementById("telemetryBackBtn").addEventListener("click", () => {
  document.getElementById("telemetryPanel").classList.add("hidden");
  document.getElementById("homePage").classList.remove("hidden");
});


const FLAG_EMOJI = {
  "Australia": "🇦🇺", "China": "🇨🇳", "Japan": "🇯🇵", "United States": "🇺🇸",
  "Canada": "🇨🇦", "Monaco": "🇲🇨", "Spain": "🇪🇸", "Austria": "🇦🇹",
  "United Kingdom": "🇬🇧", "Belgium": "🇧🇪", "Hungary": "🇭🇺", "Netherlands": "🇳🇱",
  "Italy": "🇮🇹", "Azerbaijan": "🇦🇿", "Singapore": "🇸🇬", "Mexico": "🇲🇽",
  "Brazil": "🇧🇷", "Qatar": "🇶🇦", "United Arab Emirates": "🇦🇪",
};

async function loadRecentSessions(year) {
  const grid = document.getElementById("recentSessionsGrid");
  grid.innerHTML = `<p class="sessions-loading">Loading recent sessions…</p>`;

  try {
    const res = await fetch(`/api/schedule/${year}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const weekends = await res.json();

    const today = new Date();
    const past = weekends
      .filter(w => new Date(w.date) <= today)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    if (past.length === 0) {
      grid.innerHTML = `<p class="sessions-loading">No completed sessions yet for ${year} — try a different year above.</p>`;
      return;
    }

    grid.innerHTML = past.map(w => `
      <div class="session-card" data-round="${w.round_number}" data-year="${year}">
        <span class="session-card-play">▶</span>
        <div class="session-card-flag">${FLAG_EMOJI[w.country] || "🏁"}</div>
        <div class="session-card-title">${w.event_name}</div>
        <div class="session-card-sub">${w.country}</div>
        <div class="session-card-meta">
          <span>${w.date}</span>
          <span class="session-card-type">RACE</span>
        </div>
      </div>`).join("");

    grid.querySelectorAll(".session-card").forEach(card => {
      card.addEventListener("click", async () => {
        const y = card.dataset.year;
        const r = card.dataset.round;
        goToPickerScreen();
        yearSelect.value = y;
        await loadSchedule();
        roundSelect.value = r;
        updateSessionOptions();
        sessionTypeSelect.value = "R";
        submitLoadSession();
      });
    });
  } catch (e) {
    grid.innerHTML = `<p class="sessions-loading">Couldn't load sessions: ${e.message}</p>`;
  }
}

function initHomePage() {
  const homeYearSelect = document.getElementById("homeYearSelect");
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2018; y--) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    homeYearSelect.appendChild(opt);
  }
  homeYearSelect.addEventListener("change", () => loadRecentSessions(homeYearSelect.value));
  loadRecentSessions(thisYear);

  const updateClocks = () => {
    const t = new Date().toLocaleTimeString();
    document.getElementById("homeTopClock").textContent = t;
    document.getElementById("homeLocalTime").textContent = t;
  };
  updateClocks();
  setInterval(updateClocks, 1000);
}

initHomePage();

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

function updateLocalTimeDisplay() {
  const el = document.getElementById("localTimeValue");
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString();
}
updateLocalTimeDisplay();
setInterval(updateLocalTimeDisplay, 1000);

// Keyed by round_number, holds each weekend's raw FastF1 EventFormat
// string (e.g. "conventional", "sprint_qualifying", "sprint_shootout",
// "sprint") — used to filter which sessions are selectable per round.
let currentSchedule = {};

// FastF1 has used different EventFormat names for the sprint session
// across seasons (see f1_data.py's list_sprints, which handles the same
// variation). Any of these means the weekend has a sprint race + some
// form of sprint qualifying/shootout.
const SPRINT_FORMATS = new Set(["sprint", "sprint_qualifying", "sprint_shootout"]);

async function loadSchedule() {
  roundSelect.innerHTML = "<option>Loading…</option>";
  try {
    const res = await fetch(`/api/schedule/${yearSelect.value}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const weekends = await res.json();
    roundSelect.innerHTML = "";
    currentSchedule = {};
    for (const w of weekends) {
      currentSchedule[w.round_number] = w.type;
      const opt = document.createElement("option");
      opt.value = w.round_number;
      opt.textContent = `${w.round_number}: ${w.event_name}`;
      roundSelect.appendChild(opt);
    }
    updateSessionOptions();
  } catch (e) {
    roundSelect.innerHTML = "<option>Failed to load</option>";
    pickerStatus.textContent = friendlyErrorMessage(`Couldn't load schedule: ${e.message}`);
  }
}

const COMPOUND_COLORS = {
  SOFT: "#ff3333",
  MEDIUM: "#ffd400",
  HARD: "#e8e8e8",
  INTERMEDIATE: "#2ecc40",
  WET: "#00aeef",
  UNKNOWN: "#888888",
};

function renderStrategy(data) {
  const totalLaps = data.total_laps;

  let html = `
    <div class="strategy-header-row">
      <div class="strategy-header">${data.meta.event_name} — Pit Stops</div>
      <div class="strategy-total-stops">
        TOTAL PIT STOPS<br><span>${data.total_pit_stops}</span>
      </div>
    </div>`;

  for (const drv of data.drivers) {
    html += `<div class="strategy-row">
      <span class="strategy-code" style="color:${drv.color}">${drv.code}</span>
      <div class="strategy-bar">`;

    for (const stint of drv.stints) {
      const widthPct = (stint.lap_count / totalLaps) * 100;
      const color = COMPOUND_COLORS[stint.compound] || COMPOUND_COLORS.UNKNOWN;
      const freshClass = stint.fresh ? "" : "strategy-used";

      html += `<div class="strategy-segment ${freshClass}"
                    style="width:${widthPct}%; ${stint.fresh ? `background:${color}` : `--used-color:${color}`}"
                    title="${stint.compound} · Laps ${stint.start_lap}-${stint.end_lap} (${stint.lap_count} laps) · ${stint.fresh ? "New" : "Used"}">
                  <span class="strategy-segment-label">${stint.end_lap}</span>
                </div>`;
    }

    html += `</div><span class="strategy-total-laps">${drv.laps_completed}</span></div>`;
  }

  html += `
    <div class="strategy-legend">
      <span><i class="strategy-legend-swatch" style="background:#e8e8e8"></i>New</span>
      <span><i class="strategy-legend-swatch strategy-used" style="--used-color:#e8e8e8"></i>Used</span>
    </div>`;

  document.getElementById("strategyContent").innerHTML = html;
}

// Show/hide Sprint + Sprint Qualifying depending on whether the selected
// round actually has a sprint format — prevents picking a combination
// FastF1 will reject (e.g. "Session type 'SQ' does not exist for this
// event" for a normal race weekend).
function updateSessionOptions() {
  const format = currentSchedule[roundSelect.value];
  const isSprintWeekend = SPRINT_FORMATS.has(format);

  const sprintOption = sessionTypeSelect.querySelector('option[value="S"]');
  const sprintQualiOption = sessionTypeSelect.querySelector('option[value="SQ"]');

  sprintOption.disabled = !isSprintWeekend;
  sprintQualiOption.disabled = !isSprintWeekend;
  sprintOption.textContent = isSprintWeekend ? "Sprint" : "Sprint (not available this weekend)";
  sprintQualiOption.textContent = isSprintWeekend ? "Sprint Qualifying" : "Sprint Qualifying (not available this weekend)";

  // If the currently-selected session is now invalid for this round,
  // fall back to Race rather than leaving an invalid option selected.
  if (sessionTypeSelect.value === "S" && !isSprintWeekend) sessionTypeSelect.value = "R";
  if (sessionTypeSelect.value === "SQ" && !isSprintWeekend) sessionTypeSelect.value = "R";
}

roundSelect.addEventListener("change", updateSessionOptions);

async function submitLoadSession() {
  const year = yearSelect.value;
  const round = roundSelect.value;
  const sessionType = sessionTypeSelect.value;

  if (!round || isNaN(Number(round))) {
    pickerStatus.textContent = "Please wait for the round list to finish loading, then pick one.";
    return;
  }

  const isQuali = sessionType === "Q" || sessionType === "SQ";
  pickerStatus.textContent = isQuali
    ? "Loading qualifying results…"
    : "Loading replay data — this can take a while the first time (building telemetry cache)…";

  try {
    if (isQuali) {
      const res = await fetch(`/api/quali?year=${year}&round=${round}&session_type=${sessionType}`);
      if (!res.ok) {
        throw new Error(await extractApiErrorMessage(res));
      }
      const data = await res.json();
      showQualiResults(data);
    } else {
      const res = await fetch(`/api/replay?year=${year}&round=${round}&session_type=${sessionType}&fps=8`);
      if (!res.ok) {
        throw new Error(await extractApiErrorMessage(res));
      }
      state.raceData = await res.json();
      startReplay();
    }
  } catch (e) {
    pickerStatus.innerHTML = friendlyErrorMessage(e.message);
  }
}

document.getElementById("loadBtn").addEventListener("click", submitLoadSession);

function showQualiResults(data) {
  document.getElementById("picker").classList.add("hidden");
  document.getElementById("qualiResults").classList.remove("hidden");

  const m = data.meta;
  document.getElementById("qualiBanner").innerHTML =
    `<b>${m.event_name} — ${m.session_type === "SQ" ? "Sprint Qualifying" : "Qualifying"}</b><br>` +
    `${m.circuit_name}, ${m.country} · ${m.date}`;

  const fmt = (s) => {
    if (s == null) return "-";
    const sec = parseFloat(s);
    const mins = Math.floor(sec / 60);
    const rem = (sec % 60).toFixed(3);
    return mins > 0 ? `${mins}:${rem.padStart(6, "0")}` : `${rem}s`;
  };

  let html = `
    <table class="quali-results-table">
      <thead>
        <tr><th>Pos</th><th>Driver</th><th>Q1</th><th>Q2</th><th>Q3</th></tr>
      </thead>
      <tbody>`;

  for (const row of data.results) {
    const [r, g, b] = row.color || [136, 136, 136];
    html += `
      <tr>
        <td>${row.position}</td>
        <td style="color:rgb(${r},${g},${b}); font-weight:700">${row.code}</td>
        <td>${fmt(row.Q1)}</td>
        <td>${fmt(row.Q2)}</td>
        <td>${fmt(row.Q3)}</td>
      </tr>`;
  }

  html += `</tbody></table>`;
  document.getElementById("qualiTable").innerHTML = html;
}

document.getElementById("backToPickerBtn2").addEventListener("click", () => {
  document.getElementById("qualiResults").classList.add("hidden");
  document.getElementById("picker").classList.remove("hidden");
  pickerStatus.textContent = "";
});


document.getElementById("backToPickerBtn").addEventListener("click", () => {
  state.playing = false;
  document.getElementById("replay").classList.add("hidden");
  document.getElementById("picker").classList.remove("hidden");
  pickerStatus.textContent = "";
});

document.getElementById("strategyBtn").addEventListener("click", async () => {
  const m = state.raceData.meta;
  document.getElementById("replay").classList.add("hidden");
  document.getElementById("strategyPanel").classList.remove("hidden");
  document.getElementById("strategyContent").innerHTML = "Loading…";

  try {
    const res = await fetch(`/api/strategy?year=${m.year}&round=${m.round}&session_type=${m.session_type}`);
    if (!res.ok) {
      throw new Error(await extractApiErrorMessage(res));
    }
    const data = await res.json();
    renderStrategy(data);
  } catch (e) {
    document.getElementById("strategyContent").innerHTML = friendlyErrorMessage(e.message);
  }
});

document.getElementById("strategyBackBtn").addEventListener("click", () => {
  document.getElementById("strategyPanel").classList.add("hidden");
  document.getElementById("replay").classList.remove("hidden");
});

// Replay setup
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

// Track drawing (static — only needs to run once per resize)
function drawTrack() {
  const {
    inner,
    outer,
    centerline,
    drs_zones,
    sectors,
    sector_segments,
    start_finish,
    corners
  } = state.raceData.track;

  // Track Boundaries
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 1;

  drawPolyline(inner, false);
  drawPolyline(outer, false);

  // Center Line
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;

  drawPolyline(centerline, true);

  // DRS Zones (toggled with 'D') — dashed green, matches broadcast style
  if (state.showDrsZones) {
    ctx.save();
    ctx.strokeStyle = "#00ff66";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);

    drs_zones.forEach(zone => {
      const [x1, y1] = toCanvas([zone.start_offset.x, zone.start_offset.y]);
      const [x2, y2] = toCanvas([zone.end_offset.x, zone.end_offset.y]);
      

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.fillStyle = "#00ff66";
      ctx.font = "bold 14px Arial";
      ctx.fillText(
        zone.label || `DRS ${zone.zone}`,
        (x1 + x2) / 2,
        (y1 + y2) / 2 - 8
      );
    });

    ctx.restore(); // undo setLineDash so it doesn't leak into later drawing
  }

  // Sector-colored segments + rotated labels (toggled with 'S')
  if (state.showSectors) {
    if (sector_segments) {
      sector_segments.forEach(seg => {
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = 6;
        drawPolyline(seg.centerline, false);
      });
    }

    if (sectors) {
      sectors.forEach(sector => {
        const [x, y] = toCanvas([sector.position.x, sector.position.y]);
        const [tx, ty] = toCanvas([sector.tangent_point.x, sector.tangent_point.y]);
        const angle = Math.atan2(ty - y, tx - x);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = sector.color || "#FFD700";
        ctx.font = "bold 15px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`SECTOR ${sector.id}`, 0, -10);
        ctx.restore();
      });
    }
  }


  // Start / Finish
  if (start_finish) {
    const [sx, sy] = toCanvas([start_finish.x, start_finish.y]);

    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ff0000";
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
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

// Frame interpolation
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
      // discrete/object fields: no interpolation, just use the earlier frame
      gear: a.gear, drs: a.drs, tyre: a.tyre, tyre_life: a.tyre_life,
      position: a.position, lap: a.lap, rel_dist: a.rel_dist,
      in_pit: a.in_pit, ahead: a.ahead, behind: a.behind,
    };
  }
  return { drivers: result, lap: fA.lap, weather: fA.weather };
}

function lerp(a, b, frac) { return a + (b - a) * frac; }



// Main animation loop
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

    // Playback
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

    // Current Frame
    const frame =
        getInterpolatedDrivers(state.playheadT);

    // Render
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawTrack();

    drawCars(frame);

    // UI
    updateLapCounter(frame);

    updateLeaderboard(frame);

    updateWeather(frame);

    updateDriverInfo(frame);

    updateTimeLabel(totalT);

    drawProgressBar(totalT);

    // Next Frame
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

// Same distance→time approximation used everywhere else in this app
// (neighborGapLabel, driver info panel) — not a precise physical gap.
function computeGapSeconds(distA, distB) {
  if (distA == null || distB == null) return null;
  const distM = Math.abs(distA - distB) / 10.0;
  return distM / 55.56;
}

function buildStatusBadges(d) {
  const badges = [];
  if (d.rel_dist === 1) badges.push('<span class="lb-badge out">OUT</span>');
  if (d.in_pit) badges.push('<span class="lb-badge pit">PIT</span>');
  if (d.drs >= 10) badges.push('<span class="lb-badge drs">DRS</span>');
  return badges.join("");
}

function updateLapCounter(frame) {
  const totalLaps = state.raceData.meta.total_laps;
  const currentLap = Math.min(frame.lap ?? 1, totalLaps);
  document.getElementById("lapCounter").textContent = `Lap: ${currentLap}/${totalLaps}`;
}

// Tyre compound → single-letter badge + color, matching common F1
// broadcast graphics convention (not official FIA colors, just widely
// recognized: red=soft, yellow=medium, white=hard, green=inter, blue=wet).
const TYRE_BADGE = {
  0: { letter: "C5", color: "#a349a4" },
  1: { letter: "S", color: "#ff3333" },
  2: { letter: "M", color: "#ffd400" },
  3: { letter: "H", color: "#e8e8e8" },
  4: { letter: "I", color: "#2ecc40" },
  5: { letter: "W", color: "#00aeef" },
};

function buildTyreBadge(d) {
  const info = TYRE_BADGE[d.tyre] || { letter: "?", color: "#888" };
  const textColor = info.color === "#e8e8e8" || info.color === "#ffd400" ? "#000" : "#fff";
  return `
    <span class="lb-tyre-badge" style="background:${info.color}; color:${textColor}" title="Tyre life: ${Math.round(d.tyre_life)} laps">
      ${info.letter}<span class="lb-tyre-life">${Math.round(d.tyre_life)}</span>
    </span>`;
}

// Leaderboard panel
function updateLeaderboard(frame) {
  const rows = Object.entries(frame.drivers)
    .filter(([, d]) => d.position != null)
    .sort((a, b) => a[1].position - b[1].position);

  const colors = state.raceData.driver_colors;
  const mode = state.leaderboardGapMode;

  let html = `
    <div class="lb-header">
      <span class="lb-title">Leaderboard</span>
      <span class="lb-toggles">
        <button class="lb-toggle-btn ${mode === "interval" ? "active" : ""}" data-mode="interval" title="Interval — gap to car ahead">I</button>
        <button class="lb-toggle-btn ${mode === "leader" ? "active" : ""}" data-mode="leader" title="Gap to leader">L</button>
      </span>
    </div>`;

  for (let i = 0; i < rows.length; i++) {
    const [code, d] = rows[i];
    const selected = state.selectedDrivers.includes(code) ? "selected" : "";

    let gapText = "";
    if (mode === "leader") {
      gapText = i === 0 ? "-" : `+${computeGapSeconds(rows[0][1].dist, d.dist)?.toFixed(1) ?? "?"}s`;
    } else if (mode === "interval") {
      gapText = i === 0 ? "-" : `+${computeGapSeconds(rows[i - 1][1].dist, d.dist)?.toFixed(1) ?? "?"}s`;
    }

    html += `
      <div class="lb-row ${selected}" data-code="${code}">
        <span class="lb-pos">${d.position}.</span>
        <span class="lb-code" style="color:${selected ? "#000" : colors[code] || "#fff"}">${code}</span>
        ${mode !== "off" ? `<span class="lb-gap">${gapText}</span>` : ""}
        ${buildTyreBadge(d)}
        <span class="lb-status">${buildStatusBadges(d)}</span>
      </div>`;
  }

  const panel = document.getElementById("leaderboardPanel");
  panel.innerHTML = html;

  panel.querySelectorAll(".lb-row").forEach(row => {
    row.addEventListener("click", (e) => {
      const code = row.dataset.code;
      if (e.shiftKey) {
        const idx = state.selectedDrivers.indexOf(code);
        if (idx >= 0) state.selectedDrivers.splice(idx, 1);
        else state.selectedDrivers.push(code);
      } else {
        const onlyThisSelected = state.selectedDrivers.length === 1 && state.selectedDrivers[0] === code;
        state.selectedDrivers = onlyThisSelected ? [] : [code];
      }
    });
  });

  panel.querySelectorAll(".lb-toggle-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const clickedMode = btn.dataset.mode;
      state.leaderboardGapMode = state.leaderboardGapMode === clickedMode ? "off" : clickedMode;
    });
  });
}
// Weather panel
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
// Driver info panel (multi-select — one box per selected driver)

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

    wrapper.innerHTML = "";

    const tyreNames = {
        0: "🟣 C5",
        1: "🔴 SOFT",
        2: "🟡 MED",
        3: "⚪ HARD",
        4: "🟢 INT",
        5: "🔵 WET"
    };

    const sortedRows = Object.entries(frame.drivers)
        .filter(([, d]) => d.position != null)
        .sort((a, b) => a[1].position - b[1].position);

    for (const code of state.selectedDrivers) {

        const d = frame.drivers[code];

        if (!d) continue;

        const color =
            state.raceData.driver_colors[code] || "#888";

        const tyre =
            tyreNames[d.tyre] || d.tyre;

        const throttle =
            Math.round(d.throttle);

        const brake =
            Math.round(d.brake > 1 ? d.brake : d.brake * 100);


        const drs =
            d.drs >= 10
                ? '<span style="color:#2ecc40">DRS ●</span>'
                : '<span style="color:#888">DRS ○</span>';

        const ahead = d.ahead
          ? `Ahead (${d.ahead.driver}): +${d.ahead.gap.toFixed(2)}s (${d.ahead.distance.toFixed(1)}m)`
          : "Ahead: N/A";
        const behind = d.behind
          ? `Behind (${d.behind.driver}): -${d.behind.gap.toFixed(2)}s (${d.behind.distance.toFixed(1)}m)`
          : "Behind: N/A";

        // Tyre life as a bar, same row style as THR/BRK/ERS —
        // % remaining, color-coded green/yellow/red.
        const maxTyreLife = state.raceData.max_tyre_life[String(d.tyre)] || 30;
        const tyreHealth = Math.max(0, Math.min(1, 1 - d.tyre_life / maxTyreLife));
        const tyrePct = Math.round(tyreHealth * 100);
        const tyreColor = tyreHealth > 0.5 ? "#2ecc40" : tyreHealth > 0.25 ? "#f1c40f" : "#e74c3c";

        wrapper.innerHTML += `

<div class="driver-panel">

    <div class="driver-header">

        <div class="team-strip"
             style="background:${color}">
        </div>

        <div class="driver-code">
            ${code}
        </div>

        <div class="driver-position">
            P${d.position}
        </div>

    </div>

    <div class="driver-speed">
        ${Math.round(d.speed)} km/h
    </div>

    <div class="driver-status">

        <span>${tyre}</span>

        <span>Gear ${d.gear}</span>

        <span>${drs}</span>

    </div>

    <div class="telemetry-row">

        <span>THR</span>

        <div class="telemetry-track">

            <div class="telemetry-fill throttle"
                 style="width:${throttle}%">
            </div>

        </div>

        <span>${throttle}%</span>

    </div>

    <div class="telemetry-row">

        <span>BRK</span>

        <div class="telemetry-track">

            <div class="telemetry-fill brake"
                 style="width:${brake}%">
            </div>

        </div>

        <span>${brake}%</span>

    </div>

    <div class="telemetry-row">

        <span>TYRE</span>

        <div class="telemetry-track">

            <div class="telemetry-fill"
                 style="width:${tyrePct}%; background:${tyreColor}">
            </div>

        </div>

        <span>${Math.round(d.tyre_life)} laps</span>

    </div>

    <div class="gap-row ahead">
        ${ahead}
    </div>

    <div class="gap-row behind">
        ${behind}
    </div>

</div>

`;
    }
}


// Progress Bar (Centered Timeline)
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


    const LEFT_PAD = 0;
    const RIGHT_PAD = 0;
    const BAR_W = w;

    // Background Bar
    progressCtx.fillStyle = "#1a1a1a";
    progressCtx.fillRect(
        LEFT_PAD,
        h * 0.35,
        BAR_W,
        h * 0.30
    );

    // Progress Fill
    const progressW = (state.playheadT / totalT) * BAR_W;

    progressCtx.fillStyle = "#2ecc40";
    progressCtx.fillRect(
        LEFT_PAD,
        h * 0.35,
        progressW,
        h * 0.30
    );

    // Lap Ticks
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

    // Event Markers
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

    // Playhead
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
// Click to Seek
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


// Time Label
function updateTimeLabel(totalT) {

    const fmt = (s) => {

        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);

        return `${mins}:${String(secs).padStart(2, "0")}`;
    };

    document.getElementById("timeLabel").textContent =
        `${fmt(state.playheadT)} / ${fmt(totalT)}`;
}


// Controls
const playPauseBtn = document.getElementById("playPauseBtn");
const playPauseIcon = document.getElementById("playPauseIcon");

// Play / Pause
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

// Rewind
document.getElementById("rewindBtn").addEventListener("click", () => {

    state.playheadT = Math.max(0, state.playheadT - 10);

});

// Forward
document.getElementById("forwardBtn").addEventListener("click", () => {

    const totalT =
        state.raceData.frames[state.raceData.frames.length - 1].t;

    state.playheadT =
        Math.min(totalT, state.playheadT + 10);

});

// Playback Speed
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


//Keyboard shortcuts
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

        case "KeyS":
            state.showSectors = !state.showSectors;

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

// Telemetry comparison panel
let teleInitialized = false;
let teleSchedule = {};

function initTelemetryPanel() {
  if (teleInitialized) return;
  teleInitialized = true;

  const yearSel = document.getElementById("teleYearSelect");
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2018; y--) {
    const opt = document.createElement("option");
    opt.value = y; opt.textContent = y;
    yearSel.appendChild(opt);
  }

  yearSel.addEventListener("change", teleLoadSchedule);
  document.getElementById("teleRoundSelect").addEventListener("change", teleLoadDrivers);
  document.getElementById("teleSessionSelect").addEventListener("change", teleLoadDrivers);
  document.getElementById("teleCompareBtn").addEventListener("click", teleRunCompare);

  teleLoadSchedule();
}

async function teleLoadSchedule() {
  const roundSel = document.getElementById("teleRoundSelect");
  roundSel.innerHTML = "<option>Loading…</option>";
  try {
    const year = document.getElementById("teleYearSelect").value;
    const res = await fetch(`/api/schedule/${year}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const weekends = await res.json();
    roundSel.innerHTML = "";
    for (const w of weekends) {
      const opt = document.createElement("option");
      opt.value = w.round_number;
      opt.textContent = `${w.round_number}: ${w.event_name}`;
      roundSel.appendChild(opt);
    }
    teleLoadDrivers();
  } catch (e) {
    roundSel.innerHTML = "<option>Failed to load</option>";
  }
}

async function teleLoadDrivers() {
  const driverASel = document.getElementById("teleDriverASelect");
  const driverBSel = document.getElementById("teleDriverBSelect");
  const status = document.getElementById("telemetryStatus");
  driverASel.innerHTML = "<option>Loading…</option>";
  driverBSel.innerHTML = "<option>Loading…</option>";
  status.innerHTML = "";

  const year = document.getElementById("teleYearSelect").value;
  const round = document.getElementById("teleRoundSelect").value;
  const sessionType = document.getElementById("teleSessionSelect").value;
  if (!round || isNaN(Number(round))) return;

  try {
    const res = await fetch(`/api/drivers?year=${year}&round=${round}&session_type=${sessionType}`);
    if (!res.ok) {
      throw new Error(await extractApiErrorMessage(res));
    }
    const drivers = await res.json();
    const optionsHtml = drivers.map(d => `<option value="${d.code}">${d.code} — ${d.name}</option>`).join("");
    driverASel.innerHTML = optionsHtml;
    driverBSel.innerHTML = optionsHtml;
    if (drivers.length > 1) driverBSel.selectedIndex = 1;
  } catch (e) {
    driverASel.innerHTML = "<option>Failed to load</option>";
    driverBSel.innerHTML = "<option>Failed to load</option>";
    status.innerHTML = friendlyErrorMessage(e.message);
  }
}

async function teleRunCompare() {
  const status = document.getElementById("telemetryStatus");
  const resultsEl = document.getElementById("telemetryResults");
  status.textContent = "Loading telemetry…";
  resultsEl.classList.add("hidden");

  const year = document.getElementById("teleYearSelect").value;
  const round = document.getElementById("teleRoundSelect").value;
  const sessionType = document.getElementById("teleSessionSelect").value;
  const driverA = document.getElementById("teleDriverASelect").value;
  const driverB = document.getElementById("teleDriverBSelect").value;

  if (!driverA || !driverB) {
    status.textContent = "Pick two drivers to compare.";
    return;
  }
  if (driverA === driverB) {
    status.textContent = "Pick two different drivers.";
    return;
  }

  try {
    const res = await fetch(`/api/telemetry/compare?year=${year}&round=${round}&session_type=${sessionType}&driver_a=${driverA}&driver_b=${driverB}`);
    if (!res.ok) {
      throw new Error(await extractApiErrorMessage(res));
    }
    const data = await res.json();
    status.textContent = "";
    renderTelemetryCompare(data);
  } catch (e) {
    status.innerHTML = friendlyErrorMessage(e.message);
  }
}

function fmtLapTime(seconds) {
  if (seconds == null) return "-";
  const mins = Math.floor(seconds / 60);
  const rem = (seconds % 60).toFixed(3);
  return `${mins}:${rem.padStart(6, "0")}`;
}

function drawTelemetryLine(canvasId, seriesA, seriesB, colorA, colorB, minY, maxY) {
  const canvas = document.getElementById(canvasId);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width);
  canvas.height = Math.floor(rect.height);
  const c = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h);

  const range = maxY - minY || 1;
  const toY = (v) => h - ((v - minY) / range) * h;
  const toX = (i, len) => (i / (len - 1)) * w;

  const drawSeries = (series, color) => {
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath();
    series.forEach((v, i) => {
      const x = toX(i, series.length);
      const y = toY(v);
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    });
    c.stroke();
  };

  drawSeries(seriesA, colorA);
  drawSeries(seriesB, colorB);
}

function renderTelemetryCompare(data) {
  const a = data.driver_a, b = data.driver_b;
  const colorA = state.raceData?.driver_colors?.[a.driver] || "#00aeef";
  const colorB = state.raceData?.driver_colors?.[b.driver] || "#ff3333";

  document.getElementById("teleAInfo").innerHTML =
    `<b style="color:${colorA}">${a.driver}</b> · Lap ${a.lap_number} · ${fmtLapTime(a.lap_time)} · ${a.compound}`;
  document.getElementById("teleBInfo").innerHTML =
    `<b style="color:${colorB}">${b.driver}</b> · Lap ${b.lap_number} · ${fmtLapTime(b.lap_time)} · ${b.compound}`;

  document.getElementById("telemetryResults").classList.remove("hidden");

  const speedMax = Math.max(...a.speed, ...b.speed) * 1.05;
  drawTelemetryLine("teleSpeedCanvas", a.speed, b.speed, colorA, colorB, 0, speedMax);
  drawTelemetryLine("teleThrottleCanvas", a.throttle, b.throttle, colorA, colorB, 0, 100);
  drawTelemetryLine("teleBrakeCanvas", a.brake, b.brake, colorA, colorB, 0, 100);

  const sectorRows = ["sector1", "sector2", "sector3"].map((key, i) => {
    const ta = a.sector_times[key], tb = b.sector_times[key];
    const delta = (ta != null && tb != null) ? (ta - tb) : null;
    const deltaText = delta == null ? "-" : `${delta >= 0 ? "+" : ""}${delta.toFixed(3)}s`;
    const deltaColor = delta == null ? "#999" : delta < 0 ? "#2ecc40" : "#ff4444";
    return `<div class="telemetry-sector-row">
      <span>Sector ${i + 1}</span>
      <span style="color:${colorA}">${ta != null ? ta.toFixed(3) + "s" : "-"}</span>
      <span style="color:${colorB}">${tb != null ? tb.toFixed(3) + "s" : "-"}</span>
      <span style="color:${deltaColor}">${deltaText}</span>
    </div>`;
  }).join("");

  document.getElementById("teleSectorTable").innerHTML = `
    <div class="telemetry-sector-row" style="font-weight:700; color:#9aa1ad;">
      <span>Sector</span><span>${a.driver}</span><span>${b.driver}</span><span>Delta (A − B)</span>
    </div>
    ${sectorRows}`;
}

initPicker();
setSpeedIndex(state.speedIndex);
