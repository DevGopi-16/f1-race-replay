import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  getDriversPanel,
  type DriverPanelData,
} from "../api/drivers";
import { useNavigate } from "react-router-dom";

const DRIVER_IMAGES: Record<string, string> = {

  VER: "/images/drivers/verstappen.png",
  NOR: "/images/drivers/norris.png",
  LEC: "/images/drivers/leclerc.png",
  PIA: "/images/drivers/piastri.png",
  RUS: "/images/drivers/russell.png",
  HAM: "/images/drivers/hamilton.png",
  ANT: "/images/drivers/antonelli.png",
  ALO: "/images/drivers/alonso.png",
  GAS: "/images/drivers/gasly.png",
  STR: "/images/drivers/stroll.png",
  ALB: "/images/drivers/albon.png",
  OCO: "/images/drivers/ocon.png",
  SAI: "/images/drivers/sainz.png",
  TSU: "/images/drivers/tsunoda.png",
  LAW: "/images/drivers/lawson.png",
  HAD: "/images/drivers/hadjar.png",
  BOR: "/images/drivers/bortoleto.png",
  HUL: "/images/drivers/hulkenberg.png",
  BEA: "/images/drivers/bearman.png",
  COL: "/images/drivers/colapinto.png",
  LIN: "/images/drivers/lindblad.png",
  PER: "/images/drivers/perez.png",
  BOT: "/images/drivers/bottas.png",
};

const DRIVER_BANNERS: Record<string, string> = {

  VER: "/images/driver-banners/verstappen.png",
  NOR: "/images/driver-banners/norris.png",
  LEC: "/images/driver-banners/leclerc.png",
  PIA: "/images/driver-banners/piastri.png",
  RUS: "/images/driver-banners/russell.png",
  HAM: "/images/driver-banners/hamilton.png",
  ANT: "/images/driver-banners/antonelli.png",
  ALO: "/images/driver-banners/alonso.png",
  GAS: "/images/driver-banners/gasly.png",
  STR: "/images/driver-banners/stroll.png",
  ALB: "/images/driver-banners/albon.png",
  OCO: "/images/driver-banners/ocon.png",
  SAI: "/images/driver-banners/sainz.png",
  TSU: "/images/driver-banners/tsunoda.png",
  LAW: "/images/driver-banners/lawson.png",
  HAD: "/images/driver-banners/hadjar.png",
  BOR: "/images/driver-banners/bortoleto.png",
  HUL: "/images/driver-banners/hulkenberg.png",
  BEA: "/images/driver-banners/bearman.png",
  COL: "/images/driver-banners/colapinto.png",
  LIN: "/images/driver-banners/lindblad.png",
  PER: "/images/driver-banners/perez.png",
  BOT: "/images/driver-banners/bottas.png",
};

const TEAM_LOGOS: Record<string, string> = {
  mercedes: "/images/teams/mercedes.png",
  ferrari: "/images/teams/ferrari.png",
  mclaren: "/images/teams/mclaren.png",
  "red bull": "/images/teams/red-bull.png",
  "red bull racing": "/images/teams/red-bull.png",
  "racing bulls": "/images/teams/rb.png",
  rb: "/images/teams/rb.png",
  alpine: "/images/teams/alpine.png",
  haas: "/images/teams/haas.png",
  "aston martin": "/images/teams/aston-martin.png",
  audi: "/images/teams/audi.png",
  williams: "/images/teams/williams.png",
  cadillac: "/images/teams/cadillac.png",
};

// 2026 team accent colors — used to drive the --team-color CSS variable
// that drivers.css reads for the left-edge card/row accents.
const TEAM_COLORS: Record<string, string> = {
  mercedes: "#27F4D2",
  ferrari: "#E8002D",
  mclaren: "#FF8000",
  "red bull": "#3671C6",
  "red bull racing": "#3671C6",
  "racing bulls": "#6692FF",
  rb: "#6692FF",
  alpine: "#0090FF",
  haas: "#B6BABD",
  "aston martin": "#229971",
  audi: "#52E252",
  williams: "#64C4FF",
  cadillac: "#9B111E",
};

const DEFAULT_TEAM_COLOR = "#888888";

function getString(
  driver: DriverPanelData,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = driver[key];

    if (
      typeof value === "string" ||
      typeof value === "number"
    ) {
      return String(value);
    }
  }

  return fallback;
}

function getNumber(
  driver: DriverPanelData,
  keys: string[],
  fallback = 0,
): number {
  for (const key of keys) {
    const value = driver[key];

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function driverCode(driver: DriverPanelData): string {
  return getString(
    driver,
    ["code", "driver_code", "abbreviation", "short_name"],
    "DRV",
  ).toUpperCase();
}

function driverName(driver: DriverPanelData): string {
  return getString(
    driver,
    ["name", "full_name", "driver_name", "fullName"],
    "Unknown Driver",
  );
}

function driverTeam(driver: DriverPanelData): string {
  return getString(
    driver,
    ["team", "team_name", "constructor", "constructor_name"],
    "Formula 1",
  );
}


function getDriverCountry(driver: DriverPanelData): string {
  const code = driverCode(driver);

  const countries: Record<string, string> = {
    VER: "Netherlands",
    NOR: "United Kingdom",
    LEC: "Monaco",
    PIA: "Australia",
    RUS: "United Kingdom",
    HAM: "United Kingdom",
    ANT: "Italy",
    ALO: "Spain",
    GAS: "France",
    STR: "Canada",
    ALB: "Thailand",
    OCO: "France",
    SAI: "Spain",
    TSU: "Japan",
    LAW: "New Zealand",
    HAD: "France",
    BOR: "Brazil",
    HUL: "Germany",
    BEA: "United Kingdom",
    COL: "Argentina",
    LIN: "Sweden",
    PER: "Mexico",
    BOT: "Finland",
  };

  return countries[code] || "";
}

function getDriverFlag(driver: DriverPanelData): string {
  const code = driverCode(driver);

  const flags: Record<string, string> = {
    VER: "🇳🇱",
    NOR: "🇬🇧",
    LEC: "🇲🇨",
    PIA: "🇦🇺",
    RUS: "🇬🇧",
    HAM: "🇬🇧",
    ANT: "🇮🇹",
    ALO: "🇪🇸",
    GAS: "🇫🇷",
    STR: "🇨🇦",
    ALB: "🇹🇭",
    OCO: "🇫🇷",
    SAI: "🇪🇸",
    TSU: "🇯🇵",
    LAW: "🇳🇿",
    HAD: "🇫🇷",
    BOR: "🇧🇷",
    HUL: "🇩🇪",
    BEA: "🇬🇧",
    COL: "🇦🇷",
    LIN: "🇸🇪",
    PER: "🇲🇽",
    BOT: "🇫🇮",
  };

  return flags[code] || "🌐";
}

function driverImage(driver: DriverPanelData): string {
  return (
    DRIVER_IMAGES[driverCode(driver)] ??
    "/images/drivers/verstappen.png"
  );
}

function driverBanner(driver: DriverPanelData): string {
  return (
    DRIVER_BANNERS[driverCode(driver)] ??
    "/images/driver-banners/verstappen.png"
  );
}

function teamLogo(driver: DriverPanelData): string {
  const team = driverTeam(driver).toLowerCase();

  const match = Object.entries(TEAM_LOGOS).find(
    ([name]) => team.includes(name),
  );

  return (
    match?.[1] ??
    "/images/teams/mclaren.png"
  );
}

// Resolves this driver's team accent color for the --team-color CSS var.
function teamColor(driver: DriverPanelData): string {
  const team = driverTeam(driver).toLowerCase();

  const match = Object.entries(TEAM_COLORS).find(
    ([name]) => team.includes(name),
  );

  return match?.[1] ?? DEFAULT_TEAM_COLOR;
}

// Builds the inline style object that carries --team-color onto an
// element. Cast to CSSProperties since custom properties aren't part
// of the official React style typing.
function teamColorStyle(driver: DriverPanelData): CSSProperties {
  return { "--team-color": teamColor(driver) } as CSSProperties;
}

function firstName(driver: DriverPanelData): string {
  return driverName(driver).split(" ")[0];
}

function lastName(driver: DriverPanelData): string {
  return driverName(driver)
    .split(" ")
    .slice(1)
    .join(" ");
}

type SortKey = "position" | "points" | "name" | "team";

export default function DriversPage() {
  const navigate = useNavigate();

  const [drivers, setDrivers] = useState<DriverPanelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("position");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const year = 2026;

  useEffect(() => {
    let cancelled = false;

    async function loadDrivers() {
      try {
        setLoading(true);
        setError("");

        const data = await getDriversPanel(year);

        if (!cancelled) {
          setDrivers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(
          "[DriversPage] Failed to load drivers:",
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load drivers.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDrivers();

    return () => {
      cancelled = true;
    };
  }, []);

  const featured = drivers[0];

  const activeCode = selectedCode ?? (featured ? driverCode(featured) : null);

  const topDrivers = useMemo(
    () => drivers.slice(0, 5),
    [drivers],
  );

  const sortedDrivers = useMemo(() => {
    const list = [...drivers];

    switch (sortBy) {
      case "points":
        list.sort(
          (a, b) =>
            getNumber(b, ["points"]) - getNumber(a, ["points"]),
        );
        break;

      case "name":
        list.sort((a, b) =>
          driverName(a).localeCompare(driverName(b)),
        );
        break;

      case "team":
        list.sort((a, b) =>
          driverTeam(a).localeCompare(driverTeam(b)),
        );
        break;

      case "position":
      default:
        list.sort(
          (a, b) =>
            getNumber(a, ["position"], 999) -
            getNumber(b, ["position"], 999),
        );
        break;
    }

    return list;
  }, [drivers, sortBy]);

  return (
    <main className="drivers-page">
      <div className="drivers-container">

        {/*   HEADER */}

        <header className="drivers-header">
          <div className="drivers-header-title">
            <p className="drivers-header-eyebrow">
              F1 RACE REPLAY / 2026
            </p>

            <h1>Drivers</h1>
          </div>

          <div className="drivers-header-controls">
            <div className="drivers-search">
              <span className="drivers-search-icon">⌕</span>
              <input
                type="text"
                placeholder="Search driver"
              />
            </div>

            <button
              type="button"
              className="drivers-year"
            >
              {year}
            </button>
          </div>
        </header>

        {/* LOADING*/}

        {loading && (
          <section className="drivers-step1-loading">
            <span>LOADING DRIVERS</span>
          </section>
        )}

        {/* ERROR */}

        {!loading && error && (
          <section className="drivers-step1-error">
            <strong>Unable to load drivers</strong>
            <span>{error}</span>
          </section>
        )}

        {/* PAGE */}

        {!loading && !error && featured && (
          <>
            {/* FEATURED DRIVER */}

            <section className="featured-driver" style={teamColorStyle(featured)} onClick={() => navigate(`/drivers/${featured.code}`)}>
              <div
                className="featured-driver-bg"
                style={{
                  backgroundImage: `url("${driverBanner(featured)}")`,
                }}
              />
              <div className="featured-driver-content">

                <div className="featured-driver-copy">

                  <div className="featured-driver-position">
                    CURRENTLY
                    <strong>
                      P{getNumber(
                        featured,
                        ["position"],
                        1,
                      )}
                    </strong>
                  </div>

                  <div className="featured-driver-name">
                    <span>
                      {firstName(featured)}
                    </span>

                    <h2>
                      {lastName(featured).toUpperCase()}
                    </h2>
                  </div>

                  <div className="featured-driver-meta">

                    <div className="featured-driver-team">
                      <span className="featured-driver-team-icon">
                        <img
                          src={teamLogo(featured)}
                          alt={driverTeam(featured)}
                        />
                      </span>

                      <span>
                        {driverTeam(featured)}
                      </span>
                    </div>

                    <span className="featured-driver-meta-divider">|</span>

                    <div className="featured-driver-country">
                      <span className="featured-driver-flag">
                        {getDriverFlag(featured)}
                      </span>

                      <span>
                        {getDriverCountry(featured).toUpperCase()}
                      </span>
                    </div>

                  </div>

                  <div className="featured-driver-code">
                    {driverCode(featured)}
                  </div>
                </div>

                <div className="featured-driver-visual">

                  <div className="featured-driver-glow" />

                  <img
                    className="featured-driver-image"
                    src={driverImage(featured)}
                    alt={driverName(featured)}
                  />

                </div>
              </div>

              <div className="featured-driver-stats">

                <div className="featured-stat">
                  <span>PTS</span>
                  <strong>
                    {getNumber(featured, ["points"])}
                  </strong>
                </div>

                <div className="featured-stat">
                  <span>WINS</span>
                  <strong>
                    {getNumber(featured, ["wins"])}
                  </strong>
                </div>

                <div className="featured-stat">
                  <span>PODIUMS</span>
                  <strong>
                    {getNumber(featured, ["podiums"])}
                  </strong>
                </div>

                <div className="featured-stat">
                  <span>POLES</span>
                  <strong>
                    {getNumber(featured, ["poles"])}
                  </strong>
                </div>

                <div className="featured-stat">
                  <span>FASTEST LAPS</span>
                  <strong>
                    {getNumber(
                      featured,
                      ["fastest_laps"],
                    )}
                  </strong>
                </div>

              </div>
            </section>

            {/* TOP DRIVERS */}

            <section className="drivers-section">

              <div className="drivers-section-heading">
                <span>01 / FEATURED GRID</span>
                <h2>Top Drivers</h2>
              </div>

              <div className="top-drivers">

                {topDrivers.map((driver, index) => (
                  <button
                    type="button"
                    className={
                      driverCode(driver) === activeCode
                        ? "top-driver-card top-driver-card-selected"
                        : "top-driver-card"
                    }
                    key={`${driverCode(driver)}-${index}`}
                    style={teamColorStyle(driver)}
                    onClick={() => {
                      const code = driverCode(driver).toLowerCase();
                      setSelectedCode(driverCode(driver));
                      navigate(`/drivers/${code}`);
                    }}

                  >

                    <div className="top-driver-image-wrap">
                      <img
                        src={driverImage(driver)}
                        alt={driverName(driver)}
                      />
                    </div>

                    <div className="top-driver-info">

                      <span className="top-driver-position">
                        P
                        {getNumber(
                          driver,
                          ["position"],
                          index + 1,
                        )}
                      </span>

                      <strong>
                        {driverCode(driver)}
                      </strong>

                      <small>
                        {driverName(driver)}
                      </small>

                      <span className="top-driver-points">
                        {getNumber(driver, ["points"])}
                        <small>PTS</small>
                      </span>

                    </div>

                    <img
                      className="top-driver-team-logo"
                      src={teamLogo(driver)}
                      alt={driverTeam(driver)}
                    />

                    <span className="top-driver-arrow">
                      →
                    </span>

                  </button>
                ))}

              </div>
            </section>

            {/* ALL DRIVERS */}

            <section className="drivers-section">

              <div className="drivers-section-heading-row">
                <div className="drivers-section-heading">
                  <span>02 / COMPLETE GRID</span>
                  <h2>All Drivers</h2>
                </div>

                <div className="drivers-sort">
                  <label htmlFor="drivers-sort-select">
                    Sort by
                  </label>

                  <select
                    id="drivers-sort-select"
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(event.target.value as SortKey)
                    }
                  >
                    <option value="position">Position</option>
                    <option value="points">Points</option>
                    <option value="name">Name</option>
                    <option value="team">Team</option>
                  </select>
                </div>
              </div>

              <div className="drivers-table">

                {sortedDrivers.map((driver, index) => (
                  <button
                    type="button"
                    className={
                      driverCode(driver) === activeCode
                        ? "driver-row driver-row-selected"
                        : "driver-row"
                    }
                    key={`${driverCode(driver)}-${index}`}
                    style={teamColorStyle(driver)}
                    onClick={() => {
                      const code = driverCode(driver).toLowerCase();
                      setSelectedCode(driverCode(driver));
                      navigate(`/drivers/${code}`);
                    }}

                  >

                    <span className="driver-row-position">
                      P
                      {getNumber(
                        driver,
                        ["position"],
                        index + 1,
                      )}
                    </span>

                    <span className="driver-row-driver">

                      <span className="driver-row-image">
                        <img
                          src={driverImage(driver)}
                          alt={driverName(driver)}
                        />
                      </span>

                      <span className="driver-row-name-block">
                        <strong>
                          {driverName(driver)}
                        </strong>

                        <small>
                          {driverCode(driver)}
                        </small>
                      </span>

                    </span>

                    <span className="driver-row-team">

                      <span className="driver-team-logo">
                        <img
                          src={teamLogo(driver)}
                          alt=""
                        />
                      </span>

                      <span>
                        {driverTeam(driver)}
                      </span>

                    </span>

                    <strong className="driver-row-points">
                      {getNumber(driver, ["points"])}
                      <small>PTS</small>
                    </strong>

                    <span className="driver-row-arrow">
                      →
                    </span>

                  </button>
                ))}

              </div>
            </section>
          </>
        )}

        {!loading &&
          !error &&
          drivers.length === 0 && (
            <div className="drivers-empty">
              No drivers returned by the backend.
            </div>
          )}

      </div>
    </main>
  );
}