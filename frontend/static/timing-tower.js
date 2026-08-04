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
  BOT: "bottas.png", LIN: "lindblad.png",
};

function sectorHtml(sector) {
  if (!sector) return '<span class="tt-sector">—</span>';
  const cls = sector.is_session_best ? "tt-purple" : sector.is_personal_best ? "tt-green" : "";
  return `<span class="tt-sector ${cls}">${sector.time.toFixed(3)}</span>`;
}

function rowHtml(row, prevRow) {
  const tyreCls = TYRE_CLASS[row.compound] || "tt-tyre-hard";
  const tyreLetter = TYRE_LETTER[row.compound] || "?";
  const dotColor = row.team_color || "#888";
  const isLeader = row.position === 1;
  const isOut = row.retired || row.stopped || row.knocked_out;
  const changed = prevRow && (prevRow.position !== row.position || prevRow.last_lap !== row.last_lap);

  const tyreHtml = row.pit_status
    ? `<span class="tt-pit-badge">${row.pit_status}</span>`
    : `<span class="tt-tyre-chip ${tyreCls}">${tyreLetter}</span><span class="tt-tyre-laps">${row.tyre_laps != null ? row.tyre_laps + "L" : ""}</span>`;

  return `
    <div class="tt-row ${isLeader ? "tt-leader" : ""} ${changed ? "tt-flash" : ""}"
         data-status="${isOut ? "out" : "active"}"
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
        <span class="tt-team-dot" style="background:${dotColor}"></span>
        <span class="tt-code">${row.driver_code || "-"}</span>
      </span>
      <span class="tt-tyre">${tyreHtml}</span>
      <span class="tt-pits">${row.pit_count != null ? row.pit_count : "-"}</span>
      <span class="tt-gap">${row.gap || ""}</span>
      <span class="tt-interval">${row.interval || ""}</span>
      <span class="tt-lastlap">${row.last_lap || "-"}</span>
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
function createTimingTower(ids) {
  let previousRows = [];

  function renderStatus(message) {
    const root = document.getElementById(ids.list);
    if (!root) return;
    root.innerHTML = `<div class="tt-status-msg">${message}</div>`;
  }

  function renderRows(rows) {
    const root = document.getElementById(ids.list);
    if (!root) return;
    if (!rows || rows.length === 0) {
      renderStatus("No timing data available for this session.");
      return;
    }
    const prevMap = {};
    previousRows.forEach((r) => { prevMap[r.driver_code] = r; });
    root.innerHTML = tableHeaderHtml() + rows.map((row) => rowHtml(row, prevMap[row.driver_code])).join("");
    previousRows = rows;
    root.querySelectorAll(".tt-flash").forEach((el) => {
      el.addEventListener("animationend", () => el.classList.remove("tt-flash"), { once: true });
    });
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

  async function load(year, round, sessionType) {
    sessionType = sessionType || "R";
    renderStatus("Loading timing tower…");
    try {
      const res = await fetch(`/api/timing-tower?year=${year}&round=${round}&session_type=${sessionType}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load timing tower");
      renderRows(data.rows);
      renderLeaderGauge(data.rows);
      renderStatsFooter(data.rows);
      return data;
    } catch (err) {
      renderStatus(`Couldn't load timing tower: ${err.message}`);
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

  return { load, autoLoadLatest };
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
  stats: "raceStatsFooter",
});
const RaceControl = createRaceControl({ list: "raceControlList" });

// --- Telemetry tab instance (new IDs, see HTML snippet) ---
const TelemetryTimingTower = createTimingTower({
  list: "telLiveTimingList",
  leader: "telRaceLeaderGauge",
  stats: "telRaceStatsFooter",
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
      setInterval(() => TimingTower.load(featured.year, featured.round, "R"), AUTO_REFRESH_MS);
    }
  }

  if (document.getElementById("telLiveTimingList")) {
    const featured = await TelemetryTimingTower.autoLoadLatest();
    if (featured && document.getElementById("telRaceControlList")) {
      TelemetryRaceControl.load(featured.year, featured.round, "R");
    }
    if (featured && document.getElementById("telMinisectors")) {
      TelemetryMinisectors.load(featured.year, featured.round, "R");
    }
    if (featured && document.getElementById("telTyreStrategy")) {
      TelemetryTyreStrategy.load(featured.year, featured.round, "R");
    }
    if (featured) {
      setInterval(() => TelemetryTimingTower.load(featured.year, featured.round, "R"), AUTO_REFRESH_MS);
      setInterval(() => TelemetryRaceControl.load(featured.year, featured.round, "R"), AUTO_REFRESH_MS);
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
 * they ran across which lap ranges. Reads from your existing /api/strategy
 * endpoint. Field names are guessed defensively since I haven't seen
 * f1_data.py's exact response shape — if bars render empty, open the
 * console: it'll print the raw response so we can see the real field names.
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
