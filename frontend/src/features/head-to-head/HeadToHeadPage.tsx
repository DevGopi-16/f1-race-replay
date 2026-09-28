import { useEffect, useRef, useState } from "react";
import "./head-to-head.css";
import "./head-to-head-results.css";


interface DriverSummary {
  driverId: string;      
  code: string;         
  number: number;        
  fullName: string;      
  team: string;          
  teamColor: string;     
  headshotUrl?: string;
}

interface HeadToHeadResult {
  driverA: DriverSummary;
  driverB: DriverSummary;
  careerStats: unknown;
  driverDna: unknown;
  headToHeadRecord: unknown;
  relativePerformance: unknown;
  allTimeRankings: unknown;
  careerTrajectory: unknown;
}

// ---- Preview card data (static — mirrors "WHAT YOU'LL SEE") ----------

const PREVIEW_CARDS = [
  {
    icon: "trophy",
    title: "Career Stats",
    body: "Wins, poles, podiums and championships compared side by side.",
  },
  {
    icon: "fingerprint",
    title: "Driver DNA",
    body: "Radar breakdown of each driver's strengths and style.",
  },
  {
    icon: "shield",
    title: "Head-to-Head",
    body: "Direct results across every race they shared on track.",
  },
  {
    icon: "bars",
    title: "Relative Performance",
    body: "Teammate-relative stats that level the playing field.",
  },
  {
    icon: "search",
    title: "All-Time Rankings",
    body: "Where each driver sits in the all-time record books.",
  },
  {
    icon: "trend",
    title: "Career Trajectory",
    body: "Year-by-year points and finishing positions over their careers.",
  },
] as const;

// ---- Icon set (inline SVG, no external deps) --------------------------

function Icon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "trophy":
      return (
        <svg {...common}>
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
          <path d="M7 5H4a3 3 0 0 0 3 5" />
          <path d="M17 5h3a3 3 0 0 1-3 5" />
        </svg>
      );
    case "fingerprint":
      return (
        <svg {...common}>
          <path d="M12 3a6 6 0 0 0-6 6v2" />
          <path d="M6 15v-1" />
          <path d="M18 9a6 6 0 0 0-1.2-3.6" />
          <path d="M18 15v-6" />
          <path d="M9 20a10 10 0 0 1-3-4" />
          <path d="M12 21a9 9 0 0 0 6-8v-4" />
          <path d="M9 9v3a3 3 0 0 0 6 0" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 4.5 6v6c0 4.5 3.2 7.4 7.5 9 4.3-1.6 7.5-4.5 7.5-9V6L12 3Z" />
        </svg>
      );
    case "bars":
      return (
        <svg {...common}>
          <path d="M5 20V10" />
          <path d="M12 20V4" />
          <path d="M19 20v-7" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "trend":
      return (
        <svg {...common}>
          <path d="M4 16l5-6 4 4 7-9" />
          <path d="M20 5v4h-4" />
        </svg>
      );
    default:
      return null;
  }
}

// ---- Driver search input ----------------------------------------------

function DriverSearchInput({
  label,
  value,
  onSelect,
  searchDrivers,
}: {
  label: string;
  value: DriverSummary | null;
  onSelect: (driver: DriverSummary | null) => void;
  searchDrivers: (query: string) => Promise<DriverSummary[]>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DriverSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const r = await searchDrivers(query.trim());
        if (!cancelled) setResults(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200); // debounce
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, searchDrivers]);

  return (
    <div className="h2h-field" ref={containerRef}>
      <label className="h2h-field-label">{label}</label>

      {value ? (
        <button
          type="button"
          className="h2h-selected-driver"
          style={{ ["--team-color" as string]: value.teamColor }}
          onClick={() => {
            onSelect(null);
            setQuery("");
            setOpen(true);
          }}
        >
          {value.headshotUrl && <img src={value.headshotUrl} alt="" className="h2h-selected-avatar" />}
          <span className="h2h-selected-name">{value.fullName}</span>
          <span className="h2h-selected-meta">#{value.number} · {value.team}</span>
          <span className="h2h-selected-clear" aria-hidden>×</span>
        </button>
      ) : (
        <div className="h2h-search-wrap">
          <span className="h2h-search-icon"><Icon name="search" /></span>
          <input
            type="text"
            className="h2h-search-input"
            placeholder="Search all drivers by name or number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
          />
          {open && query.trim() && (
            <div className="h2h-dropdown">
              {loading && <div className="h2h-dropdown-empty">Searching…</div>}
              {!loading && results.length === 0 && (
                <div className="h2h-dropdown-empty">No drivers match "{query}"</div>
              )}
              {!loading &&
                results.map((d) => (
                  <button
                    key={d.driverId}
                    type="button"
                    className="h2h-dropdown-item"
                    style={{ ["--team-color" as string]: d.teamColor }}
                    onClick={() => {
                      onSelect(d);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="h2h-dropdown-swatch" />
                    <span className="h2h-dropdown-name">{d.fullName}</span>
                    <span className="h2h-dropdown-meta">#{d.number} · {d.team}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Main page ----------------------------------------------------------

export default function HeadToHeadPage({
  searchDrivers,
  fetchHeadToHead,
}: {
  // Wire these to your real backend calls.
  searchDrivers: (query: string) => Promise<DriverSummary[]>;
  fetchHeadToHead: (driverAId: string, driverBId: string) => Promise<HeadToHeadResult>;
}) {
  const [driverA, setDriverA] = useState<DriverSummary | null>(null);
  const [driverB, setDriverB] = useState<DriverSummary | null>(null);
  const [result, setResult] = useState<HeadToHeadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCompare = driverA && driverB && driverA.driverId !== driverB.driverId;

  async function handleCompare() {
    if (!driverA || !driverB) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchHeadToHead(driverA.driverId, driverB.driverId);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comparison.");
    } finally {
      setLoading(false);
    }
  }

  // Once both drivers picked, auto-trigger the comparison.
  useEffect(() => {
    if (canCompare) {
      handleCompare();
    } else {
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverA?.driverId, driverB?.driverId]);

  if (result) {
    return (
      <HeadToHeadResultsView
        result={result}
        loading={loading}
        onReset={() => {
          setDriverA(null);
          setDriverB(null);
          setResult(null);
        }}
      />
    );
  }

  return (
    <div className="h2h-page">
      <div className="h2h-main">
        <p className="h2h-eyebrow">Head-to-Head</p>
        <h1 className="h2h-title">Driver Comparison</h1>
        <p className="h2h-subtitle">
          Select two drivers to compare their head-to-head record, career stats, DNA, and all-time rankings.
        </p>

        <h2 className="h2h-section-label">What you'll see</h2>
        <div className="h2h-preview-grid">
          {PREVIEW_CARDS.map((card) => (
            <div className="h2h-preview-card" key={card.title}>
              <div className="h2h-preview-icon"><Icon name={card.icon} /></div>
              <div>
                <div className="h2h-preview-title">{card.title}</div>
                <div className="h2h-preview-body">{card.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="h2h-sidebar">
        <div className="h2h-sidebar-card">
          <h3 className="h2h-sidebar-title">Select drivers</h3>

          <DriverSearchInput
            label="Driver A"
            value={driverA}
            onSelect={setDriverA}
            searchDrivers={searchDrivers}
          />

          <div className="h2h-vs">vs</div>

          <DriverSearchInput
            label="Driver B"
            value={driverB}
            onSelect={setDriverB}
            searchDrivers={searchDrivers}
          />

          {loading && <div className="h2h-status">Loading comparison…</div>}
          {error && <div className="h2h-status h2h-status-error">{error}</div>}
        </div>

        <div className="h2h-disclaimer">
          <span className="h2h-disclaimer-title">Disclaimer</span>
          <p>
            Stats are derived from publicly available F1 data for informational purposes only.
            Accuracy may vary. H2H metrics reflect teammate seasons only. Not affiliated with F1,
            the FIA, or any driver or team.
          </p>
        </div>
      </aside>
    </div>
  );
}

// ---- Results view (placeholder shell — fill in once data shape is confirmed) --

function HeadToHeadResultsView({
  result,
  loading,
  onReset,
}: {
  result: HeadToHeadResult;
  loading: boolean;
  onReset: () => void;
}) {
  const [viewMode, setViewMode] = useState<"visual" | "detail">("visual");
  const [trajectorySeason, setTrajectorySeason] = useState(2025);
    // TODO: read from result.careerTrajectory once its shape is known
  const firstSeason = 2007;
  const lastSeason = 2026;
  const a = result.driverA;
  const b = result.driverB;
  const driverAName = a.fullName.split(" ").at(-1) ?? a.fullName;
  const driverBName = b.fullName.split(" ").at(-1) ?? b.fullName;
    // TODO: derive from result.headToHeadRecord once its shape is known
  // (e.g. whoever leads the direct race record).
  const primary = a;
  const secondary = b;
  const metrics = [
    { label: "Win rate", detail: "Races won per start", left: 26.9, right: 28.7, leftValue: "26.9%", rightValue: "28.7%", leftName: a.fullName, rightName: b.fullName, leader: "Verstappen leads by 1.8 percentage points" },
    { label: "Podium rate", detail: "Podiums per start", left: 52.5, right: 53.8, leftValue: "52.5%", rightValue: "53.8%", leftName: a.fullName, rightName: b.fullName, leader: "Verstappen leads by 1.3 percentage points" },
    { label: "Pole rate", detail: "Pole positions per start", left: 26.4, right: 19.4, leftValue: "26.4%", rightValue: "19.4%", leftName: a.fullName, rightName: b.fullName, leader: "Hamilton leads by 7.0 percentage points" },
    { label: "Fastest-lap rate", detail: "Fastest laps per start", left: 17.5, right: 15.0, leftValue: "17.5%", rightValue: "15.0%", leftName: a.fullName, rightName: b.fullName, leader: "Hamilton leads by 2.5 percentage points" },
    { label: "Points per start", detail: "Career points divided by starts", left: 13.2, right: 14.5, leftValue: "13.2", rightValue: "14.5", leftName: a.fullName, rightName: b.fullName, leader: "Verstappen leads by 1.3 points per start" },
  ];
  const careerRecords = [
    { label: "Championships", left: 7, right: 4, gap: 3 },
    { label: "Race wins", left: 106, right: 71, gap: 35 },
    { label: "Podiums", left: 207, right: 133, gap: 74 },
    { label: "Pole positions", left: 104, right: 48, gap: 56 },
    { label: "Fastest laps", left: 69, right: 37, gap: 32 },
    { label: "Race starts", left: 394, right: 247, gap: 147 },
    { label: "Career points", left: 5209.5, right: 3589.5, gap: 1620 },
  ];
  const dna = [
    ["Win rate", "Races won per start", "26.9%", "4.2%", "22.7 pts"],
    ["Podium rate", "Podiums per start", "52.5%", "18.7%", "33.9 pts"],
    ["Finish rate", "Races completed without a DNF", "91.4%", "89.2%", "LEVEL"],
    ["Average grid", "Typical starting position · lower is better", "P4.5", "P8.7", "4.2 places ahead"],
    ["Average finish", "Typical classified result · lower is better", "P3.9", "P8.4", "4.5 places ahead"],
    ["Positions gained", "Average gain from grid to finish", "+0.7", "+0.4", "+0.3 places gained"],
  ];

  return (
    <div className="h2h-dashboard">
      <header className="h2h-dashboard-header">
        <div>
          <p className="h2h-eyebrow">Head-to-Head</p>
          <h1>Driver comparison</h1>
          <p>Select two drivers to compare their head-to-head record, career stats, DNA, and all-time rankings.</p>
        </div>
        <button type="button" className="h2h-share" onClick={onReset}>Change drivers</button>
      </header>

      {loading ? <div className="h2h-loading">Loading comparison…</div> : (
        <>
          <div className="h2h-layout">
            <main>
              <section className="h2h-panel h2h-matchup-panel">
                <div className="h2h-driver-block">
                  {a.headshotUrl && <img src={a.headshotUrl} alt="" />}
                  <strong>{a.fullName}</strong>
                  <span>{a.team}</span>
                </div>
                <div className="h2h-versus"><b>vs</b><span>165 shared races</span><small>HIGH CONFIDENCE</small></div>
                <div className="h2h-driver-block">
                  {b.headshotUrl && <img src={b.headshotUrl} alt="" />}
                  <strong>{b.fullName}</strong>
                  <span>{b.team}</span>
                </div>
              </section>

              <section className="h2h-section">
                <div className="h2h-section-heading"><span>Career stats</span><small>Career output, adjusted for races started</small><ViewToggle mode={viewMode} onChange={setViewMode} /></div>
                <div className="h2h-panel h2h-stats-panel">
                  <div className="h2h-stat-header-row">
                  <span className="h2h-stat-driver-name">{driverAName}</span>
                  <span className="h2h-stat-driver-name right">{driverBName}</span>
                  </div>
                  {viewMode === "visual" ? (
                    <>
                      <div className="h2h-stat-title-block">
                        <div className="h2h-stat-leading-number">7</div>
                        <div className="h2h-stat-title-copy">
                          <span>Career titles</span>
                          <small>Rates use 394 / 247 starts</small>
                        </div>
                        <div className="h2h-stat-leading-number muted">4</div>
                      </div>
                      <div className="h2h-stat-lead-row">
                        <span className="h2h-stat-lead-icon">✦</span>
                        <span>{a.fullName} leads 3 of 5 efficiency measures</span>
                      </div>
                      {metrics.map((metric) => (
                        <div className="h2h-career-metric-row" key={metric.label}>
                          <div className="h2h-career-metric-header">
                            <span className="h2h-career-metric-label">{metric.label}</span>
                            <span className="h2h-career-metric-detail">{metric.leader}</span>
                          </div>
                          <div className="h2h-career-metric-compare">
                            <div className="h2h-career-metric-side left">
                            <span className="h2h-career-name">{driverAName}</span>
                            <strong>{metric.leftValue}</strong>
                            </div>
                            <div className="h2h-career-metric-bar-wrap">
                            <div className="h2h-career-metric-bar">
                              <span
                                className="h2h-career-metric-fill"
                                style={{ width: `${Math.min(100, (metric.left / (metric.left + metric.right || 1)) * 100)}%` }}
                              />
                            </div>
                            </div>
                            <div className="h2h-career-metric-side right">
                            <strong>{metric.rightValue}</strong>
                            <span className="h2h-career-name">{driverBName}</span>
                            </div>
                          </div>
                          <div className="h2h-career-percentages">
                            <span>{metric.left}</span>
                            <span>{metric.right}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="h2h-career-detail-grid">
                      <div className="h2h-career-detail-head">
                        <span>{a.fullName.slice(0, 3).toUpperCase()}</span>
                        <span>Metric</span>
                        <span>{b.fullName.slice(0, 3).toUpperCase()}</span>
                      </div>
                      {careerRecords.map((row) => (
                        <div className="h2h-career-detail-row" key={row.label}>
                          <span className="h2h-career-detail-value red">{row.left}</span>
                          <span className="h2h-career-detail-label">{row.label}</span>
                          <span className="h2h-career-detail-value">{row.right}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="h2h-section">
                <div className="h2h-section-heading"><span>Driver DNA</span><small>Performance fingerprint</small><ViewToggle mode={viewMode} onChange={setViewMode} /></div>
                <div className="h2h-panel h2h-dna-panel">
                  <div className="h2h-dna-head"><span>{a.fullName}</span><b>Matchup edge <em>{primary.fullName} 5 - 0 {secondary.fullName}</em></b><span>{b.fullName}</span></div>
                  {viewMode === "visual" ? <div className="h2h-dna-grid">{dna.map(([label, detail, left, right, edge]) => <div className="h2h-dna-card" key={label}><header><b>{label}</b><em>{edge}</em></header><small>{detail}</small><div><strong>{left}</strong><span>— vs —</span><strong>{right}</strong></div></div>)}</div> : <DetailTable leftLabel={a.fullName} rightLabel={b.fullName} rows={dna.map(([label, detail, left, right]) => [label, left, right, detail])} />}
                </div>
              </section>

              <section className="h2h-section">
                <div className="h2h-section-heading"><span>Head-to-head comparison</span><ViewToggle mode={viewMode} onChange={setViewMode} /></div>
                <div className="h2h-panel h2h-chart-panel">
                  {viewMode === "visual" ? <><p className="h2h-kicker">Direct head-to-head</p><small>Shared-race win split by session type.</small><BarChart label="Qualifying" left="94" right="71" /><BarChart label="Race" left="83" right="54" /><p className="h2h-kicker h2h-chart-gap">Performance gaps over seasons</p><LineChart /></> : <DetailTable leftLabel={a.fullName} rightLabel={b.fullName} rows={[["Qualifying", "94", "71", "Shared qualifying sessions"], ["Race", "83", "54", "Shared race sessions"], ["Shared races", "165", "165", "High confidence overlap"]]} />}
                </div>
              </section>

              <section className="h2h-section">
                <div className="h2h-section-heading"><span>Teammate-relative comparison</span><ViewToggle mode={viewMode} onChange={setViewMode} /></div>
                <div className="h2h-panel h2h-relative-panel"><p>Measures how each driver performed against their own teammates. A positive “Edge” means they were faster/better than the baseline of their colleagues in shared machinery.</p>{viewMode === "visual" ? ["Qualifying edge", "Race edge", "Points share %"].map((label, index) => <div className="h2h-relative-row" key={label}><b>{label}</b><span>{index === 2 ? "0.56 / 0.50" : "0.15 / 0.24"}</span><div><i style={{ left: `${index === 2 ? 56 : 42}%` }} /><i className="muted" style={{ left: `${index === 2 ? 50 : 47}%` }} /></div><small>{a.fullName}: Moderate advantage vs teammates</small><small>{b.fullName}: Moderate advantage vs teammates</small></div>) : <DetailTable leftLabel={a.fullName} rightLabel={b.fullName} rows={[["Qualifying edge", "0.15", "0.38", "Slight advantage vs teammates"], ["Race edge", "0.15", "0.24", "Moderate advantage vs teammates"], ["Points share", "0.56", "0.50", "Majority / minority share"]]} />}</div>
              </section>
            </main>
            <aside className="h2h-dashboard-side">
              <div className="h2h-side-card"><b>Direct overlap</b><strong>▥ High confidence</strong><small>165 shared races</small></div>
              <div className="h2h-side-card"><h3>{primary.fullName} leads direct race H2H by 29.</h3><p>{secondary.fullName} has stronger teammate-relative race edge (+0.09).</p></div>
              <div className="h2h-side-card"><small>Direct H2H</small><strong>{primary.fullName} leads 83-54</strong><div className="h2h-side-progress"><i /></div></div>
              <div className="h2h-side-card"><small>Confidence</small><strong>▥ 165 shared races</strong></div>
              <div className="h2h-side-card"><small>Disclaimer</small><p>Stats are derived from publicly available F1 data for informational purposes only. Accuracy may vary.</p></div>
            </aside>
          </div>
          <section className="h2h-section">
            <div className="h2h-section-heading"><span>All-time rankings</span><small>Career record books</small></div>
            <div className="h2h-panel h2h-rankings">{[["Championships", "7", "0"], ["Race wins", "106", "7"], ["Pole positions", "104", "11"], ["Podiums", "207", "31"], ["Fastest laps", "69", "12"], ["Race starts", "394", "166"]].map(([label, left, right]) => <div className="h2h-rank-row" key={label}><strong>{left}</strong><span>{label}</span><strong>{right}</strong><div><i style={{ width: `${Math.min(95, (Number(left) / (Number(left) + Number(right) || 1)) * 100)}%` }} /></div></div>)}</div>
          </section>
          <section className="h2h-section">
            <div className="h2h-section-heading"><span>Dominance trend over seasons</span><small>How their relative race advantage evolved year-over-year.</small></div>
            <div className="h2h-panel h2h-trend-panel"><div className="h2h-trend-legend"><span className="red-dot">{a.fullName} Race Edge</span><span className="gray-dot">{b.fullName} Race Edge</span></div><TrendChart /><small className="h2h-chart-note">Values above 0 mean the driver was faster/better than their teammate that season.</small></div>
          </section>
          <section className="h2h-section">
            <div className="h2h-section-heading"><span>Yearly comparison</span><small>One shared baseline replaces four competing lines.</small><ViewToggle mode={viewMode} onChange={setViewMode} /></div>
            <div className="h2h-panel h2h-year-panel">{viewMode === "visual" ? <><div className="h2h-year-axis"><span>{b.fullName}</span><b>Level</b><span>{a.fullName}</span></div><YearChart /></> : <DetailTable leftLabel={a.fullName} rightLabel={b.fullName} rows={[["2026", "P3 · +0.00 / +0.09", "P2 · -0.14 / -0.33", `${a.team} vs ${b.team}`], ["2025", "P6", "P4", "Season comparison"], ["2024", "P7", "P6", "Season comparison"]]} />} <div className="h2h-season-row"><div><small>Season</small><strong>2026</strong></div><div><b>{a.fullName}</b><span>Ferrari · P3</span><small>+0.00 / +0.09</small></div><div><b>{b.fullName}</b><span>Mercedes · P2</span><small>-0.14 / -0.33</small></div></div></div>
          </section>
          <section className="h2h-section">
            <div className="h2h-section-heading"><span>Career trajectory</span><small>How have their careers evolved?</small></div>
            <div className="h2h-panel h2h-trajectory-panel">
              <div className="h2h-trajectory-head"><span className="red-dot">{a.fullName}<small>20 seasons<br />7 titles</small></span><span className="gray-dot">{b.fullName}<small>8 seasons<br />0 titles</small></span></div>
              <TrajectoryChart />
              <div className="h2h-trajectory-legend"><span className="red-dot">{a.fullName}</span><span className="gray-dot">{b.fullName}</span></div>
              <div className="h2h-season-toolbar"><div><small>Season</small><strong>{trajectorySeason}</strong></div><div className="h2h-season-pager"><button type="button" onClick={() => setTrajectorySeason((year) => Math.max(firstSeason, year - 1))}>‹</button><span>{trajectorySeason - firstSeason + 1} of {lastSeason - firstSeason + 1}</span><button type="button" onClick={() => setTrajectorySeason((year) => Math.min(lastSeason, year + 1))}>›</button></div></div>
              <div className="h2h-season-cards"><div><b>{a.fullName}</b><span>Ferrari</span><strong>{trajectorySeason === 2025 ? "P6" : "P3"}</strong><small>{trajectorySeason === 2025 ? "156 pts · 0 wins" : "183 pts · 1 wins"}</small></div><div><b>{b.fullName}</b><span>Mercedes</span><strong>{trajectorySeason === 2025 ? "P4" : "P2"}</strong><small>{trajectorySeason === 2025 ? "319 pts · 2 wins" : "183 pts · 2 wins"}</small></div></div>
              <div className="h2h-season-dots"><i /><i className="active" /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ViewToggle({ mode, onChange }: { mode: "visual" | "detail"; onChange: (mode: "visual" | "detail") => void }) {
  return <div className="h2h-tabs"><button type="button" className={mode === "visual" ? "active" : ""} onClick={() => onChange("visual")}>▦ Visual</button><button type="button" className={mode === "detail" ? "active" : ""} onClick={() => onChange("detail")}>▤ Detail</button></div>;
}

function DetailTable({ rows, leftLabel, rightLabel }: { rows: string[][]; leftLabel: string; rightLabel: string }) {
  return <div className="h2h-detail-table"><div className="h2h-detail-head"><span>Metric</span><span>{leftLabel}</span><span>{rightLabel}</span><span>Context</span></div>{rows.map((row) => <div className="h2h-detail-row" key={row[0]}>{row.map((cell, index) => <span className={index === 0 ? "metric" : ""} key={`${row[0]}-${index}`}>{cell}</span>)}</div>)}</div>;
}

function BarChart({ label, left, right }: { label: string; left: string; right: string }) {
  return <div className="h2h-bar-chart"><span>{label}</span><div title={`${label}: Driver A ${left}, Driver B ${right}`}><i style={{ width: `${(Number(left) / (Number(left) + Number(right))) * 100}%` }} /><b>{left}</b><em>{right}</em></div></div>;
}

function LineChart() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const points = [{ x: 20, y: 42, label: "2019 · Race gap +15" }, { x: 210, y: 85, label: "2021 · Race gap +10" }, { x: 390, y: 92, label: "2022 · parity" }, { x: 560, y: 112, label: "2024 · Race gap -2" }, { x: 740, y: 128, label: "2026 · Race gap -3" }];

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = {
      x: Math.min(Math.max(event.clientX - rect.left, 20), rect.width - 20),
      y: Math.min(Math.max(event.clientY - rect.top, 20), rect.height - 20),
    };
    setTooltipPosition(next);
  };

  return (
    <div className="h2h-interactive-chart" onMouseLeave={() => setHovered(null)}>
      {hovered && <div className="h2h-chart-tooltip h2h-cursor-tooltip" style={{ left: tooltipPosition.x, top: tooltipPosition.y }}>{hovered}</div>}
      <svg className="h2h-line-chart" viewBox="0 0 760 180" role="img" aria-label="Performance gap trend" onMouseMove={handleMove}>
        <path className="h2h-gridline" d="M20 90H740M20 45H740M20 135H740" />
        <path className="h2h-green-line" d="M20 105 C110 115 130 128 210 122 S320 90 390 92 S550 115 740 110" />
        <path className="h2h-red-line" d="M20 42 C130 35 190 50 250 85 S330 95 390 92 S500 75 560 112 S650 132 740 128" />
        {points.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="8" className="h2h-hover-point" onMouseEnter={() => setHovered(point.label)} />)}
      </svg>
    </div>
  );
}

function TrendChart() {
  const [hovered, setHovered] = useState<string[] | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const points = [["2007", 20, 130, "-0.2", "-0.7"], ["2018", 450, 40, "+0.7", "+0.2"], ["2022", 580, 120, "-0.2", "-0.4"], ["2026", 740, 105, "+0.1", "-0.3"]];

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const next = {
      x: Math.min(Math.max(pointerX, 20), rect.width - 20),
      y: Math.min(Math.max(pointerY, 20), rect.height - 20),
    };
    const x = 20 + Math.max(0, Math.min(1, pointerX / rect.width)) * 720;
    const point = points.reduce((nearest, candidate) => Math.abs(Number(candidate[1]) - x) < Math.abs(Number(nearest[1]) - x) ? candidate : nearest);
    setTooltipPosition(next);
    setHoverX(Number(point[1]));
    setHovered([String(point[0]) + " season", "Race edge", String(point[3]), "Qualifying edge", String(point[4])]);
  };

  return (
    <div className="h2h-interactive-chart" onMouseLeave={() => { setHovered(null); setHoverX(null); }}>
      {hovered && <div className="h2h-chart-tooltip h2h-multi-tooltip h2h-cursor-tooltip" style={{ left: tooltipPosition.x, top: tooltipPosition.y }}><b>{hovered[0]}</b><span>Race <strong>{hovered[2]}</strong> toward Lewis Hamilton</span><span>Qualifying <strong>{hovered[4]}</strong></span></div>}
      <svg className="h2h-trend-chart" viewBox="0 0 760 220" role="img" aria-label="Dominance trend" onMouseMove={handleMove}>
        <path className="h2h-gridline" d="M20 110H740M20 60H740M20 160H740" />
        <path className="h2h-red-line" d="M20 130 C80 55 120 80 160 75 S200 155 240 90 S280 145 320 70 S370 115 410 125 S450 40 490 100 S540 60 580 120 S630 75 670 155 S710 165 740 105" />
        <path className="h2h-gray-line" d="M450 120 C490 45 520 190 570 90 S620 170 660 80 S710 60 740 130" />
        {hoverX !== null && <line x1={hoverX} x2={hoverX} y1="20" y2="190" className="h2h-crosshair" />}
        {points.map(([year, x, y]) => <circle key={String(year)} cx={Number(x)} cy={Number(y)} r="8" className="h2h-hover-point" />)}
        <rect x="0" y="0" width="760" height="220" className="h2h-chart-hit-area" />
      </svg>
    </div>
  );
}

function YearChart() {
  const [hovered, setHovered] = useState<string[] | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const points = [["2019", 20, 95, "-0.2 toward Lewis Hamilton", "-0.7 toward Russell"], ["2021", 300, 70, "-0.2 toward Lewis Hamilton", "+0.4 toward Russell"], ["2023", 450, 155, "0.8 toward Lewis Hamilton", "Level"], ["2026", 740, 55, "0.5 toward Lewis Hamilton", "Level"]];

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const next = {
      x: Math.min(Math.max(pointerX, 20), rect.width - 20),
      y: Math.min(Math.max(pointerY, 20), rect.height - 20),
    };
    const x = 20 + Math.max(0, Math.min(1, pointerX / rect.width)) * 720;
    const point = points.reduce((nearest, candidate) => Math.abs(Number(candidate[1]) - x) < Math.abs(Number(nearest[1]) - x) ? candidate : nearest);
    setTooltipPosition(next);
    setHoverX(Number(point[1]));
    setHovered([`${point[0]} season`, String(point[3]), String(point[4])]);
  };

  return (
    <div className="h2h-interactive-chart h2h-advanced-chart" onMouseLeave={() => { setHovered(null); setHoverX(null); }}>
      {hovered && <div className="h2h-chart-tooltip h2h-multi-tooltip h2h-cursor-tooltip" style={{ left: tooltipPosition.x, top: tooltipPosition.y }}><b>{hovered[0]}</b><span>Race <strong>{hovered[1]}</strong></span><span>Qualifying <strong>{hovered[2]}</strong></span></div>}
      <svg className="h2h-year-chart" viewBox="0 0 760 190" role="img" aria-label="Yearly comparison" onMouseMove={handleMove}>
        <path className="h2h-gridline" d="M20 30H740M20 95H740M20 160H740" />
        <path className="h2h-gray-line" d="M20 100 L170 80 L300 100 L450 140 L590 70 L740 115" />
        <path className="h2h-red-line" d="M20 95 L170 140 L300 70 L450 155 L590 135 L740 55" />
        {hoverX !== null && <line x1={hoverX} x2={hoverX} y1="15" y2="175" className="h2h-crosshair" />}
        <rect x="0" y="0" width="760" height="190" className="h2h-chart-hit-area" />
        {points.map(([year, x, y]) => <circle key={year} cx={Number(x)} cy={Number(y)} r="8" className="h2h-hover-point" />)}
      </svg>
    </div>
  );
}

function TrajectoryChart() {
  const [hovered, setHovered] = useState<string[] | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const points = [["2007", 20, 45, "P3", "—"], ["2017", 380, 35, "P1", "—"], ["2022", 600, 90, "P6", "P4"], ["2025", 680, 110, "P6", "P3"], ["2026", 740, 70, "P3", "P2"]];

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const next = {
      x: Math.min(Math.max(pointerX, 20), rect.width - 20),
      y: Math.min(Math.max(pointerY, 20), rect.height - 20),
    };
    const x = 20 + Math.max(0, Math.min(1, pointerX / rect.width)) * 720;
    const point = points.reduce((nearest, candidate) => Math.abs(Number(candidate[1]) - x) < Math.abs(Number(nearest[1]) - x) ? candidate : nearest);
    setTooltipPosition(next);
    setHoverX(Number(point[1]));
    setHovered([`${point[0]} season`, "Hamilton", String(point[3]), "Russell", String(point[4])]);
  };

  return (
    <div className="h2h-interactive-chart h2h-trajectory-chart-wrap" onMouseLeave={() => { setHovered(null); setHoverX(null); }}>
      {hovered && <div className="h2h-chart-tooltip h2h-multi-tooltip h2h-cursor-tooltip" style={{ left: tooltipPosition.x, top: tooltipPosition.y }}><b>{hovered[0]}</b><span>{hovered[1]} <strong>{hovered[2]}</strong></span><span>{hovered[3]} <strong>{hovered[4]}</strong></span></div>}
      <svg className="h2h-trajectory-chart" viewBox="0 0 760 230" role="img" aria-label="Career trajectory" onMouseMove={handleMove}>
        <path className="h2h-gridline" d="M20 35H740M20 95H740M20 155H740M20 210H740" />
        <path className="h2h-red-line" d="M20 45 L60 35 L100 75 L140 65 L180 75 L220 65 L260 65 L300 35 L340 35 L380 45 L420 35 L470 35 L520 35 L560 45 L600 90 L640 55 L680 110 L720 95 L740 70" />
        <path className="h2h-gray-line" d="M500 210 L540 195 L580 160 L620 80 L660 140 L700 115 L740 45" />
        {hoverX !== null && <line x1={hoverX} x2={hoverX} y1="20" y2="210" className="h2h-crosshair" />}
        <rect x="0" y="0" width="760" height="230" className="h2h-chart-hit-area" />
        {points.map(([year, x, y]) => <circle key={year} cx={Number(x)} cy={Number(y)} r="8" className="h2h-hover-point" />)}
      </svg>
      <div className="h2h-trajectory-axis"><span>P1</span><span>P5</span><span>P10</span><span>P15</span><span>P20</span></div>
      <div className="h2h-trajectory-years"><span>2007</span><span>2011</span><span>2015</span><span>2019</span><span>2023</span><span>2026</span></div>
    </div>
  );
}