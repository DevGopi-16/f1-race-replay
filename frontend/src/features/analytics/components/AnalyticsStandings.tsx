import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  DriverImage,
  TeamLogo,
  formatNumber,
  getTeamColor,
} from "../analytics.helpers";
import type { Standing } from "../analytics.types";
import "./AnalyticsStandings.css";

interface AnalyticsStandingsProps {
  standings: Standing[];
  round: number | null;
}

type SortKey = "position" | "points" | "wins" | "podiums" | "poles";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "position", label: "Position" },
  { key: "points", label: "Points" },
  { key: "wins", label: "Wins" },
  { key: "podiums", label: "Podiums" },
  { key: "poles", label: "Poles" },
];

function AnalyticsStandings({ standings, round }: AnalyticsStandingsProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    if (!sortOpen) return;
    const close = () => setSortOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [sortOpen]);

  const sortedStandings = useMemo(() => {
    const list = [...standings];

    list.sort((a, b) => {
      if (sortKey === "position") {
        return (a.position ?? 999) - (b.position ?? 999);
      }

      return b[sortKey] - a[sortKey];
    });

    return list;
  }, [standings, sortKey]);

  return (
    <section className="analytics-section">
      <div className="analytics-section-heading">
        <div>
          <h2>Driver standings.</h2>
          <p>The championship picture after Round {round ?? "—"}.</p>
        </div>
        <div className="analytics-sort">
          <span className="analytics-sort-label">SORT</span>

          <div
            className={`analytics-sort-select ${sortOpen ? "is-open" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setSortOpen((v) => !v);
            }}
          >
            <span>
              {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
            </span>

            <svg
              className="analytics-sort-chevron"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>

            <div className="analytics-sort-menu">
              {SORT_OPTIONS.map((option) => (
                <div
                  key={option.key}
                  className={`analytics-sort-option ${
                    sortKey === option.key ? "is-active" : ""
                  }`}
                  onClick={() => {
                    setSortKey(option.key);
                    setSortOpen(false);
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </div>
        </div>


      </div>

      <div className="analytics-table-wrap">
          <table className="analytics-table">
          <colgroup>
            <col className="standings-colgroup-pos" />
            <col className="standings-colgroup-driver" />
            <col className="standings-colgroup-team" />
            <col className="standings-colgroup-pts" />
            <col className="standings-colgroup-wins" />
            <col className="standings-colgroup-pod" />
            <col className="standings-colgroup-pole" />
          </colgroup>

          <thead>
            <tr>
              <th>POS</th>
              <th>DRIVER</th>
              <th>TEAM</th>
              <th>PTS</th>
              <th>WINS</th>
              <th>POD</th>
              <th>POLE</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((driver) => (
              <tr
                key={driver.code}
                className="analytics-driver-row"
                onClick={() => navigate(`/drivers/${driver.code}`)}
                tabIndex={0}
                role="link"
                style={
                  {
                    "--team-accent": getTeamColor(driver.team),
                  } as React.CSSProperties
                }
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

                <td className="analytics-metric">{driver.wins}</td>
                <td className="analytics-metric">{driver.podiums}</td>
                <td className="analytics-metric">{driver.poles}</td>


              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AnalyticsStandings;