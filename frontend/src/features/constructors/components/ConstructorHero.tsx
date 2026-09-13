
import type { CSSProperties } from "react";

import { assetUrl } from "../constructors.api";
import { getTeamColor } from "../constructors.colors";
import type { ConstructorTeam } from "../constructors.types";

interface ConstructorHeroProps {
  year: number;
  leader: ConstructorTeam | null;
  racesCompleted: number;
  totalRounds: number;
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return value.toLocaleString("en-US");
}

function ConstructorHero({
  year,
  leader,
  racesCompleted,
  totalRounds,
}: ConstructorHeroProps) {
  const progress = totalRounds
    ? Math.min(100, (racesCompleted / totalRounds) * 100)
    : 0;

  return (
    <section className="constructors-hero">
      <div className="constructors-hero-copy">
        <div className="constructors-eyebrow">
          <span className="constructors-eyebrow-dot" />
          {year} SEASON · CONSTRUCTOR BATTLE
        </div>

        <h1>
          CONSTRUCTORS'
          <br />
          <strong>CHAMPIONSHIP</strong>
        </h1>

        <p>
          Track teams, drivers, momentum, points and the
          fight for constructor glory.
        </p>

        <div className="constructors-progress">
          <div className="constructors-progress-header">
            <span>SEASON PROGRESS</span>

            <strong>
              {racesCompleted} / {totalRounds || "—"} ROUNDS
            </strong>
          </div>

          <div className="constructors-progress-track">
            <span
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </div>

      {leader && (
        <div
          className="constructors-leader-card"
          style={
            {
              "--team-color": getTeamColor(leader),
            } as CSSProperties
          }
        >
          <div className="constructors-leader-content">
            <span className="constructors-leader-label">
              CHAMPIONSHIP LEADER
            </span>

            <div className="constructors-leader-name">
              {leader.teamLogo && (
                <img
                  className="constructors-leader-logo"
                  src={assetUrl(leader.teamLogo)}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}

              <h2>{leader.name}</h2>
            </div>

            <div className="constructors-leader-points">
              <strong>{formatNumber(leader.points)}</strong>

              <span>PTS</span>

              <span className="constructors-leader-pill">
                {leader.wins} WINS
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ConstructorHero;

