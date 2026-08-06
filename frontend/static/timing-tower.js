const TYRE_CLASS = {
  SOFT: "tt-tyre-soft",
  MEDIUM: "tt-tyre-medium",
  HARD: "tt-tyre-hard",
  INTERMEDIATE: "tt-tyre-intermediate",
  WET: "tt-tyre-wet",
};

const TYRE_LETTER = {
  SOFT: "S",
  MEDIUM: "M",
  HARD: "H",
  INTERMEDIATE: "I",
  WET: "W",
};


const DRIVER_IMAGE = {
  VER: "verstappen.png", NOR: "norris.png", PIA: "piastri.png", LEC: "leclerc.png",
  HAM: "hamilton.png", RUS: "russell.png", ANT: "antonelli.png", ALO: "alonso.png",
  STR: "stroll.png", GAS: "gasly.png", OCO: "ocon.png", ALB: "albon.png",
  SAI: "sainz.png", HAD: "hadjar.png", LAW: "lawson.png", HUL: "hulkenberg.png",
  BEA: "bearman.png", COL: "colapinto.png", BOR: "bortoleto.png", PER: "perez.png",
  BOT: "bottas.png", LIN: "lindblad.png", TSU: "tsunoda.png",
};

const TEAM_NAME = {
  VER: "Red Bull Racing", LAW: "Red Bull Racing",
  NOR: "McLaren", PIA: "McLaren",
  LEC: "Ferrari", HAM: "Ferrari",
  RUS: "Mercedes", ANT: "Mercedes",
  ALO: "Aston Martin", STR: "Aston Martin",
  GAS: "Alpine", COL: "Alpine",
  OCO: "Haas F1 Team", BEA: "Haas F1 Team",
  ALB: "Williams", SAI: "Williams",
  HAD: "Racing Bulls", LIN: "Racing Bulls",
  HUL: "Audi", BOR: "Audi",
  PER: "Cadillac", BOT: "Cadillac",
};

// Tracks each driver's fastest last_lap seen so far this session —
// client-side, since the live feed doesn't send an authoritative
// "best lap" field per update. Reset whenever a new session starts
// (createTimingTower's load() gets a fresh session/round).
function _parseLapSeconds(str) {
  if (!str) return null;
  const parts = String(str).split(":");
  if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function _stintHistoryHtml(stintHistory) {
  if (!stintHistory || stintHistory.length === 0) return "";
  const icons = stintHistory
    .map((compound) => {
      const cls = TYRE_CLASS[compound] || "tt-tyre-hard";
      const letter = TYRE_LETTER[compound] || "?";
      return `<span class="tt-stint-icon ${cls}">${letter}</span>`;
    })
    .join("");
  return `<span class="tt-stint-history">${icons}</span>`;
}

function _positionChangeHtml(change) {
  if (change == null || change === 0) return "";
  const up = change > 0;
  return `<span class="tt-pos-change ${up ? "tt-pos-up" : "tt-pos-down"}">${up ? "▲" : "▼"}${Math.abs(change)}</span>`;
}

function sectorHtml(sector) {
  if (!sector) return '<span class="tt-sector">—</span>';
  const cls = sector.is_session_best ? "tt-purple" : sector.is_personal_best ? "tt-green" : "";
  return `<span class="tt-sector ${cls}">${sector.time.toFixed(3)}</span>`;
}

function rowHtml(row, prevRow, bestLapDisplay) {
  const tyreCls = TYRE_CLASS[row.compound] || "tt-tyre-hard";
  const tyreLetter = TYRE_LETTER[row.compound] || "?";
  const dotColor = row.team_color || "#888";
  const isLeader = row.position === 1;
  const isOut = row.retired || row.stopped || row.knocked_out;
  const isLapped = !isOut && !!row.lapped;
  const statusAttr = isOut ? "out" : isLapped ? "lapped" : "active";
  const changed = prevRow && (prevRow.position !== row.position || prevRow.last_lap !== row.last_lap);

  const tyreHtml = row.pit_status
    ? `<span class="tt-pit-badge">${row.pit_status}</span>`
    : `<span class="tt-tyre-chip ${tyreCls}">${tyreLetter}</span><span class="tt-tyre-laps">${row.tyre_laps != null ? row.tyre_laps + "L" : ""}</span>`;

  return `
    <div class="tt-row ${isLeader ? "tt-leader" : ""} ${changed ? "tt-flash" : ""}"
         data-driver-code="${row.driver_code}"
         data-status="${statusAttr}"
         data-favorite="${row.is_favorite ? "true" : "false"}"
         style="--row-team-color:${dotColor}; background: linear-gradient(90deg, transparent 85%, ${dotColor}22 100%);"
         ondblclick="window.dispatchEvent(new CustomEvent('driver-pin', {detail:'${row.driver_code}'}))">
      <span class="tt-pos">${row.position != null ? row.position : "-"}</span>
      <span class="tt-driver">
        ${
          DRIVER_IMAGE[row.driver_code]
            ? `<img class="tt-avatar" src="/static/images/drivers/${DRIVER_IMAGE[row.driver_code]}" alt="" onerror="this.style.display='none'">`
            : ""
        }
        <span class="tt-driver-text">
          <span class="tt-code-row">
            <span class="tt-code">${row.driver_code || "-"}</span>
            ${_positionChangeHtml(row.position_change)}
          </span>
          <span class="tt-team-name" style="color:${dotColor}">${TEAM_NAME[row.driver_code] || ""}</span>
        </span>
      </span>
      <span class="tt-tyre">${tyreHtml}</span>
      <span class="tt-speed">
        <span class="tt-drs-badge">DRS</span>
        <span class="tt-speed-value">0 km/h</span>
      </span>
      <span class="tt-pits">
        ${_stintHistoryHtml(row.stint_history)}
        <span class="tt-pit-count">${row.pit_count != null ? row.pit_count + " PIT" : "-"}</span>
      </span>
      <span class="tt-gap">${row.gap || ""}</span>
      <span class="tt-interval">${row.interval || ""}</span>
      <span class="tt-lastlap">
        <span class="tt-lastlap-current">${row.last_lap || "-"}</span>
        ${bestLapDisplay ? `<span class="tt-lastlap-best">${bestLapDisplay}</span>` : ""}
      </span>
      ${sectorHtml(row.sectors && row.sectors.s1)}
      ${sectorHtml(row.sectors && row.sectors.s2)}
      ${sectorHtml(row.sectors && row.sectors.s3)}
    </div>
  `;
}

function tableHeaderHtml() {
  return `
    <div class="tt-header">
      <span></span>
      <span>Driver</span>
      <span class="tt-align-center">Tyre</span>
      <span class="tt-align-center">Speed</span>
      <span class="tt-align-center">Pits</span>
      <span class="tt-align-right">Gap</span>
      <span class="tt-align-right">Int</span>
      <span class="tt-align-right">Last Lap</span>
      <span class="tt-align-center">S1</span>
      <span class="tt-align-center">S2</span>
      <span class="tt-align-center">S3</span>
    </div>
  `;
}

function mode(arr) {
  const counts = {};
  let best = null;
  let bestCount = 0;
  for (const v of arr) {
    if (v == null) continue;
    counts[v] = (counts[v] || 0) + 1;
    if (counts[v] > bestCount) {
      bestCount = counts[v];
      best = v;
    }
  }
  return best;
}

function average(arr) {
  const nums = arr.filter((v) => typeof v === "number" && !isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Factory: creates an independent Timing Tower instance bound to a
 * specific set of container IDs, so the same widget can be rendered
 * more than once on the page (e.g. home page + Telemetry tab) without
 * ID collisions.
 */
// --- Minisector cache: lets renderRows() re-insert blocks synchronously
// right after a table rebuild, instead of waiting for the next
// injectMinisectorBreakdown() poll — closes the "come/go" flicker gap.
const _minisectorCache = {}; // containerId -> driverMap

function _reinsertMinisectorBlocks(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  // Empty object (not undefined) when nothing has been fetched yet, so
  // every driver falls through to the placeholder branch below instead
  // of the block being skipped entirely on first load.
  const driverMap = _minisectorCache[containerId] || {};

  const rows = container.querySelectorAll(".tt-row[data-driver-code]");
  rows.forEach((row) => {
    const code = row.getAttribute("data-driver-code");
    const driverData = driverMap[code];
    const html = driverData ? _mstBlockHtml(driverData) : _mstBlockPlaceholderHtml(code);

    const existing = container.querySelector(`.mst-block[data-mst-for="${code}"]`);
    if (existing) {
      existing.outerHTML = html;
    } else {
      row.insertAdjacentHTML("afterend", html);
    }
  });
}

function createTimingTower(ids) {
  let previousRows = [];
  let currentRawRows = [];
  let bestLaps = {}; // driver_code -> { seconds, display }
  let visibleCount = 10; // Default to top 10 drivers only

  function trackBestLap(driverCode, lastLapDisplay) {
    const seconds = _parseLapSeconds(lastLapDisplay);
    if (seconds == null) return bestLaps[driverCode]?.display || "";
    const current = bestLaps[driverCode];
    if (!current || seconds < current.seconds) {
      bestLaps[driverCode] = { seconds, display: lastLapDisplay };
    }
    return bestLaps[driverCode].display;
  }

  function renderStatus(message) {
    const root = document.getElementById(ids.list);
    if (!root) return;
    root.innerHTML = `<div class="tt-status-msg">${message}</div>`;
  }

  function renderControls() {
    return `
      <div class="tt-filter-controls" style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 8px;">
        <button class="tt-btn ${visibleCount === 10 ? 'active' : ''}" style="padding: 4px 10px; font-size: 12px; cursor: pointer; border-radius: 4px; border: 1px solid #30363d; background: ${visibleCount === 10 ? '#e10600' : '#161b22'}; color: #fff; font-weight: bold;" onclick="this.dispatchEvent(new CustomEvent('tt-set-limit', {bubbles: true, detail: 10}))">Top 10</button>
        <button class="tt-btn ${visibleCount === 0 ? 'active' : ''}" style="padding: 4px 10px; font-size: 12px; cursor: pointer; border-radius: 4px; border: 1px solid #30363d; background: ${visibleCount === 0 ? '#e10600' : '#161b22'}; color: #fff; font-weight: bold;" onclick="this.dispatchEvent(new CustomEvent('tt-set-limit', {bubbles: true, detail: 0}))">All</button>
      </div>
    `;
  }

  function setLimit(limit) {
    visibleCount = limit;
    if (currentRawRows.length > 0) {
      renderRows(currentRawRows);
    }
  }

  function renderRows(rows) {
    currentRawRows = rows;
    const root = document.getElementById(ids.list);
    if (!root) return;
    if (!rows || rows.length === 0) {
      renderStatus("No timing data available for this session.");
      return;
    }

    // Attach event listener for the control buttons once if not attached
    if (!root.dataset.hasLimitListener) {
      root.addEventListener('tt-set-limit', (e) => {
        setLimit(e.detail);
      });
      root.dataset.hasLimitListener = "true";
    }

    const prevMap = {};
    previousRows.forEach((r) => { prevMap[r.driver_code] = r; });

    // Slice to top N drivers if visibleCount is set > 0
    const displayedRows = visibleCount > 0 ? rows.slice(0, visibleCount) : rows;

    root.innerHTML = renderControls() + tableHeaderHtml() + displayedRows.map((row) => {
      const bestLapDisplay = trackBestLap(row.driver_code, row.last_lap);
      return rowHtml(row, prevMap[row.driver_code], bestLapDisplay);
    }).join("");

    previousRows = rows;
    root.querySelectorAll(".tt-flash").forEach((el) => {
      el.addEventListener("animationend", () => el.classList.remove("tt-flash"), { once: true });
    });
    if (ids.showSessionHeader) {
      _reinsertMinisectorBlocks(ids.list); // Telemetry tab only — Home page never fetches minisectors
    }
  }

  function renderLeaderGauge(rows) {
    if (!ids.leader) return;
    const el = document.getElementById(ids.leader);
    if (!el) return;
    if (!rows || rows.length === 0) {
      el.innerHTML = "";
      return;
    }
    const p1 = rows[0];
    const p2 = rows[1];

    const gapSeconds = p2 && p2.gap ? parseFloat(String(p2.gap).replace(/[^0-9.]/g, "")) : null;
    const pct = gapSeconds != null && !isNaN(gapSeconds) ? Math.max(0.03, Math.min(gapSeconds / 30, 1)) : 0.03;
    const arcColor = pct < 0.15 ? "#e10600" : pct < 0.5 ? "#ffb020" : "#3ddc84";
    const degrees = Math.round(pct * 360);

    el.innerHTML = `
      <div class="rl-gauge">
        <div class="rl-ring" style="background: conic-gradient(${arcColor} ${degrees}deg, #2a2e38 ${degrees}deg)"></div>
        <div class="rl-center">
          <div class="rl-label">Race Leader</div>
          <div class="rl-p1">
            <span class="rl-pos-tag" style="color:${p1.team_color || "#e10600"}">P1</span> ${p1.driver_code || "-"}
          </div>
          <div class="rl-time">${p1.last_lap || "-"}</div>
          ${
            p2
              ? `<div class="rl-p2">
                   <span class="rl-pos-tag rl-pos-tag--p2" style="color:${p2.team_color || "#888"}">P2</span> ${p2.driver_code || "-"}
                   <span class="rl-gap">${p2.gap || ""}</span>
                 </div>`
              : ""
          }
        </div>
      </div>
    `;
  }

  function renderStatsFooter(rows) {
    if (!ids.stats) return;
    const el = document.getElementById(ids.stats);
    if (!el) return;
    if (!rows || rows.length === 0) {
      el.innerHTML = "";
      return;
    }

    const mostUsed = mode(rows.map((r) => r.compound));
    const avgTyreLife = average(rows.map((r) => r.tyre_laps));
    const avgPitStops = average(rows.map((r) => r.pit_count));

    const tyreLetter = TYRE_LETTER[mostUsed] || "?";
    const tyreCls = TYRE_CLASS[mostUsed] || "tt-tyre-hard";

    el.innerHTML = `
      <div class="rs-stat">
        <span class="rs-label">Most Used</span>
        <span class="tt-tyre-chip rs-chip ${tyreCls}">${tyreLetter}</span>
      </div>
      <div class="rs-stat">
        <span class="rs-label">Avg. Lap Age</span>
        <span class="rs-value">${avgTyreLife != null ? avgTyreLife.toFixed(0) : "-"}</span>
      </div>
      <div class="rs-stat">
        <span class="rs-label">Avg. Pit Stops</span>
        <span class="rs-value">${avgPitStops != null ? avgPitStops.toFixed(2) : "-"}</span>
      </div>
    `;
  }

  async function load(year, round, sessionType, opts) {
    sessionType = sessionType || "R";
    opts = opts || {};
    // Only show the loading state on the very first load, when the
    // table is genuinely empty. Background polls pass {silent: true}
    // and swap data in place with no flash.
    const isFirstLoad = previousRows.length === 0;
    if (!opts.silent && isFirstLoad) {
      renderStatus("Loading timing tower…");
    }
    try {
      const res = await fetch(`/api/timing-tower?year=${year}&round=${round}&session_type=${sessionType}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load timing tower");
      renderRows(data.rows);
      renderLeaderGauge(data.rows);
      renderStatsFooter(data.rows);
      renderBattleStrip(ids, data.rows);
      renderGapLadder(ids, data.rows);
      if (ids.showSessionHeader) {
        renderSessionHeader(data.meta || {}, sessionType, !!data.is_live, year);
      }
      return data;
    } catch (err) {
      // Keep showing the last good snapshot if a background poll fails —
      // only blank the table if we never had data in the first place.
      if (previousRows.length === 0) {
        renderStatus(`Couldn't load timing tower: ${err.message}`);
      }
      console.error("TimingTower.load failed", err);
    }
  }

  async function autoLoadLatest(year) {
    year = year || new Date().getFullYear();
    try {
      const res = await fetch(`/api/schedule/${year}`);
      const schedule = await res.json();
      if (!res.ok) throw new Error(schedule.detail || "Failed to load schedule");

      const races = Array.isArray(schedule) ? schedule : schedule.races || schedule.events || [];
      const now = new Date();

      const completed = races.filter((r) => {
        const dateStr = r.date || r.EventDate || r.event_date;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return !isNaN(d) && d < now;
      });

      if (completed.length === 0) {
        if (year > 2018) return autoLoadLatest(year - 1);
        renderStatus("No completed races found.");
        return null;
      }

      const last = completed[completed.length - 1];
      const round = last.round !== undefined ? last.round : (last.RoundNumber !== undefined ? last.RoundNumber : last.round_number);

      if (round === undefined) {
        console.warn("TimingTower: couldn't determine round number from schedule item", last);
        renderStatus("Couldn't determine the latest race automatically.");
        return null;
      }

      await load(year, round, "R");
      return { year, round };
    } catch (err) {
      renderStatus(`Couldn't auto-detect latest race: ${err.message}`);
      console.error("TimingTower.autoLoadLatest failed", err);
      return null;
    }
  }

  return { load, autoLoadLatest, setLimit };
}

/**
 * Factory: creates an independent Race Control feed instance bound to a
 * specific container ID.
 */
function createRaceControl(ids) {
  function renderStatus(message) {
    const root = document.getElementById(ids.list);
    if (!root) return;
    root.innerHTML = `<div class="rc-status-msg">${message}</div>`;
  }

  function itemHtml(m) {
    const safeMessage = (m.message || "").replace(/'/g, "&#39;").replace(/"/g, "&quot;");
    return `
      <div class="rc-item">
        <button class="rc-copy-btn" onclick="navigator.clipboard.writeText('${safeMessage}'); this.textContent='Copied'; this.classList.add('rc-copied'); setTimeout(() => { this.textContent='Copy'; this.classList.remove('rc-copied'); }, 1500);">Copy</button>
        <div class="rc-meta">
          ${m.time ? `<span class="rc-time">${m.time}</span>` : ""}
          ${m.lap != null ? `<span class="rc-lap">LAP ${m.lap}</span>` : ""}
          ${m.category ? `<span class="rc-category">${m.category}</span>` : ""}
        </div>
        <div class="rc-message">${m.message || ""}</div>
      </div>
    `;
  }

  function renderMessages(messages) {
    const root = document.getElementById(ids.list);
    if (!root) return;
    if (!messages || messages.length === 0) {
      renderStatus("No race control messages for this session.");
      return;
    }
    root.innerHTML = messages.map(itemHtml).join("");
  }

  async function load(year, round, sessionType) {
    sessionType = sessionType || "R";
    const root = document.getElementById(ids.list);
    if (!root) return;
    renderStatus("Loading race control…");
    try {
      const res = await fetch(`/api/race-control?year=${year}&round=${round}&session_type=${sessionType}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load race control messages");
      renderMessages(data.messages);
    } catch (err) {
      renderStatus(`Couldn't load race control: ${err.message}`);
      console.error("RaceControl.load failed", err);
    }
  }

  return { load };
}

// --- Home page instance (unchanged IDs) ---
const TimingTower = createTimingTower({
  list: "liveTimingList",
  leader: "raceLeaderGauge",

});
const RaceControl = createRaceControl({ list: "raceControlList" });

// --- Telemetry tab instance (new IDs, see HTML snippet) ---
const TelemetryTimingTower = createTimingTower({
  list: "telLiveTimingList",
  leader: "telRaceLeaderGauge",
  stats: "telRaceStatsFooter",
  battle: "telBattleStrip",
  ladder: "telGapLadder",
  showSessionHeader: true,
});
const TelemetryRaceControl = createRaceControl({ list: "telRaceControlList" });

const AUTO_REFRESH_MS = 5000;

document.addEventListener("DOMContentLoaded", async function () {
  if (document.getElementById("liveTimingList")) {
    const featured = await TimingTower.autoLoadLatest();
    if (featured && document.getElementById("raceControlList")) {
      RaceControl.load(featured.year, featured.round, "R");
    }
    if (featured) {
      setInterval(() => TimingTower.load(featured.year, featured.round, "R", { silent: true }), AUTO_REFRESH_MS);
    }
  }

  if (document.getElementById("telLiveTimingList")) {
    const featured = await TelemetryTimingTower.autoLoadLatest();
    if (featured && document.getElementById("telRaceControlList")) {
      TelemetryRaceControl.load(featured.year, featured.round, "R");
    }
    if (featured && document.getElementById("telTyreStrategy")) {
      TelemetryTyreStrategy.load(featured.year, featured.round, "R");
    }
    if (featured) {
      await injectMinisectorBreakdown("telLiveTimingList", featured.year, featured.round, "R");
      setInterval(() => TelemetryTimingTower.load(featured.year, featured.round, "R", { silent: true }), AUTO_REFRESH_MS);
      setInterval(() => TelemetryRaceControl.load(featured.year, featured.round, "R"), AUTO_REFRESH_MS);
      setInterval(() => injectMinisectorBreakdown("telLiveTimingList", featured.year, featured.round, "R"), AUTO_REFRESH_MS);
    }
  }
});

/**
 * Minisectors — appends a horizontal dash-strip per driver, colored
 * purple where that driver was fastest through that segment on their
 * fastest lap.
 */
function createMinisectors(ids) {
  function el() {
    return document.getElementById(ids.container);
  }

  function renderStatus(message) {
    const root = el();
    if (!root) return;
    root.innerHTML = `<div class="tt-status-msg">${message}</div>`;
  }

  function rowHtml(driver) {
    const dashes = driver.segments
      .map((seg) => {
        const cls = seg.is_best ? "ms-dash ms-purple" : seg.speed != null ? "ms-dash ms-yellow" : "ms-dash ms-empty";
        return `<span class="${cls}"></span>`;
      })
      .join("");

    return `
      <div class="ms-row">
        <span class="ms-code" style="color:${driver.team_color || "#f2f2f2"}">${driver.driver_code}</span>
        <span class="ms-dashes">${dashes}</span>
        <span class="ms-laptime">${driver.lap_time || "-"}</span>
      </div>
    `;
  }

  async function load(year, round, sessionType) {
    sessionType = sessionType || "R";
    const root = el();
    if (!root) return;
    renderStatus("Loading minisectors (this can take a moment)…");
    try {
      const res = await fetch(`/api/minisectors?year=${year}&round=${round}&session_type=${sessionType}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load minisectors");
      if (!data.drivers || data.drivers.length === 0) {
        renderStatus("No minisector data available for this session.");
        return;
      }
      root.innerHTML = data.drivers.map(rowHtml).join("");
    } catch (err) {
      renderStatus(`Couldn't load minisectors: ${err.message}`);
      console.error("Minisectors.load failed", err);
    }
  }

  return { load };
}

const TelemetryMinisectors = createMinisectors({ container: "telMinisectors" });

/**
 * Tyre Stint Analysis — horizontal bar per driver showing which compound
 * they ran across which lap ranges.
 */
function createTyreStrategy(ids) {
  const TYRE_BAR_CLASS = {
    SOFT: "ts-soft",
    MEDIUM: "ts-medium",
    HARD: "ts-hard",
    INTERMEDIATE: "ts-inter",
    WET: "ts-wet",
  };

  function el() {
    return document.getElementById(ids.container);
  }

  function renderStatus(message) {
    const root = el();
    if (!root) return;
    root.innerHTML = `<div class="tt-status-msg">${message}</div>`;
  }

  function pick(obj, keys) {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  }

  function rowHtml(driver, totalLaps) {
    const code = pick(driver, ["driver_code", "code", "Driver", "abbreviation", "driver"]) || "?";
    const stints = pick(driver, ["stints", "Stints", "tyre_stints"]) || [];

    const segments = stints
      .map((s) => {
        const compound = (pick(s, ["compound", "Compound"]) || "").toUpperCase();
        const start = pick(s, ["start_lap", "StartLap", "start", "from"]);
        const end = pick(s, ["end_lap", "EndLap", "end", "to"]);
        if (start == null || end == null || !totalLaps) return "";
        const widthPct = (Math.max(end - start, 1) / totalLaps) * 100;
        const cls = TYRE_BAR_CLASS[compound] || "ts-hard";
        return `<div class="ts-segment ${cls}" style="width:${widthPct}%" data-tooltip="${compound} \u00b7 Laps ${start}-${end}"></div>`;
      })
      .join("");

    return `
      <div class="ts-row">
        <span class="ts-code">${code}</span>
        <div class="ts-bar">${segments || '<div class="ts-segment ts-empty" style="width:100%"></div>'}</div>
      </div>
    `;
  }

  async function load(year, round, sessionType) {
    sessionType = sessionType || "R";
    const root = el();
    if (!root) return;
    renderStatus("Loading tyre strategy…");
    try {
      const res = await fetch(`/api/strategy?year=${year}&round=${round}&session_type=${sessionType}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load tyre strategy");

      console.log("Tyre strategy raw response:", data);

      const drivers = pick(data, ["drivers", "Drivers"]) || [];
      const totalLaps = pick(data, ["total_laps", "TotalLaps"]);

      if (!drivers.length || !totalLaps) {
        renderStatus("No tyre strategy data — check console for the raw response shape.");
        return;
      }

      root.innerHTML = drivers.map((d) => rowHtml(d, totalLaps)).join("");
    } catch (err) {
      renderStatus(`Couldn't load tyre strategy: ${err.message}`);
      console.error("TyreStrategy.load failed", err);
    }
  }

  return { load };
}

const TelemetryTyreStrategy = createTyreStrategy({ container: "telTyreStrategy" });

// --- Lightweight custom tooltip (replaces native title attr) ---
(function initCustomTooltip() {
  const tip = document.createElement("div");
  tip.className = "ts-tooltip-popup";
  tip.style.display = "none";
  document.body.appendChild(tip);

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (!target) return;
    tip.textContent = target.getAttribute("data-tooltip");
    tip.style.display = "block";
  });

  document.addEventListener("mousemove", (e) => {
    if (tip.style.display === "none") return;
    tip.style.left = `${e.clientX + 12}px`;
    tip.style.top = `${e.clientY + 12}px`;
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("[data-tooltip]")) tip.style.display = "none";
  });
})();

// --- Phase 2: Minisector & Times expansion block ---
function _mstDashClass(seg) {
  if (seg.is_best) return "mst-dash mst-purple";
  if (seg.speed != null) return "mst-dash mst-yellow";
  return "mst-dash mst-empty";
}

function _mstSectorLineHtml(sectorKey, driverData) {
  const segments = (driverData.sector_segments && driverData.sector_segments[sectorKey]) || [];
  const ownTime = driverData.sector_times ? driverData.sector_times[sectorKey] : null;
  const delta = driverData.sector_deltas ? driverData.sector_deltas[sectorKey] : null;
  const bestTime = ownTime != null && delta != null ? (ownTime + delta) : null;

  const dashes = segments.map((seg) => `<span class="${_mstDashClass(seg)}"></span>`).join("");

  return `
    <div class="mst-line">
      <span class="mst-dashes">${dashes}</span>
      <span class="mst-time">${ownTime != null ? ownTime.toFixed(3) : "-"}</span>
      <span class="mst-time mst-best">${bestTime != null ? bestTime.toFixed(3) : "-"}</span>
      <span class="mst-delta">${delta != null ? delta.toFixed(3) : "-"}</span>
    </div>
  `;
}

function _mstBlockHtml(driverData) {
  return `
    <div class="mst-block" data-mst-for="${driverData.driver_code}">
      ${_mstSectorLineHtml("s1", driverData)}
      ${_mstSectorLineHtml("s2", driverData)}
      ${_mstSectorLineHtml("s3", driverData)}
    </div>
  `;
}

async function injectMinisectorBreakdown(containerId, year, round, sessionType) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const res = await fetch(`/api/minisectors?year=${year}&round=${round}&session_type=${sessionType}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load minisectors");

    const driverMap = {};
    (data.drivers || []).forEach((d) => { driverMap[d.driver_code] = d; });
    _minisectorCache[containerId] = driverMap;
  } catch (err) {
    console.error("injectMinisectorBreakdown failed", err);
    // Keep whatever was cached before — don't wipe out working data on a failed poll.
  }

  _reinsertMinisectorBlocks(containerId);
}

// Dashed placeholder for a row with no computed minisector data yet
// (or a driver the backend silently skipped — e.g. missing sector splits),
// so every row keeps the same layout instead of some rows lacking the block.
const MST_PLACEHOLDER_SEGMENTS = 7; // matches backend SEGMENTS_PER_SECTOR

function _mstBlockPlaceholderHtml(code) {
  const dashes = Array.from({ length: MST_PLACEHOLDER_SEGMENTS })
    .map(() => `<span class="mst-dash mst-empty"></span>`)
    .join("");
  const line = `
    <div class="mst-line">
      <span class="mst-dashes">${dashes}</span>
      <span class="mst-time">-</span>
      <span class="mst-time mst-best">-</span>
      <span class="mst-delta">-</span>
    </div>`;
  return `
    <div class="mst-block" data-mst-for="${code}">
      ${line}${line}${line}
    </div>
  `;
}

// --- Session header bar ---
const SESSION_TYPE_LABEL = {
  FP1: "Practice 1", FP2: "Practice 2", FP3: "Practice 3",
  Q: "Qualifying", SQ: "Sprint Qualifying", S: "Sprint", R: "Race",
};

function renderSessionHeader(meta, sessionType, isLive, year) {
  const container = document.querySelector("#telemetryPanel .telemetry-content-wide");
  if (!container) return;

  const existing = document.getElementById("telSessionHeader");
  if (existing) existing.remove();

  const sessionLabel = SESSION_TYPE_LABEL[sessionType] || sessionType;
  const statusHtml = isLive
    ? `<span class="tsh-status tsh-live"><span class="tsh-live-dot"></span> LIVE</span>`
    : `<span class="tsh-status tsh-replay">REPLAY</span>`;
  const flag = COUNTRY_FLAG[meta.country] || "";

  const header = document.createElement("div");
  header.id = "telSessionHeader";
  header.className = "tsh-bar";
  header.innerHTML = `
    <div class="tsh-titles">
      ${flag ? `<span class="tsh-flag">${flag}</span>` : ""}
      <div class="tsh-title-col">
        <div class="tsh-event">${meta.event_name || ""}: ${sessionLabel}</div>
        ${statusHtml}
      </div>
    </div>
  `;

  container.insertBefore(header, container.firstChild);

  if (year) {
    _renderNextEventBadge(year);
  }
}

// --- Country flag + "Next session" countdown ---
const COUNTRY_FLAG = {
  Australia: "🇦🇺", China: "🇨🇳", Japan: "🇯🇵", "United States": "🇺🇸",
  Canada: "🇨🇦", Monaco: "🇲🇨", Spain: "🇪🇸", Austria: "🇦🇹",
  "United Kingdom": "🇬🇧", Belgium: "🇧🇪", Hungary: "🇭🇺", Netherlands: "🇳🇱",
  Italy: "🇮🇹", Azerbaijan: "🇦🇿", Singapore: "🇸🇬", Mexico: "🇲🇽",
  Brazil: "🇧🇷", "United Arab Emirates": "🇦🇪", "Saudi Arabia": "🇸🇦", Qatar: "🇶🇦",
};

function _findNextEvent(schedule, now) {
  const upcoming = schedule.filter((e) => new Date(e.date + "T00:00:00Z") > now);
  if (upcoming.length === 0) return null;
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0];
}

function _daysUntil(dateStr, now) {
  const target = new Date(dateStr + "T00:00:00Z");
  const diffMs = target - now;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

async function _renderNextEventBadge(year) {
  const el = document.getElementById("telSessionHeader");
  if (!el) return;
  try {
    const res = await fetch(`/api/schedule/${year}`);
    const schedule = await res.json();
    const now = new Date();
    const next = _findNextEvent(schedule, now);
    if (!next) return;

    const days = _daysUntil(next.date, now);
    const flag = COUNTRY_FLAG[next.country] || "";
    const badge = document.createElement("div");
    badge.className = "tsh-next";
    badge.innerHTML = `
      <div class="tsh-next-label">Next: ${next.country} - ${next.event_name}</div>
      <div class="tsh-next-countdown">${days} DAY${days === 1 ? "" : "S"}</div>
    `;
    el.appendChild(badge);

    const titleEl = el.querySelector(".tsh-event");
    if (titleEl && flag && !titleEl.dataset.flagged) {
      titleEl.dataset.flagged = "true";
    }
  } catch (err) {
    console.error("Next-event badge failed", err);
  }
}

// --- Battle Cards + Gap Ladder ---
function _gapSeconds(row) {
  // Key off position, not gap text — replay rows use the literal
  // string "Leader" but the live SignalR feed sends an empty string
  // for GapToLeader on the P1 row, which would otherwise get dropped.
  if (row.position === 1) return 0;
  const gapStr = row.gap;
  if (!gapStr) return null;
  const n = parseFloat(String(gapStr).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function battleCardHtml(row) {
  const isLeader = row.position === 1;
  const team = TEAM_NAME[row.driver_code] || "";
  return `
    <div class="tw-battle-card" style="--card-color:${row.team_color || "#888"}">
      <div class="tw-battle-who">
        <span class="tw-battle-pos">P${row.position}</span>
        <div>
          <div class="tw-battle-code">${row.driver_code || "-"}</div>
          <div class="tw-battle-team">${team}</div>
        </div>
      </div>
      <div class="tw-battle-gap ${isLeader ? "tw-leader" : ""}">${isLeader ? "Leader" : (row.gap || "-")}</div>
    </div>`;
}

function renderBattleStrip(ids, rows) {
  if (!ids.battle) return;
  const el = document.getElementById(ids.battle);
  if (!el) return;
  el.innerHTML = (!rows || rows.length === 0) ? "" : rows.slice(0, 3).map(battleCardHtml).join("");
}

function renderGapLadder(ids, rows) {
  if (!ids.ladder) return;
  const el = document.getElementById(ids.ladder);
  if (!el) return;

  const list = (rows || [])
    .map((r) => ({ r, g: _gapSeconds(r) }))
    .filter((x) => x.g !== null)
    .slice(0, 16);

  if (list.length === 0) { el.innerHTML = ""; return; }

  const H = 320;
  const maxG = Math.log(1 + Math.max(...list.map((x) => x.g)));

  const items = list.map(({ r, g }) => {
    const t = maxG === 0 ? 0 : Math.log(1 + g) / maxG;
    const y = 6 + t * (H - 24);
    const isLeader = g === 0;
    return `
      <div class="ladder-item ${isLeader ? "tw-leader" : ""}" style="top:${y}px;">
        <div class="ladder-gap">${isLeader ? "" : "+" + g.toFixed(1)}</div>
        <div class="ladder-dot" style="--dot-color:${r.team_color || "#888"}"></div>
        <div class="ladder-code">${r.driver_code || "-"}</div>
      </div>`;
  }).join("");

  el.style.minHeight = H + "px";
  el.innerHTML = `<div class="ladder-axis"></div>` + items;
}