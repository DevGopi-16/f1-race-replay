import "../styles/driver-detail.css";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  getDriverFull,
  type DriverPanelData,
} from "../api/drivers";

const YEAR = 2026;

const API_ORIGIN = "http://127.0.0.1:8000";

const TEAM_COLORS: Record<string, string> = {
  Mercedes: "#27F4D2",
  "Red Bull Racing": "#3671C6",
  Ferrari: "#E8002D",
  McLaren: "#FF8000",
  "Aston Martin": "#229971",
  Alpine: "#FF87BC",
  Williams: "#64C4FF",
  "Racing Bulls": "#6692FF",
  "Kick Sauber": "#52E252",
  Haas: "#B6BABD",
  Audi: "#E50000",
  Cadillac: "#C0C0C0",
};

const TEAM_DISPLAY_NAMES: Record<string, string> = {
  Mercedes: "Mercedes-AMG PETRONAS F1 TEAM",
  "Red Bull Racing": "Oracle Red Bull Racing",
  Ferrari: "Scuderia Ferrari",
  McLaren: "McLaren Formula 1 Team",
  "Aston Martin": "Aston Martin Aramco Formula One Team",
  Alpine: "BWT Alpine F1 Team",
  Williams: "Williams Racing",
  "Racing Bulls": "Visa Cash App Racing Bulls F1 Team",
  "Kick Sauber": "Stake F1 Team Kick Sauber",
  Haas: "MoneyGram Haas F1 Team",
  Audi: "Audi Revolut F1 Team",
  Cadillac: "Cadillac Formula 1 Team",
};

/* =========================================================
   FLAGS
========================================================= */

const NATIONALITY_FLAGS: Record<string, string> = {
  British: "🇬🇧",
  Dutch: "🇳🇱",
  Monégasque: "🇲🇨",
  Monegasque: "🇲🇨",
  Spanish: "🇪🇸",
  Mexican: "🇲🇽",
  French: "🇫🇷",
  German: "🇩🇪",
  Finnish: "🇫🇮",
  Australian: "🇦🇺",
  Canadian: "🇨🇦",
  Japanese: "🇯🇵",
  Thai: "🇹🇭",
  Chinese: "🇨🇳",
  Danish: "🇩🇰",
  American: "🇺🇸",
  Italian: "🇮🇹",
  Brazilian: "🇧🇷",
  Argentine: "🇦🇷",
  Argentinian: "🇦🇷",
  "New Zealander": "🇳🇿",
  Belgian: "🇧🇪",
  Austrian: "🇦🇹",
  Swiss: "🇨🇭",
  Polish: "🇵🇱",
  Russian: "🇷🇺",
  "South African": "🇿🇦",
  Indonesian: "🇮🇩",
  Indian: "🇮🇳",
  Irish: "🇮🇪",
  Hungarian: "🇭🇺",
  Portuguese: "🇵🇹",
  Swedish: "🇸🇪",
  Norwegian: "🇳🇴",
};

function getNationalityFlag(
  nationality?: string | null,
): string {
  if (!nationality) return "";

  return (
    NATIONALITY_FLAGS[
      nationality.trim()
    ] || ""
  );
}

const RACE_COUNTRY_FLAGS: [
  string,
  string,
][] = [
  ["bahrain", "🇧🇭"],
  ["saudi", "🇸🇦"],
  ["australia", "🇦🇺"],
  ["japan", "🇯🇵"],
  ["china", "🇨🇳"],
  ["miami", "🇺🇸"],
  ["emilia romagna", "🇮🇹"],
  ["imola", "🇮🇹"],
  ["monaco", "🇲🇨"],
  ["canada", "🇨🇦"],
  ["spain", "🇪🇸"],
  ["spanish", "🇪🇸"],
  ["austria", "🇦🇹"],
  ["britain", "🇬🇧"],
  ["british", "🇬🇧"],
  ["silverstone", "🇬🇧"],
  ["belgium", "🇧🇪"],
  ["belgian", "🇧🇪"],
  ["hungary", "🇭🇺"],
  ["hungarian", "🇭🇺"],
  ["netherlands", "🇳🇱"],
  ["dutch", "🇳🇱"],
  ["zandvoort", "🇳🇱"],
  ["italy", "🇮🇹"],
  ["italian", "🇮🇹"],
  ["monza", "🇮🇹"],
  ["azerbaijan", "🇦🇿"],
  ["baku", "🇦🇿"],
  ["singapore", "🇸🇬"],
  ["united states", "🇺🇸"],
  ["austin", "🇺🇸"],
  ["vegas", "🇺🇸"],
  ["mexico", "🇲🇽"],
  ["brazil", "🇧🇷"],
  ["são paulo", "🇧🇷"],
  ["sao paulo", "🇧🇷"],
  ["interlagos", "🇧🇷"],
  ["qatar", "🇶🇦"],
  ["abu dhabi", "🇦🇪"],
  ["korea", "🇰🇷"],
  ["turkey", "🇹🇷"],
  ["russia", "🇷🇺"],
  ["portugal", "🇵🇹"],
  ["france", "🇫🇷"],
  ["french", "🇫🇷"],
];

function getRaceFlag(
  eventName?: string | null,
): string {
  if (!eventName) return "";

  const lower =
    eventName.toLowerCase();

  for (const [
    keyword,
    flag,
  ] of RACE_COUNTRY_FLAGS) {
    if (lower.includes(keyword)) {
      return flag;
    }
  }

  return "";
}

/* =========================================================
   HELPERS
========================================================= */

function assetUrl(path?: string | null): string {
  if (!path) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  return `${API_ORIGIN}/${path.replace(/^\/+/, "")}`;
}

function getString(
  data: DriverPanelData,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = data[key];

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
  data: DriverPanelData,
  keys: string[],
  fallback = 0,
): number {
  for (const key of keys) {
    const value = data[key];

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

function getArray<T = unknown>(
  data: DriverPanelData,
  key: string,
): T[] {
  const value = data[key];

  return Array.isArray(value)
    ? (value as T[])
    : [];
}

function getObject(
  data: DriverPanelData,
  key: string,
): Record<string, unknown> | null {
  const value = data[key];

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return null;
}

function objectNumber(
  object: Record<string, unknown> | null,
  key: string,
  fallback = 0,
): number {
  if (!object) return fallback;

  const value = object[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function objectString(
  object: Record<string, unknown> | null,
  key: string,
  fallback = "",
): string {
  if (!object) return fallback;

  const value = object[key];

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  return fallback;
}

function formatNumber(
  value: unknown,
  decimals = 2,
  fallback = "-",
): string {
  if (typeof value === "number") {
    return value.toFixed(decimals);
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return parsed.toFixed(decimals);
    }
  }

  return fallback;
}

/* =========================================================
   COUNT-UP NUMBER ANIMATION
========================================================= */

function useCountUp(
  target: number,
  duration = 1200,
): number {
  const [value, setValue] =
    useState(0);

  useEffect(() => {
    let frame: number;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;

      const progress = Math.min(
        elapsed / duration,
        1,
      );

      const eased =
        1 -
        Math.pow(1 - progress, 3);

      setValue(
        Math.round(
          target * eased,
        ),
      );

      if (progress < 1) {
        frame =
          requestAnimationFrame(
            tick,
          );
      }
    }

    frame =
      requestAnimationFrame(tick);

    return () =>
      cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/* =========================================================
   TYPES
========================================================= */

type HistoryEntry = {
  round: number;
  event_name: string;
  position: number | null;
  points: number;
  cumulative_points: number;
  quali_position: number | null;
};

type NextRace = {
  name: string;
  date: string;
  display_date: string;
  country: string;
};

type CircuitRating = {
  circuit: string;
  score: number;
  races: number;
};

type SeasonJourneyEntry = {
  year: number;
  points: number;
  wins: number;
  avg_finish: number | null;
};

type TeammateDriver = {
  code?: string;
  name?: string;
  nationality?: string;
  position?: number | null;
  points?: number;
  wins?: number;
  podiums?: number;
  poles?: number;
  fastest_laps?: number;
  avg_finish?: number | null;
};

type PerformanceMetric = {
  label: string;
  value: unknown;
};

/* =========================================================
   ADVANCED ANALYTICS
========================================================= */

type ChartKey =
  | "points"
  | "position"
  | "perRace"
  | "qualiRace";

const CHART_TABS: {
  key: ChartKey;
  label: string;
}[] = [
  {
    key: "points",
    label: "POINTS",
  },
  {
    key: "position",
    label: "POSITION",
  },
  {
    key: "perRace",
    label: "PTS / RACE",
  },
  {
    key: "qualiRace",
    label: "QUALI VS RACE",
  },
];

function DriverAnalytics({
  history,
}: {
  history: HistoryEntry[];
}) {
  const [active, setActive] =
    useState<ChartKey>("points");

  const width = 760;
  const height = 240;
  const padding = 24;

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const xFor = (index: number) => {
    if (history.length <= 1) {
      return width / 2;
    }

    return (
      padding +
      (index * innerW) /
        (history.length - 1)
    );
  };

  function buildLine(
    values: (number | null)[],
    invert = false,
  ) {
    const numeric = values.filter(
      (value): value is number =>
        value != null &&
        Number.isFinite(value),
    );

    if (numeric.length === 0) {
      return {
        points: [],
        linePath: "",
      };
    }

    const max = Math.max(...numeric, 1);

    const min = invert ? 1 : 0;

    const range = Math.max(
      max - min,
      1,
    );

    const yFor = (value: number) =>
      invert
        ? padding +
          ((value - min) / range) *
            innerH
        : padding +
          innerH -
          (value / max) * innerH;

    const points = values.map(
      (value, index) =>
        value == null
          ? null
          : {
              x: xFor(index),
              y: yFor(value),
            },
    );

    const validPoints = points.filter(
      (
        point,
      ): point is {
        x: number;
        y: number;
      } => point != null,
    );

    const linePath = validPoints
      .map(
        (point, index) =>
          index === 0
            ? `M ${point.x} ${point.y}`
            : `L ${point.x} ${point.y}`,
      )
      .join(" ");

    return {
      points,
      linePath,
    };
  }

  function renderAreaLine(
    values: (number | null)[],
    invert = false,
  ) {
    const {
      points,
      linePath,
    } = buildLine(
      values,
      invert,
    );

    const valid = points.filter(
      (
        point,
      ): point is {
        x: number;
        y: number;
      } => point != null,
    );

    const areaPath =
      valid.length > 0
        ? `${linePath} L ${
            valid[valid.length - 1].x
          } ${height - padding} L ${
            valid[0].x
          } ${
            height - padding
          } Z`
        : "";

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="analytics-svg"
        preserveAspectRatio="none"
      >
        {areaPath && (
          <path
            d={areaPath}
            className="analytics-area"
          />
        )}

        {linePath && (
          <path
            d={linePath}
            className="analytics-line"
          />
        )}

        {valid.map(
          (point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={
                index ===
                valid.length - 1
                  ? 5
                  : 3
              }
              className="analytics-dot"
            />
          ),
        )}
      </svg>
    );
  }

  function renderBars(
    values: number[],
  ) {
    if (values.length === 0) {
      return null;
    }

    const max = Math.max(
      ...values,
      1,
    );

    const barW =
      (innerW / values.length) *
      0.6;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="analytics-svg"
        preserveAspectRatio="none"
      >
        {values.map(
          (value, index) => {
            const x =
              xFor(index) -
              barW / 2;

            const barH =
              (value / max) *
              innerH;

            const y =
              height -
              padding -
              barH;

            return (
              <rect
                key={index}
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                className="analytics-bar"
              />
            );
          },
        )}
      </svg>
    );
  }

  function renderQualiVsRace() {
    const quali =
      buildLine(
        history.map(
          (race) =>
            race.quali_position,
        ),
        true,
      );

    const race =
      buildLine(
        history.map(
          (race) =>
            race.position,
        ),
        true,
      );

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="analytics-svg"
        preserveAspectRatio="none"
      >
        {quali.linePath && (
          <path
            d={quali.linePath}
            className="analytics-line analytics-line-secondary"
          />
        )}

        {race.linePath && (
          <path
            d={race.linePath}
            className="analytics-line"
          />
        )}
      </svg>
    );
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <section className="driver-section">
      <div className="driver-section-heading">
        <span>
          11 / ADVANCED ANALYTICS
        </span>

        <h2>Deep Dive</h2>
      </div>

      <div className="analytics-card">
        <div className="analytics-chart">

          {active === "points" &&
            renderAreaLine(
              history.map(
                (race) =>
                  race.cumulative_points,
              ),
            )}

          {active === "position" &&
            renderAreaLine(
              history.map(
                (race) =>
                  race.position,
              ),
              true,
            )}

          {active === "perRace" &&
            renderBars(
              history.map(
                (race) =>
                  race.points,
              ),
            )}

          {active === "qualiRace" &&
            renderQualiVsRace()}

          <div className="analytics-labels">
            <span>
              R{history[0].round}
            </span>

            <span>
              R
              {
                history[
                  history.length - 1
                ].round
              }
            </span>
          </div>

          {active === "qualiRace" && (
            <div className="analytics-legend">
              <span className="analytics-legend-item">
                <i className="analytics-legend-dot" />
                Race
              </span>

              <span className="analytics-legend-item analytics-legend-item-secondary">
                <i className="analytics-legend-dot" />
                Qualifying
              </span>
            </div>
          )}
        </div>

        <div className="analytics-tabs">
          {CHART_TABS.map(
            (tab) => (
              <button
                key={tab.key}
                type="button"
                className={
                  active === tab.key
                    ? "analytics-tab analytics-tab-active"
                    : "analytics-tab"
                }
                onClick={() =>
                  setActive(
                    tab.key,
                  )
                }
              >
                {tab.label}
              </button>
            ),
          )}
        </div>
      </div>

      <p className="driver-section-footnote">
        Switch between metrics to see
        points growth, race position
        trend, points earned per round,
        and qualifying-to-race position
        movement across the season.
      </p>
    </section>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function DriverDetailPage() {
  const { code } =
    useParams<{ code: string }>();

  const navigate =
    useNavigate();

  const driverCode =
    code ?? "";

  const [driver, setDriver] =
    useState<DriverPanelData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =======================================================
     LOAD DRIVER
  ======================================================= */

  useEffect(() => {
    if (!driverCode) {
      setError(
        "Driver code is missing.",
      );
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getDriverFull(
            driverCode,
            YEAR,
          );

        if (!cancelled) {
          setDriver(data);
        }
      } catch (err) {
        console.error(
          "[DriverDetailPage] Failed to load driver:",
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load driver.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [driverCode]);

  /* scroll to top on driver change */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [driverCode]);


  /* =======================================================
     DATA
  ======================================================= */

  const history = useMemo(
    () =>
      driver
        ? getArray<HistoryEntry>(
            driver,
            "history",
          )
        : [],
    [driver],
  );

  const last9 = useMemo(
    () => history.slice(-9),
    [history],
  );

  const career = driver
    ? getObject(
        driver,
        "career",
      )
    : null;

  const performanceIndex =
    driver
      ? getObject(
          driver,
          "performance_index",
        )
      : null;

  const racecraft = driver
    ? getObject(
        driver,
        "racecraft",
      )
    : null;

  const circuitDna = driver
    ? getObject(
        driver,
        "circuit_dna",
      )
    : null;

  const teammateBattle =
    driver
      ? getObject(
          driver,
          "teammate_battle",
        )
      : null;

  const seasonJourney =
    useMemo(
      () =>
        driver
          ? getArray<SeasonJourneyEntry>(
              driver,
              "season_journey",
            )
          : [],
      [driver],
    );

  const nextRaces =
    useMemo(
      () =>
        driver
          ? getArray<NextRace>(
              driver,
              "next_races",
            )
          : [],
      [driver],
    );

  /* =======================================================
     COUNT-UP TARGETS (must run every render, before
     any early return, so hook order stays stable)
  ======================================================= */

  const heroPoints = driver
    ? getNumber(driver, ["points"])
    : 0;

  const heroWins = driver
    ? getNumber(driver, ["wins"])
    : 0;

  const heroPodiums = driver
    ? getNumber(
        driver,
        ["podiums"],
      )
    : 0;

  const heroPoles = driver
    ? getNumber(driver, ["poles"])
    : 0;

  const animatedPoints =
    useCountUp(heroPoints);

  const animatedWins =
    useCountUp(heroWins);

  const animatedPodiums =
    useCountUp(heroPodiums);

  const animatedPoles =
    useCountUp(heroPoles);

  /* =======================================================
     SCROLL-TRIGGERED REVEAL
     Sections fade/slide in as they enter the viewport,
     instead of all animating on page load.
  ======================================================= */

  useEffect(() => {
    if (!driver) return;

    const targets =
      document.querySelectorAll<HTMLElement>(
        ".driver-section, .driver-next-race",
      );

    if (targets.length === 0) return;

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "dd-in-view",
                );

                observer.unobserve(
                  entry.target,
                );
              }
            },
          );
        },
        {
          threshold: 0.12,
          rootMargin:
            "0px 0px -60px 0px",
        },
      );

    targets.forEach((target) =>
      observer.observe(target),
    );

    return () =>
      observer.disconnect();
  }, [driver]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="driver-detail-page">
        <div className="driver-detail-container">
          <section className="drivers-step1-loading">
            <span>
              LOADING DRIVER
            </span>
          </section>
        </div>
      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error || !driver) {
    return (
      <main className="driver-detail-page">
        <div className="driver-detail-container">
          <section className="drivers-step1-error">
            <strong>
              Unable to load driver
            </strong>

            <span>
              {error ||
                "Driver not found."}
            </span>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/drivers",
                )
              }
            >
              ← BACK TO DRIVERS
            </button>
          </section>
        </div>
      </main>
    );
  }

  /* =======================================================
     BASIC DRIVER DATA
  ======================================================= */

  const name = getString(
    driver,
    ["name"],
    "Unknown Driver",
  );

  const nameParts =
    name.trim().split(/\s+/);

  const firstName =
    nameParts[0] || "";

  const lastName =
    nameParts
      .slice(1)
      .join(" ") ||
    firstName;

  const team = getString(
    driver,
    ["team"],
    "Formula 1",
  );
  const teamDisplayName =
  TEAM_DISPLAY_NAMES[team] || team;
  
  const teamColor =
    TEAM_COLORS[team] ||
    "#4fa9c9";

  const number = getNumber(
    driver,
    ["number"],
  );

  const nationality =
    getString(
      driver,
      ["nationality"],
    );

  const codeValue =
    getString(
      driver,
      ["code"],
      driverCode.toUpperCase(),
    );

  const image = getString(
    driver,
    ["image"],
  );

  const banner = getString(
    driver,
    ["banner"],
  );

  const teamLogo =
    getString(
      driver,
      ["teamLogo"],
    );

  const carName =
    getString(
      driver,
      ["carName"],
      "",
    );

  const position = getNumber(
    driver,
    ["position"],
  );

  const points = heroPoints;

  const wins = heroWins;

  const podiums = heroPodiums;

  const poles = heroPoles;

  const fastestLaps =
    getNumber(
      driver,
      [
        "fastest_laps",
        "fastestLaps",
      ],
    );

  const avgFinish =
    driver["avg_finish"];

  const description =
    getString(
      driver,
      ["description"],
    );

  const born = getString(
    driver,
    ["born"],
  );

  const debut = getString(
    driver,
    ["debut"],
  );

  const age = getNumber(
    driver,
    ["age"],
  );

  /* =======================================================
     SOCIAL
  ======================================================= */

  const socialObject =
    getObject(
      driver,
      "social",
    );

  const instagramUrl =
    objectString(
      socialObject,
      "instagram",
    );

  const xUrl =
    objectString(
      socialObject,
      "x",
    );

  const youtubeUrl =
    objectString(
      socialObject,
      "youtube",
    );

  /* =======================================================
     PERFORMANCE INDEX
  ======================================================= */

  const performanceMetrics:
    PerformanceMetric[] = [
    {
      label: "Race Pace",
      value:
        performanceIndex
          ?.race_pace,
    },
    {
      label: "Qualifying",
      value:
        performanceIndex
          ?.qualifying,
    },
    {
      label: "Consistency",
      value:
        performanceIndex
          ?.consistency,
    },
    {
      label: "Racecraft",
      value:
        performanceIndex
          ?.racecraft,
    },
    {
      label: "Overtaking",
      value:
        performanceIndex
          ?.overtaking,
    },
    {
      label: "Tyre Mgmt",
      value:
        performanceIndex
          ?.tyre_mgmt,
    },
  ];

  /* =======================================================
     TEAMMATE BATTLE
  ======================================================= */

  const teammateDriver =
    teammateBattle?.driver &&
    typeof teammateBattle.driver ===
      "object"
      ? (teammateBattle.driver as TeammateDriver)
      : null;

  const teammate =
    teammateBattle?.teammate &&
    typeof teammateBattle.teammate ===
      "object"
      ? (teammateBattle.teammate as TeammateDriver)
      : null;

  const battleDriver:
    TeammateDriver = {
    code:
      teammateDriver?.code ||
      codeValue ||
      "-",

    name:
      teammateDriver?.name ||
      name,

    nationality:
      teammateDriver?.nationality ||
      nationality,

    position:
      teammateDriver?.position ??
      position,

    points:
      teammateDriver?.points ??
      points,

    wins:
      teammateDriver?.wins ??
      wins,

    podiums:
      teammateDriver?.podiums ??
      podiums,

    poles:
      teammateDriver?.poles ??
      poles,

    fastest_laps:
      teammateDriver?.fastest_laps ??
      fastestLaps,

    avg_finish:
      teammateDriver?.avg_finish ??
      (typeof avgFinish ===
      "number"
        ? avgFinish
        : null),
  };

  const battleTeammate:
    TeammateDriver = {
    code:
      teammate?.code ||
      "-",

    name:
      teammate?.name ||
      teammate?.code ||
      "Teammate",

    nationality:
      teammate?.nationality ||
      "",

    position:
      teammate?.position ??
      null,

    points:
      teammate?.points ??
      0,

    wins:
      teammate?.wins ??
      0,

    podiums:
      teammate?.podiums ??
      0,

    poles:
      teammate?.poles ??
      0,

    fastest_laps:
      teammate?.fastest_laps ??
      0,

    avg_finish:
      teammate?.avg_finish ??
      null,
  };

  /* =======================================================
     CIRCUIT DNA
  ======================================================= */

  const circuitRatings =
    circuitDna?.ratings &&
    Array.isArray(
      circuitDna.ratings,
    )
      ? (circuitDna.ratings as CircuitRating[])
      : [];

  /* =======================================================
     TEAMMATE COMPARISON
  ======================================================= */

  const teammateMetrics = [
    {
      label: "STANDING",
      left:
        battleDriver.position !=
        null
          ? battleDriver.position
          : "-",
      right:
        battleTeammate.position !=
        null
          ? battleTeammate.position
          : "-",
      lowerIsBetter: true,
    },

    {
      label: "PTS",
      left:
        battleDriver.points ?? 0,
      right:
        battleTeammate.points ?? 0,
      lowerIsBetter: false,
    },

    {
      label: "WINS",
      left:
        battleDriver.wins ?? 0,
      right:
        battleTeammate.wins ?? 0,
      lowerIsBetter: false,
    },

    {
      label: "PODIUMS",
      left:
        battleDriver.podiums ?? 0,
      right:
        battleTeammate.podiums ?? 0,
      lowerIsBetter: false,
    },

    {
      label: "POLES",
      left:
        battleDriver.poles ?? 0,
      right:
        battleTeammate.poles ?? 0,
      lowerIsBetter: false,
    },

    {
      label: "FASTEST LAPS",
      left:
        battleDriver.fastest_laps ??
        0,
      right:
        battleTeammate.fastest_laps ??
        0,
      lowerIsBetter: false,
    },

    {
      label: "AVG FINISH",
      left:
        battleDriver.avg_finish !=
        null
          ? battleDriver.avg_finish
          : "-",
      right:
        battleTeammate.avg_finish !=
        null
          ? battleTeammate.avg_finish
          : "-",
      lowerIsBetter: true,
    },
  ];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="driver-detail-page">
      <div
        className="driver-detail-container"
        style={
          {
            "--team-color":
              teamColor,
          } as CSSProperties
        }
      >

        {/* =================================================
            DRIVER HERO
        ================================================= */}

        <section className="driver-hero">

          {banner && (
            <img
              src={assetUrl(banner)}
              alt=""
              className="driver-hero-banner-img"
              onError={(event) => {
                console.error(
                  "[DriverDetailPage] Banner failed:",
                  banner,
                );

                event.currentTarget.style.display =
                  "none";
              }}
            />
          )}
          {banner && <div className="driver-hero-wipe-edge" />}

          <div className="driver-hero-scrim" />

          <button
            type="button"
            className="driver-hero-back"
            onClick={() =>
              navigate(
                "/drivers",
              )
            }
          >
            ← ALL DRIVERS
          </button>

          <div className="driver-hero-content">

            <div className="driver-hero-copy">

              <div className="driver-hero-name">
                <span>
                  {firstName}
                </span>

                <h1>
                  {lastName.toUpperCase()}
                </h1>
              </div>

              <div className="driver-hero-meta">

                {teamLogo && (
                  <img
                    src={assetUrl(
                      teamLogo,
                    )}
                    alt={team}
                    className="driver-hero-team-logo"
                  />
                )}

                <span>
                  {team.toUpperCase()}
                </span>

                {nationality && (
                  <>
                    <span className="driver-hero-meta-divider">
                      |
                    </span>

                    <span className="driver-hero-meta-flag-item">
                      <span className="flag-icon">
                        {getNationalityFlag(
                          nationality,
                        )}
                      </span>
                      {nationality.toUpperCase()}
                    </span>
                  </>
                )}

                {codeValue && (
                  <>
                    <span className="driver-hero-meta-divider">
                      |
                    </span>

                    <span>
                      {codeValue}
                    </span>
                  </>
                )}

              </div>

              <div className="driver-hero-championship">
                <span>
                  CHAMPIONSHIP
                </span>

                <strong>
                  P
                  {position ||
                    "-"}
                </strong>
              </div>

            </div>

            <div className="driver-hero-visual">

              {image && (
                <img
                  src={assetUrl(image)}
                  alt={name}
                  className="driver-hero-image"
                  onError={(event) => {
                    console.error(
                      "[DriverDetailPage] Driver image failed:",
                      image,
                    );

                    event.currentTarget.style.display =
                      "none";
                  }}
                />
              )}

            </div>

          </div>

          <div className="driver-hero-stats">

            <div className="driver-hero-stat">
              <span>PTS</span>
              <strong>
                {animatedPoints}
              </strong>
            </div>

            <div className="driver-hero-stat">
              <span>WINS</span>
              <strong>
                {animatedWins}
              </strong>
            </div>

            <div className="driver-hero-stat">
              <span>PODIUMS</span>
              <strong>
                {animatedPodiums}
              </strong>
            </div>

            <div className="driver-hero-stat">
              <span>POLES</span>
              <strong>
                {animatedPoles}
              </strong>
            </div>

            <div className="driver-hero-stat">
              <span>AVG FINISH</span>

              <strong>
                {avgFinish != null
                  ? String(
                      avgFinish,
                    )
                  : "-"}
              </strong>
            </div>

          </div>

        </section>

        {/* =================================================
            HORIZONTAL TICKER BANNER
        ================================================= */}

        <div className="driver-ticker">
          <div className="driver-ticker-track">
            {[0, 1].map((copy) => (
              <div
                className="driver-ticker-content"
                key={copy}
                aria-hidden={
                  copy === 1
                    ? true
                    : undefined
                }
              >
                <span className="driver-ticker-item">
                  <strong>
                    P{position || "-"}
                  </strong>
                  CHAMPIONSHIP
                </span>

                <span className="driver-ticker-dot" />

                <span className="driver-ticker-item">
                  <strong>
                    {points}
                  </strong>
                  POINTS
                </span>

                <span className="driver-ticker-dot" />

                <span className="driver-ticker-item">
                  <strong>
                    {wins}
                  </strong>
                  WINS
                </span>

                <span className="driver-ticker-dot" />

                <span className="driver-ticker-item">
                  {getNationalityFlag(
                    nationality,
                  )}{" "}
                  {team.toUpperCase()}
                </span>

                <span className="driver-ticker-dot" />

                {nextRaces.length >
                  0 && (
                  <span className="driver-ticker-item">
                    NEXT →
                    <strong>
                      {
                        nextRaces[0]
                          .name
                      }
                    </strong>
                    {
                      nextRaces[0]
                        .display_date
                    }
                  </span>
                )}

                <span className="driver-ticker-dot" />
              </div>
            ))}
          </div>
        </div>

        {/* =================================================
            01 — BIOGRAPHY
        ================================================= */}

        {description && (
          <section className="driver-section">

            <div className="driver-section-heading">
              <span>
                01 / BIOGRAPHY
              </span>

              <h2>
                About {firstName}
              </h2>
            </div>

            <div className="driver-bio-card">

              <p className="driver-bio-text">
                {description}
              </p>

              <div className="driver-bio-facts">

                {born && (
                  <div className="driver-bio-fact">
                    <span>
                      BORN
                    </span>

                    <strong>
                      {born}
                    </strong>
                  </div>
                )}

                {age > 0 && (
                  <div className="driver-bio-fact">
                    <span>
                      AGE
                    </span>

                    <strong>
                      {age}
                    </strong>
                  </div>
                )}

                {nationality && (
                  <div className="driver-bio-fact">
                    <span>
                      NATIONALITY
                    </span>

                    <strong>
                      <span className="flag-icon">
                        {getNationalityFlag(
                          nationality,
                        )}
                      </span>
                      {nationality}
                    </strong>
                  </div>
                )}

                {debut && (
                  <div className="driver-bio-fact">
                    <span>
                      F1 DEBUT
                    </span>

                    <strong>
                      {debut}
                    </strong>
                  </div>
                )}

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            02 — TEAM & CAR
        ================================================= */}

        <section className="driver-section">

          <div className="driver-section-heading">
            <span>
              02 / TEAM & CAR
            </span>

            <h2>
              Current Team
            </h2>
          </div>

          <div className="driver-team-card">

            {teamLogo && (
              <img
                src={assetUrl(
                  teamLogo,
                )}
                alt={teamDisplayName}
                className="driver-team-card-logo"
              />
            )}

            <div className="driver-team-card-info">
              <span className="driver-team-card-label">
                COMPETING FOR
              </span>

              <strong className="driver-team-card-name">
                {teamDisplayName}
              </strong>
            </div>

            <div className="driver-team-card-car">
              <span className="driver-team-card-car-label">
                CAR
              </span>

              <strong className="driver-team-card-car-name">
                {carName || "-"}
              </strong>
            </div>

            <div
              className="driver-team-card-swatch"
              style={{
                background:
                  teamColor,
              }}
            />

          </div>

          <p className="driver-section-footnote">
            Car specifications aren't
            currently tracked by this app —
            only team affiliation.
          </p>

        </section>

        {/* =================================================
            03 — SOCIAL
        ================================================= */}

        {(instagramUrl ||
          xUrl ||
          youtubeUrl) && (
          <section className="driver-section">

            <div className="driver-section-heading">
              <span>
                03 / FOLLOW
              </span>

              <h2>
                Social
              </h2>
            </div>

            <div className="driver-social-row">

              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="driver-social-link"
                >
                  Instagram
                </a>
              )}

              {xUrl && (
                <a
                  href={xUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="driver-social-link"
                >
                  X
                </a>
              )}

              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="driver-social-link"
                >
                  YouTube
                </a>
              )}

            </div>

          </section>
        )}

        {/* =================================================
            04 — PERFORMANCE INDEX
        ================================================= */}

        {performanceIndex && (
          <section className="driver-section">

            <div className="driver-section-heading">
              <span>
                04 / RATING
              </span>

              <h2>
                Performance Index
              </h2>
            </div>

            <div className="performance-index">

              <div className="performance-index-score">
                <strong>
                  {String(
                    performanceIndex.overall ??
                      "-",
                  )}
                </strong>

                <span>
                  / 100
                </span>
              </div>

              <div className="performance-index-bars">

                {performanceMetrics.map(
                  ({
                    label,
                    value,
                  }) => {
                    const numericValue =
                      value == null
                        ? 0
                        : Number(value);

                    const safeValue =
                      Number.isFinite(
                        numericValue,
                      )
                        ? Math.max(
                            0,
                            Math.min(
                              100,
                              numericValue,
                            ),
                          )
                        : 0;

                    return (
                      <div
                        className="performance-index-bar-row"
                        key={label}
                      >

                        <span>
                          {label}
                        </span>

                        <div className="performance-index-bar-track">

                          <div
                            className="performance-index-bar-fill"
                            style={{
                              width: `${safeValue}%`,
                            }}
                          />

                        </div>

                        <strong>
                          {value == null
                            ? "N/A"
                            : String(
                                value,
                              )}
                        </strong>

                      </div>
                    );
                  },
                )}

              </div>

            </div>

            <p className="driver-section-footnote">
              An estimated rating derived
              from this season's real
              results — not an official F1
              statistic.
            </p>

          </section>
        )}

        {/* =================================================
            05 — FORM
        ================================================= */}

        {last9.length > 0 && (
          <section className="driver-section">

            <div className="driver-section-heading">
              <span>
                05 / FORM
              </span>

              <h2>
                Last {last9.length} Races
              </h2>
            </div>

            <div className="driver-form-strip">
              <div className="driver-form-track">
                {[0, 1].map(
                  (copy) => (
                    <div
                      className="driver-form-track-set"
                      key={copy}
                      aria-hidden={
                        copy === 1
                          ? true
                          : undefined
                      }
                    >
                      {last9.map(
                        (
                          race,
                          index,
                        ) => (
                          <div
                            className="driver-form-item"
                            key={`${copy}-${race.round}-${index}`}
                          >

                            <span className="driver-form-round">
                              R
                              {
                                race.round
                              }
                            </span>

                            <strong
                              className={
                                race.position ===
                                1
                                  ? "driver-form-win"
                                  : ""
                              }
                            >
                              {race.position !=
                              null
                                ? `P${race.position}`
                                : "DNF"}
                            </strong>

                          </div>
                        ),
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>

          </section>
        )}

        {/* =================================================
            06 — QUALIFYING TO RACE
        ================================================= */}

        {history.length > 0 && (
          <section className="driver-section">

            <div className="driver-section-heading">
              <span>
                06 / QUALIFYING → RACE
              </span>

              <h2>
                Grid to Finish
              </h2>
            </div>

            <div className="quali-race-table">

              {history
                .slice(-6)
                .map(
                  (race) => {
                    const diff =
                      race.quali_position !=
                        null &&
                      race.position !=
                        null
                        ? race.quali_position -
                          race.position
                        : null;

                    const diffClass =
                      diff != null &&
                      diff > 0
                        ? "quali-race-gain"
                        : diff != null &&
                            diff < 0
                          ? "quali-race-loss"
                          : "";

                    return (
                      <div
                        className="quali-race-row"
                        key={race.round}
                      >

                        <span className="quali-race-event">
                          <span className="flag-icon">
                            {getRaceFlag(
                              race.event_name,
                            )}
                          </span>
                          {
                            race.event_name
                          }
                        </span>

                        <span>
                          Q
                          {race.quali_position ??
                            "-"}
                          {" → "}
                          P
                          {race.position ??
                            "DNF"}
                        </span>

                        <strong
                          className={
                            diffClass
                          }
                        >
                          {diff == null
                            ? "-"
                            : diff > 0
                              ? `+${diff}`
                              : diff}
                        </strong>

                      </div>
                    );
                  },
                )}

            </div>

          </section>
        )}

        {/* =================================================
            07 — TEAMMATE COMPARISON
        ================================================= */}

        {teammateBattle && (
          <section className="driver-section teammate-comparison-section">

            <div className="driver-section-heading">
              <span>
                07 / HEAD TO HEAD
              </span>

              <h2>
                Teammate Comparison
              </h2>
            </div>

            <div className="teammate-comparison">

              <div className="teammate-comparison-driver teammate-comparison-left">

                <div className="teammate-driver-name">
                  <span className="flag-icon">
                    {getNationalityFlag(
                      battleDriver.nationality,
                    )}
                  </span>
                  {battleDriver.name ||
                    battleDriver.code ||
                    name}
                </div>

                <div className="teammate-driver-code">
                  {battleDriver.code ||
                    "-"}
                </div>

              </div>

              <div className="teammate-comparison-vs">
                VS
              </div>

              <div className="teammate-comparison-driver teammate-comparison-right">

                <div className="teammate-driver-name">
                  <span className="flag-icon">
                    {getNationalityFlag(
                      battleTeammate.nationality,
                    )}
                  </span>
                  {battleTeammate.name ||
                    battleTeammate.code ||
                    "Teammate"}
                </div>

                <div className="teammate-driver-code">
                  {battleTeammate.code ||
                    "-"}
                </div>

              </div>

              <div className="teammate-comparison-metrics">

                {teammateMetrics.map(
                  (metric) => {
                    const leftNumber =
                      typeof metric.left ===
                      "number"
                        ? metric.left
                        : null;

                    const rightNumber =
                      typeof metric.right ===
                      "number"
                        ? metric.right
                        : null;

                    let leftRatio = 0;
                    let rightRatio = 0;

                    if (
                      leftNumber !=
                        null &&
                      rightNumber !=
                        null
                    ) {
                      const maxValue =
                        Math.max(
                          leftNumber,
                          rightNumber,
                          1,
                        );

                      if (
                        metric.lowerIsBetter
                      ) {
                        leftRatio =
                          ((maxValue -
                            leftNumber) /
                            maxValue) *
                          100;

                        rightRatio =
                          ((maxValue -
                            rightNumber) /
                            maxValue) *
                          100;
                      } else {
                        leftRatio =
                          (leftNumber /
                            maxValue) *
                          100;

                        rightRatio =
                          (rightNumber /
                            maxValue) *
                          100;
                      }

                      if (
                        leftNumber ===
                        rightNumber
                      ) {
                        leftRatio = 100;
                        rightRatio = 100;
                      }
                    }

                    return (
                      <div
                        className="teammate-comparison-row"
                        key={metric.label}
                      >

                        <div className="teammate-comparison-value teammate-comparison-value-left">

                          <strong>
                            {
                              metric.left
                            }
                          </strong>

                          <div className="teammate-comparison-bar teammate-comparison-bar-left">

                            <div
                              className="teammate-comparison-fill"
                              style={{
                                width: `${leftRatio}%`,
                              }}
                            />

                          </div>

                        </div>

                        <div className="teammate-comparison-label">
                          {
                            metric.label
                          }
                        </div>

                        <div className="teammate-comparison-value teammate-comparison-value-right">

                          <div className="teammate-comparison-bar teammate-comparison-bar-right">

                            <div
                              className="teammate-comparison-fill"
                              style={{
                                width: `${rightRatio}%`,
                              }}
                            />

                          </div>

                          <strong>
                            {
                              metric.right
                            }
                          </strong>

                        </div>

                      </div>
                    );
                  },
                )}

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            08 — RACECRAFT
        ================================================= */}

        {racecraft && (
          <section className="driver-section">

            <div className="driver-section-heading">
              <span>
                08 / RACECRAFT
              </span>

              <h2>
                On-Track Performance
              </h2>
            </div>

            <div className="racecraft-grid">

              <div className="racecraft-stat">
                <strong>
                  {objectNumber(
                    racecraft,
                    "overtakes",
                  )}
                </strong>

                <span>
                  OVERTAKES (EST.)
                </span>
              </div>

              <div className="racecraft-stat">
                <strong>
                  {objectNumber(
                    racecraft,
                    "positions_gained",
                  )}
                </strong>

                <span>
                  NET POSITIONS GAINED
                </span>
              </div>

              <div className="racecraft-stat">
                <strong>
                  {objectNumber(
                    racecraft,
                    "pit_stops",
                  )}
                </strong>

                <span>
                  PIT STOPS
                </span>
              </div>

              <div className="racecraft-stat">
                <strong>
                  {racecraft.avg_pit_stop !=
                  null
                    ? `${String(
                        racecraft.avg_pit_stop,
                      )}s`
                    : "-"}
                </strong>

                <span>
                  AVG PIT LANE TIME
                </span>
              </div>

            </div>

            <p className="driver-section-footnote">
              Overtake counts include
              position changes caused by
              pit-stop cycles, not only
              on-track passes. Pit lane time
              includes in-lap and out-lap,
              not just the stationary stop.
            </p>

          </section>
        )}

        {/* =================================================
            09 — CIRCUIT DNA
        ================================================= */}

        {circuitDna &&
          circuitRatings.length > 0 && (
            <section className="driver-section">

              <div className="driver-section-heading">
                <span>
                  09 / CIRCUIT DNA
                </span>

                <h2>
                  Where This Driver Is
                  Strongest
                </h2>
              </div>

              <div className="circuit-dna-list">

                {circuitRatings
                  .slice(0, 6)
                  .map(
                    (rating) => (
                      <div
                        className="circuit-dna-row"
                        key={
                          rating.circuit
                        }
                      >

                        <span>
                          {
                            rating.circuit
                          }
                        </span>

                        <div className="circuit-dna-bar-track">

                          <div
                            className="circuit-dna-bar-fill"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  rating.score,
                                ),
                              )}%`,
                            }}
                          />

                        </div>

                        <strong>
                          {
                            rating.score
                          }
                        </strong>

                      </div>
                    ),
                  )}

              </div>

            </section>
          )}

        {/* =================================================
            10 — SEASON JOURNEY
        ================================================= */}

        {seasonJourney.length > 0 && (
          <section className="driver-section">

            <div className="driver-section-heading">
              <span>
                10 / SEASON JOURNEY
              </span>

              <h2>
                Career Trajectory
              </h2>
            </div>

            <div className="season-journey">

              {seasonJourney.map(
                (season) => (
                  <div
                    className="season-journey-item"
                    key={
                      season.year
                    }
                  >

                    <span>
                      {
                        season.year
                      }
                    </span>

                    <strong>
                      {
                        season.points
                      }{" "}
                      PTS
                    </strong>

                    <span>
                      {
                        season.wins
                      }{" "}
                      WINS
                    </span>

                    <span>
                      {season.avg_finish !=
                      null
                        ? `AVG ${season.avg_finish}`
                        : "AVG -"}
                    </span>

                  </div>
                ),
              )}

            </div>

          </section>
        )}

        {/* =================================================
            11 — ADVANCED ANALYTICS
        ================================================= */}

        {history.length > 1 && (
          <DriverAnalytics
            history={history}
          />
        )}

        {/* =================================================
            12 — RACE TIMELINE
        ================================================= */}

        {history.length > 0 && (
          <section className="driver-section">

            <div className="driver-section-heading">
              <span>
                12 / RACE TIMELINE
              </span>

              <h2>
                This Season
              </h2>
            </div>

            <div className="race-timeline">

              {history.map(
                (race) => (
                  <div
                    className="race-timeline-row"
                    key={
                      race.round
                    }
                  >

                    <span>
                      R
                      {race.round}
                    </span>

                    <span className="race-timeline-event">
                      <span className="flag-icon">
                        {getRaceFlag(
                          race.event_name,
                        )}
                      </span>
                      {
                        race.event_name
                      }
                    </span>

                    <strong>
                      {race.position !=
                      null
                        ? `P${race.position}`
                        : "DNF"}
                    </strong>

                    <span>
                      {
                        race.points
                      }{" "}
                      PTS
                    </span>

                  </div>
                ),
              )}

            </div>

          </section>
        )}

        {/* =================================================
            13 — CAREER
        ================================================= */}

        {career && (
          <section className="driver-section">

            <div className="driver-section-heading">
              <span>
                13 / CAREER
              </span>

              <h2>
                All-Time
              </h2>
            </div>

            <div className="career-grid">

              <div className="career-stat">
                <span>
                  WINS
                </span>

                <strong>
                  {objectNumber(
                    career,
                    "wins",
                  )}
                </strong>
              </div>

              <div className="career-stat">
                <span>
                  PODIUMS
                </span>

                <strong>
                  {objectNumber(
                    career,
                    "podiums",
                  )}
                </strong>
              </div>

              <div className="career-stat">
                <span>
                  POLES
                </span>

                <strong>
                  {objectNumber(
                    career,
                    "poles",
                  )}
                </strong>
              </div>

              <div className="career-stat">
                <span>
                  STARTS
                </span>

                <strong>
                  {objectNumber(
                    career,
                    "starts",
                  )}
                </strong>
              </div>

              <div className="career-stat">
                <span>
                  FIRST WIN
                </span>

                <strong>
                  {objectString(
                    career,
                    "first_win_year",
                    "-",
                  )}
                </strong>
              </div>

              <div className="career-stat">
                <span>
                  FIRST POLE
                </span>

                <strong>
                  {objectString(
                    career,
                    "first_pole_year",
                    "-",
                  )}
                </strong>
              </div>

            </div>

          </section>
        )}

        {/* =================================================
            NEXT RACE
        ================================================= */}

        {nextRaces.length > 0 && (
          <section className="driver-next-race">

            <span>
              NEXT RACE
            </span>

            <h2>
              {
                nextRaces[0].name
              }
            </h2>

            <p>
              {
                nextRaces[0]
                  .display_date
              }
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/replay",
                )
              }
            >
              OPEN RACE REPLAY →
            </button>

          </section>
        )}

      </div>
    </main>
  );
}