import {
  Gauge,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";

import { getTeamColor } from "../constructors.colors";
import type { ConstructorTeam } from "../constructors.types";
import "./ConstructorPerformance.css";
interface ConstructorPerformanceProps {
  team: ConstructorTeam;
  racesCompleted: number;
}

interface Metric {
  label: string;
  description: string;
  value: number;
  displayValue: string;
  icon: typeof Gauge;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function getAverageFinish(team: ConstructorTeam) {
  const driverPositions = (team.drivers ?? [])
    .flatMap((driver) =>
      (driver.history ?? [])
        .map((result) => result.position)
        .filter(
          (position) =>
            typeof position === "number" &&
            position > 0,
        ),
    );

  if (driverPositions.length === 0) {
    const teamPositions = (team.history ?? [])
      .map((result) => result.position)
      .filter(
        (position) =>
          typeof position === "number" &&
          position > 0,
      );

    if (teamPositions.length === 0) return null;

    return (
      teamPositions.reduce(
        (total, position) => total + position,
        0,
      ) / teamPositions.length
    );
  }

  return (
    driverPositions.reduce(
      (total, position) => total + position,
      0,
    ) / driverPositions.length
  );
}

function getPerformanceMetrics(
  team: ConstructorTeam,
  racesCompleted: number,
): Metric[] {
  const stats = team.team_stats;

  const averageFinish =
    stats?.avg_finish ?? getAverageFinish(team);

  const averageStart =
    stats?.avg_start ??
    null;

  const raceResults =
    averageFinish == null
      ? 0
      : clamp(100 - (averageFinish - 1) * 7);

  const qualifying =
    averageStart == null
      ? 0
      : clamp(100 - (averageStart - 1) * 7);

  const reliability =
    team.reliability_rate != null
      ? clamp(team.reliability_rate)
      : clamp(100 - (team.dnfs ?? 0) * 15);

  const scoringConsistency =
    racesCompleted > 0
      ? clamp(
          ((stats?.points_finishes ?? 0) /
            racesCompleted) *
            100,
        )
      : 0;

  return [
    {
      label: "Race results",
      description:
        averageFinish == null
          ? "Race finishing data unavailable"
          : `Average finish ${averageFinish.toFixed(1)}`,
      value: raceResults,
      displayValue:
        averageFinish == null
          ? "—"
          : `${raceResults.toFixed(0)}%`,
      icon: TrendingUp,
    },
    {
      label: "Qualifying",
      description:
        averageStart == null
          ? "Qualifying data unavailable"
          : `Average start ${averageStart.toFixed(1)}`,
      value: qualifying,
      displayValue:
        averageStart == null
          ? "—"
          : `${qualifying.toFixed(0)}%`,
      icon: Target,
    },
    {
      label: "Reliability",
      description:
        team.dnfs > 0
          ? `${team.dnfs} retirement${team.dnfs === 1 ? "" : "s"}`
          : "No recorded DNFs",
      value: reliability,
      displayValue: formatPercent(
        team.reliability_rate ?? reliability,
      ),
      icon: ShieldCheck,
    },
    {
      label: "Scoring consistency",
      description:
        racesCompleted > 0
          ? `${stats?.points_finishes ?? 0} scoring rounds`
          : "No completed rounds",
      value: scoringConsistency,
      displayValue: `${scoringConsistency.toFixed(0)}%`,
      icon: Gauge,
    },
  ];
}

function ConstructorPerformance({
  team,
  racesCompleted,
}: ConstructorPerformanceProps) {
  const metrics = getPerformanceMetrics(
    team,
    racesCompleted,
  );

  return (
    <section className="constructor-profile-card constructor-performance">
      <div className="constructor-card-heading">
        <div>
          <span>05 / PERFORMANCE PROFILE</span>
          <h2>Performance profile</h2>
        </div>

        <span className="constructor-performance-label">
          SEASON TO DATE
        </span>
      </div>

      <div className="constructor-performance-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              className="constructor-performance-metric"
              key={metric.label}
            >
              <div className="constructor-performance-metric-top">
                <div className="constructor-performance-icon">
                  <Icon size={15} />
                </div>

                <div className="constructor-performance-value">
                  {metric.displayValue}
                </div>
              </div>

              <div className="constructor-performance-copy">
                <strong>{metric.label}</strong>
                <span>{metric.description}</span>
              </div>

              <div className="constructor-performance-track">
                <span
                  style={{
                    width: `${metric.value}%`,
                    backgroundColor: getTeamColor(team),
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ConstructorPerformance;
