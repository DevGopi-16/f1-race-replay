import {
  Award,
  Flag,
  Gauge,
  Medal,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";

import { getTeamColor } from "../constructors.colors";
import type { ConstructorTeam } from "../constructors.types";

import "./ConstructorTeamStatistics.css";

interface ConstructorTeamStatisticsProps {
  team: ConstructorTeam;
}

function formatNumber(
  value: number | null | undefined,
  digits = 0,
) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

interface StatItem {
  label: string;
  value: string;
  icon: typeof Trophy;
  detail?: string;
}

function ConstructorTeamStatistics({
  team,
}: ConstructorTeamStatisticsProps) {
  const stats = team.team_stats;

  const statItems: StatItem[] = [
    {
      label: "WINS",
      value: formatNumber(team.wins),
      icon: Trophy,
      detail:
        team.wins === 1
          ? "race victory"
          : "race victories",
    },
    {
      label: "PODIUMS",
      value: formatNumber(team.podiums),
      icon: Medal,
      detail:
        team.podiums === 1
          ? "podium finish"
          : "podium finishes",
    },
    {
      label: "POLES",
      value: formatNumber(team.poles),
      icon: Flag,
      detail:
        team.poles === 1
          ? "pole position"
          : "pole positions",
    },
    {
      label: "FASTEST LAPS",
      value: formatNumber(team.fastest_laps),
      icon: Zap,
      detail:
        team.fastest_laps === 1
          ? "fastest lap"
          : "fastest laps",
    },
    {
      label: "POINTS FINISHES",
      value: formatNumber(
        stats?.points_finishes,
      ),
      icon: Award,
      detail: "scoring finishes",
    },
    {
      label: "DNFs",
      value: formatNumber(team.dnfs),
      icon: ShieldCheck,
      detail:
        team.dnfs === 1
          ? "retirement"
          : "retirements",
    },
    {
      label: "AVERAGE START",
      value: formatNumber(
        stats?.avg_start,
        1,
      ),
      icon: Gauge,
      detail: "qualifying position",
    },
    {
      label: "AVERAGE FINISH",
      value: formatNumber(
        stats?.avg_finish,
        1,
      ),
      icon: Gauge,
      detail: "race position",
    },
    {
      label: "BEST FINISH",
      value:
        stats?.best_finish != null
          ? `P${stats.best_finish}`
          : "—",
      icon: Trophy,
      detail: "best race result",
    },
  ];

  return (
    <section
      className="constructor-team-statistics"
      style={
        {
          "--constructor-color":
            getTeamColor(team),
        } as React.CSSProperties
      }
    >
      <div className="constructors-section-heading">
        <div>
          <span className="constructors-section-kicker">
            SEASON NUMBERS
          </span>

          <h2>Team statistics</h2>
        </div>

        <span className="constructor-team-statistics-name">
          {team.name}
        </span>
      </div>

      <div className="constructor-team-statistics-grid">
        {statItems.map(
          ({
            label,
            value,
            icon: Icon,
            detail,
          }) => (
            <article
              className="constructor-team-stat-card"
              key={label}
            >
              <div className="constructor-team-stat-icon">
                <Icon size={17} />
              </div>

              <div className="constructor-team-stat-copy">
                <span className="constructor-team-stat-label">
                  {label}
                </span>

                <strong className="constructor-team-stat-value">
                  {value}
                </strong>

                {detail && (
                  <span className="constructor-team-stat-detail">
                    {detail}
                  </span>
                )}
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}

export default ConstructorTeamStatistics;
