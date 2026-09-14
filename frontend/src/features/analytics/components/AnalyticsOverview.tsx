import { formatNumber } from "../analytics.helpers";
import type { AnalyticsResponse } from "../analytics.types";
import "./AnalyticsOverview.css";

interface AnalyticsOverviewProps {
  overview: AnalyticsResponse["overview"];
}

function AnalyticsOverview({ overview }: AnalyticsOverviewProps) {
  return (
    <section className="analytics-overview">
      <div className="analytics-stat">
        <span className="analytics-stat-label">Drivers</span>
        <strong>{overview.drivers}</strong>
        <span className="analytics-stat-meta">Championship field</span>
      </div>

      <div className="analytics-stat">
        <span className="analytics-stat-label">Total Points</span>
        <strong>{formatNumber(overview.total_points)}</strong>
        <span className="analytics-stat-meta">Season points scored</span>
      </div>

      <div className="analytics-stat">
        <span className="analytics-stat-label">Wins</span>
        <strong>{overview.total_wins}</strong>
        <span className="analytics-stat-meta">Race victories</span>
      </div>

      <div className="analytics-stat">
        <span className="analytics-stat-label">Podiums</span>
        <strong>{overview.total_podiums}</strong>
        <span className="analytics-stat-meta">Top-three finishes</span>
      </div>

      <div className="analytics-stat">
        <span className="analytics-stat-label">Poles</span>
        <strong>{overview.total_poles}</strong>
        <span className="analytics-stat-meta">Pole positions</span>
      </div>
    </section>
  );
}

export default AnalyticsOverview;