import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import {
  DriverImage,
  getTeamColor,
  getCountryFlag,
  formatNumber,
  formatAverageFinish,
} from "../analytics.helpers";
import type { TeammateBattle, TeammateBattleDriver } from "../analytics.types";
import "./AnalyticsTeammateBattle.css";

interface AnalyticsTeammateBattleProps {
  battles: TeammateBattle[];
}

function TeammateStat({
  left,
  label,
  right,
  leftColor,
  rightColor,
}: {
  left: string | number;
  label: string;
  right: string | number;
  leftColor: string;
  rightColor: string;
}) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  const maxValue = Math.max(
    Number.isFinite(leftNumber) ? leftNumber : 0,
    Number.isFinite(rightNumber) ? rightNumber : 0,
    1,
  );

  const leftWidth = Number.isFinite(leftNumber)
    ? Math.max(4, (leftNumber / maxValue) * 100)
    : 0;

  const rightWidth = Number.isFinite(rightNumber)
    ? Math.max(4, (rightNumber / maxValue) * 100)
    : 0;

  return (
    <div className="teammate-stat-row">
      <div className="teammate-stat-side teammate-stat-side-left">
        <strong style={{ color: leftColor }}>{left}</strong>

        <div
          className="teammate-stat-bar teammate-stat-bar-left"
          style={{ borderColor: `${leftColor}55` }}
        >
          <span
            style={{
              width: `${leftWidth}%`,
              backgroundColor: leftColor,
              boxShadow: `0 0 14px ${leftColor}66`,
            }}
          />
        </div>
      </div>

      <span className="teammate-stat-label">{label}</span>

      <div className="teammate-stat-side teammate-stat-side-right">
        <div
          className="teammate-stat-bar teammate-stat-bar-right"
          style={{ borderColor: `${rightColor}55` }}
        >
          <span
            style={{
              width: `${rightWidth}%`,
              backgroundColor: rightColor,
              boxShadow: `0 0 14px ${rightColor}66`,
            }}
          />
        </div>

        <strong style={{ color: rightColor }}>{right}</strong>
      </div>
    </div>
  );
}

function TeammateDriverHeader({
  driver,
  side,
  leader,
  onClick,
}: {
  driver: TeammateBattleDriver;
  side: "left" | "right";
  leader: boolean;
  onClick: () => void;
}) {
  const flag = getCountryFlag(driver.country);
  const accent = getTeamColor(driver.team);

  const style = {
    "--teammate-accent": accent,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`teammate-driver-header teammate-driver-header-${side}`}
      style={style}
      onClick={onClick}
    >
      <DriverImage code={driver.code} name={driver.name} size="normal" />

      <div className="teammate-driver-header-copy">
        <div className="teammate-driver-name-line">
          {side === "left" && (
            <span className="teammate-driver-flag">{flag}</span>
          )}

          <span className="teammate-driver-full-name">{driver.name}</span>

          {side === "right" && (
            <span className="teammate-driver-flag">{flag}</span>
          )}
        </div>

        <div className="teammate-driver-code" style={{ color: accent }}>
          {driver.code}
        </div>

        {leader && (
          <span
            className="teammate-driver-leader"
            style={{
              color: accent,
              borderColor: `${accent}66`,
              background: `${accent}14`,
            }}
          >
            LEADER
          </span>
        )}
      </div>
    </button>
  );
}

function AnalyticsTeammateBattle({ battles }: AnalyticsTeammateBattleProps) {
  const navigate = useNavigate();

  return (
    <section className="analytics-section">
      <div className="analytics-section-heading">
        <div>
          <h2>Head to head.</h2>
          <p>Championship comparison between teammates.</p>
        </div>
      </div>

      <div className="teammate-grid">
        {battles.map((battle) => {
          const left = battle.driver;
          const right = battle.teammate;

          const leftColor = getTeamColor(left.team);
          const rightColor = getTeamColor(right.team);

          const leftLeader = battle.leader === left.code;
          const rightLeader = battle.leader === right.code;

          return (
            <article
              className="teammate-card"
              key={`${left.code}-${right.code}`}
              style={
                {
                  "--teammate-left-color": leftColor,
                  "--teammate-right-color": rightColor,
                } as CSSProperties
              }
            >
              <div className="teammate-card-header">
                <TeammateDriverHeader
                  driver={left}
                  side="left"
                  leader={leftLeader}
                  onClick={() => navigate(`/drivers/${left.code}`)}
                />

                <div className="teammate-vs">VS</div>

                <TeammateDriverHeader
                  driver={right}
                  side="right"
                  leader={rightLeader}
                  onClick={() => navigate(`/drivers/${right.code}`)}
                />
              </div>

              <div className="teammate-statistics">
                <TeammateStat
                  left={left.position ?? "—"}
                  label="STANDING"
                  right={right.position ?? "—"}
                  leftColor={leftColor}
                  rightColor={rightColor}
                />

                <TeammateStat
                  left={formatNumber(left.points)}
                  label="PTS"
                  right={formatNumber(right.points)}
                  leftColor={leftColor}
                  rightColor={rightColor}
                />

                <TeammateStat
                  left={left.wins}
                  label="WINS"
                  right={right.wins}
                  leftColor={leftColor}
                  rightColor={rightColor}
                />

                <TeammateStat
                  left={left.podiums}
                  label="PODIUMS"
                  right={right.podiums}
                  leftColor={leftColor}
                  rightColor={rightColor}
                />

                <TeammateStat
                  left={left.poles}
                  label="POLES"
                  right={right.poles}
                  leftColor={leftColor}
                  rightColor={rightColor}
                />

                <TeammateStat
                  left={left.fastest_laps}
                  label="FASTEST LAPS"
                  right={right.fastest_laps}
                  leftColor={leftColor}
                  rightColor={rightColor}
                />

                <TeammateStat
                  left={formatAverageFinish(left.avg_finish)}
                  label="AVG FINISH"
                  right={formatAverageFinish(right.avg_finish)}
                  leftColor={leftColor}
                  rightColor={rightColor}
                />
              </div>
            </article>
          );
        })}

        {battles.length === 0 && (
          <div className="analytics-empty">
            No teammate battle data is available.
          </div>
        )}
      </div>
    </section>
  );
}

export default AnalyticsTeammateBattle;