import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  DriverImage,
  TeamLogo,
  getTeamColor,
  getPerformanceScore,
} from "../analytics.helpers";
import type { AnalyticsDriver } from "../analytics.types";
import "./AnalyticsPerformance.css";

interface AnalyticsPerformanceProps {
  drivers: AnalyticsDriver[];
}

function AnalyticsPerformance({ drivers }: AnalyticsPerformanceProps) {
  const navigate = useNavigate();

  const performanceDrivers = useMemo(() => {
    return [...drivers]
      .map((driver) => ({
        ...driver,
        score: getPerformanceScore(driver.performance),
      }))
      .filter(
        (driver): driver is AnalyticsDriver & { score: number } =>
          driver.score !== null,
      )
      .sort((a, b) => b.score - a.score);
  }, [drivers]);

  return (
    <section className="analytics-section">
      <div className="analytics-section-heading">
        <div>
          <h2>Who&apos;s performing?</h2>
          <p>
            Composite driver performance based on the existing season model.
          </p>
        </div>
      </div>

      <div className="performance-grid">
        {performanceDrivers.length === 0 && (
          <div className="analytics-empty">
            Performance index data is not available yet.
          </div>
        )}

        {performanceDrivers.map((driver, index) => {
          const rank = index + 1;
          const score = driver.score;
          const normalizedScore = Math.min(100, Math.max(0, score));
          const isTopThree = rank <= 3;
          const teamColor = getTeamColor(driver.team);

          return (
            <article
              className={[
                "performance-card",
                isTopThree ? "performance-card-top" : "",
                rank === 1 ? "performance-card-p1" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={driver.code}
              onClick={() => navigate(`/drivers/${driver.code}`)}
              style={{ "--performance-accent": teamColor } as React.CSSProperties}
            >
              <div className="performance-card-top-row">
                <div className="performance-rank-number">
                  {String(rank).padStart(2, "0")}
                </div>

                {isTopThree && (
                  <span className="performance-status">
                    {rank === 1 ? "LEADER" : `P${rank}`}
                  </span>
                )}
              </div>

              <div className="performance-driver">
                <DriverImage code={driver.code} name={driver.name} size="normal" />

                <div className="performance-driver-identity">
                  <strong>{driver.code}</strong>
                  <span>{driver.name}</span>

                  <div className="performance-team">
                    <TeamLogo team={driver.team} size="small" />
                    <span>{driver.team || "Unknown Team"}</span>
                  </div>
                </div>
              </div>

              <div className="performance-visual">
                <div className="performance-bar-header">
                  <span>PERFORMANCE</span>
                  <strong className="performance-score">{score.toFixed(1)}</strong>
                </div>

                <div
                  className="performance-track"
                  style={{ borderColor: `${teamColor}33` }}
                >
                  <div className="performance-track-grid" aria-hidden="true" />

                  <div
                    className="performance-fill"
                    style={{
                      width: `${normalizedScore}%`,
                      background: teamColor,
                      boxShadow: `0 0 10px ${teamColor}55`,
                    }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default AnalyticsPerformance;