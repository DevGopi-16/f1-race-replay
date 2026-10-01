import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import "./head-to-head.css";
import HeadToHeadLanding from "./HeadToHeadLanding";
import HeadToHeadResults from "./HeadToHeadResults";
import "./head-to-head-landing.css";

interface DriverSummary {
  driverId: string;
  code: string;
  number: number;
  fullName: string;
  team: string;
  teamColor: string;
  headshotUrl?: string;
}

interface CareerAllTime {
  wins: number;
  podiums: number;
  poles: number;
  fastest_laps: number;
  starts: number;
  championships: number;
  seasons: number;
}

interface HeadToHeadRecord {
  shared_races: number;
  qualifying: Record<string, number>;
  race: Record<string, number>;
  by_season: Record<string, { shared_races: number; race: Record<string, number>; qualifying: Record<string, number> }>;
  incomplete_years: number[];
}

interface HeadToHeadResult {
  driverA: DriverSummary;
  driverB: DriverSummary;
  careerStats: { driverA: CareerAllTime | null; driverB: CareerAllTime | null } | null;
  driverDna: unknown;
  headToHeadRecord: HeadToHeadRecord | null;
  relativePerformance: unknown;
  allTimeRankings: unknown;
  careerTrajectory: unknown;
}

const PREVIEW_CARDS = [
  { icon: "trophy", title: "Career Stats", body: "Wins, poles, podiums and championships compared side by side." },
  { icon: "fingerprint", title: "Driver DNA", body: "Radar breakdown of each driver's strengths and style." },
  { icon: "shield", title: "Head-to-Head", body: "Direct results across every race they shared on track." },
  { icon: "bars", title: "Relative Performance", body: "Teammate-relative stats that level the playing field." },
  { icon: "search", title: "All-Time Rankings", body: "Where each driver sits in the all-time record books." },
  { icon: "trend", title: "Career Trajectory", body: "Year-by-year points and finishing positions over their careers." },
] as const;

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
    }, 200);
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
                    {d.headshotUrl ? (
                      <span className="h2h-dropdown-photo">
                        <img src={d.headshotUrl} alt="" />
                      </span>
                    ) : (
                      <span className="h2h-dropdown-swatch" />
                    )}
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


export default function HeadToHeadPage({
  searchDrivers,
  fetchHeadToHead,
}: {
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
      console.log("[h2h result]", JSON.stringify(r, null, 2));
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comparison.");
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    if (canCompare) {
      handleCompare();
    } else {
      setResult(null);
    }

  }, [driverA?.driverId, driverB?.driverId]);

  if (result) {
    return (
      <HeadToHeadResults
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

  async function applyPreset(queryA: string, queryB: string) {
    setError(null);
    try {
      const [ra, rb] = await Promise.all([searchDrivers(queryA), searchDrivers(queryB)]);
      if (ra[0] && rb[0]) {
        setDriverA(ra[0]);
        setDriverB(rb[0]);
      } else {
        setError("Couldn't find one of those drivers. Try searching by name.");
      }
    } catch {
      setError("Couldn't load drivers. Check your connection and try again.");
    }
  }

  return (
    <HeadToHeadLanding
      driverA={driverA}
      driverB={driverB}
      pickerA={<DriverSearchInput label="Driver A" value={driverA} onSelect={setDriverA} searchDrivers={searchDrivers} />}
      pickerB={<DriverSearchInput label="Driver B" value={driverB} onSelect={setDriverB} searchDrivers={searchDrivers} />}
      loading={loading}
      error={error}
      cards={PREVIEW_CARDS.map((card) => ({ icon: <Icon name={card.icon} />, title: card.title, body: card.body }))}
      onPreset={applyPreset}
    />
  );
}



interface SeasonEntry {
  season: number;
  position: number | null;
  points: number | null;
  wins: number | null;
  team: string | null;
}

function normalizeTrajectory(raw: unknown, key: "driverA" | "driverB"): SeasonEntry[] {
  const source = (raw as Record<string, unknown> | null)?.[key];
  const list: unknown[] = Array.isArray(source)
    ? source
    : Array.isArray((source as { seasons?: unknown[] } | null)?.seasons)
      ? (source as { seasons: unknown[] }).seasons
      : [];
  const num = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
  return list
    .map((item) => {
      const s = item as Record<string, unknown>;
      return {
        season: Number(s.season ?? s.year),
        position: num(s.position ?? s.pos ?? s.final_position),
        points: num(s.points ?? s.pts),
        wins: num(s.wins),
        team: (s.team ?? s.team_name ?? null) as string | null,
      };
    })
    .filter((s) => Number.isFinite(s.season));
}

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function pickYearLabels(years: number[], count = 6) {
  if (years.length <= count) return years;
  const step = (years.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => years[Math.round(i * step)]);
}

const signed = (v: number) => (v > 0 ? `+${v}` : String(v));



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
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<"next" | "prev">("next");

  const a = result.driverA;
  const b = result.driverB;
  const driverAName = a.fullName.split(" ").at(-1) ?? a.fullName;
  const driverBName = b.fullName.split(" ").at(-1) ?? b.fullName;


  const h2h = result.headToHeadRecord;
  const bySeason = h2h?.by_season ?? {};
  const sharedRaces = h2h?.shared_races ?? 0;
  const raceA = h2h?.race?.[a.code] ?? 0;
  const raceB = h2h?.race?.[b.code] ?? 0;
  const qualiA = h2h?.qualifying?.[a.code] ?? 0;
  const qualiB = h2h?.qualifying?.[b.code] ?? 0;
  const raceLead = raceA >= raceB ? a : b;
  const raceLeadWins = Math.max(raceA, raceB);
  const raceTrail = Math.min(raceA, raceB);
  const qualiLead = qualiA >= qualiB ? a : b;
  const qualiLeadWins = Math.max(qualiA, qualiB);
  const qualiTrail = Math.min(qualiA, qualiB);
  const confidence =
    sharedRaces >= 50 ? "High confidence" : sharedRaces >= 15 ? "Medium confidence" : "Low confidence";

  const sharedYears = Object.keys(bySeason).map(Number).filter(Number.isFinite).sort((x, y) => x - y);
  const raceAt = (year: number, d: DriverSummary) => bySeason[String(year)]?.race?.[d.code] ?? 0;
  const qualiAt = (year: number, d: DriverSummary) => bySeason[String(year)]?.qualifying?.[d.code] ?? 0;
  const latestShared = sharedYears.at(-1);


  const ca = result.careerStats?.driverA;
  const cb = result.careerStats?.driverB;
  const rate = (n?: number, s?: number) => (s ? Math.round(((n ?? 0) / s) * 1000) / 10 : 0);
  const perSeason = (n?: number, s?: number) => (s ? Math.round(((n ?? 0) / s) * 10) / 10 : 0);

  const metrics = [
    { label: "Win rate", left: rate(ca?.wins, ca?.starts), right: rate(cb?.wins, cb?.starts) },
    { label: "Podium rate", left: rate(ca?.podiums, ca?.starts), right: rate(cb?.podiums, cb?.starts) },
    { label: "Pole rate", left: rate(ca?.poles, ca?.starts), right: rate(cb?.poles, cb?.starts) },
    { label: "Fastest-lap rate", left: rate(ca?.fastest_laps, ca?.starts), right: rate(cb?.fastest_laps, cb?.starts) },
  ].map((m) => ({ ...m, leftValue: `${m.left.toFixed(1)}%`, rightValue: `${m.right.toFixed(1)}%` }));

  const careerRecords = [
    { label: "Championships", left: ca?.championships ?? 0, right: cb?.championships ?? 0 },
    { label: "Race wins", left: ca?.wins ?? 0, right: cb?.wins ?? 0 },
    { label: "Podiums", left: ca?.podiums ?? 0, right: cb?.podiums ?? 0 },
    { label: "Pole positions", left: ca?.poles ?? 0, right: cb?.poles ?? 0 },
    { label: "Fastest laps", left: ca?.fastest_laps ?? 0, right: cb?.fastest_laps ?? 0 },
    { label: "Race starts", left: ca?.starts ?? 0, right: cb?.starts ?? 0 },
  ];


  const dnaSource = [
    { label: "Win rate", detail: "Races won per start", left: rate(ca?.wins, ca?.starts), right: rate(cb?.wins, cb?.starts), suffix: "%", unit: " pts" },
    { label: "Podium rate", detail: "Podiums per start", left: rate(ca?.podiums, ca?.starts), right: rate(cb?.podiums, cb?.starts), suffix: "%", unit: " pts" },
    { label: "Pole rate", detail: "Pole positions per start", left: rate(ca?.poles, ca?.starts), right: rate(cb?.poles, cb?.starts), suffix: "%", unit: " pts" },
    { label: "Fastest-lap rate", detail: "Fastest laps per start", left: rate(ca?.fastest_laps, ca?.starts), right: rate(cb?.fastest_laps, cb?.starts), suffix: "%", unit: " pts" },
    { label: "Wins per season", detail: "Average race wins each season", left: perSeason(ca?.wins, ca?.seasons), right: perSeason(cb?.wins, cb?.seasons), suffix: "", unit: "" },
    { label: "Podiums per season", detail: "Average podiums each season", left: perSeason(ca?.podiums, ca?.seasons), right: perSeason(cb?.podiums, cb?.seasons), suffix: "", unit: "" },
  ];
  const dna = dnaSource.map((row) => {
    const diff = row.left - row.right;
    const level = Math.abs(diff) < 0.05;
    return {
      label: row.label,
      detail: row.detail,
      leftText: `${row.left.toFixed(1)}${row.suffix}`,
      rightText: `${row.right.toFixed(1)}${row.suffix}`,
      edge: level ? "LEVEL" : `${diff > 0 ? driverAName : driverBName} +${Math.abs(diff).toFixed(1)}${row.unit}`,
      lead: level ? 0 : diff > 0 ? 1 : -1,
    };
  });
  const dnaLeadA = dna.filter((row) => row.lead === 1).length;
  const dnaLeadB = dna.filter((row) => row.lead === -1).length;


  const seasonsLedA = sharedYears.filter((y) => raceAt(y, a) > raceAt(y, b)).length;
  const seasonsLedB = sharedYears.filter((y) => raceAt(y, b) > raceAt(y, a)).length;
  const relativeRows = [
    { label: "Qualifying wins", left: qualiA, right: qualiB },
    { label: "Race wins", left: raceA, right: raceB },
    { label: "Seasons led", left: seasonsLedA, right: seasonsLedB },
  ].map((row) => {
    const total = row.left + row.right;
    return { ...row, total, shareA: total ? (row.left / total) * 100 : 50 };
  });


  const trajA = normalizeTrajectory(result.careerTrajectory, "driverA");
  const trajB = normalizeTrajectory(result.careerTrajectory, "driverB");
  const seasons = Array.from(new Set([...trajA, ...trajB].map((s) => s.season))).sort((x, y) => y - x);
  const trajYears = seasons.length ? range(seasons[seasons.length - 1], seasons[0]) : [];
  const activeIndex = Math.min(seasonIndex, Math.max(seasons.length - 1, 0));
  const activeSeason = seasons[activeIndex];
  const seasonA = trajA.find((s) => s.season === activeSeason);
  const seasonB = trajB.find((s) => s.season === activeSeason);

  const goToSeason = (next: number) => {
    const clamped = Math.max(0, Math.min(seasons.length - 1, next));
    if (clamped === activeIndex) return;
    setSlideDir(clamped > activeIndex ? "next" : "prev");
    setSeasonIndex(clamped);
  };

  const positionAt = (list: SeasonEntry[], year: number) => {
    const p = list.find((s) => s.season === year)?.position;
    return p ? Math.min(p, 20) : null;
  };

  const latestSharedA = latestShared !== undefined ? trajA.find((s) => s.season === latestShared) : undefined;
  const latestSharedB = latestShared !== undefined ? trajB.find((s) => s.season === latestShared) : undefined;

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

      {loading ? <div className="h2h-loading-bar" aria-label="Loading comparison" /> : (
        <>
          <div className="h2h-layout">
            <main>
              <section className="h2h-panel h2h-matchup-panel">
                {[a, b].map((d, i) => (
                  <div key={d.driverId} style={{ display: "contents" }}>
                    {i === 1 && (
                      <div className="h2h-versus"><b>vs</b><span>{sharedRaces} shared races</span><small>{confidence.toUpperCase()}</small></div>
                    )}
                    <div className="h2h-driver-block">
                      {d.headshotUrl && (
                        <div className="h2h-headshot">
                          <img src={d.headshotUrl} alt="" />
                        </div>
                      )}
                      <strong>{d.fullName}</strong>
                      <span className="h2h-team-line">
                        {d.team && (
                          <span className="h2h-team-logo-placeholder" aria-hidden />
                        )}
                        {d.team}
                      </span>
                    </div>
                  </div>
                ))}
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
                        <div className="h2h-stat-leading-number">{ca?.championships ?? 0}</div>
                        <div className="h2h-stat-title-copy">
                          <span>Career titles</span>
                          <small>Rates use {ca?.starts ?? 0} / {cb?.starts ?? 0} starts</small>
                        </div>
                        <div className="h2h-stat-leading-number muted">{cb?.championships ?? 0}</div>
                      </div>
                      <div className="h2h-stat-lead-row">
                        <span className="h2h-stat-lead-icon">✦</span>
                        <span>{a.fullName} leads {metrics.filter((m) => m.left > m.right).length} of {metrics.length} efficiency measures</span>
                      </div>
                      {metrics.map((metric) => (
                        <div className="h2h-career-metric-row" key={metric.label}>
                          <div className="h2h-career-metric-header">
                            <span className="h2h-career-metric-label">{metric.label}</span>
                            <span className="h2h-career-metric-detail">{leaderText(metric, driverAName, driverBName)}</span>
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
                  <div className="h2h-dna-head"><span>{a.fullName}</span><b>Matchup edge <em>{a.fullName} {dnaLeadA} - {dnaLeadB} {b.fullName}</em></b><span>{b.fullName}</span></div>
                  {viewMode === "visual" ? (
                    <div className="h2h-dna-grid">
                      {dna.map((row) => (
                        <div className="h2h-dna-card" key={row.label}>
                          <header><b>{row.label}</b><em>{row.edge}</em></header>
                          <small>{row.detail}</small>
                          <div><strong>{row.leftText}</strong><span>— vs —</span><strong>{row.rightText}</strong></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DetailTable
                      leftLabel={a.fullName}
                      rightLabel={b.fullName}
                      rows={dna.map((row) => [row.label, row.leftText, row.rightText, row.detail])}
                    />
                  )}
                </div>
              </section>

              <section className="h2h-section">
                <div className="h2h-section-heading"><span>Head-to-head comparison</span><ViewToggle mode={viewMode} onChange={setViewMode} /></div>
                <div className="h2h-panel h2h-chart-panel">
                  {viewMode === "visual" ? (
                    <>
                      <p className="h2h-kicker">Direct head-to-head</p>
                      <small>Shared-race win split by session type.</small>
                      <BarChart label="Qualifying" left={String(qualiA)} right={String(qualiB)} />
                      <BarChart label="Race" left={String(raceA)} right={String(raceB)} />
                      <p className="h2h-kicker h2h-chart-gap">Performance gaps over seasons</p>
                      <small>Positive values favour {a.fullName}; negative favour {b.fullName}.</small>
                      <SeasonLineChart
                        years={sharedYears}
                        svgClassName="h2h-line-chart"
                        ariaLabel="Performance gap by season"
                        format={signed}
                        series={[
                          { label: "Race gap", className: "h2h-red-line", values: sharedYears.map((y) => raceAt(y, a) - raceAt(y, b)) },
                          { label: "Qualifying gap", className: "h2h-green-line", values: sharedYears.map((y) => qualiAt(y, a) - qualiAt(y, b)) },
                        ]}
                      />
                    </>
                  ) : (
                    <DetailTable
                      leftLabel={a.fullName}
                      rightLabel={b.fullName}
                      rows={[
                        ["Qualifying", String(qualiA), String(qualiB), "Shared qualifying sessions"],
                        ["Race", String(raceA), String(raceB), "Shared race sessions"],
                        ["Shared races", String(sharedRaces), String(sharedRaces), `${confidence} overlap`],
                      ]}
                    />
                  )}
                </div>
              </section>

              <section className="h2h-section">
                <div className="h2h-section-heading"><span>Teammate-relative comparison</span><ViewToggle mode={viewMode} onChange={setViewMode} /></div>
                <div className="h2h-panel h2h-relative-panel">
                  <p>Measures how often each driver beat the other in the seasons they shared. Markers show each driver's share of the wins.</p>
                  {viewMode === "visual" ? (
                    relativeRows.map((row) => (
                      <div className="h2h-relative-row" key={row.label}>
                        <b>{row.label}</b>
                        <span>{row.left} / {row.right}</span>
                        <div>
                          <i style={{ left: `${row.shareA}%` }} />
                          <i className="muted" style={{ left: `${100 - row.shareA}%` }} />
                        </div>
                        <small>{a.fullName}: {row.left} of {row.total} ({Math.round(row.shareA)}%)</small>
                        <small>{b.fullName}: {row.right} of {row.total} ({row.total ? Math.round(100 - row.shareA) : 50}%)</small>
                      </div>
                    ))
                  ) : (
                    <DetailTable
                      leftLabel={a.fullName}
                      rightLabel={b.fullName}
                      rows={relativeRows.map((row) => [row.label, String(row.left), String(row.right), `${row.total} decided`])}
                    />
                  )}
                </div>
              </section>
            </main>

            <aside className="h2h-dashboard-side">
              <div className="h2h-side-card"><b>Direct overlap</b><strong>▥ {confidence}</strong><small>{sharedRaces} shared races</small></div>
              <div className="h2h-side-card">
                <h3>{raceLead.fullName} leads direct race H2H by {raceLeadWins - raceTrail}.</h3>
                <p>{qualiLead.fullName} leads qualifying {qualiLeadWins}-{qualiTrail}.</p>
              </div>
              <div className="h2h-side-card">
                <small>Direct H2H</small>
                <strong>{raceLead.fullName} leads {raceLeadWins}-{raceTrail}</strong>
                <div className="h2h-side-progress"><i style={{ width: `${(raceLeadWins / (raceA + raceB || 1)) * 100}%` }} /></div>
              </div>
              <div className="h2h-side-card"><small>Confidence</small><strong>▥ {sharedRaces} shared races</strong></div>
              <div className="h2h-side-card"><small>Disclaimer</small><p>Stats are derived from publicly available F1 data for informational purposes only. Accuracy may vary.</p></div>
            </aside>
          </div>

          <section className="h2h-section">
            <div className="h2h-section-heading"><span>All-time rankings</span><small>Career record books</small></div>
            <div className="h2h-panel h2h-rankings">
              {careerRecords.map((row) => (
                <div className="h2h-rank-row" key={row.label}>
                  <strong>{row.left}</strong>
                  <span>{row.label}</span>
                  <strong>{row.right}</strong>
                  <div><i style={{ width: `${Math.min(95, (row.left / (row.left + row.right || 1)) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="h2h-section">
            <div className="h2h-section-heading"><span>Dominance trend over seasons</span><small>Race wins against each other, season by season.</small></div>
            <div className="h2h-panel h2h-trend-panel">
              <div className="h2h-trend-legend"><span className="red-dot">{a.fullName} race wins</span><span className="gray-dot">{b.fullName} race wins</span></div>
              <SeasonLineChart
                years={sharedYears}
                height={220}
                svgClassName="h2h-trend-chart"
                ariaLabel="Race wins per shared season"
                series={[
                  { label: driverAName, className: "h2h-red-line", values: sharedYears.map((y) => raceAt(y, a)) },
                  { label: driverBName, className: "h2h-gray-line", values: sharedYears.map((y) => raceAt(y, b)) },
                ]}
              />
              <small className="h2h-chart-note">Higher means more wins in the races both drivers started that season.</small>
            </div>
          </section>

          <section className="h2h-section">
            <div className="h2h-section-heading"><span>Yearly comparison</span><small>Qualifying wins per shared season.</small><ViewToggle mode={viewMode} onChange={setViewMode} /></div>
            <div className="h2h-panel h2h-year-panel">
              {viewMode === "visual" ? (
                <>
                  <div className="h2h-trend-legend"><span className="red-dot">{a.fullName}</span><span className="gray-dot">{b.fullName}</span></div>
                  <SeasonLineChart
                    years={sharedYears}
                    svgClassName="h2h-year-chart"
                    wrapClassName="h2h-advanced-chart"
                    ariaLabel="Qualifying wins per shared season"
                    series={[
                      { label: driverAName, className: "h2h-red-line", values: sharedYears.map((y) => qualiAt(y, a)) },
                      { label: driverBName, className: "h2h-gray-line", values: sharedYears.map((y) => qualiAt(y, b)) },
                    ]}
                  />
                </>
              ) : (
                <DetailTable
                  leftLabel={a.fullName}
                  rightLabel={b.fullName}
                  rows={[...sharedYears].reverse().map((y) => [
                    String(y),
                    `R ${raceAt(y, a)} · Q ${qualiAt(y, a)}`,
                    `R ${raceAt(y, b)} · Q ${qualiAt(y, b)}`,
                    `${bySeason[String(y)]?.shared_races ?? 0} shared races`,
                  ])}
                />
              )}
              {latestShared !== undefined && (
                <div className="h2h-season-row">
                  <div><small>Latest shared season</small><strong>{latestShared}</strong></div>
                  <div>
                    <b>{a.fullName}</b>
                    <span>{latestSharedA?.team ?? "—"}{latestSharedA?.position ? ` · P${latestSharedA.position}` : ""}</span>
                    <small>R {raceAt(latestShared, a)} · Q {qualiAt(latestShared, a)}</small>
                  </div>
                  <div>
                    <b>{b.fullName}</b>
                    <span>{latestSharedB?.team ?? "—"}{latestSharedB?.position ? ` · P${latestSharedB.position}` : ""}</span>
                    <small>R {raceAt(latestShared, b)} · Q {qualiAt(latestShared, b)}</small>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="h2h-section">
            <div className="h2h-section-heading"><span>Career trajectory</span><small>How have their careers evolved?</small></div>
            <div className="h2h-panel h2h-trajectory-panel">
              <div className="h2h-trajectory-head">
                <span className="red-dot">{a.fullName}<small>{ca?.seasons ?? 0} seasons<br />{ca?.championships ?? 0} titles</small></span>
                <span className="gray-dot">{b.fullName}<small>{cb?.seasons ?? 0} seasons<br />{cb?.championships ?? 0} titles</small></span>
              </div>

              <div className="h2h-trajectory-chart-wrap">
                <SeasonLineChart
                  years={trajYears}
                  height={230}
                  yDomain={[1, 20]}
                  invert
                  gridValues={[1, 5, 10, 15, 20]}
                  svgClassName="h2h-trajectory-chart"
                  ariaLabel="Career trajectory"
                  format={(v) => `P${v}`}
                  series={[
                    { label: driverAName, className: "h2h-red-line", values: trajYears.map((y) => positionAt(trajA, y)) },
                    { label: driverBName, className: "h2h-gray-line", values: trajYears.map((y) => positionAt(trajB, y)) },
                  ]}
                />
                {trajYears.length > 0 && (
                  <>
                    <div className="h2h-trajectory-axis"><span>P1</span><span>P5</span><span>P10</span><span>P15</span><span>P20</span></div>
                    <div className="h2h-trajectory-years">
                      {pickYearLabels(trajYears).map((y) => <span key={y}>{y}</span>)}
                    </div>
                  </>
                )}
              </div>

              <div className="h2h-trajectory-legend"><span className="red-dot">{a.fullName}</span><span className="gray-dot">{b.fullName}</span></div>

              <div className="h2h-season-toolbar">
                <div><small>Season</small><strong>{activeSeason ?? "—"}</strong></div>
                <div className="h2h-season-pager">
                  <button type="button" disabled={activeIndex === 0} onClick={() => goToSeason(activeIndex - 1)}>‹</button>
                  <span>{seasons.length ? activeIndex + 1 : 0} of {seasons.length}</span>
                  <button type="button" disabled={activeIndex >= seasons.length - 1} onClick={() => goToSeason(activeIndex + 1)}>›</button>
                </div>
              </div>

              <div className={`h2h-season-cards h2h-slide-${slideDir}`} key={activeSeason}>
                {[{ d: a, s: seasonA }, { d: b, s: seasonB }].map(({ d, s }) => (
                  <div key={d.driverId}>
                    <b>{d.fullName}</b>
                    <span>{s?.team ?? "—"}</span>
                    <strong>{s?.position ? `P${s.position}` : "—"}</strong>
                    <small>
                      {s ? `${s.points ?? 0} pts · ${s.wins ?? 0} ${s.wins === 1 ? "win" : "wins"}` : "Did not race this season"}
                    </small>
                  </div>
                ))}
              </div>

              <div className="h2h-season-dots">
                {seasons.map((year, index) => (
                  <i
                    key={year}
                    title={String(year)}
                    className={index === activeIndex ? "active" : ""}
                    onClick={() => goToSeason(index)}
                  />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}



function leaderText(
  m: { label: string; left: number; right: number },
  aName: string,
  bName: string,
) {
  const diff = Math.abs(m.left - m.right);
  if (diff === 0) return "Level";
  return `${m.left > m.right ? aName : bName} leads by ${diff.toFixed(1)} percentage points`;
}

function ViewToggle({ mode, onChange }: { mode: "visual" | "detail"; onChange: (mode: "visual" | "detail") => void }) {
  return (
    <div className="h2h-tabs">
      <button type="button" className={mode === "visual" ? "active" : ""} onClick={() => onChange("visual")}>▦ Visual</button>
      <button type="button" className={mode === "detail" ? "active" : ""} onClick={() => onChange("detail")}>▤ Detail</button>
    </div>
  );
}

function DetailTable({ rows, leftLabel, rightLabel }: { rows: string[][]; leftLabel: string; rightLabel: string }) {
  if (!rows.length) return <p className="h2h-empty">No data available.</p>;
  return (
    <div className="h2h-detail-table">
      <div className="h2h-detail-head"><span>Metric</span><span>{leftLabel}</span><span>{rightLabel}</span><span>Context</span></div>
      {rows.map((row) => (
        <div className="h2h-detail-row" key={row[0]}>
          {row.map((cell, index) => <span className={index === 0 ? "metric" : ""} key={`${row[0]}-${index}`}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

function BarChart({ label, left, right }: { label: string; left: string; right: string }) {
  return (
    <div className="h2h-bar-chart">
      <span>{label}</span>
      <div title={`${label}: Driver A ${left}, Driver B ${right}`}>
        <i style={{ width: `${(Number(left) / (Number(left) + Number(right) || 1)) * 100}%` }} />
        <b>{left}</b>
        <em>{right}</em>
      </div>
    </div>
  );
}



interface ChartSeries {
  label: string;
  className: string;
  values: (number | null)[];
}

function SeasonLineChart({
  years,
  series,
  format = (v: number) => String(v),
  yDomain,
  invert = false,
  gridValues,
  height = 190,
  wrapClassName = "",
  svgClassName = "",
  ariaLabel,
}: {
  years: number[];
  series: ChartSeries[];
  format?: (v: number) => string;
  yDomain?: [number, number];
  invert?: boolean;
  gridValues?: number[];
  height?: number;
  wrapClassName?: string;
  svgClassName?: string;
  ariaLabel: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  if (!years.length) return <p className="h2h-empty">No season data available yet.</p>;

  const W = 760;
  const padX = 20;
  const padY = 20;
  const values = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const lo = yDomain ? yDomain[0] : Math.min(0, ...values);
  const hi = yDomain ? yDomain[1] : Math.max(0, ...values);
  const span = hi - lo || 1;

  const xAt = (i: number) => (years.length === 1 ? W / 2 : padX + (i / (years.length - 1)) * (W - padX * 2));
  const yAt = (v: number) => {
    const t = (v - lo) / span;
    return padY + (invert ? t : 1 - t) * (height - padY * 2);
  };

  const grid = gridValues ?? (lo < 0 && hi > 0 ? [lo, 0, hi] : [lo, (lo + hi) / 2, hi]);
  const gridPath = grid.map((g) => `M${padX} ${yAt(g).toFixed(1)}H${W - padX}`).join("");

  const pathFor = (vals: (number | null)[]) => {
    let d = "";
    let penDown = false;
    vals.forEach((v, i) => {
      if (v === null) {
        penDown = false;
        return;
      }
      d += `${penDown ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`;
      penDown = true;
    });
    return d;
  };

  const handleMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const vx = (px / rect.width) * W;
    let nearest = 0;
    years.forEach((_, i) => {
      if (Math.abs(xAt(i) - vx) < Math.abs(xAt(nearest) - vx)) nearest = i;
    });
    setHoverIndex(nearest);
    setTooltipPosition({
      x: Math.min(Math.max(px, 20), rect.width - 20),
      y: Math.min(Math.max(py, 20), rect.height - 20),
    });
  };

  return (
    <div className={`h2h-interactive-chart ${wrapClassName}`} onMouseLeave={() => setHoverIndex(null)}>
      {hoverIndex !== null && (
        <div className="h2h-chart-tooltip h2h-multi-tooltip h2h-cursor-tooltip" style={{ left: tooltipPosition.x, top: tooltipPosition.y }}>
          <b>{years[hoverIndex]}</b>
          {series.map((s) => (
            <span key={s.label}>
              {s.label} <strong>{s.values[hoverIndex] === null ? "—" : format(s.values[hoverIndex] as number)}</strong>
            </span>
          ))}
        </div>
      )}
      <svg className={svgClassName} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel} onMouseMove={handleMove}>
        <path className="h2h-gridline" d={gridPath} />
        {series.map((s) => <path key={s.label} className={s.className} d={pathFor(s.values)} />)}
        {hoverIndex !== null && (
          <line x1={xAt(hoverIndex)} x2={xAt(hoverIndex)} y1={padY} y2={height - padY} className="h2h-crosshair" />
        )}
        {series.map((s) =>
          s.values.map((v, i) =>
            v === null ? null : <circle key={`${s.label}-${years[i]}`} cx={xAt(i)} cy={yAt(v)} r="8" className="h2h-hover-point" />,
          ),
        )}
        <rect x="0" y="0" width={W} height={height} className="h2h-chart-hit-area" />
      </svg>
    </div>
  );
}