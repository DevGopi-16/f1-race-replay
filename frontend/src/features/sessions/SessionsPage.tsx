import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSchedule, type RaceWeekend } from "../schedule/schedule.api";
import { getFlagEmoji } from "../schedule/countryFlags";
import { getCircuitSvgUrl, getCircuitMeta } from "../schedule/circuitAssets";
import { CircuitTrack } from "../schedule/CircuitTrack";

type SessionKey = "FP1" | "FP2" | "FP3" | "Q" | "S" | "R";
type Tab = "all" | "upcoming" | "completed" | "sprint";

interface SessionDef {
  key: SessionKey;
  label: string;
  shortLabel: string;
}

const SESSION_DEFS: SessionDef[] = [
  { key: "FP1", label: "Practice 1", shortLabel: "FP1" },
  { key: "FP2", label: "Practice 2", shortLabel: "FP2" },
  { key: "FP3", label: "Practice 3", shortLabel: "FP3" },
  { key: "Q", label: "Qualifying", shortLabel: "Q" },
  { key: "S", label: "Sprint", shortLabel: "S" },
  { key: "R", label: "Race", shortLabel: "R" },
];

const YEAR_OPTIONS = [2026, 2025, 2024, 2023, 2022];

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "sprint", label: "Sprint" },
];

function isSprintWeekend(type: string): boolean {
  return type.toLowerCase().includes("sprint");
}

function parseWeekendDate(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(raw: string): string {
  const d = parseWeekendDate(raw);
  if (!d) return raw;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getSessionsForWeekend(weekend: RaceWeekend): SessionDef[] {
  const sprintWeekend = isSprintWeekend(weekend.type);
  return SESSION_DEFS.filter((def) => def.key !== "S" || sprintWeekend);
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function getCountdown(target: Date, now: Date): Countdown {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isPast: false,
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export default function SessionsPage() {
  const navigate = useNavigate();

  const [year, setYear] = useState(new Date().getFullYear());
  const [weekends, setWeekends] = useState<RaceWeekend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await getSchedule(year);

        if (!cancelled) {
          const sorted = [...data].sort(
            (a, b) => a.round_number - b.round_number,
          );
          setWeekends(sorted);
          setExpandedRound(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load season schedule.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [year]);

  // The weekend the hero card highlights: nearest upcoming, or if the
  // whole season is in the past, the most recently completed one.
  const heroWeekend = useMemo(() => {
    if (weekends.length === 0) return null;

    let best: RaceWeekend | null = null;
    let bestDiff = Infinity;

    for (const w of weekends) {
      const d = parseWeekendDate(w.date);
      if (!d) continue;
      const diff = d.getTime() - now.getTime();
      if (diff >= 0 && diff < bestDiff) {
        best = w;
        bestDiff = diff;
      }
    }

    if (best) return best;

    // everything's in the past — fall back to the latest round
    return [...weekends].sort((a, b) => {
      const da = parseWeekendDate(a.date)?.getTime() ?? 0;
      const db = parseWeekendDate(b.date)?.getTime() ?? 0;
      return db - da;
    })[0];
  }, [weekends, now]);

  const heroDate = heroWeekend ? parseWeekendDate(heroWeekend.date) : null;
  const heroCountdown = heroDate ? getCountdown(heroDate, now) : null;
  const heroSvg = heroWeekend
    ? getCircuitSvgUrl(heroWeekend.event_name, heroWeekend.country)
    : null;

  const filteredWeekends = useMemo(() => {
    return weekends.filter((w) => {
      const d = parseWeekendDate(w.date);
      const upcoming = d ? d.getTime() >= now.getTime() : true;

      if (activeTab === "upcoming" && !upcoming) return false;
      if (activeTab === "completed" && upcoming) return false;
      if (activeTab === "sprint" && !isSprintWeekend(w.type)) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${w.event_name} ${w.country}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [weekends, activeTab, search, now]);

  function handleOpenSession(weekend: RaceWeekend, sessionKey: SessionKey) {
    navigate(
      `/replay?year=${year}&round=${weekend.round_number}&session=${sessionKey}`,
    );
  }

  function handleShare(weekend: RaceWeekend) {
    const url = `${window.location.origin}${window.location.pathname}?year=${year}&round=${weekend.round_number}`;
    if (navigator.share) {
      navigator.share({ title: weekend.event_name, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  }

  function toggleExpanded(round: number) {
    setExpandedRound((current) => (current === round ? null : round));
  }

  return (
    <main className="sessions-page">
      <div className="sessions-container">
        <header className="sessions-header">
          <div className="sessions-header-title">
            <p className="sessions-header-eyebrow">The Paddock</p>
            <h1>Sessions Hub</h1>
            <p className="sessions-header-sub">
              {year} season weekends — pick any round to jump into a session.
            </p>
          </div>

          <div className="sessions-year-toggle" role="tablist" aria-label="Season">
            {YEAR_OPTIONS.map((y) => (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={y === year}
                className={`sessions-year-pill${y === year ? " is-active" : ""}`}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </header>

        <nav className="sessions-tabs" role="tablist" aria-label="Filter rounds">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`sessions-tab${activeTab === tab.key ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {loading && (
          <section className="sessions-loading">
            <span className="sessions-spinner" aria-hidden="true" />
            <span>Loading weekend…</span>
          </section>
        )}

        {!loading && error && (
          <section className="sessions-error">
            <strong>Unable to load schedule</strong>
            <span>{error}</span>
          </section>
        )}

        {!loading && !error && heroWeekend && (
          <>
            <div className="sessions-hero-label">
              <span className="sessions-hero-bar" aria-hidden="true" />
              {heroCountdown && !heroCountdown.isPast
                ? "Next Grand Prix"
                : "Latest Round"}
            </div>

            <section className="sessions-hero">
              <div className="sessions-hero-main">
                <div className="sessions-hero-top">
                  <span className="sessions-hero-round">
                    Round {heroWeekend.round_number}
                  </span>
                  <span
                    className={`sessions-hero-status ${
                      heroCountdown && !heroCountdown.isPast
                        ? "is-upcoming"
                        : "is-completed"
                    }`}
                  >
                    {heroCountdown && !heroCountdown.isPast
                      ? "Upcoming"
                      : "Completed"}
                  </span>
                  {isSprintWeekend(heroWeekend.type) && (
                    <span className="sessions-hero-status is-sprint">
                      ⚡ Sprint
                    </span>
                  )}
                </div>

                <div className="sessions-hero-body">
                  <div className="sessions-hero-track">
                    <CircuitTrack
                      url={heroSvg}
                      className="sessions-hero-track-svg"
                      animate
                      fallback={
                        <span className="sessions-hero-track-fallback">
                          {getFlagEmoji(heroWeekend.country)}
                        </span>
                      }
                    />
                  </div>


                  <div>
                    <h2 className="sessions-hero-title">
                      <span className="sessions-hero-flag">
                        {getFlagEmoji(heroWeekend.country)}
                      </span>
                      {heroWeekend.event_name}
                    </h2>
                    <div className="sessions-hero-meta">
                      <span>{heroWeekend.country}</span>
                      <span className="sessions-hero-dot" aria-hidden="true" />
                      <span>{formatDate(heroWeekend.date)}</span>
                    </div>

                    <div className="sessions-hero-chips">
                      {getSessionsForWeekend(heroWeekend).map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          className="sessions-hero-chip"
                          onClick={() => handleOpenSession(heroWeekend, s.key)}
                        >
                          {s.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sessions-hero-side">
                <span className="sessions-hero-side-label">
                  {heroCountdown && !heroCountdown.isPast
                    ? "Lights out in"
                    : "Season status"}
                </span>

                {heroCountdown && !heroCountdown.isPast ? (
                  <div className="sessions-countdown">
                    <div className="sessions-countdown-unit">
                      <span>{pad(heroCountdown.days)}</span>
                      <small>Days</small>
                    </div>
                    <span className="sessions-countdown-sep">:</span>
                    <div className="sessions-countdown-unit">
                      <span>{pad(heroCountdown.hours)}</span>
                      <small>Hrs</small>
                    </div>
                    <span className="sessions-countdown-sep">:</span>
                    <div className="sessions-countdown-unit">
                      <span>{pad(heroCountdown.minutes)}</span>
                      <small>Min</small>
                    </div>
                    <span className="sessions-countdown-sep">:</span>
                    <div className="sessions-countdown-unit">
                      <span>{pad(heroCountdown.seconds)}</span>
                      <small>Sec</small>
                    </div>
                  </div>
                ) : (
                  <p className="sessions-countdown-note">
                    Round {heroWeekend.round_number} has taken place —
                    replay any session below.
                  </p>
                )}

                <button
                  type="button"
                  className="sessions-hero-cta"
                  onClick={() =>
                    handleOpenSession(
                      heroWeekend,
                      getSessionsForWeekend(heroWeekend).slice(-1)[0].key,
                    )
                  }
                >
                  Open Replay
                </button>
              </div>
            </section>

            <div className="sessions-search">
              <span className="sessions-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="text"
                placeholder="Search by name…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {filteredWeekends.length === 0 ? (
              <div className="sessions-empty">
                No rounds match your filters.
              </div>
            ) : (
              <div className="sessions-grid">
                {filteredWeekends.map((weekend) => {
                  const svg = getCircuitSvgUrl(
                    weekend.event_name,
                    weekend.country,
                  );
                  const d = parseWeekendDate(weekend.date);
                  const upcoming = d ? d.getTime() >= now.getTime() : true;
                  const expanded = expandedRound === weekend.round_number;
                  const sessions = getSessionsForWeekend(weekend);
                  const meta = getCircuitMeta(weekend.event_name, weekend.country);

                  return (
                    <div key={weekend.round_number} className="round-card">
                      <div className="round-card-top">
                        <span className="round-card-round">
                          Round {weekend.round_number}
                        </span>
                        <div className="round-card-badges">
                          {isSprintWeekend(weekend.type) && (
                            <span className="round-card-badge is-sprint">
                              ⚡ Sprint
                            </span>
                          )}
                          <span
                            className={`round-card-badge ${
                              upcoming ? "is-upcoming" : "is-completed"
                            }`}
                          >
                            {upcoming ? "Upcoming" : "Completed"}
                          </span>
                          <button
                            type="button"
                            className="round-card-share"
                            aria-label="Share this round"
                            onClick={() => handleShare(weekend)}
                          >
                            ⤴
                          </button>
                        </div>
                      </div>

                      <h3 className="round-card-title">
                        <span>{getFlagEmoji(weekend.country)}</span>
                        {meta ? meta.displayName : weekend.event_name}
                      </h3>
                      <span className="round-card-location">
                        📍 {weekend.event_name}, {weekend.country}
                      </span>

                      <div className="round-card-track">
                        <CircuitTrack
                          url={svg}
                          className="round-card-track-svg"
                          animate
                          hoverOnly
                          fallback={
                            <span className="round-card-track-fallback">
                              {getFlagEmoji(weekend.country)}
                            </span>
                          }
                        />
                      </div>

                      <div className="round-card-stats">
                        <div>
                          <span className="round-card-stat-label">Length</span>
                          <span className="round-card-stat-value">
                            {meta ? `${meta.lengthKm.toFixed(2)} km` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="round-card-stat-label">Turns</span>
                          <span className="round-card-stat-value">
                            {meta ? meta.turns : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="round-card-stat-label">Date</span>
                          <span className="round-card-stat-value">
                            {d
                              ? d.toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })
                              : weekend.date}
                          </span>
                        </div>
                      </div>


                      {expanded ? (
                        <div className="round-card-sessions">
                          {sessions.map((s) => (
                            <button
                              key={s.key}
                              type="button"
                              className="round-card-session-btn"
                              onClick={() => handleOpenSession(weekend, s.key)}
                            >
                              <span>{s.label}</span>
                              <span className="round-card-session-arrow">→</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="round-card-view-btn"
                          onClick={() => toggleExpanded(weekend.round_number)}
                        >
                          View Sessions
                        </button>
                      )}

                      {expanded && (
                        <button
                          type="button"
                          className="round-card-collapse-btn"
                          onClick={() => toggleExpanded(weekend.round_number)}
                        >
                          Collapse
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!loading && !error && !heroWeekend && (
          <div className="sessions-empty">
            No race weekends found for {year}.
          </div>
        )}
      </div>
    </main>
  );
}