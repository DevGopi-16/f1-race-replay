import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { useNavigate } from "react-router-dom";

import PageTransition from "../components/motion/PageTransition";
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";
import SectionLabel from "../components/ui/SectionLabel";

import "../styles/analytics.css";

const API_ORIGIN = "http://127.0.0.1:8000";
const YEAR = 2026;
const ROUND = 11;

const DRIVER_IMAGES: Record<string, string> = {
  ALB: "/images/drivers/albon.png",
  ANT: "/images/drivers/antonelli.png",
  ALO: "/images/drivers/alonso.png",
  BEA: "/images/drivers/bearman.png",
  BOT: "/images/drivers/bottas.png",
  COL: "/images/drivers/colapinto.png",
  GAS: "/images/drivers/gasly.png",
  HAD: "/images/drivers/hadjar.png",
  HAM: "/images/drivers/hamilton.png",
  LAW: "/images/drivers/lawson.png",
  LEC: "/images/drivers/leclerc.png",
  NOR: "/images/drivers/norris.png",
  OCO: "/images/drivers/ocon.png",
  PER: "/images/drivers/perez.png",
  PIA: "/images/drivers/piastri.png",
  RUS: "/images/drivers/russell.png",
  SAI: "/images/drivers/sainz.png",
  STR: "/images/drivers/stroll.png",
  TSU: "/images/drivers/tsunoda.png",
  VER: "/images/drivers/verstappen.png",
  BOR: "/images/drivers/bortoleto.png",
  HUL: "/images/drivers/hulkenberg.png",
  LIN: "/images/drivers/lindblad.png",
};

function getDriverImage(code: string) {
  const normalized = code.toUpperCase();

  return (
    DRIVER_IMAGES[normalized] ??
    `/images/drivers/${normalized.toLowerCase()}.png`
  );
}

const TEAM_LOGOS: Record<string, string> = {
  alpine: "/images/teams/alpine.png",
  astonmartin: "/images/teams/aston-martin.png",
  aston: "/images/teams/aston-martin.png",
  ferrari: "/images/teams/ferrari.png",
  haas: "/images/teams/haas.png",
  kicksauber: "/images/teams/audi.png",
  sauber: "/images/teams/audi.png",
  audi: "/images/teams/audi.png",
  mclaren: "/images/teams/mclaren.png",
  mercedes: "/images/teams/mercedes.png",
  redbull: "/images/teams/red-bull.png",
  redbullracing: "/images/teams/red-bull.png",
  redbullf1team: "/images/teams/red-bull.png",
  racingbulls: "/images/teams/rb.png",
  rb: "/images/teams/rb.png",
  rbf1team: "/images/teams/rb.png",
  williams: "/images/teams/williams.png",
  cadillac: "/images/teams/cadillac.png",
};

function normalizeTeamName(team: string) {
  return team
    .toLowerCase()
    .trim()
    .replace(/formula 1/g, "")
    .replace(/f1/g, "")
    .replace(/racing/g, "")
    .replace(/team/g, "")
    .replace(/motorsport/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getTeamLogo(team: string | null) {
  if (!team) return null;

  const normalized = normalizeTeamName(team);

  return TEAM_LOGOS[normalized] ?? null;
}

function getTeamColor(team: string | null) {
  if (!team) return "rgba(255, 255, 255, 0.45)";

  const normalized = team.toLowerCase().trim();

  if (normalized.includes("ferrari")) {
    return "#E80020";
  }

  if (normalized.includes("mercedes")) {
    return "#00A19C";
  }

  if (normalized.includes("mclaren")) {
    return "#FF8000";
  }

  if (
    normalized.includes("red bull") ||
    normalized.includes("redbull")
  ) {
    return "#3671C6";
  }

  if (normalized.includes("aston martin")) {
    return "#229971";
  }

  if (normalized.includes("alpine")) {
    return "#FF87BC";
  }

  if (normalized.includes("williams")) {
    return "#64C4FF";
  }

  if (
    normalized.includes("racing bulls") ||
    normalized === "rb" ||
    normalized.includes(" rb")
  ) {
    return "#6692FF";
  }

  if (
    normalized.includes("sauber") ||
    normalized.includes("kick sauber") ||
    normalized.includes("audi")
  ) {
    return "#52E252";
  }

  if (normalized.includes("haas")) {
    return "#B6BABD";
  }

  if (normalized.includes("cadillac")) {
    return "#D0D0D0";
  }

  return "rgba(255, 255, 255, 0.45)";
}

type Standing = {
  code: string;
  name: string;
  team: string | null;
  country: string | null;
  position: number | null;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
};

type Performance = {
  overall: number;
  race_pace: number;
  qualifying: number;
  consistency: number;
  racecraft: number;
  overtaking: number;
  tyre_mgmt: number | null;
};

type Racecraft = {
  overtakes: number;
  positions_gained: number;
  positions_lost: number;
  pit_stops: number;
};

type HistoryEntry = {
  round?: number;
  position?: number | null;
  points?: number;
  cumulative_points?: number;
  quali_position?: number | null;
};

type AnalyticsDriver = {
  code: string;
  name: string;
  team: string | null;
  country: string | null;
  championship: {
    position: number | null;
    points: number;
    wins: number;
    podiums: number;
    poles: number;
  };
  performance: Performance;
  racecraft: Racecraft;
  history: HistoryEntry[];
};

type TeammateBattleDriver = {
  code: string;
  name: string;
  team: string | null;
  country: string | null;
  position: number | null;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  fastest_laps: number;
  avg_finish: number | null;
};

type TeammateBattle = {
  driver: TeammateBattleDriver;
  teammate: TeammateBattleDriver;
  leader: string | null;
};

type AnalyticsResponse = {
  meta: {
    season: number;
    round: number | null;
  };
  overview: {
    drivers: number;
    total_points: number;
    total_wins: number;
    total_podiums: number;
    total_poles: number;
  };
  standings: Standing[];
  drivers: AnalyticsDriver[];
  teammate_battles: TeammateBattle[];
};

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(1);
}

function formatAverageFinish(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(1);
}

function getPerformanceScore(performance: Performance) {
  return typeof performance.overall === "number" &&
    Number.isFinite(performance.overall)
    ? performance.overall
    : null;
}

function DriverImage({
  code,
  name,
  size = "normal",
}: {
  code: string;
  name: string;
  size?: "small" | "normal" | "large";
}) {
  const [failed, setFailed] = useState(false);
  const image = getDriverImage(code);

  if (failed) {
    return (
      <div
        className={`analytics-driver-avatar analytics-driver-avatar-${size} analytics-driver-avatar-fallback`}
        aria-label={name}
      >
        {code.slice(0, 3)}
      </div>
    );
  }

  return (
    <div
      className={`analytics-driver-avatar analytics-driver-avatar-${size}`}
    >
      <img
        src={image}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function TeamLogo({
  team,
  size = "normal",
}: {
  team: string | null;
  size?: "small" | "normal";
}) {
  const [failed, setFailed] = useState(false);
  const logo = getTeamLogo(team);

  if (!team || !logo || failed) {
    return (
      <div
        className={`analytics-team-logo analytics-team-logo-${size} analytics-team-logo-fallback`}
        aria-label={team ?? "Unknown team"}
      >
        {team
          ? team
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 3)
              .toUpperCase()
          : "—"}
      </div>
    );
  }

  return (
    <div
      className={`analytics-team-logo analytics-team-logo-${size}`}
    >
      <img
        src={logo}
        alt={`${team} logo`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function getCountryFlag(country: string | null) {
  if (!country) return "";

  const normalized = country.trim().toLowerCase();

  const flags: Record<string, string> = {
    uk: "🇬🇧",
    "united kingdom": "🇬🇧",
    england: "🇬🇧",
    monaco: "🇲🇨",
    italy: "🇮🇹",
    netherlands: "🇳🇱",
    australia: "🇦🇺",
    spain: "🇪🇸",
    germany: "🇩🇪",
    france: "🇫🇷",
    canada: "🇨🇦",
    japan: "🇯🇵",
    thailand: "🇹🇭",
    mexico: "🇲🇽",
    brazil: "🇧🇷",
    finland: "🇫🇮",
    denmark: "🇩🇰",
    china: "🇨🇳",
    newzealand: "🇳🇿",
    "new zealand": "🇳🇿",
    unitedstates: "🇺🇸",
    "united states": "🇺🇸",
    usa: "🇺🇸",
    switzerland: "🇨🇭",
    belgium: "🇧🇪",
    argentina: "🇦🇷",
    "south africa": "🇿🇦",
  };

  return flags[normalized] ?? "";
}

function TeammateStat({
  left,
  label,
  right,
  leftColor,
  rightColor,
}: {
  left: string | number;
  label: string;
  right: string | number;
  leftColor: string;
  rightColor: string;
}) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  const maxValue = Math.max(
    Number.isFinite(leftNumber) ? leftNumber : 0,
    Number.isFinite(rightNumber) ? rightNumber : 0,
    1,
  );

  const leftWidth = Number.isFinite(leftNumber)
    ? Math.max(4, (leftNumber / maxValue) * 100)
    : 0;

  const rightWidth = Number.isFinite(rightNumber)
    ? Math.max(4, (rightNumber / maxValue) * 100)
    : 0;

  return (
    <div className="teammate-stat-row">
      <div className="teammate-stat-side teammate-stat-side-left">
        <strong style={{ color: leftColor }}>
          {left}
        </strong>

        <div
          className="teammate-stat-bar teammate-stat-bar-left"
          style={{
            borderColor: `${leftColor}55`,
          }}
        >
          <span
            style={{
              width: `${leftWidth}%`,
              backgroundColor: leftColor,
              boxShadow: `0 0 14px ${leftColor}66`,
            }}
          />
        </div>
      </div>

      <span className="teammate-stat-label">
        {label}
      </span>

      <div className="teammate-stat-side teammate-stat-side-right">
        <div
          className="teammate-stat-bar teammate-stat-bar-right"
          style={{
            borderColor: `${rightColor}55`,
          }}
        >
          <span
            style={{
              width: `${rightWidth}%`,
              backgroundColor: rightColor,
              boxShadow: `0 0 14px ${rightColor}66`,
            }}
          />
        </div>

        <strong style={{ color: rightColor }}>
          {right}
        </strong>
      </div>
    </div>
  );
}

function TeammateDriverHeader({
  driver,
  side,
  leader,
  onClick,
}: {
  driver: TeammateBattleDriver;
  side: "left" | "right";
  leader: boolean;
  onClick: () => void;
}) {
  const flag = getCountryFlag(driver.country);
  const accent = getTeamColor(driver.team);

  const style = {
    "--teammate-accent": accent,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`teammate-driver-header teammate-driver-header-${side}`}
      style={style}
      onClick={onClick}
    >
      <DriverImage
        code={driver.code}
        name={driver.name}
        size="normal"
      />

      <div className="teammate-driver-header-copy">
        <div className="teammate-driver-name-line">
          {side === "left" && (
            <span className="teammate-driver-flag">
              {flag}
            </span>
          )}

          <span className="teammate-driver-full-name">
            {driver.name}
          </span>

          {side === "right" && (
            <span className="teammate-driver-flag">
              {flag}
            </span>
          )}
        </div>

        <div
          className="teammate-driver-code"
          style={{ color: accent }}
        >
          {driver.code}
        </div>

        {leader && (
          <span
            className="teammate-driver-leader"
            style={{
              color: accent,
              borderColor: `${accent}66`,
              background: `${accent}14`,
            }}
          >
            LEADER
          </span>
        )}
      </div>
    </button>
  );
}

export default function AnalyticsPage() {
  const navigate = useNavigate();

  const [data, setData] =
    useState<AnalyticsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_ORIGIN}/api/analytics?year=${YEAR}&round=${ROUND}`,
        );

        if (!response.ok) {
          throw new Error(
            `Analytics request failed (${response.status})`,
          );
        }

        const payload =
          (await response.json()) as AnalyticsResponse;

        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load analytics.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  const performanceDrivers = useMemo(() => {
    if (!data) return [];

    return [...data.drivers]
      .map((driver) => ({
        ...driver,
        score: getPerformanceScore(driver.performance),
      }))
      .filter(
        (
          driver,
        ): driver is AnalyticsDriver & {
          score: number;
        } => driver.score !== null,
      )
      .sort((a, b) => b.score - a.score);
  }, [data]);

  const journeyDrivers = useMemo(() => {
    if (!data) return [];

    return data.drivers
      .filter((driver) => driver.history.length > 0)
      .sort(
        (a, b) =>
          (a.championship.position ?? 999) -
          (b.championship.position ?? 999),
      );
  }, [data]);

  const journeyMaxPoints = useMemo(() => {
    if (!journeyDrivers.length) return 1;

    return Math.max(
      ...journeyDrivers.flatMap((driver) =>
        driver.history.map(
          (item) => item.cumulative_points ?? 0,
        ),
      ),
      1,
    );
  }, [journeyDrivers]);

  if (loading) {
    return (
      <PageTransition>
        <PageContainer>
          <div className="analytics-loading">
            <div className="analytics-loading-inner">
              <span className="analytics-loading-kicker">
                F1 RACE REPLAY
              </span>

              <div className="analytics-loader" />

              <span>
                Loading season analytics...
              </span>
            </div>
          </div>
        </PageContainer>
      </PageTransition>
    );
  }

  if (error || !data) {
    return (
      <PageTransition>
        <PageContainer>
          <div className="analytics-error">
            <span>ANALYTICS</span>

            <h2>
              Unable to load season data.
            </h2>

            <p>
              {error || "No analytics data available."}
            </p>
          </div>
        </PageContainer>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageContainer>
        <div className="analytics-page">
          <PageHeader
            eyebrow={`08 / Analytics · ${data.meta.season}`}
            title="Season Analytics"
            description={`Performance intelligence from the ${data.meta.season} Formula 1 season through Round ${data.meta.round ?? "—"}.`}
          />

          <section className="analytics-overview">
            <div className="analytics-stat">
              <span className="analytics-stat-label">
                Drivers
              </span>

              <strong>
                {data.overview.drivers}
              </strong>

              <span className="analytics-stat-meta">
                Championship field
              </span>
            </div>

            <div className="analytics-stat">
              <span className="analytics-stat-label">
                Total Points
              </span>

              <strong>
                {formatNumber(
                  data.overview.total_points,
                )}
              </strong>

              <span className="analytics-stat-meta">
                Season points scored
              </span>
            </div>

            <div className="analytics-stat">
              <span className="analytics-stat-label">
                Wins
              </span>

              <strong>
                {data.overview.total_wins}
              </strong>

              <span className="analytics-stat-meta">
                Race victories
              </span>
            </div>

            <div className="analytics-stat">
              <span className="analytics-stat-label">
                Podiums
              </span>

              <strong>
                {data.overview.total_podiums}
              </strong>

              <span className="analytics-stat-meta">
                Top-three finishes
              </span>
            </div>

            <div className="analytics-stat">
              <span className="analytics-stat-label">
                Poles
              </span>

              <strong>
                {data.overview.total_poles}
              </strong>

              <span className="analytics-stat-meta">
                Pole positions
              </span>
            </div>
          </section>

          <section className="analytics-section">
            <SectionLabel number="01">
              Championship
            </SectionLabel>

            <div className="analytics-section-heading">
              <div>
                <h2>Driver standings.</h2>

                <p>
                  The championship picture after Round{" "}
                  {data.meta.round ?? "—"}.
                </p>
              </div>
            </div>

            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>POS</th>
                    <th>DRIVER</th>
                    <th>TEAM</th>
                    <th>PTS</th>
                    <th>W</th>
                    <th>POD</th>
                    <th>POLE</th>
                  </tr>
                </thead>

                <tbody>
                  {data.standings.map((driver) => (
                    <tr
                      key={driver.code}
                      className="analytics-driver-row"
                      onClick={() =>
                        navigate(
                          `/drivers/${driver.code}`,
                        )
                      }
                      tabIndex={0}
                      role="link"
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();

                          navigate(
                            `/drivers/${driver.code}`,
                          );
                        }
                      }}
                    >
                      <td className="analytics-position">
                        {driver.position ?? "—"}
                      </td>

                      <td>
                        <div className="analytics-driver-name">
                          <DriverImage
                            code={driver.code}
                            name={driver.name}
                            size="normal"
                          />

                          <div className="analytics-driver-identity">
                            <span>
                              {driver.code}
                            </span>

                            <strong>
                              {driver.name}
                            </strong>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="analytics-team-cell">
                          <TeamLogo
                            team={driver.team}
                            size="normal"
                          />

                          <span>
                            {driver.team || "—"}
                          </span>
                        </div>
                      </td>

                      <td className="analytics-points">
                        {formatNumber(driver.points)}
                      </td>

                      <td>{driver.wins}</td>

                      <td>{driver.podiums}</td>

                      <td>{driver.poles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="analytics-section">
            <SectionLabel number="02">
              Performance Index
            </SectionLabel>

            <div className="analytics-section-heading">
              <div>
                <h2>Who&apos;s performing?</h2>

                <p>
                  Composite driver performance based on
                  the existing season model.
                </p>
              </div>
            </div>

            <div className="performance-list">
              {performanceDrivers.length === 0 && (
                <div className="analytics-empty">
                  Performance index data is not available
                  yet.
                </div>
              )}

              {performanceDrivers.map(
                (driver, index) => {
                  const rank = index + 1;
                  const score = driver.score;

                  const normalizedScore = Math.min(
                    100,
                    Math.max(0, score),
                  );

                  const isTopThree = rank <= 3;

                  return (
                    <article
                      className={[
                        "performance-row",
                        isTopThree
                          ? "performance-row-top"
                          : "",
                        rank === 1
                          ? "performance-row-p1"
                          : "",
                        rank === 2
                          ? "performance-row-p2"
                          : "",
                        rank === 3
                          ? "performance-row-p3"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={driver.code}
                      onClick={() =>
                        navigate(
                          `/drivers/${driver.code}`,
                        )
                      }
                    >
                      <div className="performance-rank-number">
                        {String(rank).padStart(2, "0")}
                      </div>

                      <div className="performance-driver">
                        <DriverImage
                          code={driver.code}
                          name={driver.name}
                          size={
                            isTopThree
                              ? "normal"
                              : "small"
                          }
                        />

                        <div className="performance-driver-identity">
                          <strong>
                            {driver.code}
                          </strong>

                          <span>
                            {driver.name}
                          </span>

                          <div className="performance-team">
                            <TeamLogo
                              team={driver.team}
                              size="small"
                            />

                            <span>
                              {driver.team ||
                                "Unknown Team"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="performance-visual">
                        <div className="performance-bar-header">
                          <span>
                            PERFORMANCE
                          </span>

                          {isTopThree && (
                            <span className="performance-status">
                              {rank === 1
                                ? "LEADER"
                                : `P${rank}`}
                            </span>
                          )}
                        </div>

                        <div
                          className="performance-track"
                          style={{
                            borderColor: `${getTeamColor(driver.team)}33`,
                          }}
                        >
                          <div
                            className="performance-track-grid"
                            aria-hidden="true"
                          />

                          <div
                            className="performance-fill"
                            style={{
                              width: `${normalizedScore}%`,
                              background: getTeamColor(driver.team),
                              boxShadow: `0 0 10px ${getTeamColor(driver.team)}55`,
                            }}
                          />
                        </div>
                      </div>

                      <strong className="performance-score">
                        {score.toFixed(1)}
                      </strong>
                    </article>
                  );
                },
              )}
            </div>
          </section>

          <section className="analytics-section">
            <SectionLabel number="03">
              Racecraft
            </SectionLabel>

            <div className="analytics-section-heading">
              <div>
                <h2>On-track movement.</h2>

                <p>
                  Overtakes, position movement and
                  pit-stop activity.
                </p>
              </div>
            </div>

            <div className="racecraft-grid">
              {data.drivers.map((driver) => (
                <article
                  className="racecraft-card"
                  key={driver.code}
                >
                  <div className="racecraft-card-top">
                    <DriverImage
                      code={driver.code}
                      name={driver.name}
                      size="small"
                    />

                    <div>
                      <strong>{driver.code}</strong>

                      <span>{driver.name}</span>
                    </div>
                  </div>

                  <div className="racecraft-metrics">
                    <div>
                      <span>OVERTAKES</span>

                      <strong>
                        {driver.racecraft.overtakes}
                      </strong>
                    </div>

                    <div>
                      <span>GAINED</span>

                      <strong
                        className={
                          driver.racecraft
                            .positions_gained >= 0
                            ? "metric-positive"
                            : "metric-negative"
                        }
                      >
                        {driver.racecraft
                          .positions_gained >= 0
                          ? "+"
                          : ""}

                        {
                          driver.racecraft
                            .positions_gained
                        }
                      </strong>
                    </div>

                    <div>
                      <span>LOST</span>

                      <strong className="metric-negative">
                        -{driver.racecraft.positions_lost}
                      </strong>
                    </div>

                    <div>
                      <span>PIT STOPS</span>

                      <strong>
                        {driver.racecraft.pit_stops}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="analytics-section">
            <SectionLabel number="04">
              Teammate Battle
            </SectionLabel>

            <div className="analytics-section-heading">
              <div>
                <h2>Head to head.</h2>

                <p>
                  Championship comparison between
                  teammates.
                </p>
              </div>
            </div>

            <div className="teammate-grid">
              {data.teammate_battles.map((battle) => {
                const left = battle.driver;
                const right = battle.teammate;

                const leftColor = getTeamColor(
                  left.team,
                );

                const rightColor = getTeamColor(
                  right.team,
                );

                const leftLeader =
                  battle.leader === left.code;

                const rightLeader =
                  battle.leader === right.code;

                return (
                  <article
                    className="teammate-card"
                    key={`${left.code}-${right.code}`}
                    style={
                      {
                        "--teammate-left-color":
                          leftColor,
                        "--teammate-right-color":
                          rightColor,
                      } as CSSProperties
                    }
                  >
                    <div className="teammate-card-header">
                      <TeammateDriverHeader
                        driver={left}
                        side="left"
                        leader={leftLeader}
                        onClick={() =>
                          navigate(
                            `/drivers/${left.code}`,
                          )
                        }
                      />

                      <div className="teammate-vs">
                        VS
                      </div>

                      <TeammateDriverHeader
                        driver={right}
                        side="right"
                        leader={rightLeader}
                        onClick={() =>
                          navigate(
                            `/drivers/${right.code}`,
                          )
                        }
                      />
                    </div>

                    <div className="teammate-statistics">
                      <TeammateStat
                        left={left.position ?? "—"}
                        label="STANDING"
                        right={right.position ?? "—"}
                        leftColor={leftColor}
                        rightColor={rightColor}
                      />

                      <TeammateStat
                        left={formatNumber(
                          left.points,
                        )}
                        label="PTS"
                        right={formatNumber(
                          right.points,
                        )}
                        leftColor={leftColor}
                        rightColor={rightColor}
                      />

                      <TeammateStat
                        left={left.wins}
                        label="WINS"
                        right={right.wins}
                        leftColor={leftColor}
                        rightColor={rightColor}
                      />

                      <TeammateStat
                        left={left.podiums}
                        label="PODIUMS"
                        right={right.podiums}
                        leftColor={leftColor}
                        rightColor={rightColor}
                      />

                      <TeammateStat
                        left={left.poles}
                        label="POLES"
                        right={right.poles}
                        leftColor={leftColor}
                        rightColor={rightColor}
                      />

                      <TeammateStat
                        left={left.fastest_laps}
                        label="FASTEST LAPS"
                        right={right.fastest_laps}
                        leftColor={leftColor}
                        rightColor={rightColor}
                      />

                      <TeammateStat
                        left={formatAverageFinish(
                          left.avg_finish,
                        )}
                        label="AVG FINISH"
                        right={formatAverageFinish(
                          right.avg_finish,
                        )}
                        leftColor={leftColor}
                        rightColor={rightColor}
                      />
                    </div>
                  </article>
                );
              })}

              {data.teammate_battles.length === 0 && (
                <div className="analytics-empty">
                  No teammate battle data is available.
                </div>
              )}
            </div>
          </section>

          <section className="analytics-section analytics-last">
            <SectionLabel number="05">
              Season Journey
            </SectionLabel>

            <div className="analytics-section-heading">
              <div>
                <h2>Points progression.</h2>

                <p>
                  Championship points accumulated
                  across the season.
                </p>
              </div>
            </div>

            <div className="journey-list">
              {journeyDrivers.map((driver) => {
                const history = driver.history;

                const latest =
                  history[
                    history.length - 1
                  ]?.cumulative_points ?? 0;

                const width =
                  (latest / journeyMaxPoints) * 100;

                return (
                  <div
                    className="journey-row"
                    key={driver.code}
                  >
                    <div className="journey-driver">
                      <div className="journey-driver-identity">
                        <DriverImage
                          code={driver.code}
                          name={driver.name}
                          size="small"
                        />

                        <strong>
                          {driver.code}
                        </strong>
                      </div>

                      <span>
                        {formatNumber(latest)} PTS
                      </span>
                    </div>

                    <div
                      className="journey-track"
                      style={{
                        borderColor: `${getTeamColor(driver.team)}33`,
                      }}
                    >
                      <div
                        className="journey-fill"
                        style={{
                          width: `${width}%`,
                          background: getTeamColor(driver.team),
                          boxShadow: `0 0 10px ${getTeamColor(driver.team)}55`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </PageContainer>
    </PageTransition>
  );
}