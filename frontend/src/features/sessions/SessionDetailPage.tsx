import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFlagEmoji } from "../schedule/countryFlags";
import { getCircuitSvgUrl, getCircuitMeta } from "../schedule/circuitAssets";
import { CircuitTrack } from "../schedule/CircuitTrack";
import SeasonPicker from "./components/SeasonPicker";
import DriverAvatar from "./components/DriverAvatar";
import TeamLogo from "./components/TeamLogo";
import {
  getCircuitLegends,
  getSessionDetail,
  type CircuitLegends,
  type DriverRef,
  type LegendEntry,
  type QualiRow,
  type RaceRow,
  type SessionDetail,
} from "./sessionDetail.api";
import "../../styles/sessionDetail.css";

type ResultsTab = "race" | "qualifying" | "sprint" | "sprint_quali";
type LegendTab = "drivers" | "constructors" | "winners";

const RESULTS_TAB_LABELS: Record<ResultsTab, string> = {
  race: "Race",
  qualifying: "Qualifying",
    sprint: "Sprint",
  sprint_quali: "Sprint Qualifying",
  };

const LEGEND_COLUMNS: {
  key: "wins" | "poles" | "podiums";
  title: string;
  unit: string;
}[] = [
  { key: "wins", title: "Most wins", unit: "Wins" },
  { key: "poles", title: "Most poles", unit: "Poles" },
  { key: "podiums", title: "Most podiums", unit: "Podiums" },
];

function formatDate(raw: string): string {
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return raw;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatStart(date: string, time: string): { day: string; clock: string } {
  if (!time) return { day: formatDate(date), clock: "" };
  const t = /z$|[+-]\d\d:?\d\d$/i.test(time) ? time : `${time}Z`;
  const d = new Date(`${date}T${t}`);
  if (Number.isNaN(d.getTime())) return { day: formatDate(date), clock: "" };
  return {
    day: d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    clock: d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
  };
}

function isPast(raw: string): boolean {
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return false;
  return new Date(y, m - 1, d).getTime() < Date.now();
}

export default function SessionDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const year = Number(params.year);
  const round = Number(params.round);

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [legends, setLegends] = useState<CircuitLegends | null>(null);
  const [legendsError, setLegendsError] = useState("");
  const [legendTab, setLegendTab] = useState<LegendTab>("drivers");

  // Results Console can look at another year of the same circuit
  const [sel, setSel] = useState({ year, round });
  const [otherDetail, setOtherDetail] = useState<SessionDetail | null>(null);
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherError, setOtherError] = useState("");
  const [resultsTab, setResultsTab] = useState<ResultsTab>("race");

  // ---- page race ----
  useEffect(() => {
    let cancelled = false;
    setSel({ year, round });
    setResultsTab("race");

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await getSessionDetail(year, round);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load this race.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (Number.isFinite(year) && Number.isFinite(round)) load();
    else {
      setError("Invalid race link.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [year, round]);

  // ---- circuit legends ----
  const circuitId = detail?.meta.circuit_id;
  useEffect(() => {
    if (!circuitId) return;
    let cancelled = false;
    setLegends(null);
    setLegendsError("");

    getCircuitLegends(circuitId)
      .then((data) => {
        if (!cancelled) setLegends(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setLegendsError(
            err instanceof Error ? err.message : "Couldn't load records.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [circuitId]);

  // ---- results for another year ----
  const samePage = sel.year === year && sel.round === round;
  useEffect(() => {
    if (samePage) {
      setOtherDetail(null);
      setOtherError("");
      return;
    }
    let cancelled = false;
    setOtherLoading(true);
    setOtherError("");

    getSessionDetail(sel.year, sel.round)
      .then((data) => {
        if (!cancelled) setOtherDetail(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setOtherError(
            err instanceof Error ? err.message : "Couldn't load results.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setOtherLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sel, samePage]);

  const resultsDetail = samePage ? detail : otherDetail;

  const availableTabs = useMemo<ResultsTab[]>(() => {
    const tabs: ResultsTab[] = ["race"];
    if (resultsDetail?.results.qualifying?.length) tabs.push("qualifying");
    if (resultsDetail?.results.sprint?.length) tabs.push("sprint");
    if (resultsDetail?.results.sprint_quali?.length) tabs.push("sprint_quali");

    return tabs;
  }, [resultsDetail]);

  const activeTab: ResultsTab = availableTabs.includes(resultsTab)
    ? resultsTab
    : "race";

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({ title: detail?.meta.event_name ?? "F1 Race", url })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  }

  function handleYearChange(y: number) {
    const target = detail?.circuit_races.find((r) => r.year === y);
    if (target) setSel({ year: target.year, round: target.round });
  }

  if (loading) {
    return (
      <main className="sd-page">
        <div className="sd-container">
          <div className="sd-state">Loading race…</div>
        </div>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="sd-page">
        <div className="sd-container">
          <button
            type="button"
            className="sd-back"
            onClick={() => navigate("/sessions")}
          >
            ← Back to Sessions
          </button>
          <div className="sd-state is-error">
            <strong>Unable to load this race</strong>
            <span>{error || "No data found."}</span>
          </div>
        </div>
      </main>
    );
  }

  const { meta, highlights } = detail;
  const done = isPast(meta.date);
  const hasSprint = !!detail.results.sprint?.length;
  const circuitMeta = getCircuitMeta(meta.event_name, meta.country);
  // Circuit layouts changed a lot over the decades, so only draw the track
  // for recent seasons.
  const svg = year >= 2018 ? getCircuitSvgUrl(meta.event_name, meta.country) : null;
  const start = formatStart(meta.date, meta.time_utc);

  const highlightCards: { label: string; driver: DriverRef | null }[] = [
    { label: "Winner", driver: highlights.winner },
    { label: "Pole", driver: highlights.pole },
    { label: "Fastest lap", driver: highlights.fastest_lap },
  ];

  return (
    <main className="sd-page">
      <div className="sd-container">
        <div className="sd-topbar">
          <button
            type="button"
            className="sd-back"
            onClick={() => navigate("/sessions")}
          >
            ← Back to Sessions
          </button>
          <button
            type="button"
            className="sd-icon-btn"
            aria-label="Share this race"
            onClick={handleShare}
          >
            ⤴
          </button>
        </div>

        {/* ------------------------------------------------ Track console */}
        <div className="sd-label">
          <span className="sd-label-bar" aria-hidden="true" />
          Track Console
        </div>

        <section className="sd-hero">
          <div className="sd-hero-track">
            <CircuitTrack
              url={svg}
              className="sd-hero-track-svg"
              animate
              fallback={
                <span className="sd-hero-track-fallback">
                  {getFlagEmoji(meta.country)}
                </span>
              }
            />
          </div>

          <div className="sd-hero-info">
            <div className="sd-hero-badges">
              <span className="sd-round">Round {meta.round}</span>
              <span className={`sd-badge ${done ? "is-done" : "is-upcoming"}`}>
                {done ? "Completed" : "Upcoming"}
              </span>
              {hasSprint && <span className="sd-badge is-sprint">⚡ Sprint</span>}
            </div>

            <h1 className="sd-title">
              {meta.event_name} {meta.year}
            </h1>

            <p className="sd-sub">
              {getFlagEmoji(meta.country)} {meta.circuit_name}
              {meta.locality ? `, ${meta.locality}` : ""}
            </p>

            <p className="sd-sub">
              {start.day}
              {start.clock ? ` · ${start.clock} (your time)` : ""}

            </p>

            <div className="sd-stats">
              <div>
                <span className="sd-stat-value">
                  {circuitMeta ? circuitMeta.lengthKm.toFixed(3) : "—"}
                </span>
                <span className="sd-stat-label">Km</span>
              </div>
              <div>
                <span className="sd-stat-value">
                  {circuitMeta ? circuitMeta.turns : "—"}
                </span>
                <span className="sd-stat-label">Turns</span>
              </div>
              <div>
                <span className="sd-stat-value">{meta.year}</span>
                <span className="sd-stat-label">Season</span>
              </div>
            </div>

            <div className="sd-highlights">
              {highlightCards.map(({ label, driver }) => (
                <div key={label} className="sd-highlight">
                  {driver && (
                    <DriverAvatar
                      id={driver.id}
                      code={driver.code}
                      name={driver.name}
                      year={meta.year}
                      size={52}
                    />
                  )}
                  <div className="sd-highlight-text">
                    <span className="sd-highlight-label">{label}</span>
                    <span className="sd-highlight-name">
                      {driver ? driver.name : "Not recorded"}
                    </span>

                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------- Circuit legends */}
        <div className="sd-label is-amber">
          <span className="sd-label-bar" aria-hidden="true" />
          Circuit Legends
          <span className="sd-label-note">All-time records</span>
        </div>

        <section className="sd-panel">
          <div className="sd-tabs" role="tablist" aria-label="Circuit records">
            {(
              [
                ["drivers", "Drivers"],
                ["constructors", "Constructors"],
                ["winners", "Race winners"],
              ] as [LegendTab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={legendTab === key}
                className={`sd-tab is-amber${legendTab === key ? " is-active" : ""}`}
                onClick={() => setLegendTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {legendsError && <div className="sd-panel-note">{legendsError}</div>}
          {!legends && !legendsError && (
            <div className="sd-panel-note">Loading records…</div>
          )}

          {legends && legendTab !== "winners" && (
            <div className="sd-legend-grid">
              {LEGEND_COLUMNS.map((col) => {
                const entries: LegendEntry[] = legends[legendTab][col.key];
                return (
                  <div key={col.key} className="sd-legend-col">
                    <h3>{col.title}</h3>
                    {entries.length === 0 && (
                      <p className="sd-panel-note">No data</p>
                    )}
                    {entries.map((e, i) => (
                      <div key={`${e.name}-${i}`} className="sd-legend-row">
                        <span className="sd-legend-rank">{i + 1}</span>
                        <span className="sd-legend-bar" aria-hidden="true" />
                        <div className="sd-legend-who">
                          {legendTab === "drivers" && (
                            <DriverAvatar
                              id={e.id}
                              code={e.code}
                              name={e.name}
                              size={40}
                            />
                          )}
                          {legendTab === "constructors" && (
                            <TeamLogo name={e.name} size={36} />
                          )}
                          <span className="sd-legend-name">
                            <strong>{e.code || e.name}</strong>
                            {e.code && <small>{e.name}</small>}
                          </span>
                        </div>

                        <span className="sd-legend-count">
                          <strong>{e.count}</strong>
                          <small>{e.count === 1 ? col.unit.replace(/s$/, "") : col.unit}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {legends && legendTab === "winners" && (
            <div className="sd-winners">
              {legends.winners.map((w) => (
                <div key={`${w.year}-${w.round}`} className="sd-winner-row">
                  <span className="sd-winner-year">{w.year}</span>
                  <span className="sd-winner-driver">
                    <DriverAvatar
                      id={w.id}
                      code={w.code}
                      name={w.driver}
                      year={w.year}
                      size={30}
                    />
                    <span>
                      <strong>{w.code}</strong> {w.driver}
                    </span>
                  </span>
                  <span className="sd-winner-team sd-team-cell">
                    <TeamLogo name={w.team} size={20} />
                    {w.team}
                  </span>


                </div>
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------------------- Results console */}
        <div className="sd-label sd-results-head">
          <span className="sd-label-bar" aria-hidden="true" />
          Results Console
          <span className="sd-label-line" aria-hidden="true" />
          <SeasonPicker
            year={sel.year}
            onChange={handleYearChange}
            availableYears={detail.circuit_years}
          />
        </div>

        <section className="sd-panel">
          <div className="sd-tabs" role="tablist" aria-label="Results session">
            {availableTabs.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={`sd-tab${activeTab === key ? " is-active" : ""}`}
                onClick={() => setResultsTab(key)}
              >
                {key === "sprint_quali" && resultsDetail?.meta.year === 2023
                  ? "Sprint Shootout"
                  : RESULTS_TAB_LABELS[key]}
              </button>
            ))}
          </div>

          {otherLoading && <div className="sd-panel-note">Loading results…</div>}
          {otherError && <div className="sd-panel-note">{otherError}</div>}

          {!otherLoading && !otherError && resultsDetail && (
            <ResultsTable
              tab={activeTab}
              race={resultsDetail.results.race}
              qualifying={resultsDetail.results.qualifying}
              sprint={resultsDetail.results.sprint}
              sprintQuali={resultsDetail.results.sprint_quali}
              year={resultsDetail.meta.year}

            />
          )}
        </section>
      </div>
    </main>
  );
}

// -------------------------------------------------------------- table ---
function ResultsTable({
  tab,
  race,
  qualifying,
  sprint,
  sprintQuali,
  year,
}: {
  tab: ResultsTab;
  year: number;
  race: RaceRow[];
  qualifying: QualiRow[] | null;
  sprint: RaceRow[] | null;
  sprintQuali: QualiRow[] | null;
}) {
  if (tab === "qualifying" || tab === "sprint_quali") {
    const quali = tab === "sprint_quali" ? sprintQuali : qualifying;
    if (!quali?.length) {
      return <div className="sd-panel-note">No qualifying results.</div>;
    }

    return (
      <div className="sd-table-wrap">
        <table className="sd-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Driver</th>
              <th>Team</th>
              <th className="is-num">Q1</th>
              <th className="is-num">Q2</th>
              <th className="is-num">Q3</th>
            </tr>
          </thead>
          <tbody>
            {quali.map((r, i) => (
              <tr key={`${r.code}-${i}`}>
                <td>{r.position ?? "--"}</td>
                <td>
                  <div className="sd-driver-cell">
                    <DriverAvatar id={r.id} code={r.code} name={r.name} year={year} size={30} />
                    <div className="sd-driver-text">
                      <strong>{r.name}</strong> 
                    </div>
                  </div>
                </td>
                <td className="sd-team-td">
                  <div className="sd-team-cell">
                    <TeamLogo name={r.team} size={22} />
                    <span>{r.team}</span>
                  </div>
                </td>
                <td className="is-num">{r.q1 ?? "--"}</td>
                <td className="is-num">{r.q2 ?? "--"}</td>
                <td className="is-num">{r.q3 ?? "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const rows = tab === "sprint" ? sprint : race;
  if (!rows?.length) {
    return (
      <div className="sd-panel-note">
        Results aren't available yet for this race.
      </div>
    );
  }

  return (
    <div className="sd-table-wrap">
      <table className="sd-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Driver</th>
            <th>Team</th>
            <th className="is-num">Grid</th>
            <th className="is-num">Gap</th>
            <th className="is-num">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={`${r.code}-${i}`}
              className={r.position === 1 ? "is-winner" : undefined}
            >
              <td>{r.position ?? "--"}</td>
              <td>
                <div className="sd-driver-cell">
                  <DriverAvatar id={r.id} code={r.code} name={r.name} year={year} size={30} />
                  <div className="sd-driver-text">
                    <strong>{r.name}</strong>
                    {r.fastest_lap && <em className="sd-tag is-fl">FL</em>}
                  </div>
                </div>
              </td>
              <td className="sd-team-td">
                <div className="sd-team-cell">
                  <TeamLogo name={r.team} size={22} />
                  <span>{r.team}</span>
                </div>
              </td>
              <td className="is-num">{r.grid ?? "--"}</td>
              <td className="is-num">{r.gap || "--"}</td>
              <td className="is-num">{r.points > 0 ? r.points : "--"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}