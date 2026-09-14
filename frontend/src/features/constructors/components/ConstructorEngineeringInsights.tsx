import {
  AlertTriangle,
  Gauge,
  ShieldCheck,
  Trophy,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import type { CSSProperties } from "react";

import type { ConstructorTeam } from "../constructors.types";

import "./ConstructorEngineeringInsights.css";

interface ConstructorEngineeringInsightsProps {
  team: ConstructorTeam;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(
  value: number | null | undefined,
  maximumFractionDigits = 0,
) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function getStrongestRound(team: ConstructorTeam) {
  if (!team.history?.length) {
    return null;
  }

  return team.history.reduce((best, current) => {
    return current.points > best.points ? current : best;
  });
}

function getLowestRound(team: ConstructorTeam) {
  if (!team.history?.length) {
    return null;
  }

  return team.history.reduce((lowest, current) => {
    return current.points < lowest.points ? current : lowest;
  });
}

function getTopScorer(team: ConstructorTeam) {
  if (!team.drivers?.length) {
    return null;
  }

  return team.drivers.reduce((best, current) => {
    return current.points > best.points ? current : best;
  });
}

function getAverageRoundPoints(team: ConstructorTeam) {
  if (!team.history?.length) {
    return 0;
  }

  const total = team.history.reduce(
    (sum, round) => sum + (Number.isFinite(round.points) ? round.points : 0),
    0,
  );

  return total / team.history.length;
}

function getInsightSummary(
  team: ConstructorTeam,
  strongestRound: ConstructorTeam["history"][number] | null,
  lowestRound: ConstructorTeam["history"][number] | null,
  topScorer: ConstructorTeam["drivers"][number] | null,
) {
  const averagePoints = getAverageRoundPoints(team);

  if (!team.history?.length) {
    return "Season engineering data is not available yet.";
  }

  if (team.reliability_rate >= 95 && averagePoints > 20) {
    return `${team.name} combines strong race execution with exceptional reliability, giving the package a consistently high scoring ceiling.`;
  }

  if (team.reliability_rate >= 90 && averagePoints > 15) {
    return `${team.name} is delivering a balanced package, with dependable race finishes supporting a strong points return across the season.`;
  }

  if (team.reliability_rate < 80) {
    return `${team.name} has shown competitive pace, but reliability losses are limiting the conversion of performance into championship points.`;
  }

  if (
    strongestRound &&
    lowestRound &&
    strongestRound.points >= averagePoints * 1.7
  ) {
    return `${team.name} has demonstrated significant peak performance, although the spread between its strongest and weakest rounds suggests room for greater consistency.`;
  }

  if (topScorer && topScorer.points >= team.points * 0.65) {
    return `${topScorer.name} is carrying a large share of the team's championship points, making driver consistency a major strength of the package.`;
  }

  return `${team.name} is producing a broadly consistent championship campaign, with race execution and scoring efficiency defining its current performance profile.`;
}

function InsightCard({
  eyebrow,
  title,
  value,
  detail,
  icon,
  accent,
}: {
  eyebrow: string;
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  const style = {
    "--insight-accent": accent ?? "var(--color-accent, #e10600)",
  } as CSSProperties;

  return (
    <article
      className="constructor-engineering-insight-card"
      style={style}
    >
      <div className="constructor-engineering-insight-icon">
        {icon}
      </div>

      <div className="constructor-engineering-insight-content">
        <span className="constructor-engineering-insight-eyebrow">
          {eyebrow}
        </span>

        <h3>{title}</h3>

        <strong>{value}</strong>

        <p>{detail}</p>
      </div>
    </article>
  );
}

function ConstructorEngineeringInsights({
  team,
}: ConstructorEngineeringInsightsProps) {
  const strongestRound = getStrongestRound(team);
  const lowestRound = getLowestRound(team);
  const topScorer = getTopScorer(team);

  const averagePoints = getAverageRoundPoints(team);

  const reliability =
    team.reliability_rate != null
      ? clamp(team.reliability_rate)
      : clamp(100 - team.dnfs * 15);

  const strongestDelta = strongestRound
    ? strongestRound.points - averagePoints
    : 0;

  const lowestDelta = lowestRound
    ? averagePoints - lowestRound.points
    : 0;

  const summary = getInsightSummary(
    team,
    strongestRound,
    lowestRound,
    topScorer,
  );

  return (
    <section className="constructor-engineering-insights">
      <div className="constructor-engineering-header">
        <div>
          <span className="constructor-engineering-kicker">
            ENGINEERING ANALYSIS
          </span>

          <h2>Engineering Insights</h2>

          <p>
            Key performance signals from {team.name}'s championship
            campaign.
          </p>
        </div>

        <div className="constructor-engineering-header-mark">
          <Gauge size={20} />
          <span>DATA-DRIVEN</span>
        </div>
      </div>

      <div className="constructor-engineering-summary">
        <div className="constructor-engineering-summary-icon">
          <ShieldCheck size={21} />
        </div>

        <div>
          <span>ENGINEERING READOUT</span>
          <p>{summary}</p>
        </div>
      </div>

      <div className="constructor-engineering-grid">
        <InsightCard
          eyebrow="PEAK PERFORMANCE"
          title="Strongest Round"
          value={
            strongestRound
              ? `R${strongestRound.round}`
              : "—"
          }
          detail={
            strongestRound
              ? `${formatNumber(strongestRound.points)} points scored · ${strongestDelta >= 0 ? "+" : ""}${formatNumber(strongestDelta, 1)} vs season average`
              : "No round data available."
          }
          icon={<TrendingUp size={20} />}
          accent="var(--color-accent, #e10600)"
        />

        <InsightCard
          eyebrow="LOWEST RETURN"
          title="Lowest Scoring Round"
          value={
            lowestRound
              ? `R${lowestRound.round}`
              : "—"
          }
          detail={
            lowestRound
              ? `${formatNumber(lowestRound.points)} points scored · ${formatNumber(lowestDelta, 1)} below season average`
              : "No round data available."
          }
          icon={<TrendingDown size={20} />}
          accent="#8b93a1"
        />

        <InsightCard
          eyebrow="CHAMPIONSHIP CONTRIBUTION"
          title="Top Scorer"
          value={topScorer?.code ?? "—"}
          detail={
            topScorer
              ? `${topScorer.name} · ${formatNumber(topScorer.points)} points`
              : "No driver data available."
          }
          icon={<Trophy size={20} />}
          accent="#f5c451"
        />

        <InsightCard
          eyebrow="SYSTEM DEPENDABILITY"
          title="Reliability"
          value={`${formatNumber(reliability, 1)}%`}
          detail={`${formatNumber(team.dnfs)} DNFs · ${formatNumber(team.mechanical_failures)} mechanical failures`}
          icon={<AlertTriangle size={20} />}
          accent="#63c7a7"
        />
      </div>

      <div className="constructor-engineering-metrics">
        <div className="constructor-engineering-metric">
          <div className="constructor-engineering-metric-top">
            <span>AVERAGE POINTS / ROUND</span>
            <strong>{formatNumber(averagePoints, 1)}</strong>
          </div>

          <div className="constructor-engineering-track">
            <span
              style={{
                width: `${clamp(
                  averagePoints > 0
                    ? (averagePoints / 50) * 100
                    : 0,
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="constructor-engineering-metric">
          <div className="constructor-engineering-metric-top">
            <span>RELIABILITY</span>
            <strong>{formatNumber(reliability, 1)}%</strong>
          </div>

          <div className="constructor-engineering-track">
            <span
              style={{
                width: `${reliability}%`,
              }}
            />
          </div>
        </div>

        <div className="constructor-engineering-metric">
          <div className="constructor-engineering-metric-top">
            <span>CHAMPIONSHIP POINTS</span>
            <strong>{formatNumber(team.points, 1)}</strong>
          </div>

          <div className="constructor-engineering-track">
            <span
              style={{
                width: `${clamp(
                  (team.points / 500) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default ConstructorEngineeringInsights;
