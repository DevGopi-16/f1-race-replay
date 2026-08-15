(function () {
  let _allTeams = [];
  let _panelMeta = {};
  let _container = null;
  let _selectedName = null;
  let _viewMode = "list";
  let _resizeHandler = null;
  let _currentYear = null;
  let _currentSort = "points";

  function sortTeams(teams, by) {
    const copy = [...teams];
    if (by === "wins") return copy.sort((a, b) => (b.wins || 0) - (a.wins || 0) || (b.points || 0) - (a.points || 0));
    if (by === "name") return copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy.sort((a, b) => (b.points || 0) - (a.points || 0)); // "points" default
  }

  async function loadConstructorsPanel(containerId, { year, round = null }) {
    _container = document.getElementById(containerId);
    if (!_container) {
      console.error(`[constructors-panel] container #${containerId} not found`);
      return;
    }

    _currentYear = year;
    _container.innerHTML = skeletonHTML();

    const params = new URLSearchParams({ year });
    if (round) params.set("round", round);

    try {
      const res = await fetch(`/api/constructors/panel?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      _allTeams = json.teams || [];
      _panelMeta = {
        total_points: json.total_points ?? 0,
        races_completed: json.races_completed ?? 0,
        total_rounds: json.total_rounds ?? 0,
        next_round: json.next_round || null,
      };
      _selectedName = _allTeams[0]?.name || null;

      render();
      setupResizeHandler();
    } catch (err) {
      console.error("[constructors-panel] failed to load:", err);
      _container.innerHTML = `
        <div class="cp-error">
          <p>Couldn't load constructor data. Please try again.</p>
          <button id="cp-retry-btn" class="cp-back-btn">Retry</button>
        </div>
      `;
      const retryBtn = _container.querySelector("#cp-retry-btn");
      if (retryBtn) {
        retryBtn.addEventListener("click", () => loadConstructorsPanel(containerId, { year, round }));
      }
    }
  }

  function fmtNum(v, fallback = "—") {
    return v === null || v === undefined ? fallback : v;
  }
  function fmtPct(v, fallback = "—") {
    return v === null || v === undefined ? fallback : `${v}%`;
  }
  function fmtSecs(v, fallback = "—") {
    return v === null || v === undefined ? fallback : `${v}s`;
  }

  // ---------------------------------------------------------------------
  // LIST VIEW (Constructors' Championship dashboard)
  // ---------------------------------------------------------------------

  function render() {
    if (_viewMode === "profile") {
      const selected = _allTeams.find(c => c.name === _selectedName) || _allTeams[0];
      _container.innerHTML = profilePageHTML(selected);
      wireUpEvents();
      return;
    }

    // Leader card/stat cards always reflect the actual points leader,
    // regardless of the sort mode applied to the list below.
    const leaderSorted = [..._allTeams].sort((a, b) => (b.points || 0) - (a.points || 0));
    const leader = leaderSorted[0];
    const maxPointsForBars = leader ? (leader.points || 1) : 1;
    const sorted = sortTeams(_allTeams, _currentSort);
    const maxPoints = maxPointsForBars;
    const nr = _panelMeta.next_round;

    _container.innerHTML = `
      <div class="cp-header-row">
        <div class="cp-title-block">
          <div class="cp-season-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.4l-6.3 4.6 2.3-7.2-6-4.6h7.6z"/></svg>
            ${_currentYear} SEASON
          </div>
          <h1 class="cp-title">CONSTRUCTORS'<br>CHAMPIONSHIP</h1>
          <p class="cp-subtitle">The battle for constructor glory across ${_panelMeta.total_rounds} rounds</p>
        </div>

        <div class="cp-leader-card">
          <div class="cp-leader-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h14v2a5 5 0 01-5 5H10A5 5 0 015 6V4z"/><path d="M10 11v4h4v-4M8 20h8v-2H8z"/></svg>
            CHAMPIONSHIP LEADER
          </div>
          <div class="cp-leader-body">
            ${leader?.teamLogo ? `<img class="cp-leader-logo" src="${leader.teamLogo}" alt="${leader.name}">` : `<div class="cp-leader-logo cp-logo-fallback" style="background:${leader?.color || "#888"}22;color:${leader?.color || "#888"}">${(leader?.name || "?")[0]}</div>`}
            <div class="cp-leader-name-block">
              <div class="cp-leader-name">${leader?.name?.toUpperCase() || "—"}</div>
              <div class="cp-leader-team">${(leader?.drivers || []).map(d => d.name).join(" • ")}</div>
            </div>
            <div class="cp-leader-points">
              <span class="cp-leader-points-num">${leader?.points ?? 0}</span>
              <span class="cp-leader-points-label">PTS</span>
            </div>
          </div>
          <div class="cp-leader-wins">${leader?.wins ?? 0} WIN${(leader?.wins ?? 0) === 1 ? "" : "S"}</div>
          <div class="cp-leader-bar-track"><div class="cp-leader-bar-fill" style="width:100%"></div></div>
        </div>

        <div class="cp-stat-card">
          <div class="cp-stat-icon cp-icon-points"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18M7 15l4-4 3 3 5-6"/></svg></div>
          <div class="cp-stat-label">TOTAL POINTS</div>
          <div class="cp-stat-value">${_panelMeta.total_points.toLocaleString()}</div>
          <div class="cp-stat-sub">All Teams</div>
        </div>

        <div class="cp-stat-card">
          <div class="cp-stat-icon cp-icon-races"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20M4 4h14l-2 4 2 4H4"/></svg></div>
          <div class="cp-stat-label">RACES COMPLETED</div>
          <div class="cp-stat-value">${_panelMeta.races_completed}<span class="cp-stat-value-of"> / ${_panelMeta.total_rounds}</span></div>
          <div class="cp-stat-sub">Rounds</div>
        </div>

        <div class="cp-stat-card">
          <div class="cp-stat-icon cp-icon-next"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
          <div class="cp-stat-label">NEXT ROUND</div>
          <div class="cp-stat-value cp-stat-value-sm">${nr?.name || "—"}</div>
          <div class="cp-stat-sub">${nr?.date_range || "—"}</div>
        </div>
      </div>

      <div class="cp-standings-card">
        <div class="cp-standings-header">
          <div class="cp-standings-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18M7 16l3-4 3 2 4-6"/></svg>
            CONSTRUCTOR STANDINGS
          </div>
          <div class="cp-sort-block">
            <label for="cpSortSelect">SORT BY:</label>
            <select id="cpSortSelect" class="cp-sort-select">
              <option value="points" ${_currentSort === "points" ? "selected" : ""}>Points</option>
              <option value="wins" ${_currentSort === "wins" ? "selected" : ""}>Wins</option>
              <option value="name" ${_currentSort === "name" ? "selected" : ""}>Name</option>
            </select>
          </div>
        </div>
        <div class="cp-standings-list">
          ${sorted.map((c, i) => standingsRowHTML(c, i + 1, maxPoints)).join("") || `<p class="cp-empty">No constructor data yet.</p>`}
        </div>
        <div class="cp-standings-footer"><span class="cp-live-dot"></span> Live standings &nbsp;•&nbsp; Updated in real time</div>
      </div>
    `;

    wireUpEvents();
    animateBarWidths(_container);
  }

  function standingsRowHTML(c, rank, maxPoints) {
    const color = c.color || "#888";
    const pct = maxPoints ? Math.max(((c.points || 0) / maxPoints) * 100, 2) : 2;
    return `
      <div class="cp-row ${rank === 1 ? "cp-row-leader" : ""}" data-team-name="${escapeAttr(c.name)}" style="--row-color:${color};">
        <div class="cp-row-rank">${String(rank).padStart(2, "0")}</div>
        ${c.teamLogo ? `<img class="cp-row-logo" src="${c.teamLogo}" alt="${c.name}" onerror="this.style.visibility='hidden'">` : `<div class="cp-row-logo cp-logo-fallback" style="background:${color}22;color:${color}">${(c.name || "?")[0]}</div>`}
        <div class="cp-row-team-block">
          <div class="cp-row-team-name">${(c.name || "").toUpperCase()}</div>
          <div class="cp-row-drivers">${(c.drivers || []).map(d => d.name).join(" • ")}</div>
        </div>
        <div class="cp-row-bar-track"><div class="cp-row-bar-fill" data-target-width="${pct}" style="width:0%"></div></div>
        <div class="cp-row-points">${c.points ?? 0}<span class="cp-row-points-label">PTS</span></div>
        <div class="cp-row-wins">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h14v2a5 5 0 01-5 5H10A5 5 0 015 6V4z"/><path d="M10 11v4h4v-4M8 20h8v-2H8z"/></svg>
          ${c.wins ?? 0} WIN${(c.wins ?? 0) === 1 ? "" : "S"}
        </div>
      </div>
    `;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  // ---------------------------------------------------------------------
  // PROFILE VIEW (single-team dashboard)
  // ---------------------------------------------------------------------

  function profilePageHTML(c) {
    if (!c) return `<p class="cp-empty">Team not found.</p>`;
    const color = c.color || "#e10600";
    const drivers = c.drivers || [];
    const stats = c.team_stats || {};
    const history = c.history || [];
    const others = _allTeams.filter(t => t.name !== c.name);
    const leader = [..._allTeams].sort((a, b) => (b.points || 0) - (a.points || 0))[0];
    const gap = leader && leader.name !== c.name ? Math.round((leader.points || 0) - (c.points || 0)) : 0;
    const closestBehind = [..._allTeams]
      .filter(t => (t.points || 0) < (c.points || 0))
      .sort((a, b) => (b.points || 0) - (a.points || 0))[0];
    const gapAhead = closestBehind ? Math.round((c.points || 0) - (closestBehind.points || 0)) : null;

    return `
      <button id="cp-profile-back" class="cp-back-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        Back
      </button>

      <div class="cp-team-hero" style="--team-color:${color};">
        <div class="cp-team-hero-left">
          ${c.teamLogo ? `<img class="cp-team-hero-logo" src="${c.teamLogo}" alt="${c.name}">` : `<div class="cp-team-hero-logo cp-logo-fallback" style="background:${color}22;color:${color}">${(c.name || "?")[0]}</div>`}
          <div>
            <div class="cp-team-hero-name">${(c.name || "").toUpperCase()}</div>
            <div class="cp-team-hero-drivers">${drivers.map(d => `${d.name || ""} <span class="cp-hero-num">#${d.number ?? "-"}</span>`).join(" &nbsp;•&nbsp; ")}</div>
          </div>
        </div>
        <div class="cp-team-hero-right">
          <div class="cp-hero-pos-label">CHAMPIONSHIP<br>POSITION</div>
          <div class="cp-hero-pos" style="color:${color};">P${c.position ?? "-"}</div>
          <div class="cp-hero-points">${c.points ?? 0}<span>PTS</span></div>
          <div class="cp-hero-wins">${c.wins ?? 0} WINS</div>
        </div>
      </div>

      <div class="cp-stats-row">
        ${statChip("TOTAL POINTS", c.points ?? 0, gap ? `${gap} behind ${leader.name}` : null)}
        ${statChip("WINS", c.wins ?? 0)}
        ${statChip("PODIUMS", c.podiums ?? 0)}
        ${statChip("POLES", c.poles ?? 0)}
        ${statChip("FASTEST LAPS", c.fastest_laps ?? 0)}
        ${statChip("POINTS FINISHES", stats.points_finishes ?? 0)}
        ${statChip("DNFS", stats.dnfs ?? 0)}
      </div>

      <div class="cp-two-col">
        <div class="cp-card">
          <div class="cp-card-title">DRIVERS</div>
          <div class="cp-drivers-grid">
            ${drivers.map(d => driverCardHTML(d, color)).join("")}
          </div>
        </div>
        <div class="cp-card">
          <div class="cp-card-title">CHAMPIONSHIP PROGRESSION</div>
          <div class="cp-chart-canvas-wrap" style="height:170px;">
            <canvas id="cp-progression-canvas"></canvas>
            <div class="cp-chart-tooltip" id="cp-progression-tooltip"></div>
          </div>
        </div>
      </div>

      ${history.length ? raceByRaceHTML(history, drivers, color) : ""}

      <div class="cp-two-col">
        <div class="cp-card">
          <div class="cp-card-title">TEAM STATISTICS</div>
          <table class="cp-stat-table">
            <tr><td>Wins</td><td>${c.wins ?? 0}</td></tr>
            <tr><td>Podiums</td><td>${c.podiums ?? 0}</td></tr>
            <tr><td>Poles</td><td>${c.poles ?? 0}</td></tr>
            <tr><td>Fastest Laps</td><td>${c.fastest_laps ?? 0}</td></tr>
            <tr><td>Points Finishes</td><td>${stats.points_finishes ?? 0}</td></tr>
            <tr><td>DNFs</td><td>${stats.dnfs ?? 0}</td></tr>
            <tr><td>Average Start</td><td>${fmtNum(stats.avg_start)}</td></tr>
            <tr><td>Average Finish</td><td>${fmtNum(stats.avg_finish)}</td></tr>
            <tr><td>Best Finish</td><td style="color:${color};">${stats.best_finish ? "P" + stats.best_finish : "—"}</td></tr>
          </table>
        </div>
        <div class="cp-card">
          <div class="cp-card-title">POINTS PER ROUND</div>
          <div class="cp-chart-canvas-wrap" style="height:170px;">
            <canvas id="cp-bars-canvas"></canvas>
          </div>
        </div>
      </div>

      <div class="cp-two-col">
        <div class="cp-card">
          <div class="cp-card-title">${c.name.toUpperCase()} VS COMPETITORS</div>
          ${vsCompetitorsHTML(c, others)}
        </div>
        <div class="cp-card cp-gap-card">
          <div class="cp-card-title">GAP TO LEADER</div>
          ${gapToLeaderHTML(gap, leader, gapAhead, closestBehind, color)}
        </div>
      </div>

      <div class="cp-card">
        <div class="cp-card-title">RELIABILITY</div>
        <table class="cp-stat-table">
          <tr><td>DNFs</td><td>${c.dnfs ?? 0}</td></tr>
          <tr><td>Mechanical Failures</td><td>${c.mechanical_failures ?? 0}</td></tr>
          <tr><td>Retirements</td><td>${c.retirements ?? 0}</td></tr>
          <tr><td>Reliability Rate</td><td style="color:${color};">${fmtPct(c.reliability_rate)}</td></tr>
          <tr><td>Avg Pit Stop</td><td>${fmtSecs(c.avg_pit_stop)}</td></tr>
          <tr><td>Fastest Pit Stop</td><td style="color:${color};">${fmtSecs(c.fastest_pit_stop)}</td></tr>
        </table>
      </div>
    `;
  }

  function statChip(label, value, sub = null) {
    return `
      <div class="cp-stat-chip">
        <div class="cp-stat-chip-value">${value}</div>
        <div class="cp-stat-chip-label">${label}</div>
        ${sub ? `<div class="cp-stat-chip-sub">${sub}</div>` : ""}
      </div>
    `;
  }

  function driverCardHTML(d, color) {
    return `
      <div class="cp-driver-card" data-driver-code="${escapeAttr(d.code || "")}" style="--team-color:${color};">
        <div class="cp-driver-card-toprow">
          <span class="cp-driver-card-num">#${d.number ?? "-"} ${d.name || ""}</span>
          ${d.position ? `<span class="cp-driver-card-badge" style="background:${color}22; color:${color};">P${d.position}</span>` : ""}
        </div>
        <div class="cp-driver-card-pts">${d.points ?? 0}<span>pts</span></div>
        <div class="cp-driver-card-podiums">${d.podiums ?? 0} podiums</div>
      </div>
    `;
  }

  function raceByRaceHTML(history, drivers, color) {
    const [a, b] = drivers;
    const rows = history.map(h => {
      const aRound = a?.history?.find(x => x.round === h.round);
      const bRound = b?.history?.find(x => x.round === h.round);
      return `
        <tr>
          <td>${h.round}</td>
          <td>${h.country || "—"}</td>
          <td>${aRound?.position ? "P" + aRound.position : "—"}</td>
          <td>${bRound?.position ? "P" + bRound.position : "—"}</td>
          <td>${h.points ?? 0}</td>
        </tr>
      `;
    }).join("");
    const total = history.reduce((s, h) => s + (h.points || 0), 0);

    return `
      <div class="cp-card">
        <div class="cp-card-title">RACE BY RACE PERFORMANCE</div>
        <table class="cp-race-table">
          <thead>
            <tr><th>ROUND</th><th>COUNTRY</th><th>${a?.code || a?.name?.slice(0,3).toUpperCase() || "D1"}</th><th>${b?.code || b?.name?.slice(0,3).toUpperCase() || "D2"}</th><th>TEAM PTS</th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="4">TOTAL</td><td style="color:${color};">${total}</td></tr></tfoot>
        </table>
      </div>
    `;
  }

  function vsCompetitorsHTML(c, others) {
    const all = [c, ...others].sort((a, b) => (b.points || 0) - (a.points || 0));
    const max = all[0]?.points || 1;
    return `
      <div class="cp-vs-list">
        ${all.map(t => `
          <div class="cp-vs-row ${t.name === c.name ? "cp-vs-row-self" : ""}">
            <span class="cp-vs-name" style="color:${t.color || "#888"};">${t.name}</span>
            <div class="cp-vs-track"><div class="cp-vs-fill" data-target-width="${Math.max(((t.points || 0) / max) * 100, 1)}" style="width:0%; background:${t.color || "#888"};"></div></div>
            <span class="cp-vs-points">${t.points ?? 0}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function gapToLeaderHTML(gap, leader, gapAhead, behindTeam, color) {
    if (!leader || gap === 0) {
      return `<p class="cp-gap-leader-msg">Championship leader — ${gapAhead != null ? `+${gapAhead} pts ahead of ${behindTeam?.name || "next team"}` : ""}</p>`;
    }
    const pct = Math.min((gap / (leader.points || 1)) * 100, 100);
    return `
      <div class="cp-gap-gauge" style="--gap-pct:${pct}; --team-color:${color};">
        <div class="cp-gap-gauge-ring">
          <div class="cp-gap-gauge-num">-${gap}<span>POINTS</span></div>
        </div>
      </div>
      <p class="cp-gap-leader-msg">BEHIND ${leader.name.toUpperCase()}</p>
      ${gapAhead != null ? `<p class="cp-gap-ahead-msg">+${gapAhead} to ${behindTeam.name}</p>` : ""}
    `;
  }

  // ---------------------------------------------------------------------
  // Events / animation
  // ---------------------------------------------------------------------

  function wireUpEvents() {
    _container.querySelectorAll("[data-team-name]").forEach(el => {
      el.addEventListener("click", () => {
        _selectedName = el.dataset.teamName;
        _viewMode = "profile";
        renderWithTransition();
        _container.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    const backBtn = _container.querySelector("#cp-profile-back");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        _viewMode = "list";
        renderWithTransition();
      });
    }

    _container.querySelectorAll("[data-driver-code]").forEach(el => {
      el.addEventListener("click", () => {
        const code = el.dataset.driverCode;
        if (typeof window.openDriverProfile === "function") {
          window.openDriverProfile(code);
        }
      });
    });

    const sortSelect = _container.querySelector("#cpSortSelect");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        _currentSort = e.target.value;
        render();
      });
    }

    animateStatCounters(_container);
    animateBarWidths(_container);

    if (_viewMode === "profile") {
      const selected = _allTeams.find(c => c.name === _selectedName) || _allTeams[0];
      if (selected) {
        drawProgressionChart(selected);
        drawPointsPerRoundBars(selected);
      }
    }
  }

  function setupResizeHandler() {
    if (_resizeHandler) window.removeEventListener("resize", _resizeHandler);
    let raf = null;
    _resizeHandler = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (_viewMode !== "profile" || !_container) return;
        const selected = _allTeams.find(c => c.name === _selectedName) || _allTeams[0];
        if (selected) {
          drawProgressionChart(selected);
          drawPointsPerRoundBars(selected);
        }
      });
    };
    window.addEventListener("resize", _resizeHandler);
  }

  function renderWithTransition() {
    if (!_container) { render(); return; }
    _container.classList.add("cp-view-out");
    window.setTimeout(() => {
      render();
      _container.classList.remove("cp-view-out");
      _container.classList.add("cp-view-in");
      window.setTimeout(() => _container.classList.remove("cp-view-in"), 420);
    }, 180);
  }

  // Guards against overlapping counter animations when switching teams fast.
  let _counterToken = 0;
  function animateStatCounters(root) {
    const myToken = ++_counterToken;
    const els = root.querySelectorAll("[data-count-target]");
    els.forEach(el => {
      const target = parseFloat(el.dataset.countTarget);
      if (Number.isNaN(target)) return;
      const duration = 900;
      const startTime = performance.now();
      function tick(now) {
        if (myToken !== _counterToken) return; // a newer render superseded this one
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      }
      requestAnimationFrame(tick);
    });
  }

  function animateBarWidths(root) {
    const bars = root.querySelectorAll("[data-target-width]");
    bars.forEach(bar => {
      const target = bar.dataset.targetWidth;
      bar.style.width = "0%";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { bar.style.width = target + "%"; });
      });
    });
  }

  // ---------------------------------------------------------------------
  // Charts (canvas, matching driver-panel.js conventions)
  // ---------------------------------------------------------------------

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    return { ctx, width, height };
  }

  function drawProgressionChart(c) {
    const canvas = _container.querySelector("#cp-progression-canvas");
    const tooltip = _container.querySelector("#cp-progression-tooltip");
    if (!canvas) return;
    const data = (c.history || []).filter(h => h.cumulative_points != null);
    if (!data.length) return;

    const color = c.color || "#e10600";
    const { ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 16, right: 12, bottom: 22, left: 38 };
    const plotW = Math.max(width - padding.left - padding.right, 1);
    const plotH = Math.max(height - padding.top - padding.bottom, 1);

    const values = data.map(d => d.cumulative_points);
    const minV = 0;
    const maxV = Math.max(...values, 1);

    const n = data.length;
    const xFor = (i) => padding.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const yFor = (v) => padding.top + plotH - ((v - minV) / (maxV - minV)) * plotH;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (plotH / 3) * i;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
    }

    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xFor(i), y = yFor(d.cumulative_points);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.stroke();

    data.forEach((d, i) => {
      const x = xFor(i), y = yFor(d.cumulative_points);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    });

    ctx.fillStyle = "#888";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let i = 0; i <= 3; i++) {
      const v = minV + ((maxV - minV) / 3) * i;
      const y = padding.top + plotH - (plotH / 3) * i;
      ctx.fillText(Math.round(v), padding.left - 6, y);
    }

    if (tooltip) {
      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        let closest = 0, closestDist = Infinity;
        data.forEach((d, i) => {
          const dist = Math.abs(xFor(i) - mx);
          if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        const point = data[closest];
        if (!point) { tooltip.style.display = "none"; return; }
        tooltip.style.display = "block";
        tooltip.style.left = Math.min(xFor(closest) + 12, width - 100) + "px";
        tooltip.style.top = Math.max(yFor(point.cumulative_points) - 44, 0) + "px";
        tooltip.innerHTML = `<div class="cp-tooltip-title">Round ${point.round}</div><div class="cp-tooltip-value"><b>${point.cumulative_points} pts</b></div>`;
      };
      canvas.onmouseleave = () => { tooltip.style.display = "none"; };
    }
  }

  function drawPointsPerRoundBars(c) {
    const canvas = _container.querySelector("#cp-bars-canvas");
    if (!canvas) return;
    const data = c.history || [];
    if (!data.length) return;

    const color = c.color || "#e10600";
    const { ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 16, right: 8, bottom: 22, left: 30 };
    const plotW = Math.max(width - padding.left - padding.right, 1);
    const plotH = Math.max(height - padding.top - padding.bottom, 1);

    const maxV = Math.max(...data.map(d => d.points || 0), 1);
    const n = data.length;
    const gap = 6;
    const barW = Math.max((plotW - gap * (n - 1)) / n, 2);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#888";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let i = 0; i <= 2; i++) {
      const v = (maxV / 2) * i;
      const y = padding.top + plotH - (plotH / 2) * i;
      ctx.fillText(Math.round(v), padding.left - 6, y);
    }

    data.forEach((d, i) => {
      const x = padding.left + i * (barW + gap);
      const h = ((d.points || 0) / maxV) * plotH;
      const y = padding.top + plotH - h;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, h);
    });
  }

  function skeletonHTML() {
    return `
      <div class="cp-skeleton-wrap">
        <div class="cp-skeleton cp-skeleton-hero"></div>
        <div class="cp-skeleton-row">
          <div class="cp-skeleton cp-skeleton-card"></div>
          <div class="cp-skeleton cp-skeleton-card"></div>
          <div class="cp-skeleton cp-skeleton-card"></div>
        </div>
      </div>
    `;
  }

  function openConstructorProfile(name) {
    if (!_allTeams.length) return false;
    const match = _allTeams.find(c => c.name === name);
    if (!match) return false;
    _selectedName = name;
    _viewMode = "profile";
    render();
    if (_container) _container.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  window.loadConstructorsPanel = loadConstructorsPanel;
  window.openConstructorProfile = openConstructorProfile;
})();