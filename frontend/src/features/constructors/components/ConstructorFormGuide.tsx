import { Flag, Trophy } from "lucide-react";

import type {
  ConstructorDriver,
  ConstructorDriverHistory,
  ConstructorHistory,
  ConstructorTeam,
} from "../constructors.types";

import "./ConstructorFormGuide.css";

interface ConstructorFormGuideProps {
  team: ConstructorTeam;
}

function positionClass(position: number | null | undefined) {
  if (position == null || position <= 0) {
    return "constructor-form-position muted";
  }

  if (position === 1) {
    return "constructor-form-position p1";
  }

  if (position === 2) {
    return "constructor-form-position p2";
  }

  if (position === 3) {
    return "constructor-form-position p3";
  }

  if (position > 10) {
    return "constructor-form-position low";
  }

  return "constructor-form-position";
}

function formatPoints(points: number) {
  return Number.isInteger(points)
    ? String(points)
    : points.toFixed(1);
}

function driverResult(
  driver: ConstructorDriver,
  round: number,
): ConstructorDriverHistory | null {
  return (
    driver.history.find((result) => result.round === round) ??
    null
  );
}

function getResultLabel(
  position: number | null | undefined,
) {
  if (position == null || position <= 0) {
    return "—";
  }

  return `P${position}`;
}

function ConstructorFormGuide({
  team,
}: ConstructorFormGuideProps) {
  const races = team.history?.slice(-5) ?? [];

  const maxPoints = Math.max(
    ...races.map((race) => race.points ?? 0),
    1,
  );

  if (!races.length) {
    return (
      <section className="constructor-form-guide">
        <div className="constructor-form-guide-heading">
          <div>
            <span className="constructor-form-guide-kicker">
              RECENT FORM
            </span>

            <h2>Last 5 form guide</h2>
          </div>
        </div>

        <div className="constructor-form-guide-empty">
          <Flag size={20} />
          <span>No completed races available.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="constructor-form-guide">
      <div className="constructor-form-guide-heading">
        <div>
          <span className="constructor-form-guide-kicker">
            RECENT FORM
          </span>

          <h2>Last 5 form guide</h2>

          <p>
            The team's most recent championship results,
            including both drivers and points scored.
          </p>
        </div>

        <div className="constructor-form-guide-count">
          <span>SHOWING</span>
          <strong>{races.length}</strong>
          <small>RACES</small>
        </div>
      </div>

      <div className="constructor-form-guide-card">
        <div className="constructor-form-guide-list">
          {races.map((race: ConstructorHistory) => {
            const teamPosition = race.position;
            const racePoints = race.points ?? 0;

            return (
              <article
                className="constructor-form-race"
                key={`${team.id}-${race.round}`}
              >
                <div className="constructor-form-race-round">
                  <span>R{race.round}</span>

                  <small>
                    {race.country || "—"}
                  </small>
                </div>

                <div className="constructor-form-race-main">
                  <div className="constructor-form-race-title">
                    <div>
                      <span>CHAMPIONSHIP POSITION</span>

                      <strong
                        className={positionClass(
                          teamPosition,
                        )}
                      >
                        {getResultLabel(teamPosition)}
                      </strong>
                    </div>

                    <div className="constructor-form-race-points">
                      <Trophy size={15} />

                      <strong>
                        {formatPoints(racePoints)}
                      </strong>

                      <small>PTS</small>
                    </div>
                  </div>

                  <div className="constructor-form-race-bar">
                    <div
                      className="constructor-form-race-bar-fill"
                      style={{
                        width: `${Math.max(
                          4,
                          (racePoints / maxPoints) * 100,
                        )}%`,
                        background:
                          team.color || undefined,
                      }}
                    />
                  </div>

                  <div className="constructor-form-drivers">
                    {team.drivers.map(
                      (driver: ConstructorDriver) => {
                        const result = driverResult(
                          driver,
                          race.round,
                        );

                        return (
                          <div
                            className="constructor-form-driver"
                            key={`${race.round}-${driver.code}`}
                          >
                            <div className="constructor-form-driver-info">
                              <span className="constructor-form-driver-code">
                                {driver.code}
                              </span>

                              <span className="constructor-form-driver-name">
                                {driver.name}
                              </span>
                            </div>

                            <span
                              className={positionClass(
                                result?.position,
                              )}
                            >
                              {getResultLabel(
                                result?.position,
                              )}
                            </span>

                            <span className="constructor-form-driver-points">
                              {formatPoints(
                                result?.points ?? 0,
                              )}
                              <small> PTS</small>
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ConstructorFormGuide;
