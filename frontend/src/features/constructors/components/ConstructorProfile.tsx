import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Flag,
  Gauge,
  Medal,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { assetUrl } from "../constructors.api";
import ConstructorProgression from "./ConstructorProgression";
import ConstructorRaceResults from "./ConstructorRaceResults";
import ConstructorPerformance from "./ConstructorPerformance";
import ConstructorPointsPerRound from "./ConstructorPointsPerRound";
import ConstructorFormGuide from "./ConstructorFormGuide";
import ConstructorChampionshipBattle from "./ConstructorChampionshipBattle";
import ConstructorTeamStatistics from "./ConstructorTeamStatistics";
import ConstructorReliability from "./ConstructorReliability";
import ConstructorEngineeringInsights from "./ConstructorEngineeringInsights";
import type { ConstructorTeam } from "../constructors.types";
import "./ConstructorProfile.css";
import { getTeamColor } from "../constructors.colors";

const TEAM_BANNER_FILES: Record<string, string> = {
  alpine: "alpine.png",
  "aston martin": "AstonMartin.png",
  audi: "audi.png",
  cadillac: "cadillac.png",
  ferrari: "ferrari.png",
  haas: "haas.png",
  mclaren: "mclaren.png",
  mercedes: "mercedes.png",
  "racing bulls": "racingbulls.png",
  "rb f1": "racingbulls.png",
  vcarb: "racingbulls.png",
  "red bull": "redbull.png",
  williams: "Williams.png",
};

function getTeamBannerUrl(team: ConstructorTeam) {
  const name = team.name.trim().toLowerCase();

  // exact match first, then partial match (e.g. "haas f1 team" contains "haas")
  const key =
    TEAM_BANNER_FILES[name] !== undefined
      ? name
      : Object.keys(TEAM_BANNER_FILES).find((k) => name.includes(k));

  const file = key ? TEAM_BANNER_FILES[key] : undefined;
  return file ? `/images/teambanner/${file}` : null;
}

interface ConstructorProfileProps {
  team: ConstructorTeam;
  teams: ConstructorTeam[];
  year: number;
  racesCompleted: number;
  onBack: () => void;
}

function formatNumber(
  value: number | null | undefined,
) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return value.toLocaleString("en-US");
}

function formatPercent(
  value: number | null | undefined,
) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function getLeader(
  teams: ConstructorTeam[],
) {
  return [...teams].sort(
    (a, b) => b.points - a.points,
  )[0] ?? null;
}

function getGapToLeader(
  team: ConstructorTeam,
  teams: ConstructorTeam[],
) {
  const leader = getLeader(teams);

  if (!leader) {
    return 0;
  }

  return Math.max(
    0,
    leader.points - team.points,
  );
}

function getBestFinish(
  team: ConstructorTeam,
) {
  const values = team.history
    ?.map((entry) => entry.position)
    .filter(
      (position): position is number =>
        typeof position === "number" &&
        position > 0,
    );

  if (!values || values.length === 0) {
    return null;
  }

  return Math.min(...values);
}

function getAverageFinish(
  team: ConstructorTeam,
) {
  const values = team.history
    ?.map((entry) => entry.position)
    .filter(
      (position): position is number =>
        typeof position === "number" &&
        position > 0,
    );

  if (!values || values.length === 0) {
    return null;
  }

  return (
    values.reduce(
      (total, value) => total + value,
      0,
    ) / values.length
  );
}

function ConstructorProfile({
  team,
  teams,
  year,
  racesCompleted,
  onBack,
}: ConstructorProfileProps) {
  const navigate = useNavigate();

  const leader = getLeader(teams);
  const gapToLeader = getGapToLeader(
    team,
    teams,
  );

  const bestFinish = getBestFinish(team);
  const averageFinish =
    team.team_stats?.avg_finish ??
    getAverageFinish(team);

  const podiumRate =
    racesCompleted > 0
      ? (team.podiums / racesCompleted) * 100
      : 0;

  const winRate =
    racesCompleted > 0
      ? (team.wins / racesCompleted) * 100
      : 0;

  const style = {
    "--team-color": getTeamColor(team),
  } as CSSProperties;

  return (
    <section
      className="constructor-profile"
      style={style}
    >
      <div className="constructor-profile-topbar">
        <button
          type="button"
          className="constructor-back-button"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          <span>ALL CONSTRUCTORS</span>
        </button>

        <span className="constructor-profile-season">
          {year} CONSTRUCTOR PROFILE
        </span>
      </div>

            <header
        className="constructor-profile-hero"
        style={
          getTeamBannerUrl(team)
            ? ({
                "--hero-banner": `url(${getTeamBannerUrl(team)})`,
              } as CSSProperties)
            : undefined
        }
      >
        <div className="constructor-profile-hero-bg" />
        <div className="constructor-profile-hero-glow" />
      </header>

      <div className="constructor-profile-meta-row">
        <span>CONSTRUCTOR PERFORMANCE PROFILE</span>
        <span>
          {racesCompleted} / {team.history?.length ?? racesCompleted} ROUNDS COMPLETE
        </span>
      </div>

      <div className="constructor-profile-kpis">
        <div className="constructor-profile-kpi featured">
          <span>
            <Trophy size={15} />
            CHAMPIONSHIP POINTS
          </span>

          <strong>
            {formatNumber(team.points)}
          </strong>

          <small>
            {racesCompleted} ROUNDS COMPLETED
          </small>
        </div>

        <div className="constructor-profile-kpi">
          <span>
            <Trophy size={15} />
            WINS
          </span>

          <strong>{team.wins}</strong>

          <small>
            {formatPercent(winRate)} WIN RATE
          </small>
        </div>

        <div className="constructor-profile-kpi">
          <span>
            <Medal size={15} />
            PODIUMS
          </span>

          <strong>{team.podiums}</strong>

          <small>
            {formatPercent(podiumRate)} PODIUM RATE
          </small>
        </div>

        <div className="constructor-profile-kpi">
          <span>
            <Flag size={15} />
            POLES
          </span>

          <strong>{team.poles}</strong>

          <small>QUALIFYING WINS</small>
        </div>

        <div className="constructor-profile-kpi">
          <span>
            <Zap size={15} />
            FASTEST LAPS
          </span>

          <strong>
            {team.fastest_laps}
          </strong>

          <small>RACE PACE</small>
        </div>

        <div className="constructor-profile-kpi">
          <span>
            <Gauge size={15} />
            RELIABILITY
          </span>

          <strong>
            {formatPercent(
              team.reliability_rate,
            )}
          </strong>

          <small>
            {team.dnfs} DNFs
          </small>
        </div>
      </div>

      <div className="constructor-profile-grid">
        <section className="constructor-profile-card constructor-driver-card">
          <div className="constructor-card-heading">
            <div>
              <span>01 / DRIVER LINEUP</span>
              <h2>Race drivers</h2>
            </div>

            <Users size={19} />
          </div>

          <div className="constructor-driver-list">
            {team.drivers.map((driver) => (
              <article
                className="constructor-profile-driver"
                key={driver.code}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate(`/drivers/${driver.code}`)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    navigate(`/drivers/${driver.code}`);
                  }
                }}
              >

                <div className="constructor-profile-driver-image">
                  {driver.image && (
                    <img
                      src={assetUrl(driver.image)}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  )}

                  <span>
                    #{driver.number}
                  </span>
                </div>

                <div className="constructor-profile-driver-info">
                  <span>{driver.code}</span>

                  <h3>{driver.name}</h3>

                  <small>
                    P{driver.position} ·{" "}
                    {formatNumber(
                      driver.points,
                    )}{" "}
                    POINTS
                  </small>
                </div>

                <div className="constructor-profile-driver-results">
                  <div>
                    <strong>
                      {driver.wins}
                    </strong>
                    <span>WINS</span>
                  </div>

                  <div>
                    <strong>
                      {driver.podiums}
                    </strong>
                    <span>PODIUMS</span>
                  </div>

                  <div>
                    <strong>
                      {driver.fastest_laps}
                    </strong>
                    <span>FASTEST</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="constructor-profile-card constructor-summary-card">
          <div className="constructor-card-heading">
            <div>
              <span>02 / SEASON SNAPSHOT</span>
              <h2>Performance</h2>
            </div>

            <Award size={19} />
          </div>

          <div className="constructor-summary-stat">
            <span>BEST FINISH</span>
            <strong>
              {bestFinish == null
                ? "—"
                : `P${bestFinish}`}
            </strong>
          </div>

          <div className="constructor-summary-stat">
            <span>AVERAGE FINISH</span>
            <strong>
              {averageFinish == null
                ? "—"
                : `P${averageFinish.toFixed(1)}`}
            </strong>
          </div>

          <div className="constructor-summary-stat">
            <span>POINTS FINISHES</span>
            <strong>
              {formatNumber(
                team.drivers.reduce(
                  (total, driver) =>
                    total +
                    (driver.history?.filter(
                      (entry) =>
                        typeof entry.position === "number" &&
                        entry.position <= 10,
                    ).length ?? 0),
                  0,
                ),
              )}
            </strong>
          </div>

          <div className="constructor-summary-stat">
            <span>DNFs</span>
            <strong>{team.dnfs}</strong>
          </div>

          <div className="constructor-summary-stat">
            <span>CHAMPIONSHIP LEADER</span>
            <strong>
              {leader?.name ?? "—"}
            </strong>
          </div>
        </section>
      </div>

      <section className="constructor-profile-card constructor-progression-card">
        <div className="constructor-card-heading">
          <div>
            <span>03 / CHAMPIONSHIP DATA</span>
            <h2>Season progression</h2>
          </div>

          <div className="constructor-progression-total">
            <strong>
              {formatNumber(team.points)}
            </strong>

            <span>CHAMPIONSHIP POINTS</span>
          </div>
        </div>

        <ConstructorProgression
          history={team.history}
          teamColor={getTeamColor(team)}
        />
      </section>

      <ConstructorRaceResults team={team} />

      <ConstructorPerformance
        team={team}
        racesCompleted={racesCompleted}
      />

      <ConstructorPointsPerRound
        team={team}
      />

      <ConstructorFormGuide
        team={team}
      />

      <ConstructorChampionshipBattle
        team={team}
        teams={teams}
      />

      <ConstructorTeamStatistics
        team={team}
      />

      <ConstructorReliability
        team={team}
      />

      <ConstructorEngineeringInsights
        team={team}
      />
    </section>
  );
}

export default ConstructorProfile;
