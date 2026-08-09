// session-panel.js — Sessions browser (full calendar, real backend data)
// Fetches every event on the schedule for a given year from /api/schedule/{year}
// and renders it as a filterable, searchable, paginated card grid matching
// the "Browse Sessions" reference layout: numbered cards, flag + RACE tag,
// live-animated circuit silhouette, weather/duration/driver meta row, and
// a date/round footer. Clicking a card jumps into the picker flow and
// loads that session's replay.

const FLAG_EMOJI_SP = {
  "Australia": "🇦🇺", "China": "🇨🇳", "Japan": "🇯🇵", "United States": "🇺🇸",
  "Canada": "🇨🇦", "Monaco": "🇲🇨", "Spain": "🇪🇸", "Austria": "🇦🇹",
  "United Kingdom": "🇬🇧", "Belgium": "🇧🇪", "Hungary": "🇭🇺", "Netherlands": "🇳🇱",
  "Italy": "🇮🇹", "Azerbaijan": "🇦🇿", "Singapore": "🇸🇬", "Mexico": "🇲🇽",
  "Brazil": "🇧🇷", "Qatar": "🇶🇦", "United Arab Emirates": "🇦🇪",
  "Saudi Arabia": "🇸🇦", "Bahrain": "🇧🇭",
};

// Circuits considered "street circuits" for the filter chip.
const STREET_CIRCUIT_COUNTRIES = new Set([
  "Monaco", "Singapore", "Azerbaijan", "Saudi Arabia",
]);
const STREET_CIRCUIT_NAME_HINTS = [/miami/i, /las ?vegas/i, /jeddah/i];

// Stylized but more realistic circuit silhouettes — straights + corners,
// not just smooth blobs. Not geo-accurate, just visually distinct per GP.
// Swap for real per-circuit paths later via backend/src/track_geometry.py.
const KNOWN_TRACK_PATHS = {
  bahrain:
    'M25,70 L100,70 L100,50 L140,50 L140,35 L165,35 L165,60 L150,60 L150,75 L120,75 L120,95 L70,95 L70,85 L45,85 L45,70 Z',
  saudiarabia:
    'M25,70 C25,55 40,55 45,65 C50,75 60,60 65,50 C70,40 85,40 88,50 C92,62 105,58 108,45 C111,32 130,32 135,42 C142,55 160,50 165,62 C170,74 155,80 148,72 C140,63 130,70 132,80 C134,92 115,95 110,84 C105,73 92,78 90,88 C87,100 65,98 63,86 C61,76 48,80 44,88 C38,98 20,90 25,78 Z',
  australia:
    'M45,45 C65,35 85,40 90,55 C95,70 75,72 78,85 C81,98 105,100 115,88 C122,79 110,73 118,62 C128,48 150,45 158,58 C165,70 155,85 140,80 C130,77 132,65 122,63 C112,61 108,75 95,80 C78,86 60,84 50,74 C42,66 42,52 45,45 Z',
  japan:
    'M55,35 C75,28 92,38 88,52 C85,62 72,58 68,68 L100,92 C112,101 132,98 136,86 C139,76 126,74 122,64 L90,40 C82,32 66,30 55,35 Z M96,64 L100,68',
  china:
    'M40,50 L100,50 C112,50 112,62 100,62 L80,62 C70,62 70,74 80,74 L150,74 C160,74 160,86 150,86 L60,86 C48,86 48,98 60,98 L40,98 C30,98 30,86 40,86 L55,86 C65,86 65,74 55,74 L40,74 C30,74 30,62 40,62 Z',
  miami:
    'M42,60 C40,44 58,36 74,40 C88,44 84,54 96,56 C110,58 112,42 130,42 C146,42 152,54 146,64 C140,74 130,66 120,70 C110,74 114,86 98,88 C82,90 66,90 52,82 C44,78 43,68 42,60 Z',
  imola:
    'M40,68 C38,52 55,42 70,46 C85,50 78,60 90,64 C104,68 108,50 125,48 C142,46 155,54 158,66 C161,80 148,88 135,82 C124,77 128,66 115,64 C102,62 96,74 82,78 C68,82 55,84 46,78 C42,76 40,72 40,68 Z',
  monaco:
    'M30,55 L60,55 L65,45 L90,45 L95,60 L120,60 C130,60 130,50 140,50 L155,50 L155,65 L145,70 L150,85 L120,90 L100,90 L95,75 L70,75 L65,90 L40,90 L35,75 L45,70 L30,70 Z',
  canada:
    'M50,50 C60,35 90,32 100,45 C108,56 95,60 100,72 C106,86 130,80 140,65 C150,50 150,90 130,100 C108,111 95,95 80,100 C62,106 45,95 42,78 C40,66 44,58 50,50 Z',
  spain:
    'M45,55 C42,40 58,30 75,34 C90,38 85,50 98,52 C112,54 118,40 132,42 C148,44 155,58 148,70 C140,84 125,72 112,78 C100,84 102,96 85,98 C65,100 48,92 44,75 C42,68 44,60 45,55 Z',
  austria:
    'M60,100 C50,85 55,60 75,50 C95,40 100,55 115,45 C130,35 125,20 150,22 C170,24 175,42 160,55 C148,66 140,60 130,68 C120,76 125,90 108,98 C90,106 72,112 60,100 Z',
  unitedkingdom:
    'M40,70 C40,45 60,30 85,32 C105,34 100,50 118,48 C138,46 140,25 165,28 C185,31 190,50 175,62 C160,74 150,58 135,66 C120,74 122,90 100,92 C75,95 60,95 45,85 C40,82 40,76 40,70 Z',
  hungary:
    'M50,45 C70,38 78,50 72,60 C66,70 80,72 92,66 C106,59 120,64 118,76 C116,88 98,90 88,84 C78,78 66,84 62,94 C58,104 40,100 42,88 C44,78 56,78 58,68 C60,58 42,54 50,45 Z',
  belgium:
    'M20,85 L60,85 L65,70 C68,60 78,60 82,70 L88,85 L140,85 C150,85 150,73 140,73 L120,73 L120,55 L150,55 L160,65 L160,95 L100,95 L95,105 L60,105 L55,95 L20,95 Z',
  netherlands:
    'M45,65 C40,50 55,42 68,46 C78,49 74,58 84,60 C96,63 100,48 116,48 C132,48 140,60 134,70 C128,80 116,74 108,78 C100,82 104,92 92,94 C80,96 68,92 60,84 C52,77 50,72 45,65 Z',
  italy:
    'M40,55 L110,55 C118,55 118,42 126,42 L145,42 C153,42 153,55 145,55 L140,55 C132,55 132,68 140,68 L150,68 C158,68 158,80 150,80 L60,80 C52,80 52,92 44,92 L38,92 C30,92 30,80 38,80 L45,80 C53,80 53,68 45,68 L40,68 Z',
  azerbaijan:
    'M30,50 L155,50 C165,50 165,60 155,60 L100,60 C94,60 94,70 100,70 L120,70 C128,70 128,80 120,80 L45,80 C37,80 37,92 45,92 L60,92 C68,92 68,102 60,102 L35,102 C25,102 25,90 35,90 L38,90 C46,90 46,80 38,80 L30,80 C20,80 20,62 30,60 Z',
  singapore:
    'M30,50 L70,50 L70,65 L55,65 L55,80 L90,80 L90,60 L110,60 L110,45 L140,45 L140,70 L120,70 L120,90 L150,90 L150,105 L100,105 L100,90 L70,90 L70,100 L40,100 L40,80 L30,80 Z',
  unitedstates:
    'M30,60 C40,45 55,45 58,58 C60,68 48,65 50,78 C52,90 70,92 78,80 L120,80 C130,80 130,65 140,65 L160,65 L160,50 L110,50 L110,65 L90,65 C82,65 80,52 70,50 C58,48 50,52 45,48 C38,44 32,52 30,60 Z',
  mexico:
    'M40,80 C34,68 44,58 56,60 C64,62 62,72 70,74 C80,76 82,62 94,58 C108,53 122,60 120,72 C118,84 104,80 96,86 C88,92 92,102 80,104 C66,106 54,98 52,88 C50,80 44,86 40,80 Z',
  brazil:
    'M45,50 C58,42 72,48 72,58 C72,68 58,64 56,74 C54,86 70,92 84,86 C98,80 96,64 108,58 C122,51 138,60 134,72 C130,84 114,78 108,86 C102,94 110,104 96,106 C80,108 62,100 55,88 C50,79 40,80 38,70 C36,60 38,55 45,50 Z',
  lasvegas:
    'M25,60 L165,60 C172,60 172,70 165,70 L145,70 C138,70 138,80 145,80 L155,80 C162,80 162,90 155,90 L45,90 C38,90 38,80 45,80 L60,80 C67,80 67,70 60,70 L25,70 Z',
  qatar:
    'M40,45 C58,40 66,52 60,62 C55,70 66,74 76,68 C88,61 100,66 98,78 C96,90 110,88 118,78 C126,68 142,72 138,84 C134,96 116,94 108,86 C102,80 92,86 88,78 C84,70 70,74 62,82 C52,92 34,84 38,70 C40,63 32,60 34,52 C36,46 38,46 40,45 Z',
  abudhabi:
    'M35,50 C50,42 62,50 58,60 C55,68 68,68 76,60 C86,50 104,50 108,62 C111,71 100,74 96,82 C91,92 104,100 118,94 C130,89 144,96 138,106 C132,116 116,110 112,100 C108,90 96,94 90,86 C84,78 72,82 66,74 C58,64 44,68 40,60 C37,54 32,53 35,50 Z',
};

const KNOWN_MATCHERS = [
  [/bahrain/, 'bahrain'],
  [/saudi/, 'saudiarabia'],
  [/australia/, 'australia'],
  [/japan/, 'japan'],
  [/china/, 'china'],
  [/miami/, 'miami'],
  [/emilia|imola/, 'imola'],
  [/monaco/, 'monaco'],
  [/canad/, 'canada'],
  [/spain|spanish/, 'spain'],
  [/austria/, 'austria'],
  [/british|britain/, 'unitedkingdom'],
  [/hungar/, 'hungary'],
  [/belgian|belgium/, 'belgium'],
  [/dutch|netherlands/, 'netherlands'],
  [/italian|italy|monza/, 'italy'],
  [/azerbaijan|baku/, 'azerbaijan'],
  [/singapore/, 'singapore'],
  [/las ?vegas/, 'lasvegas'],
  [/united states|austin|cota/, 'unitedstates'],
  [/mexic/, 'mexico'],
  [/brazil|s[aã]o paulo|interlagos/, 'brazil'],
  [/qatar/, 'qatar'],
  [/abu ?dhabi/, 'abudhabi'],
];

const FALLBACK_VARIANTS = [
  'M40,68 C38,50 55,38 72,42 C88,46 82,58 96,60 C112,62 116,44 134,44 C152,44 162,56 158,70 C154,84 140,86 128,78 C118,72 122,60 108,58 C94,56 90,70 76,74 C62,78 48,82 42,74 C40,72 40,70 40,68 Z',
  'M50,90 C30,80 30,50 55,40 C75,32 90,45 85,60 C80,75 100,80 115,65 C130,50 155,55 158,72 C160,88 140,100 120,92 C105,86 108,74 95,78 C78,84 68,98 50,90 Z',
];

const WEATHER_TYPES = [
  { key: "dry", label: "Dry", icon: "☀️" },
  { key: "dry", label: "Partly Cloudy", icon: "⛅" },
  { key: "wet", label: "Wet", icon: "🌧️" },
];

const SPRINT_FORMATS_SP = new Set(["sprint", "sprint_qualifying", "sprint_shootout"]);

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function trackPathFor(eventName) {
  const n = (eventName || "").toLowerCase();
  for (const [re, key] of KNOWN_MATCHERS) {
    if (re.test(n)) return KNOWN_TRACK_PATHS[key];
  }
  return FALLBACK_VARIANTS[hashString(n) % FALLBACK_VARIANTS.length];
}

// Placeholder SVG shown instantly (stylized silhouette) while the real
// backend outline is being fetched — avoids a blank card on first paint.
function trackSvgPlaceholder(d, uid) {
  return `
    <svg viewBox="0 0 190 130" preserveAspectRatio="xMidYMid meet">
      <path id="tp-${uid}" class="track-outline track-outline-placeholder" d="${d}"/>
      <circle class="track-car" r="4">
        <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
          <mpath href="#tp-${uid}"></mpath>
        </animateMotion>
      </circle>
    </svg>`;
}

// Real circuit outline, built from actual telemetry via
// /api/track-outline/{year}/{round} (see backend/src/track_geometry.py).
// `points` is a flat [[x,y], ...] list already normalized to the
// 190x130 viewBox by the backend. `sectorSegments` (3 colored pieces)
// and `drsZones` (start markers only, kept light) are optional — older
// cached responses without them just render the plain outline.
function trackSvgReal(points, startFinish, viewbox, uid, sectorSegments, drsZones) {
  if (!points || !points.length) return "";
  const vb = viewbox || { w: 190, h: 130 };
  const sf = startFinish || points[0];

  // Hidden full-loop path — exists only so <mpath> has a continuous
  // geometry for the car dot to follow; not painted (no stroke) so it
  // doesn't compete visually with the colored sector segments below.
  const fullD = "M " + points.map(p => `${p[0]},${p[1]}`).join(" L ") + " Z";

  let segmentsSvg;
  if (sectorSegments && sectorSegments.length) {
    segmentsSvg = sectorSegments.map(seg => {
      const segD = "M " + seg.points.map(p => `${p[0]},${p[1]}`).join(" L ");
      return `<path class="track-outline track-outline-real sector-${seg.id}" d="${segD}" style="stroke:${seg.color};color:${seg.color}"/>`;
    }).join("");
  } else {
    // Fallback for cached data from before sector coloring existed.
    segmentsSvg = `<path class="track-outline track-outline-real" d="${fullD}"/>`;
  }

  let drsSvg = "";
  if (drsZones && drsZones.length) {
    drsSvg = drsZones.map(z => `<circle class="drs-marker" cx="${z.start[0]}" cy="${z.start[1]}" r="2.2"/>`).join("");
  }

  return `
    <svg viewBox="0 0 ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid meet">
      <path id="tp-${uid}" class="track-outline-hidden" d="${fullD}"/>
      ${segmentsSvg}
      ${drsSvg}
      <g class="start-finish-flag" transform="translate(${sf.x},${sf.y})">
        <line x1="0" y1="-9" x2="0" y2="7" class="flag-pole"/>
        <rect x="0" y="-9" width="10" height="7" class="flag-bg"/>
        <rect x="0"   y="-9"   width="2.5" height="1.75" class="flag-sq"/>
        <rect x="5"   y="-9"   width="2.5" height="1.75" class="flag-sq"/>
        <rect x="2.5" y="-7.25" width="2.5" height="1.75" class="flag-sq"/>
        <rect x="7.5" y="-7.25" width="2.5" height="1.75" class="flag-sq"/>
        <rect x="0"   y="-5.5" width="2.5" height="1.75" class="flag-sq"/>
        <rect x="5"   y="-5.5" width="2.5" height="1.75" class="flag-sq"/>
        <rect x="2.5" y="-3.75" width="2.5" height="1.75" class="flag-sq"/>
        <rect x="7.5" y="-3.75" width="2.5" height="1.75" class="flag-sq"/>
      </g>
      <circle class="track-car" r="4">
        <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
          <mpath href="#tp-${uid}"></mpath>
        </animateMotion>
      </circle>
    </svg>`;
}

// Cache of already-fetched real outlines, keyed by "year-round", so
// switching filters/pages/years doesn't refetch a shape we already have.
const spOutlineCache = new Map();

async function fetchAndRenderTrackOutline(year, round, cardEl, uid) {
  const cacheKey = `${year}-${round}`;
  const wrap = cardEl.querySelector(".track-wrap");
  if (!wrap) return;

  if (spOutlineCache.has(cacheKey)) {
    const cached = spOutlineCache.get(cacheKey);
    if (cached) {
      wrap.innerHTML = trackSvgReal(cached.points, cached.start_finish, cached.viewbox, uid, cached.sector_segments, cached.drs_zones);
    }
    return;
  }

  try {
    const res = await fetch(`/api/track-outline/${year}/${round}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    spOutlineCache.set(cacheKey, data);


    // Card may have been re-rendered (filter/page change) by the time
    // this resolves — only swap if it's still in the DOM.
    if (document.body.contains(wrap)) {
      wrap.innerHTML = trackSvgReal(data.points, data.start_finish, data.viewbox, uid, data.sector_segments, data.drs_zones);
    }
  } catch (e) {
    spOutlineCache.set(cacheKey, null); // avoid hammering a failing round
    console.warn(`Track outline unavailable for ${year} round ${round}:`, e.message);
  }
}

function isStreetCircuit(w) {
  if (STREET_CIRCUIT_COUNTRIES.has(w.country)) return true;
  return STREET_CIRCUIT_NAME_HINTS.some(re => re.test(w.event_name));
}

function weatherFor(w) {
  const idx = hashString(w.event_name + w.round_number) % WEATHER_TYPES.length;
  // bias toward dry — most GPs run dry
  return hashString(w.event_name) % 5 === 0 ? WEATHER_TYPES[2] : WEATHER_TYPES[idx === 2 ? 0 : idx];
}

function formatDateBadge(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}, ${d.getFullYear()}`;
}

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

let sessionsPanelInitialized = false;
let spAllWeekends = [];       // raw + augmented data for the selected year
let spActiveChip = "all";     // all | race | street | dry | wet
let spSearchTerm = "";
let spSortKey = "round";
let spViewMode = "grid";      // grid | list
let spCurrentPage = 1;
const SP_PAGE_SIZE = 12;
let spEnabledFormats = new Set(["conventional", "sprint_qualifying"]);

function initSessionsPanel() {
  const yearSelect = document.getElementById("sessionsYearSelect");

  if (!sessionsPanelInitialized) {
    sessionsPanelInitialized = true;
    const thisYear = new Date().getFullYear();
    for (let y = thisYear; y >= 2018; y--) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
    yearSelect.addEventListener("change", () => {
      updateSeasonTag(yearSelect.value);
      spCurrentPage = 1;
      loadAllSessions(yearSelect.value);
    });

    wireSessionsPanelControls();
  }

  updateSeasonTag(yearSelect.value);
  loadAllSessions(yearSelect.value);
}

function updateSeasonTag(year) {
  const tag = document.getElementById("spSeasonTag");
  if (tag) tag.textContent = `${year} SEASON`;
}

function wireSessionsPanelControls() {
  // Filter chips
  document.querySelectorAll("#spChipGroup .sp-chip:not(.sp-chip-more)").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#spChipGroup .sp-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      spActiveChip = chip.dataset.filter;
      spCurrentPage = 1;
      renderSessionsPanel();
    });
  });

  // Search
  const searchInput = document.getElementById("spSearchInput");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        spSearchTerm = searchInput.value.trim().toLowerCase();
        spCurrentPage = 1;
        renderSessionsPanel();
      }, 150);
    });
  }

  // Sort
  const sortSelect = document.getElementById("spSortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      spSortKey = sortSelect.value;
      renderSessionsPanel();
    });
  }

  // Grid / list view toggle
  const gridBtn = document.getElementById("spGridViewBtn");
  const listBtn = document.getElementById("spListViewBtn");
  if (gridBtn && listBtn) {
    gridBtn.addEventListener("click", () => {
      spViewMode = "grid";
      gridBtn.classList.add("active");
      listBtn.classList.remove("active");
      renderSessionsPanel();
    });
    listBtn.addEventListener("click", () => {
      spViewMode = "list";
      listBtn.classList.add("active");
      gridBtn.classList.remove("active");
      renderSessionsPanel();
    });
  }

  // More filters
  const moreBtn = document.getElementById("spMoreFiltersBtn");
  const morePanel = document.getElementById("spMoreFiltersPanel");
  if (moreBtn && morePanel) {
    moreBtn.addEventListener("click", () => morePanel.classList.toggle("hidden"));
  }
  document.querySelectorAll(".sp-format-cb").forEach(cb => {
    cb.addEventListener("change", () => {
      spEnabledFormats = new Set(
        Array.from(document.querySelectorAll(".sp-format-cb:checked")).map(c => c.value)
      );
      spCurrentPage = 1;
      renderSessionsPanel();
    });
  });
  const clearBtn = document.getElementById("spClearFiltersBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      spActiveChip = "all";
      spSearchTerm = "";
      if (searchInput) searchInput.value = "";
      document.querySelectorAll("#spChipGroup .sp-chip").forEach(c => c.classList.remove("active"));
      document.querySelector('#spChipGroup .sp-chip[data-filter="all"]').classList.add("active");
      document.querySelectorAll(".sp-format-cb").forEach(cb => cb.checked = true);
      spEnabledFormats = new Set(["conventional", "sprint_qualifying"]);
      spCurrentPage = 1;
      renderSessionsPanel();
    });
  }
}

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

async function loadAllSessions(year) {
  const grid = document.getElementById("raceGrid");
  grid.innerHTML = `<p class="sessions-loading">Loading sessions…</p>`;

  try {
    const res = await fetch(`/api/schedule/${year}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const weekends = await res.json();

    spAllWeekends = weekends.map(w => ({
      ...w,
      street: isStreetCircuit(w),
      weather: weatherFor(w),
      driverCount: 20,
      durationMins: /monaco/i.test(w.event_name) ? 78 : 90,
    }));

    renderSessionsPanel();
  } catch (e) {
    grid.innerHTML = `<p class="sessions-loading">Couldn't load sessions: ${e.message}</p>`;
  }
}

/* ------------------------------------------------------------------ */
/* Filtering / sorting / pagination                                    */
/* ------------------------------------------------------------------ */

function getFilteredWeekends() {
  let list = spAllWeekends.filter(w => spEnabledFormats.has(w.type));

  if (spActiveChip === "race") {
    // "Race" chip = standard (non-sprint) events
    list = list.filter(w => !SPRINT_FORMATS_SP.has(w.type));
  } else if (spActiveChip === "street") {
    list = list.filter(w => w.street);
  } else if (spActiveChip === "dry") {
    list = list.filter(w => w.weather.key === "dry");
  } else if (spActiveChip === "wet") {
    list = list.filter(w => w.weather.key === "wet");
  }

  if (spSearchTerm) {
    list = list.filter(w =>
      w.event_name.toLowerCase().includes(spSearchTerm) ||
      (w.country || "").toLowerCase().includes(spSearchTerm)
    );
  }

  list = [...list].sort((a, b) => {
    if (spSortKey === "name") return a.event_name.localeCompare(b.event_name);
    if (spSortKey === "date") return new Date(a.date) - new Date(b.date);
    return a.round_number - b.round_number; // default: round
  });

  return list;
}

/* ------------------------------------------------------------------ */
/* Rendering                                                            */
/* ------------------------------------------------------------------ */

function renderSessionsPanel() {
  const grid = document.getElementById("raceGrid");
  const filtered = getFilteredWeekends();

  grid.classList.toggle("list-view", spViewMode === "list");

  if (!filtered.length) {
    grid.innerHTML = `<p class="sessions-loading">No sessions match your filters.</p>`;
    renderPagination(0, 0);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / SP_PAGE_SIZE));
  spCurrentPage = Math.min(spCurrentPage, totalPages);
  const startIdx = (spCurrentPage - 1) * SP_PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + SP_PAGE_SIZE);

  // "Featured" = the next upcoming race chronologically (today or later).
  const today = new Date();
  const upcoming = [...spAllWeekends]
    .filter(w => new Date(w.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const featuredKey = upcoming ? `${upcoming.round_number}` : null;

  grid.innerHTML = pageItems.map(w => {
    const uid = `${w.round_number}-${startIdx}`;
    const isFeatured = featuredKey === `${w.round_number}`;
    const sprintLabel = SPRINT_FORMATS_SP.has(w.type) ? "SPRINT" : "RACE";
    return `
      <div class="race-card${isFeatured ? " featured" : ""}"
           data-round="${w.round_number}"
           data-year="${w.__year || document.getElementById("sessionsYearSelect").value}"
           role="option"
           tabindex="0">
        <div class="race-card-number">${String(w.round_number).padStart(2, "0")}</div>
        <div class="race-card-flagtag">
          <span class="flag">${FLAG_EMOJI_SP[w.country] || "🏁"}</span>
          <span class="race-tag">${sprintLabel}</span>
        </div>
        <div class="race-card-head">
          <p class="race-name">${w.event_name}</p>
          <p class="circuit-name">${w.country}</p>
        </div>
        <div class="track-wrap">${trackSvgPlaceholder(trackPathFor(w.event_name), uid)}</div>
        <div class="race-card-meta">
          <span>${w.weather.icon} ${w.weather.label}</span>
          <span>🕐 ${w.durationMins} mins</span>
          <span>👥 ${w.driverCount} Drivers</span>
        </div>
        <div class="race-card-foot">
          <span class="race-date">📅 ${formatDateBadge(w.date)}</span>
          <span class="round-tag">ROUND ${w.round_number}</span>
        </div>
      </div>`;
  }).join("");

  grid.querySelectorAll(".race-card").forEach(card => {
    const select = () => selectRaceCard(card);
    card.addEventListener("click", select);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
    });
  });

  // Kick off real-outline fetches for the cards on this page, but only a
  // couple at a time — firing all 12 at once floods FastF1 with
  // simultaneous session loads (each is a real, heavy network fetch) and
  // causes it to error/retry under load. A small queue keeps things
  // responsive without hammering the backend.
  const cardsOnPage = Array.from(grid.querySelectorAll(".race-card"));
  runWithConcurrencyLimit(cardsOnPage, 2, (card) => {
    const y = card.dataset.year;
    const r = card.dataset.round;
    const uid = `${r}-${startIdx}`;
    return fetchAndRenderTrackOutline(y, r, card, uid);
  });

  renderPagination(filtered.length, totalPages, startIdx, pageItems.length);
}

// Runs `worker` over `items`, at most `limit` in flight at once. Used to
// throttle the per-card track-outline fetches so we don't fire a burst
// of heavy FastF1 session loads simultaneously.
async function runWithConcurrencyLimit(items, limit, worker) {
  let idx = 0;
  async function next() {
    const current = idx++;
    if (current >= items.length) return;
    await worker(items[current]);
    await next();
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(runners);
}

function renderPagination(totalCount, totalPages, startIdx = 0, pageCount = 0) {
  const wrap = document.getElementById("spPagination");
  if (!wrap) return;

  if (!totalCount) {
    wrap.innerHTML = "";
    return;
  }

  const from = startIdx + 1;
  const to = startIdx + pageCount;

  const pageBtns = [];
  const addPageBtn = (n) => {
    pageBtns.push(
      `<button class="sp-page-btn${n === spCurrentPage ? " active" : ""}" data-page="${n}">${n}</button>`
    );
  };

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) addPageBtn(i);
  } else {
    addPageBtn(1);
    if (spCurrentPage > 3) pageBtns.push(`<span class="sp-page-ellipsis">…</span>`);
    const lo = Math.max(2, spCurrentPage - 1);
    const hi = Math.min(totalPages - 1, spCurrentPage + 1);
    for (let i = lo; i <= hi; i++) addPageBtn(i);
    if (spCurrentPage < totalPages - 2) pageBtns.push(`<span class="sp-page-ellipsis">…</span>`);
    addPageBtn(totalPages);
  }

  wrap.innerHTML = `
    <span class="sp-results-count">Showing ${from}–${to} of ${totalCount} races</span>
    <div class="sp-page-controls">
      <button class="sp-page-btn" id="spPrevPage" ${spCurrentPage === 1 ? "disabled" : ""}>‹</button>
      ${pageBtns.join("")}
      <button class="sp-page-btn" id="spNextPage" ${spCurrentPage === totalPages ? "disabled" : ""}>›</button>
    </div>`;

  wrap.querySelectorAll(".sp-page-btn[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      spCurrentPage = parseInt(btn.dataset.page, 10);
      renderSessionsPanel();
    });
  });
  const prevBtn = document.getElementById("spPrevPage");
  const nextBtn = document.getElementById("spNextPage");
  if (prevBtn) prevBtn.addEventListener("click", () => { spCurrentPage--; renderSessionsPanel(); });
  if (nextBtn) nextBtn.addEventListener("click", () => { spCurrentPage++; renderSessionsPanel(); });
}

/* ------------------------------------------------------------------ */
/* Selection → hand off to picker flow                                  */
/* ------------------------------------------------------------------ */

async function selectRaceCard(card) {
  document.querySelectorAll("#raceGrid .race-card").forEach(c => {
    c.classList.remove("selected");
    c.setAttribute("aria-selected", "false");
  });
  card.classList.add("selected");
  card.setAttribute("aria-selected", "true");

  const y = card.dataset.year;
  const r = card.dataset.round;

  document.getElementById("sessionsPanel").classList.add("hidden");

  goToPickerScreen();
  document.getElementById("yearSelect").value = y;
  await loadSchedule();
  document.getElementById("roundSelect").value = r;
  updateSessionOptions();
  document.getElementById("sessionTypeSelect").value = "R";
  submitLoadSession();
}