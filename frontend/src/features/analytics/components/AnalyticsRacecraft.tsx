import { DriverImage } from "../analytics.helpers";
import type { AnalyticsDriver } from "../analytics.types";
import "./AnalyticsRacecraft.css";

interface AnalyticsRacecraftProps {
  drivers: AnalyticsDriver[];
}

function AnalyticsRacecraft({ drivers }: AnalyticsRacecraftProps) {
  return (
    <section className="analytics-section">
      <div className="analytics-section-heading">
        <div>
          <h2>On-track movement.</h2>
          <p>Overtakes, position movement and pit-stop activity.</p>
        </div>
      </div>

      <div className="racecraft-grid">
        {drivers.map((driver) => (
          <article className="racecraft-card" key={driver.code}>
            <div className="racecraft-card-top">
              <DriverImage code={driver.code} name={driver.name} size="small" />

              <div>
                <strong>{driver.code}</strong>
                <span>{driver.name}</span>
              </div>
            </div>

            <div className="racecraft-metrics">
              <div>
                <span>OVERTAKES</span>
                <strong>{driver.racecraft.overtakes}</strong>
              </div>

              <div>
                <span>GAINED</span>
                <strong
                  className={
                    driver.racecraft.positions_gained >= 0
                      ? "metric-positive"
                      : "metric-negative"
                  }
                >
                  {driver.racecraft.positions_gained >= 0 ? "+" : ""}
                  {driver.racecraft.positions_gained}
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
                <strong>{driver.racecraft.pit_stops}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AnalyticsRacecraft;