import { useMemo } from "react";

import { useHomeDrivers } from "../home.api";

interface TeamStanding {
  name: string;
  logo: string;
  color: string;
  points: number;
  drivers: string[];
}

function teamStandings(
  drivers: NonNullable<ReturnType<typeof useHomeDrivers>["data"]>,
): TeamStanding[] {
  const teams = new Map<string, TeamStanding>();

  for (const driver of drivers) {
    if (!driver.team) continue;

    const standing = teams.get(driver.team) ?? {
      name: driver.team,
      logo: driver.teamLogo,
      color: driver.teamColor,
      points: 0,
      drivers: [],
    };
    standing.points += driver.points;
    standing.drivers.push(driver.familyName);
    teams.set(driver.team, standing);
  }

  return [...teams.values()].sort((a, b) => b.points - a.points);
}

export default function ConstructorPulse() {
  const query = useHomeDrivers();
  const teams = useMemo(
    () => teamStandings(query.data ?? []),
    [query.data],
  );
  const leaderPoints = teams[0]?.points ?? 0;

  return (
    <section
      className="home-constructor-pulse"
      aria-labelledby="home-constructor-pulse-title"
    >
      <header className="home-constructor-pulse-header">
        <div>
          <span>SEASON DATA</span>
          <h3 id="home-constructor-pulse-title">CONSTRUCTOR STANDINGS</h3>
        </div>
        <span>{new Date().getFullYear()} CHAMPIONSHIP</span>
      </header>

      {query.isLoading && (
        <p className="home-constructor-pulse-message" role="status">
          Loading current team standings…
        </p>
      )}

      {query.isError && (
        <p className="home-constructor-pulse-message" role="alert">
          Current team standings are temporarily unavailable.
        </p>
      )}

      {!query.isLoading && !query.isError && teams.length === 0 && (
        <p className="home-constructor-pulse-message">
          Team standings will appear when season data is available.
        </p>
      )}

      {teams.length > 0 && (
        <ol className="home-constructor-pulse-list">
          {teams.slice(0, 3).map((team, index) => (
            <li key={team.name}>
              <span className="home-constructor-pulse-position">
                {String(index + 1).padStart(2, "0")}
              </span>
              {team.logo && (
                <img src={team.logo} alt="" aria-hidden="true" />
              )}
              <div className="home-constructor-pulse-team">
                <div>
                  <strong>{team.name}</strong>
                  <span>{team.drivers.join(" · ")}</span>
                </div>
                <div className="home-constructor-pulse-bar" aria-hidden="true">
                  <span
                    style={{
                      width: `${leaderPoints ? (team.points / leaderPoints) * 100 : 0}%`,
                      backgroundColor: team.color,
                    }}
                  />
                </div>
              </div>
              <strong className="home-constructor-pulse-points">
                {team.points.toLocaleString()} <small>PTS</small>
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
