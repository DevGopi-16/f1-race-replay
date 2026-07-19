// Driver Panel — renders the response from GET /api/drivers/panel
// Plain script (no ES modules), matching app.js's style. Exposes
// window.loadDriverPanel(containerId, {year, round}).
//
// Layout: hero (currently selected driver) + horizontal "Top Drivers"
// carousel + "All Drivers" list below. Clicking any driver card updates
// the hero in place — no separate detail page/route.
//
// Expected shape per driver (see backend/src/driver_panel.py):
// {
//   code: "VER", name: "Max Verstappen", team: "Red Bull Racing",
//   position: 1, points: 25.0, wins: 0, podiums: 0, poles: 0,
//   fastest_laps: 0, avg_finish: null, color: "#3671C6",
//   image: "static/images/drivers/verstappen.png",       // optional
//   banner: "static/images/banners/verstappen.png",      // optional
//   description: "..."                                    // optional
// }

(function () {
  let _drivers = [];
  let _container = null;
  let _selectedCode = null;
  let _viewMode = "list";

  async function loadDriverPanel(containerId, { year, round = null }) {
    _container = document.getElementById(containerId);
    if (!_container) {
      console.error(`[driver-panel] container #${containerId} not found`);
      return;
    }

    _container.innerHTML = `<p class="dp-loading">Loading drivers…</p>`;

    const params = new URLSearchParams({ year });
    if (round) params.set("round", round);

    try {
      const res = await fetch(`/api/drivers/panel?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      _drivers = await res.json();
      _selectedCode = _drivers[0]?.code || null;
      render();
    } catch (err) {
      console.error("[driver-panel] failed to load:", err);
      throw err;
    }
  }

  function assetPath(path) {
    if (!path) return "";
    return "/" + String(path).replace(/^\/+/, "");
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  function matchesSearch(d, text) {
    const q = text.toLowerCase();
    return (
      (d.name || "").toLowerCase().includes(q) ||
      (d.team || "").toLowerCase().includes(q) ||
      (d.code || "").toLowerCase().includes(q)
    );
  }

  function render(filterText = "") {
    if (_viewMode === "profile") {
      const selected = _drivers.find(d => d.code === _selectedCode) || _drivers[0];
      _container.innerHTML = profilePageHTML(selected);
      wireUpEvents(filterText);
      return;
    }

    const selected = _drivers.find(d => d.code === _selectedCode) || _drivers[0];
    const top5 = _drivers.slice(0, 5);
    const rest = _drivers.slice(5);
    const filtered = filterText ? _drivers.filter(d => matchesSearch(d, filterText)) : null;

    _container.innerHTML = `
      <div class="dp-header-row">
        <h1 class="dp-page-title">Drivers</h1>
        <div class="dp-search-wrap">
          <input type="text" id="dp-search" class="dp-search-input"
                 placeholder="Search drivers or teams..." value="${escapeAttr(filterText)}" />
        </div>
      </div>

      ${filtered ? `
        <div class="dp-section-header">
          <h2>Search Results</h2>
          <div class="dp-rule"></div>
          <span class="dp-count">${filtered.length} driver${filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div class="dp-grid">
          ${filtered.map(driverListRowHTML).join("") || `<p class="dp-empty">No drivers found.</p>`}
        </div>
      ` : `
        ${selected ? heroHTML(selected) : ""}

        <div class="dp-section-header">
          <h2>Top Drivers</h2>
          <div class="dp-rule"></div>
        </div>
        <div class="dp-carousel-wrap">
          <button class="dp-carousel-arrow dp-carousel-arrow-left" id="dp-scroll-left" aria-label="Scroll left">&#8249;</button>
          <div class="dp-carousel" id="dp-carousel">
            ${top5.map(d => topDriverCardHTML(d, d.code === _selectedCode)).join("")}
          </div>
          <button class="dp-carousel-arrow dp-carousel-arrow-right" id="dp-scroll-right" aria-label="Scroll right">&#8250;</button>
        </div>

        <div class="dp-section-header">
          <h2>All Drivers</h2>
          <div class="dp-rule"></div>
          <span class="dp-count">${rest.length} driver${rest.length !== 1 ? "s" : ""}</span>
        </div>
        <div class="dp-grid">
          ${rest.map(driverListRowHTML).join("") || `<p class="dp-empty">No other drivers.</p>`}
        </div>
      `}
    `;

    wireUpEvents(filterText);
  }

  function wireUpEvents(filterText) {
    const searchInput = _container.querySelector("#dp-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => render(e.target.value));
      searchInput.focus();
      searchInput.setSelectionRange(filterText.length, filterText.length);
    }

    _container.querySelectorAll("[data-driver-code]").forEach(el => {
      el.addEventListener("click", () => {
        _selectedCode = el.dataset.driverCode;
        _viewMode = "list";
        render();
        _container.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    const heroTrigger = _container.querySelector("#dp-hero-trigger");
    if (heroTrigger) {
      heroTrigger.addEventListener("click", () => {
        _viewMode = "profile";
        render();
        _container.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    const backBtn = _container.querySelector("#dp-profile-back");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        _viewMode = "list";
        render();
      });
    }

    const carousel = _container.querySelector("#dp-carousel");
    const leftBtn = _container.querySelector("#dp-scroll-left");
    const rightBtn = _container.querySelector("#dp-scroll-right");
    if (carousel && leftBtn && rightBtn) {
      leftBtn.addEventListener("click", () => carousel.scrollBy({ left: -280, behavior: "smooth" }));
      rightBtn.addEventListener("click", () => carousel.scrollBy({ left: 280, behavior: "smooth" }));
    }
  }

  function heroHTML(d) {
    const color = d.color || "#888";
    const bannerSrc = d.banner ? assetPath(d.banner) : null;
    const imgSrc = d.image ? assetPath(d.image) : null;

    return `
      <div class="dp-hero" style="--team-color:${color};">
        <div id="dp-hero-trigger" class="dp-hero-clickable">
          ${bannerSrc ? `
            <div class="dp-hero-banner-frame">
              <img class="dp-hero-banner-img" src="${bannerSrc}" alt="" onerror="this.closest('.dp-hero-banner-frame').remove()">
              <div class="dp-hero-scrim"></div>
              ${imgSrc ? `<img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">` : ""}
              <div class="dp-hero-scrim-content">
                <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
                  ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
                </span>
                <h1 class="dp-hero-name">${d.name}</h1>
                <div class="dp-hero-teamrow">
                  ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
                  <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
                </div>
                <span class="dp-hero-expand-hint">View full profile &rarr;</span>
              </div>
            </div>
          ` : imgSrc ? `
            <div class="dp-hero-banner-frame">
              <div class="dp-hero-fallback-bg" style="background:linear-gradient(115deg, ${color}33, #000 65%);"></div>
              <img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">
              <div class="dp-hero-scrim-content">
                <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
                  ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
                </span>
                <h1 class="dp-hero-name">${d.name}</h1>
                <div class="dp-hero-teamrow">
                  ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
                  <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
                </div>
                <span class="dp-hero-expand-hint">View full profile &rarr;</span>
              </div>
            </div>
          ` : `
            <div class="dp-hero-fallback" style="background:linear-gradient(115deg, ${color}33, #000 65%);">
              <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
                ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
              </span>
              <h1 class="dp-hero-name">${d.name}</h1>
              <div class="dp-hero-teamrow">
                ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
                <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
              </div>
              <span class="dp-hero-expand-hint">View full profile &rarr;</span>
            </div>
          `}
        </div>

        <div class="dp-stats-row">
          ${statCardHTML("PTS", d.points ?? 0, color, true)}
          ${statCardHTML("WINS", d.wins ?? 0, color)}
          ${statCardHTML("PODIUMS", d.podiums ?? 0, color)}
          ${statCardHTML("POLES", d.poles ?? 0, color)}
          ${statCardHTML("FASTEST LAPS", d.fastest_laps ?? 0, color)}
          ${statCardHTML("AVG FINISH", d.avg_finish ?? "-", color)}
        </div>
      </div>
    `;
  }

  function profilePageHTML(d) {
    const color = d.color || "#888";
    const bannerSrc = d.banner ? assetPath(d.banner) : null;
    const imgSrc = d.image ? assetPath(d.image) : null;

    return `
      <button id="dp-profile-back" class="dp-profile-back">&larr; Back to Drivers</button>

      <div class="dp-hero dp-profile-hero" style="--team-color:${color};">
        ${bannerSrc ? `
          <div class="dp-hero-banner-frame dp-profile-banner-frame">
            <img class="dp-hero-banner-img" src="${bannerSrc}" alt="" onerror="this.closest('.dp-hero-banner-frame').remove()">
            <div class="dp-hero-scrim"></div>
            ${imgSrc ? `<img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">` : ""}
            <div class="dp-hero-scrim-content">
              <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
                ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
              </span>
              <h1 class="dp-hero-name">${d.name}</h1>
              <div class="dp-hero-teamrow">
                ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
                <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
              </div>
            </div>
          </div>
        ` : imgSrc ? `
          <div class="dp-hero-banner-frame dp-profile-banner-frame">
            <div class="dp-hero-fallback-bg" style="background:linear-gradient(115deg, ${color}33, #000 65%);"></div>
            <img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">
            <div class="dp-hero-scrim-content">
              <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
                ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
              </span>
              <h1 class="dp-hero-name">${d.name}</h1>
              <div class="dp-hero-teamrow">
                ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
                <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
              </div>
            </div>
          </div>
        ` : `
          <div class="dp-hero-fallback" style="background:linear-gradient(115deg, ${color}33, #000 65%);">
            <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
              ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
            </span>
            <h1 class="dp-hero-name">${d.name}</h1>
            <div class="dp-hero-teamrow">
              ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
              <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
            </div>
          </div>
        `}

        <div class="dp-stats-row">
          ${statCardHTML("PTS", d.points ?? 0, color, true)}
          ${statCardHTML("WINS", d.wins ?? 0, color)}
          ${statCardHTML("PODIUMS", d.podiums ?? 0, color)}
          ${statCardHTML("POLES", d.poles ?? 0, color)}
          ${statCardHTML("FASTEST LAPS", d.fastest_laps ?? 0, color)}
          ${statCardHTML("AVG FINISH", d.avg_finish ?? "-", color)}
        </div>
      </div>

      <div class="dp-full-profile">
        <div class="dp-full-profile-meta">
          ${d.flag ? `<img class="dp-flag-lg" src="${assetPath(d.flag)}" alt="" onerror="this.remove()">` : ""}
          <span class="dp-full-profile-nat">${d.nationality || ""}</span>
          ${d.number ? `<span class="dp-full-profile-num" style="color:${color};">#${d.number}</span>` : ""}
        </div>
        ${d.description ? `
          <div class="dp-desc-box">
            <div class="dp-desc-header">
              <div class="dp-desc-bar" style="background:${color};"></div>
              <h2>Biography</h2>
            </div>
            <p>${d.description}</p>
          </div>
        ` : `<p class="dp-empty">No biography available yet.</p>`}
      </div>
    `;
  }

  function topDriverCardHTML(d, isSelected) {
    const color = d.color || "#888";
    const medal = d.position === 1 ? "#FFD700" : d.position === 2 ? "#C0C0C0" : d.position === 3 ? "#CD7F32" : "#444";

    return `
      <div class="dp-top-card ${isSelected ? "dp-top-card-selected" : ""}"
           data-driver-code="${d.code}" style="--team-color:${color};">
        <div class="dp-top-card-medal" style="background:${medal}; color:${d.position <= 2 ? "#1a1a1a" : "#fff"};">${d.position ?? "-"}</div>
        ${d.image ? `<img class="dp-top-card-img" src="${assetPath(d.image)}" alt="${d.name}" onerror="this.remove()">` : ""}
        <div class="dp-top-card-info">
          <p class="dp-top-card-name">${d.name}</p>
          <p class="dp-top-card-team" style="color:${color};">${d.team || ""}</p>
          <p class="dp-top-card-pts"><span>${d.points ?? 0}</span> PTS</p>
        </div>
      </div>
    `;
  }

  function driverListRowHTML(d) {
    const color = d.color || "#888";
    const isSelected = d.code === _selectedCode;
    return `
      <div class="dp-card ${isSelected ? "dp-card-selected" : ""}" data-driver-code="${d.code}" style="--team-color:${color};">
        ${d.image ? `
          <div class="dp-card-imgwrap">
            <img class="dp-card-img" src="${assetPath(d.image)}" alt="${d.name}" onerror="this.parentElement.remove()">
          </div>` : ""}
        <div class="dp-card-info dp-card-info-full">
          <div class="dp-card-toprow">
            <span class="dp-card-pos">P${d.position ?? "-"}</span>
            <span class="dp-card-name">${d.name}</span>
          </div>
          <p class="dp-card-team" style="color:${color};">${d.team || ""}</p>
        </div>
        <div class="dp-card-right">
          ${d.teamLogo ? `<img class="dp-card-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
          <div class="dp-card-pointswrap">
            <span class="dp-points-num">${d.points ?? 0}</span>
            <span class="dp-points-label">pts</span>
          </div>
        </div>
      </div>
    `;
  }

  function statCardHTML(label, value, color, large = false) {
    return `
      <div class="dp-stat-card" style="border-color:${color}20; background:${color}08;">
        <p class="dp-stat-value ${large ? "dp-stat-large" : ""}" style="color:${color};">${value}</p>
        <p class="dp-stat-label">${label}</p>
      </div>
    `;
  }

  // Expose globally — app.js calls window.loadDriverPanel(...)
  window.loadDriverPanel = loadDriverPanel;
})();