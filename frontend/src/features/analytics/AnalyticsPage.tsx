import { useEffect, useState } from "react";

import PageTransition from "../../components/motion/PageTransition";
import PageContainer from "../../components/layout/PageContainer";
import PageHeader from "../../components/layout/PageHeader";

import { fetchAnalytics } from "./analytics.api";
import type { AnalyticsResponse } from "./analytics.types";

import AnalyticsOverview from "./components/AnalyticsOverview";
import AnalyticsStandings from "./components/AnalyticsStandings";
import AnalyticsPerformance from "./components/AnalyticsPerformance";
import AnalyticsRacecraft from "./components/AnalyticsRacecraft";
import AnalyticsTeammateBattle from "./components/AnalyticsTeammateBattle";
import AnalyticsSeasonJourney from "./components/AnalyticsSeasonJourney";

import "./AnalyticsShared.css";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        const payload = await fetchAnalytics();

        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load analytics.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <PageTransition>
        <PageContainer>
          <div className="analytics-loading">
            <div className="analytics-loading-inner">
              <span className="analytics-loading-kicker">F1 RACE REPLAY</span>
              <div className="analytics-loader" />
              <span>Loading season analytics...</span>
            </div>
          </div>
        </PageContainer>
      </PageTransition>
    );
  }

  if (error || !data) {
    return (
      <PageTransition>
        <PageContainer>
          <div className="analytics-error">
            <span>ANALYTICS</span>
            <h2>Unable to load season data.</h2>
            <p>{error || "No analytics data available."}</p>
          </div>
        </PageContainer>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageContainer>
        <div className="analytics-page">
          <PageHeader
            eyebrow={`08 / Analytics · ${data.meta.season}`}
            title="Season Analytics"
            description={`Performance intelligence from the ${data.meta.season} Formula 1 season through Round ${data.meta.round ?? "—"}.`}
          />

          <AnalyticsOverview overview={data.overview} />

          <AnalyticsStandings standings={data.standings} round={data.meta.round} />

          <AnalyticsPerformance drivers={data.drivers} />

          <AnalyticsRacecraft drivers={data.drivers} />

          <AnalyticsTeammateBattle battles={data.teammate_battles} />

          <AnalyticsSeasonJourney drivers={data.drivers} />
        </div>
      </PageContainer>
    </PageTransition>
  );
}