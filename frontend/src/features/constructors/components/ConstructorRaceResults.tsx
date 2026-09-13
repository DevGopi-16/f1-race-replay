import { Flag, Trophy } from "lucide-react";

import type {
  ConstructorDriver,
  ConstructorDriverHistory,
  ConstructorHistory,
  ConstructorTeam,
} from "../constructors.types";

interface ConstructorRaceResultsProps {
  team: ConstructorTeam;
}

interface RaceResult {
  round: number;
  country: string;
  teamPoints: number;
  cumulativePoints: number;
  teamPosition: number | null;
  drivers: Array<{
    driver: ConstructorDriver;
    result: ConstructorDriverHistory | null;
  }>;
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US");
}

function getPositionClass(position: number | null) {
  if (position == null || position <= 0) return "is-muted";
  if (position === 1) return "is-p1";
  if (position === 2) return "is-p2";
  if (position === 3) return "is-p3";
  if (position > 10) return "is-low";
  return "";
}

function formatPosition(position: number | null) {
  if (position == null || position <= 0) return "—";
  return `P${position}`;
}

function driverHistoryForRound(
  driver: ConstructorDriver,
  round: number,
) {
  return (
    driver.history?.find((result) => result.round === round) ??
    null
  );
}

function buildRaceResults(
  team: ConstructorTeam,
): RaceResult[] {
  const history = [...(team.history ?? [])].sort(
    (a, b) => a.round - b.round,
  );

  return history.map((race: ConstructorHistory) => ({
    round: race.round,
    country: race.country || "—",
    teamPoints: race.points ?? 0,
    cumulativePoints: race.cumulative_points ?? 0,
    teamPosition:
      race.position != null && race.position > 0
        ? race.position
        : null,
    drivers: (team.drivers ?? []).map((driver) => ({
      driver,
      result: driverHistoryForRound(driver, race.round),
    })),
  }));
}

function ConstructorRaceResults({
  team,
}: ConstructorRaceResultsProps) {
  const races = buildRaceResults(team);

  const maxRoundPoints = Math.max(
    ...races.map((race) => race.teamPoints),
    1,
  );

  if (races.length === 0) {
    return (
      <section className="constructor-profile-card constructor-race-results">
        <div className="constructor-card-heading">
          <div>
            <span>04 / RACE PERFORMANCE</span>
            <h2>Race-by-race results</h2>
          </div>
        </div>

        <div className="constructor-race-results-empty">
          <Flag size={22} />
          <span>No race results available yet.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="constructor-profile-card constructor-race-results">
      <div className="constructor-card-heading">
        <div>
          <span>04 / RACE PERFORMANCE</span>
          <h2>Race-by-race results</h2>
        </div>

        <div className="constructor-race-results-summary">
          <strong>{races.length}</strong>
          <span>ROUNDS</span>
        </div>
      </div>

      <div className="constructor-race-table-wrap">
        <div className="constructor-race-table">
          <div className="constructor-race-table-head">
            <span>ROUND</span>
            <span>GRAND PRIX</span>
            <span>RESULT</span>
            <span>DRIVERS</span>
            <span>POINTS</span>
            <span>TOTAL</span>
          </div>

          <div className="constructor-race-table-body">
            {races.map((race) => {
              const pointsWidth =
                (race.teamPoints / maxRoundPoints) * 100;

              return (
                <article
                  className="constructor-race-row"
                  key={race.round}
                >
                  <div className="constructor-race-round">
                    <span>R{String(race.round).padStart(2, "0")}</span>
                  </div>

                  <div className="constructor-race-event">
                    <span className="constructor-race-event-flag">
                      <Flag size={13} />
                    </span>

                    <div>
                      <strong>{race.country}</strong>
                      <small>ROUND {race.round}</small>
                    </div>
                  </div>

                  <div className="constructor-race-position">
                    {race.teamPosition === 1 && (
                      <Trophy size={13} />
                    )}

                    <span
                      className={getPositionClass(
                        race.teamPosition,
                      )}
                    >
                      {formatPosition(race.teamPosition)}
                    </span>
                  </div>

                  <div className="constructor-race-drivers">
                    {race.drivers.map(
                      ({ driver, result }) => {
                        const position =
                          result?.position ?? null;

                        return (
                          <div
                            className="constructor-race-driver"
                            key={driver.code}
                          >
                            <span className="constructor-race-driver-code">
                              {driver.code}
                            </span>

                            <span
                              className={`constructor-race-driver-position ${getPositionClass(
                                position,
                              )}`}
                            >
                              {formatPosition(position)}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>

                  <div className="constructor-race-points">
                    <div className="constructor-race-points-value">
                      <strong>
                        {formatNumber(race.teamPoints)}
                      </strong>
                      <span>PTS</span>
                    </div>

                    <div className="constructor-race-points-track">
                      <span
                        style={{
                          width: `${Math.max(
                            race.teamPoints > 0
                              ? pointsWidth
                              : 0,
                            race.teamPoints > 0
                              ? 4
                              : 0,
                          )}%`,
                          backgroundColor: team.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="constructor-race-total">
                    <strong>
                      {formatNumber(
                        race.cumulativePoints,
                      )}
                    </strong>
                    <span>TOTAL</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <div className="constructor-race-mobile-note">
        <span>SCROLL</span>
        <span>Swipe horizontally to view all race data</span>
      </div>
    </section>
  );
}

export default ConstructorRaceResults;
