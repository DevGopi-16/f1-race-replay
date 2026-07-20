// // Driver Panel — renders the response from GET /api/drivers/panel
// // Plain script (no ES modules), matching app.js's style. Exposes
// // window.loadDriverPanel(containerId, {year, round}).
// //
// // Layout: hero (currently selected driver) + horizontal "Top Drivers"
// // carousel + "All Drivers" list below. Clicking any driver card updates
// // the hero in place — no separate detail page/route.
// //
// // Expected shape per driver (see backend/src/driver_panel.py):
// // {
// //   code: "VER", name: "Max Verstappen", team: "Red Bull Racing",
// //   position: 1, points: 25.0, wins: 0, podiums: 0, poles: 0,
// //   fastest_laps: 0, avg_finish: null, color: "#3671C6",
// //   image: "static/images/drivers/verstappen.png",       // optional
// //   banner: "static/images/banners/verstappen.png",      // optional
// //   description: "..."                                    // optional
// // }

// (function () {
//   let _drivers = [];
//   let _container = null;
//   let _selectedCode = null;
//   let _viewMode = "list";

//   async function loadDriverPanel(containerId, { year, round = null }) {
//     _container = document.getElementById(containerId);
//     if (!_container) {
//       console.error(`[driver-panel] container #${containerId} not found`);
//       return;
//     }

//     _container.innerHTML = `<p class="dp-loading">Loading drivers…</p>`;

//     const params = new URLSearchParams({ year });
//     if (round) params.set("round", round);

//     try {
//       const res = await fetch(`/api/drivers/panel?${params}`);
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       _drivers = await res.json();
//       _selectedCode = _drivers[0]?.code || null;
//       render();
//     } catch (err) {
//       console.error("[driver-panel] failed to load:", err);
//       throw err;
//     }
//   }

//   function assetPath(path) {
//     if (!path) return "";
//     return "/" + String(path).replace(/^\/+/, "");
//   }

//   function escapeAttr(str) {
//     return String(str).replace(/"/g, "&quot;");
//   }

//   function matchesSearch(d, text) {
//     const q = text.toLowerCase();
//     return (
//       (d.name || "").toLowerCase().includes(q) ||
//       (d.team || "").toLowerCase().includes(q) ||
//       (d.code || "").toLowerCase().includes(q)
//     );
//   }

//   function render(filterText = "") {
//     if (_viewMode === "profile") {
//       const selected = _drivers.find(d => d.code === _selectedCode) || _drivers[0];
//       _container.innerHTML = profilePageHTML(selected);
//       wireUpEvents(filterText);
//       return;
//     }

//     const selected = _drivers.find(d => d.code === _selectedCode) || _drivers[0];
//     const top5 = _drivers.slice(0, 5);
//     const rest = _drivers.slice(5);
//     const filtered = filterText ? _drivers.filter(d => matchesSearch(d, filterText)) : null;

//     _container.innerHTML = `
//       <div class="dp-header-row">
//         <h1 class="dp-page-title">Drivers</h1>
//         <div class="dp-search-wrap">
//           <input type="text" id="dp-search" class="dp-search-input"
//                  placeholder="Search drivers or teams..." value="${escapeAttr(filterText)}" />
//         </div>
//       </div>

//       ${filtered ? `
//         <div class="dp-section-header">
//           <h2>Search Results</h2>
//           <div class="dp-rule"></div>
//           <span class="dp-count">${filtered.length} driver${filtered.length !== 1 ? "s" : ""}</span>
//         </div>
//         <div class="dp-grid">
//           ${filtered.map(driverListRowHTML).join("") || `<p class="dp-empty">No drivers found.</p>`}
//         </div>
//       ` : `
//         ${selected ? heroHTML(selected) : ""}

//         <div class="dp-section-header">
//           <h2>Top Drivers</h2>
//           <div class="dp-rule"></div>
//         </div>
//         <div class="dp-carousel-wrap">
//           <button class="dp-carousel-arrow dp-carousel-arrow-left" id="dp-scroll-left" aria-label="Scroll left">&#8249;</button>
//           <div class="dp-carousel" id="dp-carousel">
//             ${top5.map(d => topDriverCardHTML(d, d.code === _selectedCode)).join("")}
//           </div>
//           <button class="dp-carousel-arrow dp-carousel-arrow-right" id="dp-scroll-right" aria-label="Scroll right">&#8250;</button>
//         </div>

//         <div class="dp-section-header">
//           <h2>All Drivers</h2>
//           <div class="dp-rule"></div>
//           <span class="dp-count">${rest.length} driver${rest.length !== 1 ? "s" : ""}</span>
//         </div>
//         <div class="dp-grid">
//           ${rest.map(driverListRowHTML).join("") || `<p class="dp-empty">No other drivers.</p>`}
//         </div>
//       `}
//     `;

//     wireUpEvents(filterText);
//   }

//   function wireUpEvents(filterText) {
//     const searchInput = _container.querySelector("#dp-search");
//     if (searchInput) {
//       searchInput.addEventListener("input", (e) => render(e.target.value));
//       searchInput.focus();
//       searchInput.setSelectionRange(filterText.length, filterText.length);
//     }

//     _container.querySelectorAll("[data-driver-code]").forEach(el => {
//       el.addEventListener("click", () => {
//         _selectedCode = el.dataset.driverCode;
//         _viewMode = "list";
//         render();
//         _container.scrollIntoView({ behavior: "smooth", block: "start" });
//       });
//     });

//     const heroTrigger = _container.querySelector("#dp-hero-trigger");
//     if (heroTrigger) {
//       heroTrigger.addEventListener("click", () => {
//         _viewMode = "profile";
//         render();
//         _container.scrollIntoView({ behavior: "smooth", block: "start" });
//       });
//     }

//     const backBtn = _container.querySelector("#dp-profile-back");
//     if (backBtn) {
//       backBtn.addEventListener("click", () => {
//         _viewMode = "list";
//         render();
//       });
//     }

//     const carousel = _container.querySelector("#dp-carousel");
//     const leftBtn = _container.querySelector("#dp-scroll-left");
//     const rightBtn = _container.querySelector("#dp-scroll-right");
//     if (carousel && leftBtn && rightBtn) {
//       leftBtn.addEventListener("click", () => carousel.scrollBy({ left: -280, behavior: "smooth" }));
//       rightBtn.addEventListener("click", () => carousel.scrollBy({ left: 280, behavior: "smooth" }));
//     }
//   }

//   function heroHTML(d) {
//     const color = d.color || "#888";
//     const bannerSrc = d.banner ? assetPath(d.banner) : null;
//     const imgSrc = d.image ? assetPath(d.image) : null;

//     return `
//       <div class="dp-hero" style="--team-color:${color};">
//         <div id="dp-hero-trigger" class="dp-hero-clickable">
//           ${bannerSrc ? `
//             <div class="dp-hero-banner-frame">
//               <img class="dp-hero-banner-img" src="${bannerSrc}" alt="" onerror="this.closest('.dp-hero-banner-frame').remove()">
//               <div class="dp-hero-scrim"></div>
//               ${imgSrc ? `<img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">` : ""}
//               <div class="dp-hero-scrim-content">
//                 <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//                   ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//                 </span>
//                 <h1 class="dp-hero-name">${d.name}</h1>
//                 <div class="dp-hero-teamrow">
//                   ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//                   <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//                 </div>
//                 <span class="dp-hero-expand-hint">View full profile &rarr;</span>
//               </div>
//             </div>
//           ` : imgSrc ? `
//             <div class="dp-hero-banner-frame">
//               <div class="dp-hero-fallback-bg" style="background:linear-gradient(115deg, ${color}33, #000 65%);"></div>
//               <img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">
//               <div class="dp-hero-scrim-content">
//                 <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//                   ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//                 </span>
//                 <h1 class="dp-hero-name">${d.name}</h1>
//                 <div class="dp-hero-teamrow">
//                   ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//                   <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//                 </div>
//                 <span class="dp-hero-expand-hint">View full profile &rarr;</span>
//               </div>
//             </div>
//           ` : `
//             <div class="dp-hero-fallback" style="background:linear-gradient(115deg, ${color}33, #000 65%);">
//               <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//                 ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//               </span>
//               <h1 class="dp-hero-name">${d.name}</h1>
//               <div class="dp-hero-teamrow">
//                 ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//                 <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//               </div>
//               <span class="dp-hero-expand-hint">View full profile &rarr;</span>
//             </div>
//           `}
//         </div>

//         <div class="dp-stats-row">
//           ${statCardHTML("PTS", d.points ?? 0, color, true)}
//           ${statCardHTML("WINS", d.wins ?? 0, color)}
//           ${statCardHTML("PODIUMS", d.podiums ?? 0, color)}
//           ${statCardHTML("POLES", d.poles ?? 0, color)}
//           ${statCardHTML("FASTEST LAPS", d.fastest_laps ?? 0, color)}
//           ${statCardHTML("AVG FINISH", d.avg_finish ?? "-", color)}
//         </div>
//       </div>
//     `;
//   }

//   function profilePageHTML(d) {
//     const color = d.color || "#888";
//     const bannerSrc = d.banner ? assetPath(d.banner) : null;
//     const imgSrc = d.image ? assetPath(d.image) : null;

//     return `
//       <button id="dp-profile-back" class="dp-profile-back">&larr; Back to Drivers</button>

//       <div class="dp-hero dp-profile-hero" style="--team-color:${color};">
//         ${bannerSrc ? `
//           <div class="dp-hero-banner-frame dp-profile-banner-frame">
//             <img class="dp-hero-banner-img" src="${bannerSrc}" alt="" onerror="this.closest('.dp-hero-banner-frame').remove()">
//             <div class="dp-hero-scrim"></div>
//             ${imgSrc ? `<img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">` : ""}
//             <div class="dp-hero-scrim-content">
//               <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//                 ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//               </span>
//               <h1 class="dp-hero-name">${d.name}</h1>
//               <div class="dp-hero-teamrow">
//                 ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//                 <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//               </div>
//             </div>
//           </div>
//         ` : imgSrc ? `
//           <div class="dp-hero-banner-frame dp-profile-banner-frame">
//             <div class="dp-hero-fallback-bg" style="background:linear-gradient(115deg, ${color}33, #000 65%);"></div>
//             <img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">
//             <div class="dp-hero-scrim-content">
//               <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//                 ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//               </span>
//               <h1 class="dp-hero-name">${d.name}</h1>
//               <div class="dp-hero-teamrow">
//                 ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//                 <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//               </div>
//             </div>
//           </div>
//         ` : `
//           <div class="dp-hero-fallback" style="background:linear-gradient(115deg, ${color}33, #000 65%);">
//             <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//               ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//             </span>
//             <h1 class="dp-hero-name">${d.name}</h1>
//             <div class="dp-hero-teamrow">
//               ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//               <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//             </div>
//           </div>
//         `}

//         <div class="dp-stats-row">
//           ${statCardHTML("PTS", d.points ?? 0, color, true)}
//           ${statCardHTML("WINS", d.wins ?? 0, color)}
//           ${statCardHTML("PODIUMS", d.podiums ?? 0, color)}
//           ${statCardHTML("POLES", d.poles ?? 0, color)}
//           ${statCardHTML("FASTEST LAPS", d.fastest_laps ?? 0, color)}
//           ${statCardHTML("AVG FINISH", d.avg_finish ?? "-", color)}
//         </div>
//       </div>

//       <div class="dp-full-profile">
//         <div class="dp-full-profile-meta">
//           ${d.flag ? `<img class="dp-flag-lg" src="${assetPath(d.flag)}" alt="" onerror="this.remove()">` : ""}
//           <span class="dp-full-profile-nat">${d.nationality || ""}</span>
//           ${d.number ? `<span class="dp-full-profile-num" style="color:${color};">#${d.number}</span>` : ""}
//         </div>
//         ${d.description ? `
//           <div class="dp-desc-box">
//             <div class="dp-desc-header">
//               <div class="dp-desc-bar" style="background:${color};"></div>
//               <h2>Biography</h2>
//             </div>
//             <p>${d.description}</p>
//           </div>
//         ` : `<p class="dp-empty">No biography available yet.</p>`}
//       </div>
//     `;
//   }

//   function topDriverCardHTML(d, isSelected) {
//     const color = d.color || "#888";
//     const medal = d.position === 1 ? "#FFD700" : d.position === 2 ? "#C0C0C0" : d.position === 3 ? "#CD7F32" : "#444";

//     return `
//       <div class="dp-top-card ${isSelected ? "dp-top-card-selected" : ""}"
//            data-driver-code="${d.code}" style="--team-color:${color};">
//         <div class="dp-top-card-medal" style="background:${medal}; color:${d.position <= 2 ? "#1a1a1a" : "#fff"};">${d.position ?? "-"}</div>
//         ${d.image ? `<img class="dp-top-card-img" src="${assetPath(d.image)}" alt="${d.name}" onerror="this.remove()">` : ""}
//         <div class="dp-top-card-info">
//           <p class="dp-top-card-name">${d.name}</p>
//           <p class="dp-top-card-team" style="color:${color};">${d.team || ""}</p>
//           <p class="dp-top-card-pts"><span>${d.points ?? 0}</span> PTS</p>
//         </div>
//       </div>
//     `;
//   }

//   function driverListRowHTML(d) {
//     const color = d.color || "#888";
//     const isSelected = d.code === _selectedCode;
//     return `
//       <div class="dp-card ${isSelected ? "dp-card-selected" : ""}" data-driver-code="${d.code}" style="--team-color:${color};">
//         ${d.image ? `
//           <div class="dp-card-imgwrap">
//             <img class="dp-card-img" src="${assetPath(d.image)}" alt="${d.name}" onerror="this.parentElement.remove()">
//           </div>` : ""}
//         <div class="dp-card-info dp-card-info-full">
//           <div class="dp-card-toprow">
//             <span class="dp-card-pos">P${d.position ?? "-"}</span>
//             <span class="dp-card-name">${d.name}</span>
//           </div>
//           <p class="dp-card-team" style="color:${color};">${d.team || ""}</p>
//         </div>
//         <div class="dp-card-right">
//           ${d.teamLogo ? `<img class="dp-card-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//           <div class="dp-card-pointswrap">
//             <span class="dp-points-num">${d.points ?? 0}</span>
//             <span class="dp-points-label">pts</span>
//           </div>
//         </div>
//       </div>
//     `;
//   }

//   function statCardHTML(label, value, color, large = false) {
//     return `
//       <div class="dp-stat-card" style="border-color:${color}20; background:${color}08;">
//         <p class="dp-stat-value ${large ? "dp-stat-large" : ""}" style="color:${color};">${value}</p>
//         <p class="dp-stat-label">${label}</p>
//       </div>
//     `;
//   }

//   // Expose globally — app.js calls window.loadDriverPanel(...)
//   window.loadDriverPanel = loadDriverPanel;
// })();









// // Driver Panel — renders the response from GET /api/drivers/panel
// // Plain script (no ES modules), matching app.js's style. Exposes
// // window.loadDriverPanel(containerId, {year, round}).
// //
// // Layout: hero (currently selected driver) + horizontal "Top Drivers"
// // carousel + "All Drivers" list below. Clicking any driver card updates
// // the hero in place. Clicking the hero opens a full profile page with
// // biography, season statistics, and progression charts (points +
// // finish position per race), built from the `history` array the
// // backend already computes per driver.
// //
// // Expected shape per driver (see backend/src/driver_panel.py):
// // {
// //   code: "VER", name: "Max Verstappen", team: "Red Bull Racing",
// //   position: 1, points: 25.0, wins: 0, podiums: 0, poles: 0,
// //   fastest_laps: 0, avg_finish: null, color: "#3671C6",
// //   image: "static/images/drivers/verstappen.png",       // optional
// //   banner: "static/images/banners/verstappen.png",      // optional
// //   description: "..."                                    // optional
// //   history: [                                             // optional
// //     { round, event_name, position, points, cumulative_points }, ...
// //   ]
// // }

// (function () {
//   let _drivers = [];
//   let _container = null;
//   let _selectedCode = null;
//   let _viewMode = "list";
//   let _resizeHandler = null;

//   async function loadDriverPanel(containerId, { year, round = null }) {
//     _container = document.getElementById(containerId);
//     if (!_container) {
//       console.error(`[driver-panel] container #${containerId} not found`);
//       return;
//     }

//     _container.innerHTML = `<p class="dp-loading">Loading drivers…</p>`;

//     const params = new URLSearchParams({ year });
//     if (round) params.set("round", round);

//     try {
//       const res = await fetch(`/api/drivers/panel?${params}`);
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       _drivers = await res.json();
//       _selectedCode = _drivers[0]?.code || null;
//       render();
//       setupResizeHandler();
//     } catch (err) {
//       console.error("[driver-panel] failed to load:", err);
//       throw err;
//     }
//   }

//   function assetPath(path) {
//     if (!path) return "";
//     return "/" + String(path).replace(/^\/+/, "");
//   }

//   function escapeAttr(str) {
//     return String(str).replace(/"/g, "&quot;");
//   }

//   function matchesSearch(d, text) {
//     const q = text.toLowerCase();
//     return (
//       (d.name || "").toLowerCase().includes(q) ||
//       (d.team || "").toLowerCase().includes(q) ||
//       (d.code || "").toLowerCase().includes(q)
//     );
//   }

//   function render(filterText = "") {
//     if (_viewMode === "profile") {
//       const selected = _drivers.find(d => d.code === _selectedCode) || _drivers[0];
//       _container.innerHTML = profilePageHTML(selected);
//       wireUpEvents(filterText);
//       return;
//     }

//     const selected = _drivers.find(d => d.code === _selectedCode) || _drivers[0];
//     const top5 = _drivers.slice(0, 5);
//     const rest = _drivers.slice(5);
//     const filtered = filterText ? _drivers.filter(d => matchesSearch(d, filterText)) : null;

//     _container.innerHTML = `
//       <div class="dp-header-row">
//         <h1 class="dp-page-title">Drivers</h1>
//         <div class="dp-search-wrap">
//           <input type="text" id="dp-search" class="dp-search-input"
//                  placeholder="Search drivers or teams..." value="${escapeAttr(filterText)}" />
//         </div>
//       </div>

//       ${filtered ? `
//         <div class="dp-section-header">
//           <h2>Search Results</h2>
//           <div class="dp-rule"></div>
//           <span class="dp-count">${filtered.length} driver${filtered.length !== 1 ? "s" : ""}</span>
//         </div>
//         <div class="dp-grid">
//           ${filtered.map(driverListRowHTML).join("") || `<p class="dp-empty">No drivers found.</p>`}
//         </div>
//       ` : `
//         ${selected ? heroHTML(selected) : ""}

//         <div class="dp-section-header">
//           <h2>Top Drivers</h2>
//           <div class="dp-rule"></div>
//         </div>
//         <div class="dp-carousel-wrap">
//           <button class="dp-carousel-arrow dp-carousel-arrow-left" id="dp-scroll-left" aria-label="Scroll left">&#8249;</button>
//           <div class="dp-carousel" id="dp-carousel">
//             ${top5.map(d => topDriverCardHTML(d, d.code === _selectedCode)).join("")}
//           </div>
//           <button class="dp-carousel-arrow dp-carousel-arrow-right" id="dp-scroll-right" aria-label="Scroll right">&#8250;</button>
//         </div>

//         <div class="dp-section-header">
//           <h2>All Drivers</h2>
//           <div class="dp-rule"></div>
//           <span class="dp-count">${rest.length} driver${rest.length !== 1 ? "s" : ""}</span>
//         </div>
//         <div class="dp-grid">
//           ${rest.map(driverListRowHTML).join("") || `<p class="dp-empty">No other drivers.</p>`}
//         </div>
//       `}
//     `;

//     wireUpEvents(filterText);
//   }

//   function wireUpEvents(filterText) {
//     const searchInput = _container.querySelector("#dp-search");
//     if (searchInput) {
//       searchInput.addEventListener("input", (e) => render(e.target.value));
//       searchInput.focus();
//       searchInput.setSelectionRange(filterText.length, filterText.length);
//     }

//     _container.querySelectorAll("[data-driver-code]").forEach(el => {
//       el.addEventListener("click", () => {
//         _selectedCode = el.dataset.driverCode;
//         _viewMode = "list";
//         render();
//         _container.scrollIntoView({ behavior: "smooth", block: "start" });
//       });
//     });

//     const heroTrigger = _container.querySelector("#dp-hero-trigger");
//     if (heroTrigger) {
//       heroTrigger.addEventListener("click", () => {
//         _viewMode = "profile";
//         render();
//         _container.scrollIntoView({ behavior: "smooth", block: "start" });
//       });
//     }

//     const backBtn = _container.querySelector("#dp-profile-back");
//     if (backBtn) {
//       backBtn.addEventListener("click", () => {
//         _viewMode = "list";
//         render();
//       });
//     }

//     const carousel = _container.querySelector("#dp-carousel");
//     const leftBtn = _container.querySelector("#dp-scroll-left");
//     const rightBtn = _container.querySelector("#dp-scroll-right");
//     if (carousel && leftBtn && rightBtn) {
//       leftBtn.addEventListener("click", () => carousel.scrollBy({ left: -280, behavior: "smooth" }));
//       rightBtn.addEventListener("click", () => carousel.scrollBy({ left: 280, behavior: "smooth" }));
//     }

//     if (_viewMode === "profile") {
//       const selected = _drivers.find(d => d.code === _selectedCode) || _drivers[0];
//       if (selected) drawCharts(selected);
//     }
//   }

//   function setupResizeHandler() {
//     if (_resizeHandler) window.removeEventListener("resize", _resizeHandler);
//     let raf = null;
//     _resizeHandler = () => {
//       if (raf) cancelAnimationFrame(raf);
//       raf = requestAnimationFrame(() => {
//         if (_viewMode !== "profile" || !_container) return;
//         const selected = _drivers.find(d => d.code === _selectedCode) || _drivers[0];
//         if (selected) drawCharts(selected);
//       });
//     };
//     window.addEventListener("resize", _resizeHandler);
//   }

//   function heroHTML(d) {
//     const color = d.color || "#888";
//     const bannerSrc = d.banner ? assetPath(d.banner) : null;
//     const imgSrc = d.image ? assetPath(d.image) : null;

//     return `
//       <div class="dp-hero" style="--team-color:${color};">
//         <div id="dp-hero-trigger" class="dp-hero-clickable">
//           ${bannerSrc ? `
//             <div class="dp-hero-banner-frame">
//               <img class="dp-hero-banner-img" src="${bannerSrc}" alt="" onerror="this.closest('.dp-hero-banner-frame').remove()">
//               <div class="dp-hero-scrim"></div>
//               ${imgSrc ? `<img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">` : ""}
//               <div class="dp-hero-scrim-content">
//                 <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//                   ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//                 </span>
//                 <h1 class="dp-hero-name">${d.name}</h1>
//                 <div class="dp-hero-teamrow">
//                   ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//                   <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//                 </div>
//                 <span class="dp-hero-expand-hint">View full profile &rarr;</span>
//               </div>
//             </div>
//           ` : imgSrc ? `
//             <div class="dp-hero-banner-frame">
//               <div class="dp-hero-fallback-bg" style="background:linear-gradient(115deg, ${color}33, #000 65%);"></div>
//               <img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">
//               <div class="dp-hero-scrim-content">
//                 <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//                   ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//                 </span>
//                 <h1 class="dp-hero-name">${d.name}</h1>
//                 <div class="dp-hero-teamrow">
//                   ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//                   <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//                 </div>
//                 <span class="dp-hero-expand-hint">View full profile &rarr;</span>
//               </div>
//             </div>
//           ` : `
//             <div class="dp-hero-fallback" style="background:linear-gradient(115deg, ${color}33, #000 65%);">
//               <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//                 ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//               </span>
//               <h1 class="dp-hero-name">${d.name}</h1>
//               <div class="dp-hero-teamrow">
//                 ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//                 <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//               </div>
//               <span class="dp-hero-expand-hint">View full profile &rarr;</span>
//             </div>
//           `}
//         </div>

//         <div class="dp-stats-row">
//           ${statCardHTML("PTS", d.points ?? 0, color, true)}
//           ${statCardHTML("WINS", d.wins ?? 0, color)}
//           ${statCardHTML("PODIUMS", d.podiums ?? 0, color)}
//           ${statCardHTML("POLES", d.poles ?? 0, color)}
//           ${statCardHTML("FASTEST LAPS", d.fastest_laps ?? 0, color)}
//           ${statCardHTML("AVG FINISH", d.avg_finish ?? "-", color)}
//         </div>
//       </div>
//     `;
//   }

//   // Derives extra season stats (best/worst finish, DNFs, races entered,
//   // average points per race) from the per-round `history` array. These
//   // aren't computed by the backend directly, but everything needed is
//   // already in `history`, so we roll them up here rather than round-tripping
//   // to the server.
//   function computeExtraStats(d) {
//     const history = d.history || [];
//     const finishes = history.map(h => h.position).filter(p => p != null);
//     const bestFinish = finishes.length ? Math.min(...finishes) : null;
//     const worstFinish = finishes.length ? Math.max(...finishes) : null;
//     const racesEntered = history.length;
//     const dnfs = history.filter(h => h.position == null).length;
//     const totalPoints = history.reduce((sum, h) => sum + (h.points || 0), 0);
//     const avgPoints = racesEntered ? Math.round((totalPoints / racesEntered) * 10) / 10 : 0;
//     return { bestFinish, worstFinish, racesEntered, dnfs, avgPoints };
//   }

//   function profilePageHTML(d) {
//     const color = d.color || "#888";
//     const bannerSrc = d.banner ? assetPath(d.banner) : null;
//     const imgSrc = d.image ? assetPath(d.image) : null;
//     const history = d.history || [];
//     const extra = computeExtraStats(d);

//     return `
//       <button id="dp-profile-back" class="dp-profile-back">&larr; Back to Drivers</button>

//       <div class="dp-hero dp-profile-hero" style="--team-color:${color};">
//         ${bannerSrc ? `
//           <div class="dp-hero-banner-frame dp-profile-banner-frame">
//             <img class="dp-hero-banner-img" src="${bannerSrc}" alt="" onerror="this.closest('.dp-hero-banner-frame').remove()">
//             <div class="dp-hero-scrim"></div>
//             ${imgSrc ? `<img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">` : ""}
//             <div class="dp-hero-scrim-content">
//               <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//                 ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//               </span>
//               <h1 class="dp-hero-name">${d.name}</h1>
//               <div class="dp-hero-teamrow">
//                 ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//                 <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//               </div>
//             </div>
//           </div>
//         ` : imgSrc ? `
//           <div class="dp-hero-banner-frame dp-profile-banner-frame">
//             <div class="dp-hero-fallback-bg" style="background:linear-gradient(115deg, ${color}33, #000 65%);"></div>
//             <img class="dp-hero-driverimg" src="${imgSrc}" alt="${d.name}" onerror="this.remove()">
//             <div class="dp-hero-scrim-content">
//               <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//                 ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//               </span>
//               <h1 class="dp-hero-name">${d.name}</h1>
//               <div class="dp-hero-teamrow">
//                 ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//                 <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//               </div>
//             </div>
//           </div>
//         ` : `
//           <div class="dp-hero-fallback" style="background:linear-gradient(115deg, ${color}33, #000 65%);">
//             <span class="dp-hero-pos" style="color:${color}; border-color:${color}40; background:${color}22;">
//               ${d.position === 1 ? "CURRENTLY 1ST" : `P${d.position ?? "-"}`}
//             </span>
//             <h1 class="dp-hero-name">${d.name}</h1>
//             <div class="dp-hero-teamrow">
//               ${d.teamLogo ? `<img class="dp-hero-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//               <span style="color:${color};" class="dp-hero-teamname">${d.team || ""}</span>
//             </div>
//           </div>
//         `}

//         <div class="dp-stats-row">
//           ${statCardHTML("PTS", d.points ?? 0, color, true)}
//           ${statCardHTML("WINS", d.wins ?? 0, color)}
//           ${statCardHTML("PODIUMS", d.podiums ?? 0, color)}
//           ${statCardHTML("POLES", d.poles ?? 0, color)}
//           ${statCardHTML("FASTEST LAPS", d.fastest_laps ?? 0, color)}
//           ${statCardHTML("AVG FINISH", d.avg_finish ?? "-", color)}
//         </div>
//       </div>

//       <div class="dp-full-profile">
//         <div class="dp-full-profile-meta">
//           ${d.flag ? `<img class="dp-flag-lg" src="${assetPath(d.flag)}" alt="" onerror="this.remove()">` : ""}
//           <span class="dp-full-profile-nat">${d.nationality || ""}</span>
//           ${d.number ? `<span class="dp-full-profile-num" style="color:${color};">#${d.number}</span>` : ""}
//         </div>
//         ${d.description ? `
//           <div class="dp-desc-box">
//             <div class="dp-desc-header">
//               <div class="dp-desc-bar" style="background:${color};"></div>
//               <h2>Biography</h2>
//             </div>
//             <p>${d.description}</p>
//           </div>
//         ` : `<p class="dp-empty">No biography available yet.</p>`}

//         ${history.length ? `
//           <div class="dp-desc-box" style="margin-top:16px;">
//             <div class="dp-desc-header">
//               <div class="dp-desc-bar" style="background:${color};"></div>
//               <h2>Season Statistics</h2>
//             </div>
//             <div class="dp-stats-row" style="padding:12px 0 0; background:none; backdrop-filter:none;">
//               ${statCardHTML("RACES", extra.racesEntered, color)}
//               ${statCardHTML("BEST FINISH", extra.bestFinish != null ? `P${extra.bestFinish}` : "-", color)}
//               ${statCardHTML("WORST FINISH", extra.worstFinish != null ? `P${extra.worstFinish}` : "-", color)}
//               ${statCardHTML("DNFs", extra.dnfs, color)}
//               ${statCardHTML("AVG PTS/RACE", extra.avgPoints, color)}
//             </div>
//           </div>

//           <div class="dp-charts-row">
//             <div class="dp-chart-card">
//               <div class="dp-chart-title">
//                 <span class="dp-chart-title-bar" style="background:${color};"></span>Points Progression
//               </div>
//               <div class="dp-chart-canvas-wrap">
//                 <canvas id="dp-points-canvas"></canvas>
//                 <div class="dp-chart-tooltip" id="dp-points-tooltip"></div>
//               </div>
//             </div>
//             <div class="dp-chart-card">
//               <div class="dp-chart-title">
//                 <span class="dp-chart-title-bar" style="background:${color};"></span>Race Finish Position
//               </div>
//               <div class="dp-chart-canvas-wrap">
//                 <canvas id="dp-position-canvas"></canvas>
//                 <div class="dp-chart-tooltip" id="dp-position-tooltip"></div>
//               </div>
//             </div>
//           </div>
//         ` : `
//           <div class="dp-desc-box" style="margin-top:16px;">
//             <div class="dp-desc-header">
//               <div class="dp-desc-bar" style="background:${color};"></div>
//               <h2>Season Statistics</h2>
//             </div>
//             <p class="dp-empty">No round-by-round data available yet for this season.</p>
//           </div>
//         `}
//       </div>
//     `;
//   }

//   function topDriverCardHTML(d, isSelected) {
//     const color = d.color || "#888";
//     const medal = d.position === 1 ? "#FFD700" : d.position === 2 ? "#C0C0C0" : d.position === 3 ? "#CD7F32" : "#444";

//     return `
//       <div class="dp-top-card ${isSelected ? "dp-top-card-selected" : ""}"
//            data-driver-code="${d.code}" style="--team-color:${color};">
//         <div class="dp-top-card-medal" style="background:${medal}; color:${d.position <= 2 ? "#1a1a1a" : "#fff"};">${d.position ?? "-"}</div>
//         ${d.image ? `<img class="dp-top-card-img" src="${assetPath(d.image)}" alt="${d.name}" onerror="this.remove()">` : ""}
//         <div class="dp-top-card-info">
//           <p class="dp-top-card-name">${d.name}</p>
//           <p class="dp-top-card-team" style="color:${color};">${d.team || ""}</p>
//           <p class="dp-top-card-pts"><span>${d.points ?? 0}</span> PTS</p>
//         </div>
//       </div>
//     `;
//   }

//   function driverListRowHTML(d) {
//     const color = d.color || "#888";
//     const isSelected = d.code === _selectedCode;
//     return `
//       <div class="dp-card ${isSelected ? "dp-card-selected" : ""}" data-driver-code="${d.code}" style="--team-color:${color};">
//         ${d.image ? `
//           <div class="dp-card-imgwrap">
//             <img class="dp-card-img" src="${assetPath(d.image)}" alt="${d.name}" onerror="this.parentElement.remove()">
//           </div>` : ""}
//         <div class="dp-card-info dp-card-info-full">
//           <div class="dp-card-toprow">
//             <span class="dp-card-pos">P${d.position ?? "-"}</span>
//             <span class="dp-card-name">${d.name}</span>
//           </div>
//           <p class="dp-card-team" style="color:${color};">${d.team || ""}</p>
//         </div>
//         <div class="dp-card-right">
//           ${d.teamLogo ? `<img class="dp-card-teamlogo" src="${assetPath(d.teamLogo)}" alt="" onerror="this.remove()">` : ""}
//           <div class="dp-card-pointswrap">
//             <span class="dp-points-num">${d.points ?? 0}</span>
//             <span class="dp-points-label">pts</span>
//           </div>
//         </div>
//       </div>
//     `;
//   }

//   function statCardHTML(label, value, color, large = false) {
//     return `
//       <div class="dp-stat-card" style="border-color:${color}20; background:${color}08;">
//         <p class="dp-stat-value ${large ? "dp-stat-large" : ""}" style="color:${color};">${value}</p>
//         <p class="dp-stat-label">${label}</p>
//       </div>
//     `;
//   }

//   // ---------- Charts ----------

//   // Sizes a canvas to its parent's box, accounting for devicePixelRatio so
//   // lines stay crisp on retina displays. Returns a 2D context already
//   // scaled to CSS pixels, plus the CSS-pixel width/height to draw with.
//   function setupCanvas(canvas) {
//     const dpr = window.devicePixelRatio || 1;
//     const rect = canvas.parentElement.getBoundingClientRect();
//     const width = Math.max(rect.width, 1);
//     const height = Math.max(rect.height, 1);
//     canvas.width = width * dpr;
//     canvas.height = height * dpr;
//     canvas.style.width = width + "px";
//     canvas.style.height = height + "px";
//     const ctx = canvas.getContext("2d");
//     ctx.setTransform(1, 0, 0, 1, 0, 0);
//     ctx.scale(dpr, dpr);
//     return { ctx, width, height };
//   }

//   // Generic line-chart renderer used for both the points-progression and
//   // finish-position charts. `invertY` flips the axis so that position 1
//   // (best) renders at the top instead of the bottom.
//   function drawLineChart({ canvas, tooltip, data, color, valueKey, labelKey, invertY, formatValue }) {
//     if (!canvas) return;
//     const points = data.filter(d => d[valueKey] != null);
//     if (!points.length) return;

//     const { ctx, width, height } = setupCanvas(canvas);
//     const padding = { top: 16, right: 12, bottom: 22, left: 34 };
//     const plotW = Math.max(width - padding.left - padding.right, 1);
//     const plotH = Math.max(height - padding.top - padding.bottom, 1);

//     const values = points.map(d => d[valueKey]);
//     let minV = Math.min(...values);
//     let maxV = Math.max(...values);
//     if (invertY) minV = Math.min(1, minV);
//     if (minV === maxV) { minV -= 1; maxV += 1; }

//     const n = data.length;
//     const xFor = (i) => padding.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
//     const yFor = (v) => invertY
//       ? padding.top + ((v - minV) / (maxV - minV)) * plotH
//       : padding.top + plotH - ((v - minV) / (maxV - minV)) * plotH;

//     ctx.clearRect(0, 0, width, height);

//     // Gridlines
//     ctx.strokeStyle = "rgba(255,255,255,0.08)";
//     ctx.lineWidth = 1;
//     const gridLines = 4;
//     for (let i = 0; i <= gridLines; i++) {
//       const y = padding.top + (plotH / gridLines) * i;
//       ctx.beginPath();
//       ctx.moveTo(padding.left, y);
//       ctx.lineTo(width - padding.right, y);
//       ctx.stroke();
//     }

//     // Line
//     ctx.beginPath();
//     let started = false;
//     data.forEach((d, i) => {
//       if (d[valueKey] == null) return;
//       const x = xFor(i);
//       const y = yFor(d[valueKey]);
//       if (!started) { ctx.moveTo(x, y); started = true; }
//       else ctx.lineTo(x, y);
//     });
//     ctx.strokeStyle = color;
//     ctx.lineWidth = 2.5;
//     ctx.lineJoin = "round";
//     ctx.lineCap = "round";
//     ctx.stroke();

//     // Soft fill under the line (points chart only — inverted position
//     // chart reads better without it)
//     if (!invertY) {
//       const firstIdx = data.findIndex(d => d[valueKey] != null);
//       const lastIdx = data.length - 1 - [...data].reverse().findIndex(d => d[valueKey] != null);
//       const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
//       grad.addColorStop(0, color + "33");
//       grad.addColorStop(1, color + "00");
//       ctx.lineTo(xFor(lastIdx), padding.top + plotH);
//       ctx.lineTo(xFor(firstIdx), padding.top + plotH);
//       ctx.closePath();
//       ctx.fillStyle = grad;
//       ctx.fill();
//     }

//     // Point markers
//     data.forEach((d, i) => {
//       if (d[valueKey] == null) return;
//       const x = xFor(i);
//       const y = yFor(d[valueKey]);
//       ctx.beginPath();
//       ctx.arc(x, y, 3, 0, Math.PI * 2);
//       ctx.fillStyle = color;
//       ctx.fill();
//     });

//     // Y-axis labels
//     ctx.fillStyle = "#888";
//     ctx.font = "10px sans-serif";
//     ctx.textAlign = "right";
//     ctx.textBaseline = "middle";
//     for (let i = 0; i <= gridLines; i++) {
//       const v = invertY
//         ? minV + ((maxV - minV) / gridLines) * i
//         : maxV - ((maxV - minV) / gridLines) * i;
//       const y = padding.top + (plotH / gridLines) * i;
//       ctx.fillText(Math.round(v), padding.left - 6, y);
//     }

//     // Hover tooltip
//     if (tooltip) {
//       canvas.onmousemove = (e) => {
//         const rect = canvas.getBoundingClientRect();
//         const mx = e.clientX - rect.left;
//         let closest = 0, closestDist = Infinity;
//         data.forEach((d, i) => {
//           const dist = Math.abs(xFor(i) - mx);
//           if (dist < closestDist) { closestDist = dist; closest = i; }
//         });
//         const point = data[closest];
//         if (!point || point[valueKey] == null) { tooltip.style.display = "none"; return; }
//         const x = xFor(closest);
//         const y = yFor(point[valueKey]);
//         tooltip.style.display = "block";
//         tooltip.style.left = Math.min(x + 12, width - 100) + "px";
//         tooltip.style.top = Math.max(y - 44, 0) + "px";
//         tooltip.innerHTML = `
//           <div class="dp-tooltip-title">${point[labelKey] || `Round ${point.round}`}</div>
//           <div class="dp-tooltip-value"><b>${formatValue ? formatValue(point[valueKey]) : point[valueKey]}</b></div>
//         `;
//       };
//       canvas.onmouseleave = () => { tooltip.style.display = "none"; };
//     }
//   }

//   function drawCharts(d) {
//     const history = d.history || [];
//     if (!history.length || !_container) return;
//     const color = d.color || "#2ecc71";
//     const sorted = [...history].sort((a, b) => a.round - b.round);

//     drawLineChart({
//       canvas: _container.querySelector("#dp-points-canvas"),
//       tooltip: _container.querySelector("#dp-points-tooltip"),
//       data: sorted,
//       color,
//       valueKey: "cumulative_points",
//       labelKey: "event_name",
//       invertY: false,
//       formatValue: v => `${v} pts`,
//     });

//     drawLineChart({
//       canvas: _container.querySelector("#dp-position-canvas"),
//       tooltip: _container.querySelector("#dp-position-tooltip"),
//       data: sorted,
//       color,
//       valueKey: "position",
//       labelKey: "event_name",
//       invertY: true,
//       formatValue: v => `P${v}`,
//     });
//   }

//   // Expose globally — app.js calls window.loadDriverPanel(...)
//   window.loadDriverPanel = loadDriverPanel;
// })();

// Driver Panel — renders the response from GET /api/drivers/panel
// Plain script (no ES modules), matching app.js's style. Exposes
// window.loadDriverPanel(containerId, {year, round}).
//
// Layout: hero (currently selected driver) + horizontal "Top Drivers"
// carousel + "All Drivers" list below. Clicking any driver card updates
// the hero in place. Clicking the hero opens a full profile page with:
//   - biography
//   - season statistics (races, best/worst finish, DNFs, avg pts/race)
//   - recent form strip (last 5 races as colored result badges)
//   - points progression chart
//   - qualifying vs race position chart (dual-line)
//   - full race-by-race results table
//   - teammate head-to-head comparison
//
// Expected shape per driver (see backend/src/driver_panel.py):
// {
//   code: "VER", name: "Max Verstappen", team: "Red Bull Racing",
//   position: 1, points: 25.0, wins: 0, podiums: 0, poles: 0,
//   fastest_laps: 0, avg_finish: null, color: "#3671C6",
//   image: "static/images/drivers/verstappen.png",       // optional
//   banner: "static/images/banners/verstappen.png",      // optional
//   description: "..."                                    // optional
//   history: [                                             // optional
//     { round, event_name, position, points, cumulative_points, quali_position }, ...
//   ]
// }

(function () {
  let _drivers = [];
  let _container = null;
  let _selectedCode = null;
  let _viewMode = "list";
  let _resizeHandler = null;

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
      setupResizeHandler();
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

    // Teammate card in the H2H comparison — clicking it switches profile
    // to the teammate.
    const teammateSwitch = _container.querySelector("[data-teammate-code]");
    if (teammateSwitch) {
      teammateSwitch.addEventListener("click", () => {
        _selectedCode = teammateSwitch.dataset.teammateCode;
        render();
        _container.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    const carousel = _container.querySelector("#dp-carousel");
    const leftBtn = _container.querySelector("#dp-scroll-left");
    const rightBtn = _container.querySelector("#dp-scroll-right");
    if (carousel && leftBtn && rightBtn) {
      leftBtn.addEventListener("click", () => carousel.scrollBy({ left: -280, behavior: "smooth" }));
      rightBtn.addEventListener("click", () => carousel.scrollBy({ left: 280, behavior: "smooth" }));
    }

    if (_viewMode === "profile") {
      const selected = _drivers.find(d => d.code === _selectedCode) || _drivers[0];
      if (selected) drawCharts(selected);
    }
  }

  function setupResizeHandler() {
    if (_resizeHandler) window.removeEventListener("resize", _resizeHandler);
    let raf = null;
    _resizeHandler = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (_viewMode !== "profile" || !_container) return;
        const selected = _drivers.find(d => d.code === _selectedCode) || _drivers[0];
        if (selected) drawCharts(selected);
      });
    };
    window.addEventListener("resize", _resizeHandler);
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

  // Derives extra season stats (best/worst finish, DNFs, races entered,
  // average points per race) from the per-round `history` array.
  function computeExtraStats(d) {
    const history = d.history || [];
    const finishes = history.map(h => h.position).filter(p => p != null);
    const bestFinish = finishes.length ? Math.min(...finishes) : null;
    const worstFinish = finishes.length ? Math.max(...finishes) : null;
    const racesEntered = history.length;
    const dnfs = history.filter(h => h.position == null).length;
    const totalPoints = history.reduce((sum, h) => sum + (h.points || 0), 0);
    const avgPoints = racesEntered ? Math.round((totalPoints / racesEntered) * 10) / 10 : 0;
    return { bestFinish, worstFinish, racesEntered, dnfs, avgPoints };
  }

  // Classifies a single race result into a form tier for badges/table
  // row styling: win / podium / points / no-points / dnf.
  function formTierFor(h) {
    if (h.position == null) return { tier: "dnf", label: "DNF", color: "#e74c3c" };
    if (h.position === 1) return { tier: "win", label: `P${h.position}`, color: "#FFD700" };
    if (h.position <= 3) return { tier: "podium", label: `P${h.position}`, color: "#C0C0C0" };
    if ((h.points || 0) > 0) return { tier: "points", label: `P${h.position}`, color: "#2ecc71" };
    return { tier: "nopoints", label: `P${h.position}`, color: "#666" };
  }

  function recentFormHTML(d) {
    const history = [...(d.history || [])].sort((a, b) => a.round - b.round);
    if (!history.length) return "";
    const recent = history.slice(-5);
    return `
      <div class="dp-desc-box" style="margin-top:16px;">
        <div class="dp-desc-header">
          <div class="dp-desc-bar" style="background:${d.color || "#888"};"></div>
          <h2>Recent Form</h2>
        </div>
        <div class="dp-form-strip">
          ${recent.map(h => {
            const tier = formTierFor(h);
            return `
              <div class="dp-form-badge dp-form-badge-${tier.tier}"
                   style="--badge-color:${tier.color};"
                   title="${escapeAttr(h.event_name || `Round ${h.round}`)} — ${tier.label}${h.points ? `, ${h.points} pts` : ""}">
                ${tier.label}
              </div>
            `;
          }).join("")}
          <span class="dp-form-hint">most recent &rarr;</span>
        </div>
      </div>
    `;
  }

  function raceResultsTableHTML(d) {
    const history = [...(d.history || [])].sort((a, b) => b.round - a.round);
    if (!history.length) return "";
    const color = d.color || "#888";
    return `
      <div class="dp-desc-box" style="margin-top:16px;">
        <div class="dp-desc-header">
          <div class="dp-desc-bar" style="background:${color};"></div>
          <h2>Race Results</h2>
        </div>
        <div class="dp-table-wrap">
          <table class="dp-results-table">
            <thead>
              <tr>
                <th>Rnd</th>
                <th>Race</th>
                <th>Grid</th>
                <th>Finish</th>
                <th>Pts</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(h => {
                const tier = formTierFor(h);
                return `
                  <tr class="dp-results-row dp-results-row-${tier.tier}">
                    <td class="dp-results-round">${h.round}</td>
                    <td class="dp-results-race">${h.event_name || `Round ${h.round}`}</td>
                    <td class="dp-results-grid">${h.quali_position != null ? `P${h.quali_position}` : "-"}</td>
                    <td class="dp-results-finish" style="color:${tier.color};">${tier.label}</td>
                    <td class="dp-results-pts">${h.points ?? 0}</td>
                    <td class="dp-results-total" style="color:${color};">${h.cumulative_points ?? "-"}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function findTeammate(d) {
    if (!d.team) return null;
    return _drivers.find(x => x.code !== d.code && x.team === d.team) || null;
  }

  function teammateComparisonHTML(d) {
    const teammate = findTeammate(d);
    if (!teammate) return "";
    const color = d.color || "#888";
    const tColor = teammate.color || "#888";

    const rows = [
      { label: "STANDING", a: d.position ?? "-", b: teammate.position ?? "-", lowerIsBetter: true },
      { label: "PTS", a: d.points ?? 0, b: teammate.points ?? 0 },
      { label: "WINS", a: d.wins ?? 0, b: teammate.wins ?? 0 },
      { label: "PODIUMS", a: d.podiums ?? 0, b: teammate.podiums ?? 0 },
      { label: "POLES", a: d.poles ?? 0, b: teammate.poles ?? 0 },
      { label: "FASTEST LAPS", a: d.fastest_laps ?? 0, b: teammate.fastest_laps ?? 0 },
      { label: "AVG FINISH", a: d.avg_finish ?? "-", b: teammate.avg_finish ?? "-", lowerIsBetter: true },
    ];

    return `
      <div class="dp-desc-box" style="margin-top:16px;">
        <div class="dp-desc-header">
          <div class="dp-desc-bar" style="background:${color};"></div>
          <h2>Teammate Comparison</h2>
        </div>

        <div class="dp-h2h-header">
          <div class="dp-h2h-driver" style="color:${color};">${d.name}</div>
          <span class="dp-h2h-vs">VS</span>
          <div class="dp-h2h-driver dp-h2h-driver-clickable" style="color:${tColor};"
               data-teammate-code="${teammate.code}" title="View ${teammate.name}'s profile">
            ${teammate.name}
          </div>
        </div>

        ${rows.map(r => {
          const av = typeof r.a === "number" ? r.a : parseFloat(r.a) || 0;
          const bv = typeof r.b === "number" ? r.b : parseFloat(r.b) || 0;
          const max = Math.max(Math.abs(av), Math.abs(bv), 1);
          const aBetter = r.lowerIsBetter ? av < bv && r.a !== "-" : av > bv;
          const bBetter = r.lowerIsBetter ? bv < av && r.b !== "-" : bv > av;
          const aPct = Math.min((Math.abs(av) / max) * 100, 100);
          const bPct = Math.min((Math.abs(bv) / max) * 100, 100);
          return `
            <div class="dp-h2h-row">
              <span class="dp-h2h-value dp-h2h-value-left ${aBetter ? "dp-h2h-value-lead" : ""}" style="color:${aBetter ? color : "#aaa"};">${r.a}</span>
              <div class="dp-h2h-bartrack dp-h2h-bartrack-left">
                <div class="dp-h2h-bar" style="width:${aPct}%; background:${color};"></div>
              </div>
              <span class="dp-h2h-label">${r.label}</span>
              <div class="dp-h2h-bartrack dp-h2h-bartrack-right">
                <div class="dp-h2h-bar" style="width:${bPct}%; background:${tColor};"></div>
              </div>
              <span class="dp-h2h-value dp-h2h-value-right ${bBetter ? "dp-h2h-value-lead" : ""}" style="color:${bBetter ? tColor : "#aaa"};">${r.b}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function profilePageHTML(d) {
    const color = d.color || "#888";
    const bannerSrc = d.banner ? assetPath(d.banner) : null;
    const imgSrc = d.image ? assetPath(d.image) : null;
    const history = d.history || [];
    const extra = computeExtraStats(d);

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

        ${history.length ? `
          <div class="dp-desc-box" style="margin-top:16px;">
            <div class="dp-desc-header">
              <div class="dp-desc-bar" style="background:${color};"></div>
              <h2>Season Statistics</h2>
            </div>
            <div class="dp-stats-row" style="padding:12px 0 0; background:none; backdrop-filter:none;">
              ${statCardHTML("RACES", extra.racesEntered, color)}
              ${statCardHTML("BEST FINISH", extra.bestFinish != null ? `P${extra.bestFinish}` : "-", color)}
              ${statCardHTML("WORST FINISH", extra.worstFinish != null ? `P${extra.worstFinish}` : "-", color)}
              ${statCardHTML("DNFs", extra.dnfs, color)}
              ${statCardHTML("AVG PTS/RACE", extra.avgPoints, color)}
            </div>
          </div>

          ${recentFormHTML(d)}

          <div class="dp-charts-row">
            <div class="dp-chart-card">
              <div class="dp-chart-title">
                <span class="dp-chart-title-bar" style="background:${color};"></span>Points Progression
              </div>
              <div class="dp-chart-canvas-wrap">
                <canvas id="dp-points-canvas"></canvas>
                <div class="dp-chart-tooltip" id="dp-points-tooltip"></div>
              </div>
            </div>
            <div class="dp-chart-card">
              <div class="dp-chart-title">
                <span class="dp-chart-title-bar" style="background:${color};"></span>Qualifying vs Race Position
                <span class="dp-chart-legend">
                  <span class="dp-legend-item"><span class="dp-legend-dot" style="background:${color};"></span>Race</span>
                  <span class="dp-legend-item"><span class="dp-legend-dot dp-legend-dot-dashed" style="border-color:${color};"></span>Quali</span>
                </span>
              </div>
              <div class="dp-chart-canvas-wrap">
                <canvas id="dp-position-canvas"></canvas>
                <div class="dp-chart-tooltip" id="dp-position-tooltip"></div>
              </div>
            </div>
          </div>

          ${raceResultsTableHTML(d)}
          ${teammateComparisonHTML(d)}
        ` : `
          <div class="dp-desc-box" style="margin-top:16px;">
            <div class="dp-desc-header">
              <div class="dp-desc-bar" style="background:${color};"></div>
              <h2>Season Statistics</h2>
            </div>
            <p class="dp-empty">No round-by-round data available yet for this season.</p>
          </div>
          ${teammateComparisonHTML(d)}
        `}
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

  function drawGrid(ctx, padding, width, height, plotW, plotH, gridLines) {
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (plotH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
  }

  // Single-series line chart (used for Points Progression).
  function drawLineChart({ canvas, tooltip, data, color, valueKey, labelKey, invertY, formatValue }) {
    if (!canvas) return;
    const points = data.filter(d => d[valueKey] != null);
    if (!points.length) return;

    const { ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 16, right: 12, bottom: 22, left: 34 };
    const plotW = Math.max(width - padding.left - padding.right, 1);
    const plotH = Math.max(height - padding.top - padding.bottom, 1);

    const values = points.map(d => d[valueKey]);
    let minV = Math.min(...values);
    let maxV = Math.max(...values);
    if (invertY) minV = Math.min(1, minV);
    if (minV === maxV) { minV -= 1; maxV += 1; }

    const n = data.length;
    const xFor = (i) => padding.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const yFor = (v) => invertY
      ? padding.top + ((v - minV) / (maxV - minV)) * plotH
      : padding.top + plotH - ((v - minV) / (maxV - minV)) * plotH;

    ctx.clearRect(0, 0, width, height);
    const gridLines = 4;
    drawGrid(ctx, padding, width, height, plotW, plotH, gridLines);

    ctx.beginPath();
    let started = false;
    data.forEach((d, i) => {
      if (d[valueKey] == null) return;
      const x = xFor(i);
      const y = yFor(d[valueKey]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    if (!invertY) {
      const firstIdx = data.findIndex(d => d[valueKey] != null);
      const lastIdx = data.length - 1 - [...data].reverse().findIndex(d => d[valueKey] != null);
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
      grad.addColorStop(0, color + "33");
      grad.addColorStop(1, color + "00");
      ctx.lineTo(xFor(lastIdx), padding.top + plotH);
      ctx.lineTo(xFor(firstIdx), padding.top + plotH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    data.forEach((d, i) => {
      if (d[valueKey] == null) return;
      const x = xFor(i);
      const y = yFor(d[valueKey]);
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
      const v = invertY
        ? minV + ((maxV - minV) / gridLines) * i
        : maxV - ((maxV - minV) / gridLines) * i;
      const y = padding.top + (plotH / gridLines) * i;
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
        if (!point || point[valueKey] == null) { tooltip.style.display = "none"; return; }
        const x = xFor(closest);
        const y = yFor(point[valueKey]);
        tooltip.style.display = "block";
        tooltip.style.left = Math.min(x + 12, width - 100) + "px";
        tooltip.style.top = Math.max(y - 44, 0) + "px";
        tooltip.innerHTML = `
          <div class="dp-tooltip-title">${point[labelKey] || `Round ${point.round}`}</div>
          <div class="dp-tooltip-value"><b>${formatValue ? formatValue(point[valueKey]) : point[valueKey]}</b></div>
        `;
      };
      canvas.onmouseleave = () => { tooltip.style.display = "none"; };
    }
  }

  // Dual-series line chart — used for Qualifying vs Race Position.
  // Series A (race position) is solid; Series B (quali position) is
  // dashed. Y-axis is inverted (P1 at top) and shared across both series.
  function drawDualLineChart({ canvas, tooltip, data, color, seriesA, seriesB }) {
    if (!canvas) return;
    const relevant = data.filter(d => d[seriesA.key] != null || d[seriesB.key] != null);
    if (!relevant.length) return;

    const { ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 16, right: 12, bottom: 22, left: 34 };
    const plotW = Math.max(width - padding.left - padding.right, 1);
    const plotH = Math.max(height - padding.top - padding.bottom, 1);

    const allValues = data.flatMap(d => [d[seriesA.key], d[seriesB.key]]).filter(v => v != null);
    let minV = Math.min(1, ...allValues);
    let maxV = Math.max(...allValues);
    if (minV === maxV) { minV -= 1; maxV += 1; }

    const n = data.length;
    const xFor = (i) => padding.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const yFor = (v) => padding.top + ((v - minV) / (maxV - minV)) * plotH;

    ctx.clearRect(0, 0, width, height);
    const gridLines = 4;
    drawGrid(ctx, padding, width, height, plotW, plotH, gridLines);

    function strokeSeries(key, dashed) {
      ctx.beginPath();
      let started = false;
      data.forEach((d, i) => {
        if (d[key] == null) { started = false; return; }
        const x = xFor(i);
        const y = yFor(d[key]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.setLineDash(dashed ? [5, 4] : []);
      ctx.strokeStyle = color;
      ctx.globalAlpha = dashed ? 0.6 : 1;
      ctx.lineWidth = 2.25;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      data.forEach((d, i) => {
        if (d[key] == null) return;
        const x = xFor(i);
        const y = yFor(d[key]);
        ctx.beginPath();
        ctx.arc(x, y, dashed ? 2.25 : 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = dashed ? 0.6 : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }

    strokeSeries(seriesB.key, true);   // quali — dashed, underneath
    strokeSeries(seriesA.key, false);  // race — solid, on top

    ctx.fillStyle = "#888";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= gridLines; i++) {
      const v = minV + ((maxV - minV) / gridLines) * i;
      const y = padding.top + (plotH / gridLines) * i;
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
        if (!point || (point[seriesA.key] == null && point[seriesB.key] == null)) {
          tooltip.style.display = "none";
          return;
        }
        const anchorY = yFor(point[seriesA.key] ?? point[seriesB.key]);
        tooltip.style.display = "block";
        tooltip.style.left = Math.min(xFor(closest) + 12, width - 110) + "px";
        tooltip.style.top = Math.max(anchorY - 50, 0) + "px";
        tooltip.innerHTML = `
          <div class="dp-tooltip-title">${point.event_name || `Round ${point.round}`}</div>
          <div class="dp-tooltip-value">${seriesA.label}: <b>${point[seriesA.key] != null ? "P" + point[seriesA.key] : "-"}</b></div>
          <div class="dp-tooltip-value">${seriesB.label}: <b>${point[seriesB.key] != null ? "P" + point[seriesB.key] : "-"}</b></div>
        `;
      };
      canvas.onmouseleave = () => { tooltip.style.display = "none"; };
    }
  }

  function drawCharts(d) {
    const history = d.history || [];
    if (!history.length || !_container) return;
    const color = d.color || "#2ecc71";
    const sorted = [...history].sort((a, b) => a.round - b.round);

    drawLineChart({
      canvas: _container.querySelector("#dp-points-canvas"),
      tooltip: _container.querySelector("#dp-points-tooltip"),
      data: sorted,
      color,
      valueKey: "cumulative_points",
      labelKey: "event_name",
      invertY: false,
      formatValue: v => `${v} pts`,
    });

    drawDualLineChart({
      canvas: _container.querySelector("#dp-position-canvas"),
      tooltip: _container.querySelector("#dp-position-tooltip"),
      data: sorted,
      color,
      seriesA: { key: "position", label: "Race" },
      seriesB: { key: "quali_position", label: "Quali" },
    });
  }

  // Expose globally — app.js calls window.loadDriverPanel(...)
  window.loadDriverPanel = loadDriverPanel;
})();