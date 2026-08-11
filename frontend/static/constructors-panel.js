(function () {
  let _teams = [];
  let _meta = {};
  let _container = null;
  let _viewMode = "list";
  let _selectedId = null;
  let _chartMetric = "points"; // points | position | gap

  async function loadConstructorsPanel(containerId, { year, round = null }) {
    _container = document.getElementById(containerId);
    if (!_container) {
      console.error(`[constructors-panel] container #${containerId} not found`);
      return;
    }

    _container.innerHTML = skeletonHTML();

    const params = new URLSearchParams({ year });
    if (round) params.set("round", round);

    try {
      const res = await fetch(`/api/constructors/panel?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      _teams = data.teams || [];
      _meta = data;
      _selectedId = _teams[0]?.id || null;
      _viewMode = "list";
      render();
    } catch (err) {
      console.error("[constructors-panel] failed to load:", err);
      _container.innerHTML = `
        <div class="cp-error">
          <p>Couldn't load constructors data. Please try again.</p>
          <button id="cp-retry-btn" class="cp-back-btn">Retry</button>
        </div>
      `;
      const retryBtn = _container.querySelector("#cp-retry-btn");
      if (retryBtn) {
        retryBtn.addEventListener("click", () => loadConstructorsPanel(containerId, { year, round }));
      }
    }
  }

  function skeletonHTML() {
    return `
      <div class="cp-skeleton-wrap">
        <div class="cp-skeleton" style="height:120px;"></div>
        <div class="cp-skeleton" style="height:60px;"></div>
        <div class="cp-skeleton" style="height:60px;"></div>
        <div class="cp-skeleton" style="height:60px;"></div>
      </div>
    `;
  }

  function assetPath(path) {
    if (!path) return "";
    return "/" + String(path).replace(/^\/+/, "");
  }
  function escapeAttr(str) { return String(str).replace(/"/g, "&quot;"); }

  const COUNTRY_FLAGS = {
    "Australia": "🇦🇺", "China": "🇨🇳", "Japan": "🇯🇵", "Bahrain": "🇧🇭",
    "Saudi Arabia": "🇸🇦", "United States": "🇺🇸", "Italy": "🇮🇹",
    "Monaco": "🇲🇨", "Spain": "🇪🇸", "Canada": "🇨🇦", "Austria": "🇦🇹",
    "United Kingdom": "🇬🇧", "Belgium": "🇧🇪", "Hungary": "🇭🇺",
    "Netherlands": "🇳🇱", "Azerbaijan": "🇦🇿", "Singapore": "🇸🇬",
    "Mexico": "🇲🇽", "Brazil": "🇧🇷", "Qatar": "🇶🇦",
    "United Arab Emirates": "🇦🇪", "Portugal": "🇵🇹", "France": "🇫🇷",
    "Germany": "🇩🇪", "Russia": "🇷🇺", "Turkey": "🇹🇷", "India": "🇮🇳",
    "South Korea": "🇰🇷", "Malaysia": "🇲🇾",
  };
  function flagFor(country) {
    return COUNTRY_FLAGS[country] || "🏁";
  }

  // ---------- List view ----------

  function summaryCardHTML(accentClass, accentColor, label, valueHTML, sub) {
    return `
      <div class="cp-summary-card ${accentClass}" style="--accent-color:${accentColor};">
        <p class="cp-summary-label">${label}</p>
        <p class="cp-summary-value">${valueHTML}</p>
        ${sub ? `<p class="cp-summary-sub">${sub}</p>` : ""}
      </div>
    `;
  }

  function leaderCardHTML(leader) {
    if (!leader) return `<div class="cp-summary-card cp-leader-card"></div>`;
    const color = leader.color || "#888";
    return `
      <div class="cp-summary-card cp-leader-card" style="--team-color:${color};">
        <p class="cp-summary-label cp-leader-label">🏆 CHAMPIONSHIP LEADER</p>
        <div class="cp-leader-row">
          ${leader.teamLogo ? `<img class="cp-leader-logo" src="${assetPath(leader.teamLogo)}" alt="" onerror="this.remove()">` : `<div class="cp-leader-logo-fallback" style="background:${color}22; color:${color};">${(leader.name || "?")[0]}</div>`}
          <div class="cp-leader-info">
            <p class="cp-leader-name">${leader.name}</p>
            <p class="cp-leader-team" style="color:${color};">${leader.nationality || ""}</p>
          </div>
          <div class="cp-leader-pts">
            <span class="cp-leader-pts-num" data-count-target="${leader.points ?? 0}">0</span>
            <span class="cp-leader-pts-label">PTS</span>
          </div>
        </div>
        <p class="cp-leader-wins" style="color:${color};">${leader.wins ?? 0} win${leader.wins === 1 ? "" : "s"}</p>
        <div class="cp-leader-bar-track">
          <div class="cp-leader-bar-fill" style="width:0%; background:${color};" data-target-width="100"></div>
        </div>
      </div>
    `;
  }

  function standingsRowHTML(t, maxPoints) {
    const color = t.color || "#888";
    const pct = maxPoints > 0 ? Math.max((t.points / maxPoints) * 100, t.points > 0 ? 2 : 0) : 0;
    return `
      <div class="cp-row" data-team-id="${escapeAttr(t.id)}" style="--team-color:${color};">
        <div class="cp-row-pos" style="color:${color}; border-color:${color};">${String(t.position ?? "-").padStart(2, "0")}</div>
        ${t.teamLogo ? `<img class="cp-row-logo" src="${assetPath(t.teamLogo)}" alt="" onerror="this.remove()">` : `<div class="cp-row-logo-fallback" style="background:${color}22; color:${color};">${(t.name || "?")[0]}</div>`}
        <div class="cp-row-info">
          <p class="cp-row-name">${t.name}</p>
          <p class="cp-row-drivers">${(t.drivers || []).map(d => d.name).join(" &middot; ") || ""}</p>
        </div>
        <div class="cp-row-bar-track">
          <div class="cp-row-bar-fill" style="width:0%; background:${color};" data-target-width="${pct}"></div>
        </div>
        <div class="cp-row-pts">
          <span class="cp-row-pts-num" data-count-target="${t.points ?? 0}">0</span>
          <span class="cp-row-pts-label">PTS</span>
        </div>
        <div class="cp-row-wins" style="color:${color};">🏆 ${t.wins ?? 0} WIN${t.wins === 1 ? "" : "S"}</div>
      </div>
    `;
  }

  function renderList() {
    const leader = _teams[0];
    const maxPoints = leader ? leader.points : 0;
    const next = _meta.next_round;

    _container.innerHTML = `
      <div class="cp-top-row">
        <div class="cp-title-block">
          <p class="cp-season-tag">🏆 ${new Date().getFullYear()} SEASON</p>
          <h1 class="cp-page-title">CONSTRUCTORS'<br>CHAMPIONSHIP</h1>
          <p class="cp-page-desc">The battle for constructor glory across ${_meta.total_rounds ?? "-"} rounds</p>
        </div>
        <div class="cp-summary-grid">
          ${leaderCardHTML(leader)}
          ${summaryCardHTML("cp-summary-points", "#3fa9ff", "TOTAL POINTS", `<span data-count-target="${_meta.total_points ?? 0}">0</span>`, "All Teams")}
          ${summaryCardHTML("cp-summary-races", "#9a5cff", "RACES COMPLETED", `<span data-count-target="${_meta.races_completed ?? 0}">0</span><span class="cp-summary-slash">/</span>${_meta.total_rounds ?? "-"}`, "Rounds")}
          ${next
            ? summaryCardHTML("cp-summary-next", "#ff3b30", "NEXT ROUND", next.name, next.date_range)
            : summaryCardHTML("cp-summary-next", "#ff3b30", "NEXT ROUND", "Season Complete", "")}
        </div>
      </div>

      <div class="cp-standings-header"><h2>📊 CONSTRUCTOR STANDINGS</h2></div>

      <div class="cp-list">
        ${_teams.map(t => standingsRowHTML(t, maxPoints)).join("") || `<p class="cp-empty">No constructor data available.</p>`}
      </div>

      <p class="cp-footer-note">&bull; Live standings &bull; Updated in real time</p>
    `;
    wireListEvents();
  }

  function wireListEvents() {
    _container.querySelectorAll("[data-team-id]").forEach(el => {
      el.addEventListener("click", () => {
        _selectedId = el.dataset.teamId;
        _viewMode = "profile";
        _chartMetric = "points";
        renderWithTransition();
        _container.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    animateBars();
    animateCounters();
  }

  // ---------- Profile view ----------

  function driverCardHTML(d, color) {
    const imgSrc = d.image ? assetPath(d.image) : null;
    return `
      <div class="cp-driver-card" data-driver-code="${escapeAttr(d.code || '')}">
        ${imgSrc ? `<img class="cp-driver-card-img" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">` : `<div class="cp-driver-card-fallback" style="background:${color}18; color:${color};">${(d.name || "?")[0]}</div>`}
        <div class="cp-driver-card-body">
          <p class="cp-driver-card-num" style="color:${color};">#${d.number ?? "-"}</p>
          <p class="cp-driver-card-name">${d.name || ""}</p>
          <p class="cp-driver-card-pts" style="color:${color};">${d.points ?? 0} <span>PTS</span></p>
          <div class="cp-driver-card-stats">
            <div><span>${d.wins ?? 0}</span>WINS</div>
            <div><span>${d.podiums ?? 0}</span>PODIUMS</div>
            <div><span>${d.poles ?? 0}</span>POLES</div>
            <div><span>${d.fastest_laps ?? 0}</span>F.LAPS</div>
          </div>
          <p class="cp-driver-card-pos-label">Championship Position: P${d.position ?? "-"}</p>
        </div>
      </div>
    `;
  }

  function raceByRaceTableHTML(t) {
    const rounds = [...(t.history || [])].sort((a, b) => a.round - b.round);
    if (!rounds.length) return `<p class="cp-empty">No round-by-round data available yet.</p>`;
    const [d1, d2] = t.drivers || [];
    const histByRound = (d) => {
      const map = {};
      (d?.history || []).forEach(h => { map[h.round] = h; });
      return map;
    };
    const h1 = histByRound(d1);
    const h2 = histByRound(d2);
    return `
      <div class="cp-table-wrap">
        <table class="cp-results-table">
          <thead>
            <tr>
              <th>Rnd</th><th>Grand Prix</th>
              <th>${d1 ? d1.code || d1.name : "D1"}</th>
              <th>${d2 ? d2.code || d2.name : "D2"}</th>
              <th>Team Pts</th>
            </tr>
          </thead>
          <tbody>
            ${rounds.map(r => {
              const rh1 = h1[r.round], rh2 = h2[r.round];
              const p1 = rh1 ? (rh1.position != null ? `P${rh1.position}` : "DNF") : "-";
              const p2 = rh2 ? (rh2.position != null ? `P${rh2.position}` : "DNF") : "-";
              return `
                <tr>
                  <td class="cp-results-round">${r.round}</td>
                  <td><span class="cp-results-flag">${flagFor(r.country)}</span>${rh1?.event_name || rh2?.event_name || `Round ${r.round}`}</td>
                  <td>${p1}</td>
                  <td>${p2}</td>
                  <td style="color:${t.color}; font-weight:700;">${r.points ?? 0}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function teamStatsListHTML(t) {
    const s = t.team_stats || {};
    const rows = [
      ["Wins", t.wins ?? 0],
      ["Podiums", t.podiums ?? 0],
      ["Poles", t.poles ?? 0],
      ["Fastest Laps", t.fastest_laps ?? 0],
      ["Points Finishes", s.points_finishes ?? 0],
      ["DNFs", s.dnfs ?? 0],
      ["Average Start", s.avg_start != null ? `P${s.avg_start}` : "-"],
      ["Average Finish", s.avg_finish != null ? `P${s.avg_finish}` : "-"],
      ["Best Finish", s.best_finish != null ? `P${s.best_finish}` : "-"],
    ];
    return `
      <div class="cp-stat-list">
        ${rows.map(([label, val]) => `
          <div class="cp-stat-list-row">
            <span class="cp-stat-list-label">${label}</span>
            <span class="cp-stat-list-value">${val}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function competitorsBarsHTML(t) {
    const maxPoints = Math.max(..._teams.map(x => x.points || 0), 1);
    return `
      <div class="cp-competitor-list">
        ${_teams.slice(0, 7).map(x => {
          const pct = Math.max((x.points / maxPoints) * 100, x.points > 0 ? 2 : 0);
          const isSelf = x.id === t.id;
          return `
            <div class="cp-competitor-row ${isSelf ? "cp-competitor-self" : ""}">
              <span class="cp-competitor-name" style="color:${x.color};">${x.name}</span>
              <div class="cp-competitor-bar-track">
                <div class="cp-competitor-bar-fill" style="width:0%; background:${x.color};" data-target-width="${pct}"></div>
              </div>
              <span class="cp-competitor-pts">${x.points ?? 0}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function gapToLeaderHTML(t) {
    const leader = _teams[0];
    const isLeader = leader && leader.id === t.id;
    const gap = isLeader ? 0 : Math.round((t.points - (leader?.points || 0)) * 10) / 10;
    const maxGap = Math.max(Math.abs(gap), (leader?.points || 1)) || 1;
    const pct = isLeader ? 100 : Math.max(100 - (Math.abs(gap) / (leader?.points || 1)) * 100, 4);
    const color = isLeader ? "#2ecc71" : "#ff6b63";
    return `
      <div class="cp-gauge-wrap">
        <div class="cp-gauge-ring" style="--gauge-pct:${pct}; --gauge-color:${color};">
          <div class="cp-gauge-inner">
            <span class="cp-gauge-value" style="color:${color};">${isLeader ? "LEADER" : gap}</span>
            ${!isLeader ? `<span class="cp-gauge-label">PTS</span>` : ""}
          </div>
        </div>
        <p class="cp-gauge-caption">${isLeader ? "Championship Leader" : `Behind ${leader?.name || ""}`}</p>
      </div>
    `;
  }

  function recentFormHTML(t) {
    const [d1, d2] = t.drivers || [];
    const rounds = [...(t.history || [])].sort((a, b) => b.round - a.round).slice(0, 5).reverse();
    if (!rounds.length) return `<p class="cp-empty">No recent race data.</p>`;
    const histByRound = (d) => {
      const map = {};
      (d?.history || []).forEach(h => { map[h.round] = h; });
      return map;
    };
    const h1 = histByRound(d1);
    const h2 = histByRound(d2);
    return `
      <div class="cp-form-strip">
        ${rounds.map(r => {
          const rh1 = h1[r.round], rh2 = h2[r.round];
          const positions = [rh1?.position, rh2?.position].filter(p => p != null);
          const best = positions.length ? Math.min(...positions) : null;
          const label = best != null ? `P${best}` : "DNF";
          const tierColor = best == null ? "#e74c3c" : best === 1 ? "#FFD700" : best <= 3 ? "#C0C0C0" : best <= 10 ? "#2ecc71" : "#666";
          return `
            <div class="cp-form-badge" style="--badge-color:${tierColor};" title="${rh1?.event_name || rh2?.event_name || `Round ${r.round}`}">
              <span class="cp-form-flag">${flagFor(r.country)}</span>
              <span>${label}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function circuitPaceHTML(t) {
    const p = t.pace_by_circuit_type || {};
    const labels = { high_speed: "High speed", technical: "Technical", street: "Street" };
    const maxV = Math.max(...Object.values(p).filter(v => v != null), 1);
    return `
      <div class="cp-competitor-list">
        ${Object.entries(labels).map(([key, label]) => {
          const val = p[key];
          const pct = val != null ? Math.max((val / maxV) * 100, val > 0 ? 4 : 0) : 0;
          return `
            <div class="cp-competitor-row">
              <span class="cp-competitor-name">${label}</span>
              <div class="cp-competitor-bar-track">
                <div class="cp-competitor-bar-fill" style="width:0%; background:${t.color};" data-target-width="${pct}"></div>
              </div>
              <span class="cp-competitor-pts">${val != null ? val : "-"}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function nextRaceHTML(t) {
    const d1 = (t.drivers || [])[0];
    const next = (d1 && d1.next_races && d1.next_races[0]) || _meta.next_round;
    if (!next) return `<p class="cp-empty">No upcoming race scheduled.</p>`;
    const name = next.name || "";
    const dateText = next.display_date || next.date_range || next.date || "";
    return `
      <div class="cp-nextrace-row">
        <div class="cp-nextrace-icon">🏁</div>
        <div class="cp-nextrace-info">
          <p class="cp-nextrace-name">${name}</p>
          <p class="cp-nextrace-date">${dateText}</p>
        </div>
      </div>
    `;
  }

  function miniStandingsHTML(t) {
    return `
      <div class="cp-mini-standings">
        ${_teams.slice(0, 8).map(x => `
          <div class="cp-mini-row ${x.id === t.id ? "cp-mini-row-self" : ""}" style="--team-color:${x.color};">
            <span class="cp-mini-pos">${x.position ?? "-"}</span>
            <span class="cp-mini-name">${x.name}</span>
            <span class="cp-mini-pts">${x.points ?? 0} <small>PTS</small></span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function profileHTML(t) {
    const color = t.color || "#888";
    return `
      <button id="cp-back-btn" class="cp-back-btn">&larr; Back to Constructors</button>

      <div class="cp-team-hero" style="--team-color:${color}; background:linear-gradient(120deg, ${color}30, #000 75%);">
        <div class="cp-team-hero-top">
          <div class="cp-team-hero-left">
            ${t.teamLogo ? `<img class="cp-team-hero-logo" src="${assetPath(t.teamLogo)}" alt="" onerror="this.remove()">` : `<div class="cp-team-hero-logo-fallback" style="background:${color}22; color:${color};">${(t.name || "?")[0]}</div>`}
            <div>
              <h1 class="cp-team-hero-name" style="color:${color};">${t.name}</h1>
              <p class="cp-team-hero-drivers">${(t.drivers || []).map(d => `${d.name} <span>#${d.number ?? "-"}</span>`).join(" &middot; ")}</p>
            </div>
          </div>
          <div class="cp-team-hero-right">
            <span class="cp-team-hero-pos" style="color:${color};">${t.position === 1 ? "P1" : `P${t.position ?? "-"}`}</span>
            <span class="cp-team-hero-pts">${t.points ?? 0} <small>PTS</small></span>
            <span class="cp-team-hero-wins" style="color:${color};">${t.wins ?? 0} WINS</span>
          </div>
        </div>

        <div class="cp-stats-row">
          ${["PTS","WINS","PODIUMS","POLES","FASTEST LAPS"].map((label,i) => {
            const vals = [t.points ?? 0, t.wins ?? 0, t.podiums ?? 0, t.poles ?? 0, t.fastest_laps ?? 0];
            return `
              <div class="cp-stat-card" style="border-color:${color}20; background:${color}08;">
                <p class="cp-stat-value" style="color:${color};" data-count-target="${vals[i]}">0</p>
                <p class="cp-stat-label">${label}</p>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="cp-full-profile">

        <div class="cp-profile-grid">
          <div class="cp-desc-box">
            <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>Drivers</h2></div>
            <div class="cp-drivers-grid">
              ${(t.drivers || []).map(d => driverCardHTML(d, color)).join("") || `<p class="cp-empty">No driver data.</p>`}
            </div>
          </div>

          <div class="cp-desc-box">
            <div class="cp-box-header-row">
              <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>Championship Progression</h2></div>
              <div class="cp-chart-tabs">
                <button class="cp-chart-tab ${_chartMetric === "points" ? "active" : ""}" data-metric="points">Points</button>
                <button class="cp-chart-tab ${_chartMetric === "position" ? "active" : ""}" data-metric="position">Position</button>
                <button class="cp-chart-tab ${_chartMetric === "gap" ? "active" : ""}" data-metric="gap">Gap to Leader</button>
              </div>
            </div>
            <div class="cp-chart-canvas-wrap">
              <canvas id="cp-progression-canvas"></canvas>
              <div class="cp-chart-tooltip" id="cp-progression-tooltip"></div>
            </div>
          </div>
        </div>

        <div class="cp-profile-grid-3" style="margin-top:18px;">
          <div class="cp-desc-box">
            <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>Race by Race Performance</h2></div>
            ${raceByRaceTableHTML(t)}
          </div>
          <div class="cp-desc-box">
            <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>Team Statistics</h2></div>
            ${teamStatsListHTML(t)}
          </div>
          <div class="cp-desc-box">
            <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>Points per Round</h2></div>
            <div class="cp-chart-canvas-wrap" style="height:180px;">
              <canvas id="cp-perround-canvas"></canvas>
            </div>
          </div>
        </div>

        <div class="cp-profile-grid-3b" style="margin-top:18px;">
          <div class="cp-desc-box">
            <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>${t.name} vs Competitors</h2></div>
            ${competitorsBarsHTML(t)}
          </div>
          <div class="cp-desc-box">
            <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>Gap to Leader</h2></div>
            ${gapToLeaderHTML(t)}
          </div>
          <div class="cp-desc-box">
            <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>Recent Form</h2></div>
            ${recentFormHTML(t)}
          </div>
        </div>
        <div class="cp-desc-box cp-pace-box" style="margin-top:18px;">
          <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>Pace by Circuit Type</h2></div>
          ${circuitPaceHTML(t)}
        </div>
        <div class="cp-profile-grid-2" style="margin-top:18px;">
          <div class="cp-desc-box">
            <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>Next Race</h2></div>
            ${nextRaceHTML(t)}
          </div>
          <div class="cp-desc-box">
            <div class="cp-box-header-row">
              <div class="cp-desc-header"><div class="cp-desc-bar" style="background:${color};"></div><h2>Constructor Championship</h2></div>
            </div>
            ${miniStandingsHTML(t)}
          </div>
        </div>

      </div>
    `;
  }

  // ---------- View switching ----------

  function render() {
    if (_viewMode === "profile") {
      const selected = _teams.find(t => t.id === _selectedId) || _teams[0];
      _container.innerHTML = profileHTML(selected);
      wireProfileEvents(selected);
      return;
    }
    renderList();
  }

  function renderWithTransition() {
    if (!_container) { render(); return; }
    _container.classList.add("cp-view-out");
    window.setTimeout(() => {
      render();
      _container.classList.remove("cp-view-out");
      _container.classList.add("cp-view-in");
      window.setTimeout(() => { _container.classList.remove("cp-view-in"); }, 420);
    }, 180);
  }

  function wireProfileEvents(t) {
    const backBtn = _container.querySelector("#cp-back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        _viewMode = "list";
        renderWithTransition();
      });
    }


    _container.querySelectorAll("[data-driver-code]").forEach(el => {
      const code = el.dataset.driverCode;
      if (!code) return;
      el.addEventListener("click", () => {
        if (typeof window.goToDriverProfile === "function") {
          window.goToDriverProfile(code);
        }
      });
    });

    _container.querySelectorAll(".cp-chart-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        _chartMetric = btn.dataset.metric;
        _container.querySelectorAll(".cp-chart-tab").forEach(b => b.classList.toggle("active", b === btn));
        drawProgressionChart(t);
      });
    });

    animateBars();
    animateCounters();
    drawProgressionChart(t);
    drawPerRoundBarChart(t);
  }

  // ---------- Animation helpers ----------

  function animateBars() {
    _container.querySelectorAll("[data-target-width]").forEach(bar => {
      const target = bar.dataset.targetWidth;
      bar.style.width = "0%";
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = target + "%"; }));
    });
  }

  function animateCounters() {
    _container.querySelectorAll("[data-count-target]").forEach(el => {
      const target = parseFloat(el.dataset.countTarget);
      if (Number.isNaN(target)) return;
      const isDecimal = String(el.dataset.countTarget).includes(".");
      const duration = 900;
      const startTime = performance.now();
      function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = isDecimal ? value.toFixed(1) : Math.round(value);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = isDecimal ? target.toFixed(1) : target;
      }
      requestAnimationFrame(tick);
    });
  }

  // ---------- Charts ----------

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

  function buildGapSeries(t) {
    const leaderHistory = _teams[0]?.history || [];
    const leaderByRound = {};
    leaderHistory.forEach(h => { leaderByRound[h.round] = h.cumulative_points; });
    return [...(t.history || [])].sort((a, b) => a.round - b.round).map(h => ({
      round: h.round,
      value: (h.cumulative_points ?? 0) - (leaderByRound[h.round] ?? h.cumulative_points ?? 0),
    }));
  }

  function drawProgressionChart(t) {
    const canvas = _container.querySelector("#cp-progression-canvas");
    const tooltip = _container.querySelector("#cp-progression-tooltip");
    if (!canvas) return;

    let data, invertY = false, valueLabel = "pts";
    if (_chartMetric === "points") {
      data = [...(t.history || [])].sort((a, b) => a.round - b.round).map(h => ({ round: h.round, value: h.cumulative_points ?? 0 }));
    } else if (_chartMetric === "position") {
      data = [...(t.history || [])].sort((a, b) => a.round - b.round).map(h => ({ round: h.round, value: h.position ?? null }));
      invertY = true;
      valueLabel = "";
    } else {
      data = buildGapSeries(t);
      valueLabel = "pts gap";
    }
    data = data.filter(d => d.value != null);
    if (!data.length) return;

    const color = t.color || "#2ecc71";
    const { ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 16, right: 12, bottom: 22, left: 34 };
    const plotW = Math.max(width - padding.left - padding.right, 1);
    const plotH = Math.max(height - padding.top - padding.bottom, 1);

    const values = data.map(d => d.value);
    let minV = Math.min(...values, 0);
    let maxV = Math.max(...values, invertY ? 1 : 0);
    if (minV === maxV) { minV -= 1; maxV += 1; }

    const n = data.length;
    const xFor = (i) => padding.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const yFor = (v) => invertY
      ? padding.top + ((v - minV) / (maxV - minV)) * plotH
      : padding.top + plotH - ((v - minV) / (maxV - minV)) * plotH;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (plotH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
    }

    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xFor(i), y = yFor(d.value);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    if (!invertY) {
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
      grad.addColorStop(0, color + "33");
      grad.addColorStop(1, color + "00");
      ctx.lineTo(xFor(n - 1), padding.top + plotH);
      ctx.lineTo(xFor(0), padding.top + plotH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    data.forEach((d, i) => {
      const x = xFor(i), y = yFor(d.value);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    });

    ctx.fillStyle = "#888";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const v = invertY ? minV + ((maxV - minV) / 4) * i : maxV - ((maxV - minV) / 4) * i;
      const y = padding.top + (plotH / 4) * i;
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
        const x = xFor(closest), y = yFor(point.value);
        tooltip.style.display = "block";
        tooltip.style.left = Math.min(x + 12, width - 110) + "px";
        tooltip.style.top = Math.max(y - 44, 0) + "px";
        const display = invertY ? `P${point.value}` : `${point.value} ${valueLabel}`;
        tooltip.innerHTML = `
          <div class="cp-tooltip-title">Round ${point.round}</div>
          <div class="cp-tooltip-value"><b>${display}</b></div>
        `;
      };
      canvas.onmouseleave = () => { tooltip.style.display = "none"; };
    }
  }

  function drawPerRoundBarChart(t) {
    const canvas = _container.querySelector("#cp-perround-canvas");
    if (!canvas) return;
    const data = [...(t.history || [])].sort((a, b) => a.round - b.round);
    if (!data.length) return;

    const color = t.color || "#2ecc71";
    const { ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 10, right: 8, bottom: 18, left: 26 };
    const plotW = Math.max(width - padding.left - padding.right, 1);
    const plotH = Math.max(height - padding.top - padding.bottom, 1);

    const maxV = Math.max(...data.map(d => d.points ?? 0), 1);
    const n = data.length;
    const barW = Math.max((plotW / n) * 0.6, 2);
    const step = plotW / n;

    ctx.clearRect(0, 0, width, height);
    data.forEach((d, i) => {
      const v = d.points ?? 0;
      const barH = (v / maxV) * plotH;
      const x = padding.left + i * step + (step - barW) / 2;
      const y = padding.top + plotH - barH;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, barW, barH);
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = "#888";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    data.forEach((d, i) => {
      if (n > 14 && i % 2 !== 0) return;
      const x = padding.left + i * step + step / 2;
      ctx.fillText("R" + d.round, x, padding.top + plotH + 4);
    });
  }

  window.loadConstructorsPanel = loadConstructorsPanel;
})();
