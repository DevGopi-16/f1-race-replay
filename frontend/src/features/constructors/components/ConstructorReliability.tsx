import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Flag,
  Gauge,
  ShieldCheck,
  Timer,
} from "lucide-react";

import type { CSSProperties } from "react";

import { getTeamColor } from "../constructors.colors";
import type { ConstructorTeam } from "../constructors.types";

import "./ConstructorReliability.css";

interface ConstructorReliabilityProps {
  team: ConstructorTeam;
}

function formatNumber(
  value: number | null | undefined,
  digits = 0,
) {
  if (
    value == null ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function clamp(
  value: number,
  min = 0,
  max = 100,
) {
  return Math.min(
    max,
    Math.max(min, value),
  );
}

function formatPitStop(
  value: number | null | undefined,
) {
  if (
    value == null ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return `${value.toFixed(2)}s`;
}

function ConstructorReliability({
  team,
}: ConstructorReliabilityProps) {
  const reliability =
    team.reliability_rate != null
      ? clamp(team.reliability_rate)
      : null;

  const classifiedFinishes =
    team.team_stats?.classified_finishes ?? 0;

  const raceStarts =
    team.team_stats?.race_starts ?? 0;


  const dnfs = team.dnfs ?? 0;

  const reliabilityLabel =
    reliability == null
      ? "No data"
      : reliability >= 95
        ? "Exceptional"
        : reliability >= 90
          ? "Strong"
          : reliability >= 80
            ? "Stable"
            : reliability >= 70
              ? "Needs attention"
              : "High risk";



  return (
    <section
      className="constructor-reliability"
      style={
        {
          "--constructor-color":
            getTeamColor(team) || "#e10600",
        } as CSSProperties
      }
    >
      <div className="constructors-section-heading">
        <div>
          <span className="constructors-section-kicker">
            OPERATIONS
          </span>

          <h2>Reliability &amp; pit wall</h2>
        </div>

        <span className="constructor-reliability-status">
          {reliabilityLabel}
        </span>
      </div>

      <div className="constructor-reliability-layout">
        <article className="constructor-reliability-main">
          <div className="constructor-reliability-main-header">
            <div className="constructor-reliability-icon">
              <ShieldCheck size={20} />
            </div>

            <div>
              <span>RELIABILITY RATE</span>
              <strong>
                {reliability != null
                  ? `${formatNumber(reliability, 1)}%`
                  : "—"}
              </strong>

            </div>
          </div>

          <div className="constructor-reliability-meter">
            <div
              className="constructor-reliability-meter-fill"
              style={{
                width: `${reliability ?? 0}%`,
              }}
            />
          </div>



          <div className="constructor-reliability-meter-meta">
            <span>0%</span>
            <span>100%</span>
          </div>

          <p className="constructor-reliability-description">
            Reliability across the completed
            championship races, combining the team's
            retirement record with its completed
            race programme.
          </p>
        </article>

        <div className="constructor-reliability-failures">
          <article className="constructor-reliability-mini-card">
            <div className="constructor-reliability-mini-icon">
              <AlertTriangle size={16} />
            </div>

            <div>
              <span>DNFs</span>
              <strong>
                {formatNumber(dnfs)}
              </strong>
            </div>
          </article>

          <article className="constructor-reliability-mini-card">
            <div className="constructor-reliability-mini-icon">
              <CheckCircle2 size={16} />
            </div>

            <div>
              <span>CLASSIFIED FINISHES</span>
              <strong>
                {formatNumber(
                  classifiedFinishes,
                )}
              </strong>
            </div>
          </article>
          
          <article className="constructor-reliability-mini-card">
            <div className="constructor-reliability-mini-icon">
              <Flag size={16} />
            </div>

            <div>
              <span>RACE STARTS</span>
              <strong>
                {formatNumber(raceStarts)}
              </strong>
            </div>
          </article>



        </div>
      </div>

      <div className="constructor-pitwall">
        <div className="constructor-pitwall-heading">
          <div>
            <span className="constructor-pitwall-kicker">
              PIT WALL
            </span>

            <h3>Stop performance</h3>
          </div>

          <Clock3 size={17} />
        </div>

        <div className="constructor-pitwall-grid">
          <article className="constructor-pitwall-card">
            <div className="constructor-pitwall-card-icon">
              <Timer size={17} />
            </div>

            <div className="constructor-pitwall-card-copy">
              <span>AVERAGE PIT STOP</span>

              <strong>
                {formatPitStop(
                  team.avg_pit_stop,
                )}
              </strong>

              <small>
                Team average
              </small>
            </div>
          </article>

          <article className="constructor-pitwall-card">
            <div className="constructor-pitwall-card-icon">
              <Clock3 size={17} />
            </div>

            <div className="constructor-pitwall-card-copy">
              <span>FASTEST PIT STOP</span>

              <strong>
                {formatPitStop(
                  team.fastest_pit_stop,
                )}
              </strong>

              <small>
                Best recorded stop
              </small>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default ConstructorReliability;
