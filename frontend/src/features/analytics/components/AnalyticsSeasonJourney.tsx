import { useMemo } from "react";

import { DriverImage, getTeamColor, formatNumber } from "../analytics.helpers";
import type { AnalyticsDriver } from "../analytics.types";
import "./AnalyticsSeasonJourney.css";

interface AnalyticsSeasonJourneyProps {
  drivers: AnalyticsDriver[];
}

function AnalyticsSeasonJourney({ drivers }: AnalyticsSeasonJourneyProps) {
  const journeyDrivers = useMemo(() => {
    return drivers
      .filter((driver) => driver.history.length > 0)
      .sort(
        (a, b) =>
          (a.championship.position ?? 999) - (b.championship.position ?? 999),
      );
  }, [drivers]);

  const journeyMaxPoints = useMemo(() => {
    if (!journeyDrivers.length) return 1;

    return Math.max(
      ...journeyDrivers.flatMap((driver) =>
        driver.history.map((item) => item.cumulative_points ?? 0),
      ),
      1,
    );
  }, [journeyDrivers]);

  return (
    <section className="analytics-section analytics-last">
      <div className="analytics-section-heading">
        <div>
          <h2>Points progression.</h2>
          <p>Championship points accumulated across the season.</p>
        </div>
      </div>

      <div className="journey-list">
        {journeyDrivers.map((driver) => {
          const history = driver.history;
          const latest = history[history.length - 1]?.cumulative_points ?? 0;
          const width = (latest / journeyMaxPoints) * 100;

          return (
            <div className="journey-row" key={driver.code}>
              <div className="journey-driver">
                <div className="journey-driver-identity">
                  <DriverImage code={driver.code} name={driver.name} size="small" />
                  <strong>{driver.code}</strong>
                </div>

                <span>{formatNumber(latest)} PTS</span>
              </div>

              <div
                className="journey-track"
                style={{ borderColor: `${getTeamColor(driver.team)}33` }}
              >
                <div
                  className="journey-fill"
                  style={{
                    width: `${width}%`,
                    background: getTeamColor(driver.team),
                    boxShadow: `0 0 10px ${getTeamColor(driver.team)}55`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default AnalyticsSeasonJourney;