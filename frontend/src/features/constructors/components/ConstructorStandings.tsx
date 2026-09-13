import type { CSSProperties } from "react";
import { ArrowDownAZ, ChevronRight, Trophy } from "lucide-react";

import { assetUrl } from "../constructors.api";
import { getTeamColor } from "../constructors.colors";
import type { ConstructorTeam } from "../constructors.types";
import type { SortMode } from "../ConstructorsPage";

interface ConstructorStandingsProps {
  teams: ConstructorTeam[];
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onSelectTeam: (team: ConstructorTeam) => void;
}

function formatNumber(
  value: number | null | undefined,
  maximumFractionDigits = 0,
) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits,
  });
}

function ConstructorStandings({
  teams,
  sortMode,
  onSortChange,
  onSelectTeam,
}: ConstructorStandingsProps) {
  const leaderPoints = Math.max(
    ...teams.map((team) => team.points ?? 0),
    1,
  );

  return (
    <section className="constructors-section">
      <div className="constructors-section-heading">
        <div>
          <span className="constructors-section-kicker">
            01 / STANDINGS
          </span>

          <h2>Constructor standings</h2>
        </div>

        <div className="constructors-sort">
          <button
            type="button"
            className={sortMode === "points" ? "active" : ""}
            onClick={() => onSortChange("points")}
          >
            <Trophy size={14} />
            Points
          </button>

          <button
            type="button"
            className={sortMode === "wins" ? "active" : ""}
            onClick={() => onSortChange("wins")}
          >
            Wins
          </button>

          <button
            type="button"
            className={sortMode === "name" ? "active" : ""}
            onClick={() => onSortChange("name")}
          >
            <ArrowDownAZ size={14} />
            Name
          </button>
        </div>
      </div>

      <div className="constructors-layout">
        <div className="constructors-list">
          {teams.map((team) => {
            const style = {
              "--team-color": getTeamColor(team),
            } as CSSProperties;

            const points = team.points ?? 0;

            const progress = Math.max(
              0,
              Math.min(100, (points / leaderPoints) * 100),
            );

            return (
              <button
                key={team.id}
                type="button"
                className="constructor-row"
                onClick={() => onSelectTeam(team)}
                style={style}
              >
                <span className="constructor-position">
                  {String(team.position).padStart(2, "0")}
                </span>

                <span className="constructor-color" />

                <span className="constructor-logo">
                  {team.teamLogo && (
                    <img
                      src={assetUrl(team.teamLogo)}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </span>

                <span className="constructor-info">
                  <strong>{team.name}</strong>

                  <small>
                  {team.drivers?.length
                  ? team.drivers.map((d) => d.name).join("•")
                  : team.nationality}
                  </small>

                  <span className="constructor-progress">
                    <span style={{ width: `${progress}%` }} />
                  </span>
                </span>

                <span className="constructor-stat">
                  <strong>{formatNumber(team.points)}</strong>
                  <small>POINTS</small>
                </span>

                <span className="constructor-stat compact">
                  <strong>{team.wins}</strong>
                  <small>WINS</small>
                </span>

                <ChevronRight
                  className="constructor-chevron"
                  size={17}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ConstructorStandings;
