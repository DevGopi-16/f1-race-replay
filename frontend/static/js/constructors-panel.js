/* ============================================================================
   F1 RACE REPLAY — CONSTRUCTORS PANEL
   PREMIUM CONSTRUCTOR ANALYTICS DASHBOARD
   Complete replacement for constructors-panel.js

   Existing API preserved:
   GET /api/constructors/panel?year=YYYY&round=...

   Existing integrations preserved:
   - window.loadConstructorsPanel()
   - window.openConstructorProfile()
   - window.openDriverProfile()
   - /static/images/teambanner/
   - /static/images/drivers/
   - Custom Canvas charts
============================================================================ */

(function () {
  "use strict";

  /* ==========================================================================
     STATE
  ========================================================================== */

  let _allTeams = [];
  let _panelMeta = {};
  let _container = null;
  let _selectedName = null;
  let _viewMode = "list";
  let _resizeHandler = null;
  let _currentYear = null;
  let _currentRound = null;
  let _currentSort = "points";

  let _counterToken = 0;
  let _progressionAnimToken = 0;
  let _barsAnimToken = 0;

  /* ==========================================================================
     ASSET PATHS
  ========================================================================== */

  const BANNER_BASE_PATH = "/static/images/teambanner/";

  const BANNER_FILENAMES = {
    Mercedes: "mercedes.png",
    Ferrari: "ferrari.png",
    McLaren: "mclaren.png",
    "Red Bull": "redbull.png",
    "RB F1 Team": "racingbulls.png",
    "Racing Bulls": "racingbulls.png",
    Alpine: "alpine.png",
    "Alpine F1 Team": "alpine.png",
    Haas: "haas.png",
    "Haas F1 Team": "haas.png",
    Audi: "audi.png",
    "Kick Sauber": "audi.png",
    Williams: "Williams.png",
    "Aston Martin": "AstonMartin.png",
    Cadillac: "cadillac.png",
    "Cadillac F1 Team": "cadillac.png"
  };

  const DRIVER_IMAGE_BASE = "/static/images/drivers/";

  /* ==========================================================================
     DATA HELPERS
  ========================================================================== */

  const num = (value) => Number(value || 0);

  const fmtNum = (value, fallback = "—") => {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    return value;
  };

  const fmtPct = (value, fallback = "—") => {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    return `${value}%`;
  };

  const fmtSecs = (value, fallback = "—") => {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    return `${value}s`;
  };

  const bannerUrl = (name) => {
    return BANNER_FILENAMES[name]
      ? `${BANNER_BASE_PATH}${BANNER_FILENAMES[name]}`
      : "";
  };

  const driverSlug = (name) => {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .pop()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
  };

  const driverImageUrl = (name) => {
    return `${DRIVER_IMAGE_BASE}${driverSlug(name)}.png`;
  };

  const escapeHtml = (str) => {
    return String(str ?? "").replace(
      /[&<>"']/g,
      (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
    );
  };

  const escapeAttr = escapeHtml;

  /* ==========================================================================
     TEAM SORTING
  ========================================================================== */

  function sortTeams(teams, by) {
    const copy = [...teams];

    if (by === "wins") {
      return copy.sort(
        (a, b) =>
          num(b.wins) - num(a.wins) ||
          num(b.points) - num(a.points)
      );
    }

    if (by === "name") {
      return copy.sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
    }

    return copy.sort(
      (a, b) => num(b.points) - num(a.points)
    );
  }

  /* ==========================================================================
     MAIN API LOADER
  ========================================================================== */

  async function loadConstructorsPanel(
    containerId,
    { year, round = null } = {}
  ) {
    _container = document.getElementById(containerId);

    if (!_container) {
      console.error(
        `[constructors-panel] container #${containerId} not found`
      );
      return;
    }

    _currentYear = year;
    _currentRound = round;

    _container.innerHTML = skeletonHTML();

    const params = new URLSearchParams({
      year
    });

    if (round) {
      params.set("round", round);
    }

    try {
      const res = await fetch(
        `/api/constructors/panel?${params}`
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();

      _allTeams = json.teams || [];

      _panelMeta = {
        total_points: json.total_points ?? 0,
        races_completed: json.races_completed ?? 0,
        total_rounds: json.total_rounds ?? 0,
        next_round: json.next_round || null
      };

      _selectedName =
        _allTeams[0]?.name || null;

      _viewMode = "list";

      render();
      setupResizeHandler();

    } catch (err) {
      console.error(
        "[constructors-panel] failed to load:",
        err
      );

      _container.innerHTML = `
        <div class="cp-error">
          <div class="cp-error-icon">!</div>

          <h3>
            Couldn't load constructor data
          </h3>

          <p>
            Please try again.
          </p>

          <button
            id="cp-retry-btn"
            class="cp-back-btn"
            type="button"
          >
            Retry
          </button>
        </div>
      `;

      _container
        .querySelector("#cp-retry-btn")
        ?.addEventListener(
          "click",
          () =>
            loadConstructorsPanel(
              containerId,
              {
                year,
                round
              }
            )
        );
    }
  }

  /* ==========================================================================
     RENDER ROUTER
  ========================================================================== */

  function render() {
    if (!_container) {
      return;
    }

    if (_viewMode === "profile") {
      const selected =
        _allTeams.find(
          (team) => team.name === _selectedName
        ) || _allTeams[0];

      _container.innerHTML =
        profilePageHTML(selected);

      wireUpEvents();

      return;
    }

    renderList();
  }

  /* ==========================================================================
     CONSTRUCTOR LIST PAGE
  ========================================================================== */

  function renderList() {
    const sorted = sortTeams(
      _allTeams,
      _currentSort
    );

    const leader =
      [..._allTeams].sort(
        (a, b) =>
          num(b.points) - num(a.points)
      )[0];

    const maxPoints = Math.max(
      num(leader?.points),
      1
    );

    const nextRound =
      _panelMeta.next_round;

    _container.innerHTML = `
      <section class="cp-list-hero">

        <div class="cp-list-hero-content">

          <div class="cp-eyebrow">
            ${escapeHtml(_currentYear)}
            SEASON
            <span></span>
            CONSTRUCTOR BATTLE
          </div>

          <h1>
            CONSTRUCTORS'
            <br>
            <strong>CHAMPIONSHIP</strong>
          </h1>

          <p>
            Track teams, drivers, momentum,
            points and the fight for constructor glory.
          </p>

        </div>

        <div class="cp-list-hero-side">

          <span>
            CHAMPIONSHIP LEADER
          </span>

          <strong>
            ${escapeHtml(
              leader?.name || "—"
            )}
          </strong>

          <b>
            ${num(leader?.points)}
            <small>PTS</small>
          </b>

          <em>
            ${num(leader?.wins)}
            WINS
          </em>

        </div>

      </section>

      <section class="cp-overview-strip">

        ${miniMetric(
          "TOTAL POINTS",
          _panelMeta.total_points,
          "ALL TEAMS"
        )}

        ${miniMetric(
          "RACES COMPLETED",
          _panelMeta.races_completed,
          `${_panelMeta.total_rounds} TOTAL ROUNDS`
        )}

        ${miniMetric(
          "TEAMS",
          _allTeams.length,
          "CONSTRUCTORS"
        )}

        ${miniMetric(
          "NEXT ROUND",
          nextRound?.name || "—",
          nextRound?.date_range || "—"
        )}

      </section>

      <section class="cp-section-card cp-standings-modern">

        <div class="cp-section-head">

          <div>
            <span class="cp-section-kicker">
              LIVE CHAMPIONSHIP
            </span>

            <h2>
              Constructor standings
            </h2>
          </div>

          <label class="cp-select-wrap">

            SORT

            <select id="cpSortSelect">

              <option
                value="points"
                ${_currentSort === "points" ? "selected" : ""}
              >
                Points
              </option>

              <option
                value="wins"
                ${_currentSort === "wins" ? "selected" : ""}
              >
                Wins
              </option>

              <option
                value="name"
                ${_currentSort === "name" ? "selected" : ""}
              >
                Name
              </option>

            </select>

          </label>

        </div>

        <div class="cp-standings-modern-list">

          ${
            sorted.length
              ? sorted
                  .map(
                    (team, index) =>
                      modernStandingRow(
                        team,
                        index + 1,
                        maxPoints
                      )
                  )
                  .join("")
              : `
                <p class="cp-empty">
                  No constructor data yet.
                </p>
              `
          }

        </div>

      </section>
    `;

    wireUpEvents();

    animateStatCounters(_container);
    animateBarWidths(_container);
  }

  /* ==========================================================================
     LIST METRICS
  ========================================================================== */

  function miniMetric(
    label,
    value,
    sub
  ) {
    return `
      <div class="cp-mini-metric">

        <span>
          ${escapeHtml(label)}
        </span>

        <strong>
          ${escapeHtml(value)}
        </strong>

        <small>
          ${escapeHtml(sub)}
        </small>

      </div>
    `;
  }

  /* ==========================================================================
     MODERN STANDING ROW
  ========================================================================== */

  function modernStandingRow(
    team,
    rank,
    maxPoints
  ) {
    const color =
      team.color || "#888";

    const percentage = Math.max(
      (num(team.points) / maxPoints) * 100,
      2
    );

    const driverNames =
      (team.drivers || [])
        .map((driver) => driver.name)
        .join(" · ");

    return `
      <button
        class="
          cp-standing-modern-row
          ${rank === 1 ? "is-leader" : ""}
        "
        data-team-name="${escapeAttr(team.name)}"
        style="--team-color:${color};"
        type="button"
      >

        <span class="cp-rank">
          ${String(rank).padStart(2, "0")}
        </span>

        ${
          team.teamLogo
            ? `
              <img
                src="${escapeAttr(team.teamLogo)}"
                alt="${escapeAttr(team.name)}"
                class="cp-team-logo-small"
                onerror="this.style.visibility='hidden'"
              >
            `
            : `
              <span
                class="
                  cp-team-logo-small
                  cp-logo-fallback
                "
              >
                ${escapeHtml(
                  (team.name || "?")[0]
                )}
              </span>
            `
        }

        <span class="cp-standing-info">

          <b>
            ${escapeHtml(team.name)}
          </b>

          <small>
            ${escapeHtml(driverNames)}
          </small>

        </span>

        <span class="cp-standing-progress">

          <i
            data-target-width="${percentage}"
          ></i>

        </span>

        <span class="cp-standing-points">

          <b>
            ${num(team.points)}
          </b>

          <small>
            PTS
          </small>

        </span>

        <span class="cp-standing-wins">

          ${num(team.wins)}

          <small>
            WINS
          </small>

        </span>

        <span class="cp-chevron">
          ›
        </span>

      </button>
    `;
  }

  /* ==========================================================================
     PREMIUM PROFILE PAGE
  ========================================================================== */

  function profilePageHTML(team) {

    if (!team) {
      return `
        <p class="cp-empty">
          Team not found.
        </p>
      `;
    }

    const color =
      team.color || "#e10600";

    const drivers =
      team.drivers || [];

    const stats =
      team.team_stats || {};

    const history =
      team.history || [];

    const others =
      _allTeams.filter(
        (item) => item.name !== team.name
      );

    const leaderboard =
      [..._allTeams].sort(
        (a, b) =>
          num(b.points) - num(a.points)
      );

    const leader =
      leaderboard[0];

    const leaderGap =
      Math.max(
        0,
        num(leader?.points) -
        num(team.points)
      );

    const ahead =
      [..._allTeams]
        .filter(
          (item) =>
            num(item.points) >
            num(team.points)
        )
        .sort(
          (a, b) =>
            num(a.points) -
            num(b.points)
        )[0];

    const behind =
      [..._allTeams]
        .filter(
          (item) =>
            num(item.points) <
            num(team.points)
        )
        .sort(
          (a, b) =>
            num(b.points) -
            num(a.points)
        )[0];

    const gapToBehind =
      behind
        ? num(team.points) -
          num(behind.points)
        : null;

    const last5 =
      history.slice(-5);

    const avgFinish =
      stats.avg_finish != null
        ? Number(stats.avg_finish)
        : averageFinish(
            history,
            drivers
          );

    const avgStart =
      stats.avg_start != null
        ? Number(stats.avg_start)
        : null;

    const best =
      stats.best_finish ||
      team.best_finish ||
      bestFinish(
        history,
        drivers
      );

    const podiumRate =
      _panelMeta.races_completed
        ? Math.round(
            num(team.podiums) /
            _panelMeta.races_completed *
            100
          )
        : 0;

    const winRate =
      _panelMeta.races_completed
        ? Math.round(
            num(team.wins) /
            _panelMeta.races_completed *
            100
          )
        : 0;

    return `
      <div class="cp-profile">

        <!-- BACK -->

        <button
          id="cp-profile-back"
          class="cp-back-btn"
          type="button"
        >
          <span>←</span>
          Back to Constructors
        </button>


        <!-- ==========================================================
             HERO
        =========================================================== -->

        <section
          class="cp-team-hero-premium"
          style="
            --team-color:${color};
            --team-banner:${
              bannerUrl(team.name)
                ? `url('${bannerUrl(team.name)}')`
                : "none"
            };
          "
        >

          <div class="cp-hero-overlay"></div>

          <div class="cp-hero-content">

            <div class="cp-hero-identity">

              ${
                team.teamLogo
                  ? `
                    <img
                      src="${escapeAttr(team.teamLogo)}"
                      alt="${escapeAttr(team.name)}"
                      class="cp-hero-logo"
                    >
                  `
                  : `
                    <div
                      class="
                        cp-hero-logo
                        cp-logo-fallback
                      "
                    >
                      ${escapeHtml(
                        (team.name || "?")[0]
                      )}
                    </div>
                  `
              }

              <div>

                <span class="cp-hero-season">
                  ${escapeHtml(
                    _currentYear
                  )}
                  CONSTRUCTOR
                </span>

                <h1>
                  ${escapeHtml(
                    team.name
                  ).toUpperCase()}
                </h1>

                <p>
                  ${drivers
                    .map(
                      (driver) =>
                        `${escapeHtml(
                          driver.name
                        )}
                        <b>#${escapeHtml(
                          driver.number ?? "-"
                        )}</b>`
                    )
                    .join(
                      ' <i>·</i> '
                    )}
                </p>

              </div>

            </div>


            <div class="cp-hero-champ">

              <span>
                CHAMPIONSHIP
              </span>

              <strong>
                P${team.position ?? "—"}
              </strong>

              <b>
                ${num(team.points)}
                <small>PTS</small>
              </b>

              <em>
                ${num(team.wins)}
                WINS
              </em>

            </div>

          </div>


          <div class="cp-hero-bottom">

            <span>
              CONSTRUCTOR PERFORMANCE PROFILE
            </span>

            <span>
              ${_panelMeta.races_completed}
              /
              ${_panelMeta.total_rounds}
              ROUNDS COMPLETE
            </span>

          </div>

        </section>


        <!-- ==========================================================
             KPI STRIP
        =========================================================== -->

        <section class="cp-kpi-grid">

          ${profileKpi(
            "POINTS",
            num(team.points),
            leaderGap
              ? `${leaderGap} behind ${escapeHtml(
                  leader.name
                )}`
              : "CHAMPIONSHIP LEADER",
            true
          )}

          ${profileKpi(
            "WINS",
            num(team.wins),
            `${winRate}% WIN RATE`
          )}

          ${profileKpi(
            "PODIUMS",
            num(team.podiums),
            `${podiumRate}% PODIUM RATE`
          )}

          ${profileKpi(
            "POLES",
            num(team.poles),
            "QUALIFYING WINS"
          )}

          ${profileKpi(
            "FASTEST LAPS",
            num(team.fastest_laps),
            "RACE PACE"
          )}

          ${profileKpi(
            "POINTS FINISHES",
            num(stats.points_finishes),
            "SCORING ROUNDS"
          )}

          ${profileKpi(
            "DNFS",
            num(
              stats.dnfs ??
              team.dnfs
            ),
            "RETIREMENTS",
            false,
            true
          )}

        </section>


        <!-- ==========================================================
             DRIVER + CHAMPIONSHIP CHART
        =========================================================== -->

        <section
          class="
            cp-dashboard-grid
            cp-overview-grid
          "
        >

          <div
            class="
              cp-section-card
              cp-drivers-panel
            "
          >

            <div class="cp-section-head">

              <div>

                <span class="cp-section-kicker">
                  DRIVER LINE-UP
                </span>

                <h2>
                  Driver performance
                </h2>

              </div>

              <span class="cp-live-pill">
                ${drivers.length}
                DRIVERS
              </span>

            </div>

            <div class="cp-driver-list">

              ${
                drivers.length
                  ? drivers
                      .map(
                        (driver) =>
                          driverCardHTML(
                            driver,
                            color
                          )
                      )
                      .join("")
                  : `
                    <div class="cp-empty-small">
                      No driver data available.
                    </div>
                  `
              }

            </div>

          </div>


          <div
            class="
              cp-section-card
              cp-chart-panel
            "
          >

            <div class="cp-section-head">

              <div>

                <span class="cp-section-kicker">
                  SEASON MOMENTUM
                </span>

                <h2>
                  Championship progression
                </h2>

              </div>

              <strong class="cp-chart-total">
                ${num(team.points)}
                PTS
              </strong>

            </div>

            <div
              class="
                cp-chart-canvas-wrap
                cp-chart-large
              "
            >

              <canvas
                id="cp-progression-canvas"
              ></canvas>

              <div
                class="cp-chart-tooltip"
                id="cp-progression-tooltip"
              ></div>

            </div>

            <div class="cp-chart-footer">

              <span>
                R1
              </span>

              <b>
                ${
                  _panelMeta.races_completed
                    ? `+${Math.max(
                        0,
                        num(team.points) -
                        num(
                          history[0]
                            ?.cumulative_points
                        )
                      )} PTS GAINED`
                    : "SEASON TO DATE"
                }
              </b>

              <span>
                R${_panelMeta.races_completed ||
                history.length ||
                0}
              </span>

            </div>

          </div>

        </section>


        <!-- ==========================================================
             PERFORMANCE PROFILE
        =========================================================== -->

        <section
          class="
            cp-section-card
            cp-performance-profile
          "
        >

          <div class="cp-section-head">

            <div>

              <span class="cp-section-kicker">
                CONSTRUCTOR ANALYTICS
              </span>

              <h2>
                Performance profile
              </h2>

            </div>

            <span class="cp-section-note">
              Relative strengths across the season
            </span>

          </div>

          <div class="cp-profile-metrics">

            ${metricBar(
              "Race results",
              best
                ? Math.max(
                    0,
                    100 -
                    (
                      Number(
                        avgFinish || 10
                      ) - 1
                    ) * 7
                  )
                : 0,
              color,
              best
                ? `Best P${best}`
                : "—"
            )}

            ${metricBar(
              "Qualifying",
              avgStart
                ? Math.max(
                    0,
                    100 -
                    (
                      avgStart - 1
                    ) * 7
                  )
                : 0,
              color,
              avgStart
                ? `Avg P${avgStart.toFixed(1)}`
                : "—"
            )}

            ${metricBar(
              "Reliability",
              team.reliability_rate != null
                ? num(
                    team.reliability_rate
                  )
                : Math.max(
                    0,
                    100 -
                    num(
                      stats.dnfs ??
                      team.dnfs
                    ) * 15
                  ),
              color,
              fmtPct(
                team.reliability_rate
              )
            )}

            ${metricBar(
              "Scoring consistency",
              _panelMeta.races_completed
                ? Math.min(
                    100,
                    Math.round(
                      num(
                        stats.points_finishes
                      ) /
                      _panelMeta.races_completed *
                      100
                    )
                  )
                : 0,
              color,
              `${num(
                stats.points_finishes
              )} scoring rounds`
            )}

          </div>

        </section>


        <!-- ==========================================================
             RACE BY RACE
        =========================================================== -->

        ${
          history.length
            ? raceByRaceHTML(
                history,
                drivers,
                color
              )
            : ""
        }


        <!-- ==========================================================
             POINTS + FORM
        =========================================================== -->

        <section
          class="
            cp-dashboard-grid
            cp-analysis-grid
          "
        >

          <div
            class="cp-section-card"
          >

            <div class="cp-section-head">

              <div>

                <span class="cp-section-kicker">
                  POINTS CURVE
                </span>

                <h2>
                  Points per round
                </h2>

              </div>

              <span class="cp-section-note">
                Team points
              </span>

            </div>

            <div
              class="
                cp-chart-canvas-wrap
                cp-chart-medium
              "
            >

              <canvas
                id="cp-bars-canvas"
              ></canvas>

            </div>

          </div>


          <div
            class="cp-section-card"
          >

            <div class="cp-section-head">

              <div>

                <span class="cp-section-kicker">
                  FORM GUIDE
                </span>

                <h2>
                  Last 5 rounds
                </h2>

              </div>

              <span class="cp-section-note">
                Latest momentum
              </span>

            </div>

            ${formGuideHTML(
              last5,
              drivers,
              color
            )}

          </div>

        </section>


        <!-- ==========================================================
             CHAMPIONSHIP BATTLE
        =========================================================== -->

        <section
          class="
            cp-dashboard-grid
            cp-analysis-grid
          "
        >

          <div
            class="cp-section-card"
          >

            <div class="cp-section-head">

              <div>

                <span class="cp-section-kicker">
                  CHAMPIONSHIP BATTLE
                </span>

                <h2>
                  ${escapeHtml(
                    team.name
                  )}
                  vs the field
                </h2>

              </div>

            </div>

            ${vsCompetitorsHTML(
              team,
              others
            )}

          </div>


          <div
            class="
              cp-section-card
              cp-gap-premium
            "
          >

            <div class="cp-section-head">

              <div>

                <span class="cp-section-kicker">
                  TITLE POSITION
                </span>

                <h2>
                  Championship battle
                </h2>

              </div>

            </div>

            ${championshipBattleHTML(
              team,
              leader,
              ahead,
              behind,
              leaderGap,
              gapToBehind,
              color
            )}

          </div>

        </section>


        <!-- ==========================================================
             TEAM STATS + RELIABILITY
        =========================================================== -->

        <section
          class="
            cp-dashboard-grid
            cp-bottom-grid
          "
        >

          <div
            class="cp-section-card"
          >

            <div class="cp-section-head">

              <div>

                <span class="cp-section-kicker">
                  TEAM STATISTICS
                </span>

                <h2>
                  Season numbers
                </h2>

              </div>

            </div>

            ${teamStatsHTML(
              team,
              stats,
              color,
              avgStart,
              avgFinish,
              best
            )}

          </div>


          <div
            class="cp-section-card"
          >

            <div class="cp-section-head">

              <div>

                <span class="cp-section-kicker">
                  RELIABILITY & PIT WALL
                </span>

                <h2>
                  Operational performance
                </h2>

              </div>

            </div>

            ${reliabilityHTML(
              team,
              stats,
              color
            )}

          </div>

        </section>


        <!-- ==========================================================
             ENGINEERING INSIGHTS
        =========================================================== -->

        <section
          class="
            cp-section-card
            cp-insights
          "
        >

          <div class="cp-section-head">

            <div>

              <span class="cp-section-kicker">
                RACE ENGINEERING
              </span>

              <h2>
                Engineering insights
              </h2>

            </div>

            <span class="cp-section-note">
              Automatically derived from available season data
            </span>

          </div>

          ${insightsHTML(
            team,
            history,
            drivers,
            stats,
            color
          )}

        </section>

      </div>
    `;
  }

  /* ==========================================================================
     KPI
  ========================================================================== */

  function profileKpi(
    label,
    value,
    sub,
    accent = false,
    danger = false
  ) {
    return `
      <div
        class="
          cp-profile-kpi
          ${accent ? "is-accent" : ""}
          ${danger ? "is-danger" : ""}
        "
      >

        <span>
          ${escapeHtml(label)}
        </span>

        <strong
          ${accent
            ? `data-count-target="${num(value)}"`
            : ""}
        >
          ${value}
        </strong>

        <small>
          ${escapeHtml(sub)}
        </small>

      </div>
    `;
  }

  /* ==========================================================================
     DRIVER CARD
  ========================================================================== */

  function driverCardHTML(
    driver,
    color
  ) {
    const initial =
      (driver.name || "?")
        .trim()
        .charAt(0)
        .toUpperCase();

    const driverMax =
      Math.max(
        1,
        ..._allTeams.flatMap(
          (team) =>
            (team.drivers || [])
              .map(
                (item) =>
                  num(item.points)
              )
        )
      );

    const driverPct =
      Math.min(
        100,
        Math.max(
          3,
          num(driver.points) /
          driverMax *
          100
        )
      );

    return `
      <button
        class="cp-driver-card"
        data-driver-code="${escapeAttr(
          driver.code || ""
        )}"
        style="--team-color:${color};"
        type="button"
      >

        <div class="cp-driver-avatar">

          <img
            src="${escapeAttr(
              driverImageUrl(
                driver.name
              )
            )}"
            alt="${escapeAttr(
              driver.name || ""
            )}"
            onerror="
              this.style.display='none';
              this.nextElementSibling.style.display='flex';
            "
          >

          <span
            style="
              display:none;
              background:${color}22;
              color:${color};
            "
          >
            ${initial}
          </span>

        </div>

        <div class="cp-driver-main">

          <div class="cp-driver-name-row">

            <b>
              ${escapeHtml(
                driver.name || "—"
              )}
            </b>

            <em>
              P${driver.position ?? "—"}
            </em>

          </div>

          <div class="cp-driver-meta">

            #${escapeHtml(
              driver.number ?? "-"
            )}

            <i>·</i>

            ${num(driver.points)}
            points

            <i>·</i>

            ${num(driver.podiums)}
            podiums

          </div>

          <div class="cp-driver-progress">

            <i
              style="width:${driverPct}%"
            ></i>

          </div>

        </div>

        <span class="cp-driver-arrow">
          ↗
        </span>

      </button>
    `;
  }

  /* ==========================================================================
     RACE TABLE
  ========================================================================== */

  function raceByRaceHTML(
    history,
    drivers,
    color
  ) {
    const [driverA, driverB] =
      drivers;

    const total =
      history.reduce(
        (sum, race) =>
          sum + num(race.points),
        0
      );

    return `
      <section
        class="
          cp-section-card
          cp-race-section
        "
      >

        <div class="cp-section-head">

          <div>

            <span class="cp-section-kicker">
              SEASON LOG
            </span>

            <h2>
              Race-by-race performance
            </h2>

          </div>

          <span class="cp-section-note">
            ${history.length}
            rounds
          </span>

        </div>

        <div class="cp-table-wrap">

          <table class="cp-race-table">

            <thead>

              <tr>

                <th>
                  ROUND
                </th>

                <th>
                  GRAND PRIX
                </th>

                <th>
                  ${escapeHtml(
                    driverA?.code ||
                    driverA?.name
                      ?.slice(
                        0,
                        3
                      )
                      .toUpperCase() ||
                    "D1"
                  )}
                </th>

                <th>
                  ${escapeHtml(
                    driverB?.code ||
                    driverB?.name
                      ?.slice(
                        0,
                        3
                      )
                      .toUpperCase() ||
                    "D2"
                  )}
                </th>

                <th>
                  TEAM PTS
                </th>

                <th>
                  FORM
                </th>

              </tr>

            </thead>

            <tbody>

              ${history
                .map(
                  (race, index) => {

                    const resultA =
                      driverA?.history?.find(
                        (item) =>
                          item.round ===
                          race.round
                      );

                    const resultB =
                      driverB?.history?.find(
                        (item) =>
                          item.round ===
                          race.round
                      );

                    return `
                      <tr>

                        <td>
                          ${escapeHtml(
                            race.round ??
                            index + 1
                          )}
                        </td>

                        <td>
                          <b>
                            ${escapeHtml(
                              race.country ||
                              race.name ||
                              "—"
                            )}
                          </b>
                        </td>

                        <td>
                          ${positionBadge(
                            resultA?.position
                          )}
                        </td>

                        <td>
                          ${positionBadge(
                            resultB?.position
                          )}
                        </td>

                        <td>
                          <strong
                            style="color:${color}"
                          >
                            ${num(
                              race.points
                            )}
                          </strong>
                        </td>

                        <td>

                          <span class="cp-row-form">

                            ${formDots(
                              race,
                              history,
                              index
                            )}

                          </span>

                        </td>

                      </tr>
                    `;
                  }
                )
                .join("")}

            </tbody>

            <tfoot>

              <tr>

                <td colspan="4">
                  SEASON TOTAL
                </td>

                <td
                  style="color:${color}"
                >
                  ${total}
                </td>

                <td></td>

              </tr>

            </tfoot>

          </table>

        </div>

      </section>
    `;
  }

  /* ==========================================================================
     POSITION BADGE
  ========================================================================== */

  function positionBadge(
    position
  ) {
    if (!position) {
      return `
        <span
          class="
            cp-pos-badge
            is-muted
          "
        >
          —
        </span>
      `;
    }

    const p = num(position);

    return `
      <span
        class="
          cp-pos-badge
          ${p <= 3 ? "is-podium" : ""}
          ${p > 10 ? "is-low" : ""}
        "
      >
        P${p}
      </span>
    `;
  }

  /* ==========================================================================
     FORM BAR
  ========================================================================== */

  function formDots(
    race,
    history
  ) {
    const points =
      num(race.points);

    const max =
      Math.max(
        ...history.map(
          (item) =>
            num(item.points)
        ),
        1
      );

    return `
      <span
        style="
          width:${Math.max(
            10,
            points / max * 100
          )}%;
        "
      ></span>
    `;
  }

  /* ==========================================================================
     COMPETITOR COMPARISON
  ========================================================================== */

  function vsCompetitorsHTML(
    team,
    others
  ) {
    const all =
      [team, ...others]
        .sort(
          (a, b) =>
            num(b.points) -
            num(a.points)
        );

    const max =
      Math.max(
        num(all[0]?.points),
        1
      );

    return `
      <div class="cp-vs-list">

        ${all
          .map((item) => {

            const width =
              Math.max(
                2,
                num(item.points) /
                max *
                100
              );

            const itemColor =
              item.color || "#888";

            return `
              <div
                class="
                  cp-vs-row
                  ${
                    item.name === team.name
                      ? "is-self"
                      : ""
                  }
                "
              >

                <span
                  class="cp-vs-name"
                  style="
                    --team-color:${itemColor}
                  "
                >
                  ${escapeHtml(
                    item.name
                  )}
                </span>

                <div class="cp-vs-track">

                  <i
                    style="
                      width:${width}%;
                      background:${itemColor};
                    "
                  ></i>

                </div>

                <b>
                  ${num(item.points)}
                </b>

              </div>
            `;
          })
          .join("")}

      </div>
    `;
  }

  /* ==========================================================================
     CHAMPIONSHIP BATTLE
  ========================================================================== */

  function championshipBattleHTML(
    team,
    leader,
    ahead,
    behind,
    leaderGap,
    gapToBehind,
    color
  ) {
    const isLeader =
      leader?.name === team.name;

    return `
      <div class="cp-battle-wrap">

        <div class="cp-battle-score">

          <span>
            ${
              isLeader
                ? "CHAMPIONSHIP LEADER"
                : "GAP TO LEADER"
            }
          </span>

          <strong>
            ${
              isLeader
                ? "P1"
                : `-${leaderGap}`
            }
          </strong>

          <small>
            ${
              isLeader
                ? "LEADING THE FIELD"
                : `POINTS BEHIND ${
                    escapeHtml(
                      leader?.name ||
                      "LEADER"
                    ).toUpperCase()
                  }`
            }
          </small>

        </div>


        <div class="cp-battle-route">

          <div>

            <b>
              ${
                escapeHtml(
                  ahead?.name ||
                  "LEADER"
                )
              }
            </b>

            <span>
              ${
                ahead
                  ? `+${num(
                      ahead.points
                    ) -
                    num(
                      team.points
                    )} pts`
                  : isLeader
                    ? "YOU ARE P1"
                    : "—"
              }
            </span>

          </div>

          <i></i>

          <div>

            <b>
              ${escapeHtml(
                team.name
              )}
            </b>

            <span
              style="color:${color}"
            >
              ${num(team.points)}
              pts
            </span>

          </div>

          ${
            behind
              ? `
                <i></i>

                <div>

                  <b>
                    ${escapeHtml(
                      behind.name
                    )}
                  </b>

                  <span>
                    -${gapToBehind}
                    pts
                  </span>

                </div>
              `
              : ""
          }

        </div>

      </div>
    `;
  }

  /* ==========================================================================
     TEAM STATISTICS
  ========================================================================== */

  function teamStatsHTML(
    team,
    stats,
    color,
    avgStart,
    avgFinish,
    best
  ) {
    const rows = [

      [
        "Wins",
        team.wins
      ],

      [
        "Podiums",
        team.podiums
      ],

      [
        "Poles",
        team.poles
      ],

      [
        "Fastest laps",
        team.fastest_laps
      ],

      [
        "Points finishes",
        stats.points_finishes
      ],

      [
        "DNFs",
        stats.dnfs ??
        team.dnfs
      ],

      [
        "Average start",
        avgStart != null
          ? avgStart.toFixed(1)
          : null
      ],

      [
        "Average finish",
        avgFinish != null
          ? avgFinish.toFixed(1)
          : null
      ],

      [
        "Best finish",
        best
          ? `P${best}`
          : null
      ]

    ];

    return `
      <div class="cp-stat-rows">

        ${rows
          .map(
            ([label, value]) => `
              <div>

                <span>
                  ${escapeHtml(
                    label
                  )}
                </span>

                <b
                  ${
                    label ===
                    "Best finish"
                      ? `style="color:${color}"`
                      : ""
                  }
                >
                  ${escapeHtml(
                    fmtNum(value)
                  )}
                </b>

              </div>
            `
          )
          .join("")}

      </div>
    `;
  }

  /* ==========================================================================
     RELIABILITY / PIT WALL
  ========================================================================== */

  function reliabilityHTML(
    team,
    stats,
    color
  ) {
    const reliability =
      num(
        team.reliability_rate
      );

    return `
      <div class="cp-ops-grid">

        <div class="cp-ops-main">

          <span>
            RELIABILITY
          </span>

          <strong>
            ${fmtPct(
              team.reliability_rate
            )}
          </strong>

          <div class="cp-progress">

            <i
              style="
                width:${Math.min(
                  100,
                  Math.max(
                    0,
                    reliability
                  )
                )}%;
                background:${color};
              "
            ></i>

          </div>

        </div>


        <div class="cp-op-item">

          <span>
            DNFs
          </span>

          <b>
            ${num(
              stats.dnfs ??
              team.dnfs
            )}
          </b>

        </div>


        <div class="cp-op-item">

          <span>
            MECHANICAL
          </span>

          <b>
            ${num(
              team.mechanical_failures ??
              stats.mechanical_failures
            )}
          </b>

        </div>


        <div class="cp-op-item">

          <span>
            RETIREMENTS
          </span>

          <b>
            ${num(
              team.retirements ??
              stats.retirements
            )}
          </b>

        </div>


        <div class="cp-op-item">

          <span>
            AVG PIT STOP
          </span>

          <b>
            ${fmtSecs(
              team.avg_pit_stop
            )}
          </b>

        </div>


        <div class="cp-op-item">

          <span>
            FASTEST STOP
          </span>

          <b
            style="color:${color}"
          >
            ${fmtSecs(
              team.fastest_pit_stop
            )}
          </b>

        </div>

      </div>
    `;
  }

  /* ==========================================================================
     FORM GUIDE
  ========================================================================== */

  function formGuideHTML(
    last5,
    drivers,
    color
  ) {
    const [driverA, driverB] =
      drivers;

    if (!last5.length) {
      return `
        <div class="cp-empty-small">
          No recent race data.
        </div>
      `;
    }

    return `
      <div class="cp-form-list">

        ${last5
          .map((race) => {

            const resultA =
              driverA?.history?.find(
                (item) =>
                  item.round ===
                  race.round
              );

            const resultB =
              driverB?.history?.find(
                (item) =>
                  item.round ===
                  race.round
              );

            return `
              <div class="cp-form-row">

                <span>
                  R${escapeHtml(
                    race.round
                  )}
                </span>

                <b>
                  ${escapeHtml(
                    race.country ||
                    "Race"
                  )}
                </b>

                <span>
                  ${positionBadge(
                    resultA?.position
                  )}
                </span>

                <span>
                  ${positionBadge(
                    resultB?.position
                  )}
                </span>

                <strong
                  style="color:${color}"
                >
                  ${num(
                    race.points
                  )}

                  <small>
                    PTS
                  </small>

                </strong>

              </div>
            `;
          })
          .join("")}

      </div>
    `;
  }

  /* ==========================================================================
     PERFORMANCE METRIC BAR
  ========================================================================== */

  function metricBar(
    label,
    value,
    color,
    meta
  ) {
    const width =
      Math.min(
        100,
        Math.max(
          0,
          Number(value) || 0
        )
      );

    return `
      <div class="cp-metric-bar">

        <div>

          <span>
            ${escapeHtml(
              label
            )}
          </span>

          <b>
            ${escapeHtml(
              meta
            )}
          </b>

        </div>

        <div class="cp-progress">

          <i
            data-target-width="${width}"
            style="
              width:${width}%;
              background:${color};
            "
          ></i>

        </div>

      </div>
    `;
  }

  /* ==========================================================================
     ENGINEERING INSIGHTS
  ========================================================================== */

  function insightsHTML(
    team,
    history,
    drivers,
    stats,
    color
  ) {
    const bestRound =
      history.reduce(
        (best, race) =>
          num(race.points) >
          num(best?.points)
            ? race
            : best,
        null
      );

    const worstRound =
      history.reduce(
        (worst, race) =>
          num(race.points) <
          num(worst?.points)
            ? race
            : worst,
        null
      );

    const topDriver =
      drivers.length > 1
        ? drivers.reduce(
            (current, driver) =>
              num(driver.points) >
              num(current.points)
                ? driver
                : current,
            drivers[0]
          )
        : drivers[0];

    const cards = [];

    if (bestRound) {
      cards.push([
        "STRONGEST ROUND",
        bestRound.country ||
          `Round ${bestRound.round}`,
        `${num(
          bestRound.points
        )} team points in R${bestRound.round}`,
        "positive"
      ]);
    }

    if (
      worstRound &&
      history.length > 1
    ) {
      cards.push([
        "LOWEST SCORING ROUND",
        worstRound.country ||
          `Round ${worstRound.round}`,
        `${num(
          worstRound.points
        )} team points in R${worstRound.round}`,
        "warning"
      ]);
    }

    if (topDriver) {
      cards.push([
        "TOP SCORER",
        topDriver.name,
        `${num(
          topDriver.points
        )} points · ${num(
          topDriver.podiums
        )} podiums`,
        "neutral"
      ]);
    }

    cards.push([
      "RELIABILITY",
      fmtPct(
        team.reliability_rate
      ),
      `${num(
        stats.dnfs ??
        team.dnfs
      )} DNFs across the season`,
      "positive"
    ]);

    return `
      <div class="cp-insight-grid">

        ${cards
          .map(
            (card) => `
              <article
                class="
                  cp-insight-card
                  ${card[3]}
                "
              >

                <span>
                  ${escapeHtml(
                    card[0]
                  )}
                </span>

                <strong>
                  ${escapeHtml(
                    card[1]
                  )}
                </strong>

                <p>
                  ${escapeHtml(
                    card[2]
                  )}
                </p>

              </article>
            `
          )
          .join("")}

      </div>
    `;
  }

  /* ==========================================================================
     DRIVER STATISTICS
  ========================================================================== */

  function averageFinish(
    history,
    drivers
  ) {
    const values = [];

    history.forEach((race) => {

      drivers.forEach((driver) => {

        const result =
          driver.history?.find(
            (item) =>
              item.round ===
              race.round
          );

        if (
          result?.position
        ) {
          values.push(
            num(
              result.position
            )
          );
        }

      });

    });

    if (!values.length) {
      return null;
    }

    return (
      values.reduce(
        (a, b) => a + b,
        0
      ) /
      values.length
    );
  }

  function bestFinish(
    history,
    drivers
  ) {
    const values = [];

    history.forEach((race) => {

      drivers.forEach((driver) => {

        const result =
          driver.history?.find(
            (item) =>
              item.round ===
              race.round
          );

        if (
          result?.position
        ) {
          values.push(
            num(
              result.position
            )
          );
        }

      });

    });

    return values.length
      ? Math.min(...values)
      : null;
  }

  /* ==========================================================================
     EVENT BINDINGS
  ========================================================================== */

  function wireUpEvents() {

    if (!_container) {
      return;
    }

    /* Constructor cards */

    _container
      .querySelectorAll(
        "[data-team-name]"
      )
      .forEach((element) => {

        element.addEventListener(
          "click",
          () => {

            _selectedName =
              element.dataset.teamName;

            _viewMode =
              "profile";

            renderWithTransition();

            window.scrollTo({
              top:
                _container.offsetTop -
                20,
              behavior:
                "smooth"
            });

          }
        );

      });


    /* Back button */

    _container
      .querySelector(
        "#cp-profile-back"
      )
      ?.addEventListener(
        "click",
        () => {

          _viewMode =
            "list";

          renderWithTransition();

        }
      );


    /* Driver cards */

    _container
      .querySelectorAll(
        "[data-driver-code]"
      )
      .forEach((element) => {

        element.addEventListener(
          "click",
          (event) => {

            event.stopPropagation();

            const code =
              element.dataset
                .driverCode;

            if (
              code &&
              typeof window.openDriverProfile ===
                "function"
            ) {
              window.openDriverProfile(
                code
              );
            }

          }
        );

      });


    /* Sort */

    _container
      .querySelector(
        "#cpSortSelect"
      )
      ?.addEventListener(
        "change",
        (event) => {

          _currentSort =
            event.target.value;

          render();

        }
      );


    /* Animations */

    animateStatCounters(
      _container
    );

    animateBarWidths(
      _container
    );


    /* Charts */

    if (
      _viewMode ===
      "profile"
    ) {

      const team =
        _allTeams.find(
          (item) =>
            item.name ===
            _selectedName
        ) ||
        _allTeams[0];

      if (team) {

        drawProgressionChart(
          team
        );

        drawPointsPerRoundBars(
          team
        );

      }

    }

  }

  /* ==========================================================================
     VIEW TRANSITION
  ========================================================================== */

  function renderWithTransition() {

    if (!_container) {
      return;
    }

    _container.classList.add(
      "cp-view-out"
    );

    setTimeout(() => {

      render();

      _container.classList.remove(
        "cp-view-out"
      );

      _container.classList.add(
        "cp-view-in"
      );

      setTimeout(() => {

        _container.classList.remove(
          "cp-view-in"
        );

      }, 450);

    }, 160);
  }

  /* ==========================================================================
     COUNTER ANIMATION
  ========================================================================== */

  function animateStatCounters(
    root
  ) {
    const token =
      ++_counterToken;

    root
      .querySelectorAll(
        "[data-count-target]"
      )
      .forEach((element) => {

        const target =
          parseFloat(
            element.dataset
              .countTarget
          );

        if (
          Number.isNaN(target)
        ) {
          return;
        }

        const start =
          performance.now();

        const duration =
          750;

        function tick(now) {

          if (
            token !==
            _counterToken
          ) {
            return;
          }

          const progress =
            Math.min(
              1,
              (
                now - start
              ) /
              duration
            );

          const eased =
            1 -
            Math.pow(
              1 - progress,
              3
            );

          element.textContent =
            Math.round(
              target *
              eased
            );

          if (
            progress <
            1
          ) {
            requestAnimationFrame(
              tick
            );
          } else {
            element.textContent =
              target;
          }

        }

        requestAnimationFrame(
          tick
        );

      });
  }

  /* ==========================================================================
     BAR ANIMATION
  ========================================================================== */

  function animateBarWidths(
    root
  ) {

    root
      .querySelectorAll(
        "[data-target-width]"
      )
      .forEach((element) => {

        const width =
          element.dataset
            .targetWidth;

        element.style.width =
          "0%";

        requestAnimationFrame(
          () => {

            requestAnimationFrame(
              () => {

                element.style.width =
                  `${width}%`;

              }
            );

          }
        );

      });
  }

  /* ==========================================================================
     RESIZE HANDLER
  ========================================================================== */

  function setupResizeHandler() {

    if (_resizeHandler) {
      window.removeEventListener(
        "resize",
        _resizeHandler
      );
    }

    let raf = null;

    _resizeHandler =
      () => {

        if (raf) {
          cancelAnimationFrame(
            raf
          );
        }

        raf =
          requestAnimationFrame(
            () => {

              if (
                _viewMode !==
                "profile"
              ) {
                return;
              }

              const team =
                _allTeams.find(
                  (item) =>
                    item.name ===
                    _selectedName
                ) ||
                _allTeams[0];

              if (team) {

                drawProgressionChart(
                  team
                );

                drawPointsPerRoundBars(
                  team
                );

              }

            }
          );

      };

    window.addEventListener(
      "resize",
      _resizeHandler
    );
  }

  /* ==========================================================================
     CANVAS SETUP
  ========================================================================== */

  function setupCanvas(
    canvas
  ) {

    const dpr =
      window.devicePixelRatio ||
      1;

    const rect =
      canvas.parentElement
        .getBoundingClientRect();

    const width =
      Math.max(
        rect.width,
        1
      );

    const height =
      Math.max(
        rect.height,
        1
      );

    canvas.width =
      width * dpr;

    canvas.height =
      height * dpr;

    canvas.style.width =
      `${width}px`;

    canvas.style.height =
      `${height}px`;

    const ctx =
      canvas.getContext(
        "2d"
      );

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    return {
      ctx,
      width,
      height
    };
  }

  /* ==========================================================================
     CHAMPIONSHIP PROGRESSION CHART
  ========================================================================== */

  function drawProgressionChart(
    team
  ) {

    const canvas =
      _container?.querySelector(
        "#cp-progression-canvas"
      );

    const tooltip =
      _container?.querySelector(
        "#cp-progression-tooltip"
      );

    if (!canvas) {
      return;
    }

    const data =
      (team.history || [])
        .filter(
          (item) =>
            item.cumulative_points !=
            null
        );

    if (!data.length) {
      return;
    }

    const color =
      team.color ||
      "#27f4c4";

    _progressionAnimToken++;

    const token =
      _progressionAnimToken;

    const start =
      performance.now();

    const duration =
      850;

    function frame(now) {

      if (
        token !==
        _progressionAnimToken ||
        !_container.contains(
          canvas
        )
      ) {
        return;
      }

      const progress =
        Math.min(
          1,
          (
            now - start
          ) /
          duration
        );

      const eased =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      const {
        ctx,
        width,
        height
      } =
        setupCanvas(
          canvas
        );

      const pad = {
        top: 18,
        right: 18,
        bottom: 30,
        left: 42
      };

      const plotW =
        width -
        pad.left -
        pad.right;

      const plotH =
        height -
        pad.top -
        pad.bottom;

      const maxValue =
        Math.max(
          ...data.map(
            (item) =>
              num(
                item.cumulative_points
              )
          ),
          1
        );

      const count =
        data.length;

      const x = (index) =>
        pad.left +
        (
          count === 1
            ? plotW / 2
            : index /
              (count - 1) *
              plotW
        );

      const y = (value) =>
        pad.top +
        plotH -
        (
          value /
          maxValue
        ) *
        plotH;

      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      /* Grid */

      ctx.font =
        "10px Inter, Arial, sans-serif";

      ctx.fillStyle =
        "rgba(255,255,255,.42)";

      ctx.textAlign =
        "right";

      for (
        let index = 0;
        index <= 3;
        index++
      ) {

        const value =
          maxValue *
          index /
          3;

        const yy =
          y(value);

        ctx.strokeStyle =
          "rgba(255,255,255,.07)";

        ctx.lineWidth = 1;

        ctx.beginPath();

        ctx.moveTo(
          pad.left,
          yy
        );

        ctx.lineTo(
          width -
            pad.right,
          yy
        );

        ctx.stroke();

        ctx.fillText(
          Math.round(value),
          pad.left - 8,
          yy + 3
        );
      }

      /* Clip animation */

      ctx.save();

      ctx.beginPath();

      ctx.rect(
        pad.left,
        0,
        plotW * eased,
        height
      );

      ctx.clip();

      /* Area */

      const gradient =
        ctx.createLinearGradient(
          0,
          pad.top,
          0,
          pad.top + plotH
        );

      gradient.addColorStop(
        0,
        `${color}44`
      );

      gradient.addColorStop(
        1,
        `${color}00`
      );

      ctx.beginPath();

      data.forEach(
        (item, index) => {

          if (index) {

            ctx.lineTo(
              x(index),
              y(
                num(
                  item.cumulative_points
                )
              )
            );

          } else {

            ctx.moveTo(
              x(index),
              y(
                num(
                  item.cumulative_points
                )
              )
            );

          }

        }
      );

      ctx.lineTo(
        x(count - 1),
        pad.top + plotH
      );

      ctx.lineTo(
        x(0),
        pad.top + plotH
      );

      ctx.closePath();

      ctx.fillStyle =
        gradient;

      ctx.fill();

      /* Main line */

      ctx.beginPath();

      data.forEach(
        (item, index) => {

          const point =
            num(
              item.cumulative_points
            );

          if (index) {

            ctx.lineTo(
              x(index),
              y(point)
            );

          } else {

            ctx.moveTo(
              x(index),
              y(point)
            );

          }

        }
      );

      ctx.strokeStyle =
        color;

      ctx.lineWidth =
        2.5;

      ctx.lineCap =
        "round";

      ctx.lineJoin =
        "round";

      ctx.stroke();

      /* Points */

      data.forEach(
        (item, index) => {

          ctx.beginPath();

          ctx.arc(
            x(index),
            y(
              num(
                item.cumulative_points
              )
            ),
            3.2,
            0,
            Math.PI * 2
          );

          ctx.fillStyle =
            color;

          ctx.fill();

        }
      );

      ctx.restore();

      /* X labels */

      ctx.fillStyle =
        "rgba(255,255,255,.4)";

      ctx.textAlign =
        "center";

      [
        0,
        Math.floor(
          (count - 1) / 2
        ),
        count - 1
      ].forEach(
        (index) => {

          if (data[index]) {

            ctx.fillText(
              `R${data[index].round}`,
              x(index),
              height - 8
            );

          }

        }
      );

      /* Tooltip */

      if (
        progress >= 1 &&
        tooltip
      ) {

        canvas.onmousemove =
          (event) => {

            const rect =
              canvas.getBoundingClientRect();

            const mouseX =
              event.clientX -
              rect.left;

            let closest =
              0;

            let distance =
              Infinity;

            data.forEach(
              (item, index) => {

                const difference =
                  Math.abs(
                    x(index) -
                    mouseX
                  );

                if (
                  difference <
                  distance
                ) {

                  distance =
                    difference;

                  closest =
                    index;

                }

              }
            );

            const point =
              data[closest];

            tooltip.style.display =
              "block";

            tooltip.style.left =
              `${Math.min(
                width - 120,
                Math.max(
                  8,
                  x(closest) + 12
                )
              )}px`;

            tooltip.style.top =
              `${Math.max(
                8,
                y(
                  num(
                    point.cumulative_points
                  )
                ) - 42
              )}px`;

            tooltip.innerHTML = `
              <b>
                Round ${escapeHtml(
                  point.round
                )}
              </b>

              <span>
                ${num(
                  point.cumulative_points
                )}
                pts
              </span>
            `;
          };

        canvas.onmouseleave =
          () => {
            tooltip.style.display =
              "none";
          };
      }

      if (
        progress < 1
      ) {

        requestAnimationFrame(
          frame
        );

      }

    }

    requestAnimationFrame(
      frame
    );
  }

  /* ==========================================================================
     POINTS PER ROUND BAR CHART
  ========================================================================== */

  function drawPointsPerRoundBars(
    team
  ) {

    const canvas =
      _container?.querySelector(
        "#cp-bars-canvas"
      );

    if (!canvas) {
      return;
    }

    const data =
      team.history || [];

    if (!data.length) {
      return;
    }

    const color =
      team.color ||
      "#27f4c4";

    _barsAnimToken++;

    const token =
      _barsAnimToken;

    const start =
      performance.now();

    const duration =
      700;

    function frame(now) {

      if (
        token !==
        _barsAnimToken ||
        !_container.contains(
          canvas
        )
      ) {
        return;
      }

      const progress =
        Math.min(
          1,
          (
            now - start
          ) /
          duration
        );

      const eased =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      const {
        ctx,
        width,
        height
      } =
        setupCanvas(
          canvas
        );

      const pad = {
        top: 18,
        right: 12,
        bottom: 30,
        left: 34
      };

      const plotW =
        width -
        pad.left -
        pad.right;

      const plotH =
        height -
        pad.top -
        pad.bottom;

      const maxValue =
        Math.max(
          ...data.map(
            (item) =>
              num(item.points)
          ),
          1
        );

      const gap =
        Math.max(
          3,
          Math.min(
            9,
            plotW /
              data.length *
              0.15
          )
        );

      const barWidth =
        Math.max(
          2,
          (
            plotW -
            gap *
            (
              data.length - 1
            )
          ) /
          data.length
        );

      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      /* Y axis */

      ctx.fillStyle =
        "rgba(255,255,255,.4)";

      ctx.font =
        "10px Inter,Arial,sans-serif";

      ctx.textAlign =
        "right";

      for (
        let index = 0;
        index <= 2;
        index++
      ) {

        const value =
          maxValue *
          index /
          2;

        const yy =
          pad.top +
          plotH -
          (
            index / 2
          ) *
          plotH;

        ctx.fillText(
          Math.round(value),
          pad.left - 7,
          yy + 3
        );

        ctx.strokeStyle =
          "rgba(255,255,255,.06)";

        ctx.beginPath();

        ctx.moveTo(
          pad.left,
          yy
        );

        ctx.lineTo(
          width -
            pad.right,
          yy
        );

        ctx.stroke();

      }

      /* Bars */

      data.forEach(
        (race, index) => {

          const barHeight =
            num(race.points) /
            maxValue *
            plotH *
            eased;

          const x =
            pad.left +
            index *
              (
                barWidth +
                gap
              );

          const y =
            pad.top +
            plotH -
            barHeight;

          ctx.fillStyle =
            color;

          ctx.globalAlpha =
            0.9;

          ctx.beginPath();

          if (
            typeof ctx.roundRect ===
            "function"
          ) {

            ctx.roundRect(
              x,
              y,
              barWidth,
              barHeight,
              Math.min(
                4,
                barWidth / 2
              )
            );

          } else {

            ctx.rect(
              x,
              y,
              barWidth,
              barHeight
            );

          }

          ctx.fill();

          ctx.globalAlpha =
            1;

          /* Last round label */

          if (
            index ===
            data.length - 1
          ) {

            ctx.fillStyle =
              "#fff";

            ctx.textAlign =
              "center";

            ctx.fillText(
              `R${race.round}`,
              x +
                barWidth / 2,
              height - 9
            );

          }

        }
      );

      if (
        progress < 1
      ) {

        requestAnimationFrame(
          frame
        );

      }

    }

    requestAnimationFrame(
      frame
    );
  }

  /* ==========================================================================
     SKELETON
  ========================================================================== */

  function skeletonHTML() {
    return `
      <div class="cp-skeleton-wrap">

        <div
          class="
            cp-skeleton
            cp-skeleton-hero
          "
        ></div>

        <div class="cp-skeleton-row">

          <div
            class="
              cp-skeleton
              cp-skeleton-card
            "
          ></div>

          <div
            class="
              cp-skeleton
              cp-skeleton-card
            "
          ></div>

          <div
            class="
              cp-skeleton
              cp-skeleton-card
            "
          ></div>

        </div>

        <div
          class="
            cp-skeleton
            cp-skeleton-table
          "
        ></div>

      </div>
    `;
  }

  /* ==========================================================================
     PUBLIC CONSTRUCTOR PROFILE API
  ========================================================================== */

  function openConstructorProfile(
    name
  ) {

    if (!_allTeams.length) {
      return false;
    }

    const match =
      _allTeams.find(
        (team) =>
          team.name === name
      );

    if (!match) {
      return false;
    }

    _selectedName =
      name;

    _viewMode =
      "profile";

    render();

    _container?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    return true;
  }

  /* ==========================================================================
     PUBLIC API
  ========================================================================== */

  window.loadConstructorsPanel =
    loadConstructorsPanel;

  window.openConstructorProfile =
    openConstructorProfile;

})();