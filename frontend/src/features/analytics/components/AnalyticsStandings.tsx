import { useNavigate } from "react-router-dom";

import { DriverImage, TeamLogo, formatNumber } from "../analytics.helpers";
import type { Standing } from "../analytics.types";
import "./AnalyticsStandings.css";

interface AnalyticsStandingsProps {
  standings: Standing[];
  round: number | null;
}

function AnalyticsStandings({ standings, round }: AnalyticsStandingsProps) {
  const navigate = useNavigate();

  return (
    <section className="analytics-section">
      <div className="analytics-section-heading">
        <div>
          <h2>Driver standings.</h2>
          <p>The championship picture after Round {round ?? "—"}.</p>
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
            {standings.map((driver) => (
              <tr
                key={driver.code}
                className="analytics-driver-row"
                onClick={() => navigate(`/drivers/${driver.code}`)}
                tabIndex={0}
                role="link"
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/drivers/${driver.code}`);
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
                      <span>{driver.code}</span>
                      <strong>{driver.name}</strong>
                    </div>
                  </div>
                </td>

                <td>
                  <div className="analytics-team-cell">
                    <TeamLogo team={driver.team} size="normal" />
                    <span>{driver.team || "—"}</span>
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
  );
}

export default AnalyticsStandings;