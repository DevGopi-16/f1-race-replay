import {
  ArrowDown,
  ArrowUp,
  Minus,
  Trophy,
} from "lucide-react";

import { assetUrl } from "../constructors.api";
import type { ConstructorTeam } from "../constructors.types";

import "./ConstructorChampionshipBattle.css";

interface ConstructorChampionshipBattleProps {
  team: ConstructorTeam;
  teams: ConstructorTeam[];
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return value.toLocaleString("en-US");
}

function ConstructorChampionshipBattle({
  team,
  teams,
}: ConstructorChampionshipBattleProps) {
  const sortedTeams = [...teams].sort(
    (a, b) =>
      a.position - b.position ||
      b.points - a.points,
  );

  const leader =
    sortedTeams.find((entry) => entry.position === 1) ??
    sortedTeams[0] ??
    null;

  const ahead =
    sortedTeams.find(
      (entry) => entry.points > team.points,
    ) ?? null;

  const behind =
    [...sortedTeams]
      .reverse()
      .find(
        (entry) => entry.points < team.points,
      ) ?? null;

  const leaderGap =
    leader && leader.id !== team.id
      ? Math.max(0, leader.points - team.points)
      : 0;

  const gapToAhead = ahead
    ? Math.max(0, ahead.points - team.points)
    : 0;

  const gapToBehind = behind
    ? Math.max(0, team.points - behind.points)
    : 0;

  const maximumPoints = Math.max(
    ...sortedTeams.map((entry) => entry.points),
    1,
  );

  const positionChange =
    ahead && behind
      ? "IN THE FIGHT"
      : team.position === 1
        ? "CHAMPIONSHIP LEADER"
        : ahead
          ? "CHASING"
          : "PROTECTING";

  return (
    <section className="constructor-battle">
      <div className="constructors-section-heading">
        <div>
          <span className="constructors-section-kicker">
            CHAMPIONSHIP PICTURE
          </span>

          <h2>Championship battle</h2>
        </div>

        <span className="constructor-battle-status">
          {positionChange}
        </span>
      </div>

      <div className="constructor-battle-grid">
        <article
          className="constructor-battle-card constructor-battle-card--primary"
          style={
            {
              "--constructor-color":
                team.color || "#e10600",
            } as React.CSSProperties
          }
        >
          <div className="constructor-battle-card-top">
            <div>
              <span className="constructor-battle-label">
                CURRENT POSITION
              </span>

              <strong className="constructor-battle-position">
                P{team.position}
              </strong>
            </div>

            <div className="constructor-battle-team-logo">
              {team.teamLogo ? (
                <img
                  src={assetUrl(team.teamLogo)}
                  alt=""
                />
              ) : (
                <span>
                  {team.name.charAt(0)}
                </span>
              )}
            </div>
          </div>

          <h3>{team.name}</h3>

          <div className="constructor-battle-points">
            <strong>
              {formatNumber(team.points)}
            </strong>

            <span>POINTS</span>
          </div>

          <div className="constructor-battle-leader-gap">
            {leader?.id === team.id ? (
              <>
                <Trophy size={15} />
                <span>
                  Championship leader
                </span>
              </>
            ) : (
              <>
                <span>GAP TO LEADER</span>
                <strong>
                  {formatNumber(leaderGap)}
                </strong>
                <span>PTS</span>
              </>
            )}
          </div>
        </article>

        <article className="constructor-battle-card constructor-battle-card--ahead">
          <div className="constructor-battle-card-heading">
            <div>
              <span className="constructor-battle-label">
                TEAM AHEAD
              </span>

              <h3>
                {ahead?.name ?? "No team ahead"}
              </h3>
            </div>

            {ahead ? (
              <ArrowUp size={18} />
            ) : (
              <Minus size={18} />
            )}
          </div>

          {ahead ? (
            <>
              <div className="constructor-battle-competitor">
                <div className="constructor-battle-competitor-position">
                  P{ahead.position}
                </div>

                <div className="constructor-battle-competitor-logo">
                  {ahead.teamLogo ? (
                    <img
                      src={assetUrl(
                        ahead.teamLogo,
                      )}
                      alt=""
                    />
                  ) : (
                    <span>
                      {ahead.name.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="constructor-battle-competitor-points">
                  <strong>
                    {formatNumber(
                      ahead.points,
                    )}
                  </strong>
                  <span>PTS</span>
                </div>
              </div>

              <div className="constructor-battle-gap">
                <span>TO OVERTAKE</span>
                <strong>
                  {formatNumber(gapToAhead)}
                </strong>
                <span>PTS</span>
              </div>
            </>
          ) : (
            <p className="constructor-battle-empty">
              This constructor is currently
              leading the championship.
            </p>
          )}
        </article>

        <article className="constructor-battle-card constructor-battle-card--behind">
          <div className="constructor-battle-card-heading">
            <div>
              <span className="constructor-battle-label">
                TEAM BEHIND
              </span>

              <h3>
                {behind?.name ?? "No team behind"}
              </h3>
            </div>

            {behind ? (
              <ArrowDown size={18} />
            ) : (
              <Minus size={18} />
            )}
          </div>

          {behind ? (
            <>
              <div className="constructor-battle-competitor">
                <div className="constructor-battle-competitor-position">
                  P{behind.position}
                </div>

                <div className="constructor-battle-competitor-logo">
                  {behind.teamLogo ? (
                    <img
                      src={assetUrl(
                        behind.teamLogo,
                      )}
                      alt=""
                    />
                  ) : (
                    <span>
                      {behind.name.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="constructor-battle-competitor-points">
                  <strong>
                    {formatNumber(
                      behind.points,
                    )}
                  </strong>
                  <span>PTS</span>
                </div>
              </div>

              <div className="constructor-battle-gap">
                <span>ADVANTAGE</span>
                <strong>
                  {formatNumber(gapToBehind)}
                </strong>
                <span>PTS</span>
              </div>
            </>
          ) : (
            <p className="constructor-battle-empty">
              No constructor is currently
              behind this team.
            </p>
          )}
        </article>
      </div>

      <div className="constructor-field-card">
        <div className="constructor-field-header">
          <div>
            <span className="constructors-section-kicker">
              FULL GRID
            </span>

            <h3>VS field</h3>
          </div>

          <span className="constructor-field-total">
            {sortedTeams.length} TEAMS
          </span>
        </div>

        <div className="constructor-field-list">
          {sortedTeams.map((entry) => {
            const width =
              (entry.points /
                maximumPoints) *
              100;

            const isSelected =
              entry.id === team.id;

            const isLeader =
              entry.position === 1;

            return (
              <div
                className={`constructor-field-row${
                  isSelected
                    ? " is-selected"
                    : ""
                }`}
                key={entry.id}
                style={
                  {
                    "--constructor-color":
                      entry.color ||
                      "#e10600",
                    "--field-width": `${width}%`,
                  } as React.CSSProperties
                }
              >
                <div className="constructor-field-rank">
                  {entry.position}
                </div>

                <div className="constructor-field-team">
                  <div className="constructor-field-logo">
                    {entry.teamLogo ? (
                      <img
                        src={assetUrl(
                          entry.teamLogo,
                        )}
                        alt=""
                      />
                    ) : (
                      <span>
                        {entry.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div>
                    <strong>
                      {entry.name}
                    </strong>

                    {isSelected && (
                      <span className="constructor-field-you">
                        SELECTED
                      </span>
                    )}

                    {isLeader && (
                      <span className="constructor-field-leader">
                        <Trophy size={11} />
                        LEADER
                      </span>
                    )}
                  </div>
                </div>

                <div className="constructor-field-bar">
                  <span />
                </div>

                <div className="constructor-field-points">
                  <strong>
                    {formatNumber(
                      entry.points,
                    )}
                  </strong>

                  <span>PTS</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ConstructorChampionshipBattle;
