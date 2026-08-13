(function () {
  let _constructors = [];
  let _container = null;
  let _selectedName = null;
  let _viewMode = "list";
  let _resizeHandler = null;
  let _currentYear = null;

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
      // const res = await fetch(`/api/constructors/panel?${params}`);
      // if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // _constructors = await res.json();
      // _selectedName = _constructors[0]?.name || null;
      const res = await fetch(`/api/constructors/panel?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const json = await res.json();
      // Extract the 'teams' array from your response object
      _constructors = Array.isArray(json) ? json : (json.teams || json.data || json.results || []);
      
      _selectedName = _constructors[0]?.name || null;
   
      render();
      setupResizeHandler();
    } catch (err) {
      console.error("[constructors-panel] failed to load:", err);
      _container.innerHTML = `
        <div class="cp-error">
          <p>Couldn't load constructor data. Please try again.</p>
          <button id="cp-retry-btn" class="cp-profile-back">Retry</button>
        </div>
      `;
      const retryBtn = _container.querySelector("#cp-retry-btn");
      if (retryBtn) {
        retryBtn.addEventListener("click", () => loadConstructorsPanel(containerId, { year, round }));
      }
    }
  }

  function assetPath(path) {
    if (!path) return "";
    return "/" + String(path).replace(/^\/+/, "");
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
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

  // ---------- List view ----------

  function render() {
    if (_viewMode === "profile") {
      const selected = _constructors.find(c => c.name === _selectedName) || _constructors[0];
      _container.innerHTML = profilePageHTML(selected);
      wireUpEvents();
      return;
    }

    _container.innerHTML = `
      <div class="cp-header-row">
        <h1 class="cp-page-title">Constructors</h1>
      </div>

      <div class="cp-section-header">
        <h2>Championship Standings</h2>
        <div class="cp-rule"></div>
        <span class="cp-count">${_constructors.length} teams</span>
      </div>
      <div class="cp-grid">
        ${_constructors.map(constructorListRowHTML).join("") || `<p class="cp-empty">No constructor data yet.</p>`}
      </div>
    `;

    wireUpEvents();
  }

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

    animateStatCounters(_container);
    animateBars(_container);

    if (_viewMode === "profile") {
      const selected = _constructors.find(c => c.name === _selectedName) || _constructors[0];
      if (selected) drawPaceTrendChart(selected);
    }
  }

  function setupResizeHandler() {
    if (_resizeHandler) window.removeEventListener("resize", _resizeHandler);
    let raf = null;
    _resizeHandler = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (_viewMode !== "profile" || !_container) return;
        const selected = _constructors.find(c => c.name === _selectedName) || _constructors[0];
        if (selected) drawPaceTrendChart(selected);
      });
    };
    window.addEventListener("resize", _resizeHandler);
  }

  function constructorListRowHTML(c) {
    const color = c.color || "#888";
    const isSelected = c.name === _selectedName;
    return `
      <div class="cp-card ${isSelected ? "cp-card-selected" : ""}" data-team-name="${escapeAttr(c.name)}" style="--team-color:${color};">
        <div class="cp-card-info">
          <div class="cp-card-toprow">
            <span class="cp-card-pos">P${c.position ?? "-"}</span>
            <span class="cp-card-name">${c.name}</span>
          </div>
          <p class="cp-card-drivers" style="color:${color};">
            ${(c.drivers || []).map(d => `#${d.number ?? "-"} ${d.name || ""}`).join(" · ")}
          </p>
        </div>
        <div class="cp-card-right">
          <div class="cp-card-pointswrap">
            <span class="cp-points-num">${c.points ?? 0}</span>
            <span class="cp-points-label">pts</span>
          </div>
        </div>
      </div>
    `;
  }

  // ---------- Profile view ----------

  function profilePageHTML(c) {
    const color = c.color || "#888";
    const drivers = c.drivers || [];

    return `
      <button id="cp-profile-back" class="cp-profile-back">&larr; Back to Constructors</button>

      <div class="cp-team-header" style="--team-color:${color};">
        <div class="cp-team-header-left">
          <div class="cp-team-swatch" style="background:${color};"></div>
          <div>
            <div class="cp-team-name">${c.name.toUpperCase()}</div>
            <div class="cp-team-drivers-line">${drivers.map(d => `${d.name || ""} #${d.number ?? "-"}`).join(" · ")}</div>
          </div>
        </div>
        <div class="cp-team-header-right">
          <div class="cp-team-standing-label">P${c.position ?? "-"} · Constructors</div>
          <div class="cp-team-standing-points">${c.points ?? 0}</div>
        </div>
      </div>

      <div class="cp-stats-row">
        ${statCardHTML("WINS", c.wins ?? 0, color)}
        ${statCardHTML("PODIUMS", c.podiums ?? 0, color)}
        ${statCardHTML("POLES", c.poles ?? 0, color)}
        ${statCardHTML("FASTEST LAPS", c.fastest_laps ?? 0, color)}
      </div>

      <div class="cp-driver-cards-row">
        ${drivers.map(d => driverContributionCardHTML(d, c)).join("")}
      </div>

      ${teammateContributionHTML(c)}
      ${qualifyingH2HHTML(c)}
      ${reliabilityStrategyHTML(c)}
      ${paceTrendHTML(c)}
    `;
  }

  function driverContributionCardHTML(d, c) {
    const color = c.color || "#888";
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

  function teammateContributionHTML(c) {
    const color = c.color || "#888";
    const drivers = c.drivers || [];
    if (drivers.length !== 2) return "";
    const total = drivers.reduce((sum, d) => sum + (d.points || 0), 0);
    if (total <= 0) return "";
    const [a, b] = drivers;
    const aPct = Math.round((a.points / total) * 100);
    const bPct = 100 - aPct;

    return `
      <div class="cp-desc-box">
        <div class="cp-desc-header"><h2>Teammate Contribution</h2></div>
        <div class="cp-split-bar">
          <div class="cp-split-fill" style="width:${aPct}%; background:${color};" data-target-width="${aPct}"></div>
          <div class="cp-split-fill-remainder" style="width:${bPct}%;"></div>
        </div>
        <div class="cp-split-labels">
          <span>${a.name} · ${aPct}%</span>
          <span class="cp-split-label-secondary">${b.name} · ${bPct}%</span>
        </div>
      </div>
    `;
  }

  function qualifyingH2HHTML(c) {
    const color = c.color || "#888";
    const h2h = c.qualifying_h2h || {};
    const drivers = c.drivers || [];
    const entries = Object.entries(h2h);
    if (entries.length !== 2 || drivers.length !== 2) return "";

    const [a, b] = drivers;
    const aWins = h2h[a.code] ?? 0;
    const bWins = h2h[b.code] ?? 0;
    const total = aWins + bWins;
    const aPct = total ? Math.round((aWins / total) * 100) : 50;
    const bPct = 100 - aPct;

    return `
      <div class="cp-desc-box">
        <div class="cp-desc-header"><h2>Qualifying Head-to-Head</h2></div>
        <div class="cp-h2h-row-simple">
          <span class="cp-h2h-name">${a.name || a.code}</span>
          <div class="cp-h2h-track">
            <div class="cp-h2h-fill" style="width:${aPct}%; background:${color};" data-target-width="${aPct}"></div>
            <div class="cp-h2h-fill-remainder" style="width:${bPct}%;"></div>
          </div>
          <span class="cp-h2h-name cp-h2h-name-right">${b.name || b.code}</span>
        </div>
        <div class="cp-h2h-sessions">
          <span>${aWins} sessions</span>
          <span>${bWins} sessions</span>
        </div>
      </div>
    `;
  }

  function reliabilityStrategyHTML(c) {
    const color = c.color || "#888";
    return `
      <div class="cp-two-col">
        <div class="cp-desc-box">
          <div class="cp-desc-header"><h2>Reliability</h2></div>
          <table class="cp-stat-table">
            <tr><td>DNFs</td><td>${fmtNum(c.dnfs)}</td></tr>
            <tr><td>Mech. failures</td><td>${fmtNum(c.mechanical_failures)}</td></tr>
            <tr><td>Retirements</td><td>${fmtNum(c.retirements)}</td></tr>
            <tr><td>Reliability rate</td><td style="color:${color};">${fmtPct(c.reliability_rate)}</td></tr>
          </table>
        </div>
        <div class="cp-desc-box">
          <div class="cp-desc-header"><h2>Strategy</h2></div>
          <table class="cp-stat-table">
            <tr><td>Avg pit stop</td><td>${fmtSecs(c.avg_pit_stop)}</td></tr>
            <tr><td>Fastest pit stop</td><td style="color:${color};">${fmtSecs(c.fastest_pit_stop)}</td></tr>
          </table>
        </div>
      </div>
    `;
  }

  function paceTrendHTML(c) {
    const color = c.color || "#888";
    const trend = c.pace_trend || [];
    if (!trend.length) return "";
    return `
      <div class="cp-desc-box">
        <div class="cp-desc-header"><h2>Development Trend · Best Finish by Round</h2></div>
        <div class="cp-chart-canvas-wrap" style="height:120px;">
          <canvas id="cp-trend-canvas"></canvas>
          <div class="cp-chart-tooltip" id="cp-trend-tooltip"></div>
        </div>
      </div>
    `;
  }

  function statCardHTML(label, value, color) {
    const isNumeric = typeof value === "number" && !Number.isNaN(value);
    return `
      <div class="cp-stat-card" style="border-color:${color}20; background:${color}08;">
        <p class="cp-stat-value" style="color:${color};" ${isNumeric ? `data-count-target="${value}"` : ""}>${isNumeric ? 0 : value}</p>
        <p class="cp-stat-label">${label}</p>
      </div>
    `;
  }

  // ---------- Chart ----------

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

  // Best-finish trend, inverted Y (P1 at top), same conventions as
  // driver-panel.js's drawLineChart/drawDualLineChart.
  function drawPaceTrendChart(c) {
    const canvas = _container.querySelector("#cp-trend-canvas");
    const tooltip = _container.querySelector("#cp-trend-tooltip");
    if (!canvas) return;
    const data = (c.pace_trend || []).filter(d => d.best_position != null);
    if (!data.length) return;

    const color = c.color || "#2ecc71";
    const { ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 16, right: 12, bottom: 22, left: 34 };
    const plotW = Math.max(width - padding.left - padding.right, 1);
    const plotH = Math.max(height - padding.top - padding.bottom, 1);

    const values = data.map(d => d.best_position);
    let minV = Math.min(1, ...values);
    let maxV = Math.max(...values);
    if (minV === maxV) { minV -= 1; maxV += 1; }

    const n = data.length;
    const xFor = (i) => padding.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const yFor = (v) => padding.top + ((v - minV) / (maxV - minV)) * plotH;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    const gridLines = 3;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (plotH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xFor(i), y = yFor(d.best_position);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    data.forEach((d, i) => {
      const x = xFor(i), y = yFor(d.best_position);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    ctx.fillStyle = "#888";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= gridLines; i++) {
      const v = minV + ((maxV - minV) / gridLines) * i;
      const y = padding.top + (plotH / gridLines) * i;
      ctx.fillText("P" + Math.round(v), padding.left - 6, y);
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
        tooltip.style.top = Math.max(yFor(point.best_position) - 44, 0) + "px";
        tooltip.innerHTML = `
          <div class="cp-tooltip-title">Round ${point.round}</div>
          <div class="cp-tooltip-value"><b>P${point.best_position}</b></div>
        `;
      };
      canvas.onmouseleave = () => { tooltip.style.display = "none"; };
    }
  }

  // ---------- Animation helpers ----------

  function renderWithTransition() {
    if (!_container) { render(); return; }
    _container.classList.add("cp-view-out");
    window.setTimeout(() => {
      render();
      _container.classList.remove("cp-view-out");
      _container.classList.add("cp-view-in");
      window.setTimeout(() => {
        _container.classList.remove("cp-view-in");
      }, 420);
    }, 180);
  }

  function animateStatCounters(root) {
    const els = root.querySelectorAll(".cp-stat-value[data-count-target]");
    els.forEach(el => {
      const target = parseFloat(el.dataset.countTarget);
      if (Number.isNaN(target)) return;
      const duration = 900;
      const startTime = performance.now();
      function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      }
      requestAnimationFrame(tick);
    });
  }

  function animateBars(root) {
    const bars = root.querySelectorAll("[data-target-width]");
    bars.forEach(bar => {
      const target = bar.dataset.targetWidth;
      bar.style.width = "0%";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.style.width = target + "%";
        });
      });
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
    if (!_constructors.length) return false;
    const match = _constructors.find(c => c.name === name);
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