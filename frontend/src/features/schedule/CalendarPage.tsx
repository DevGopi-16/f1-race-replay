import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { getSchedule, type RaceWeekend } from "./schedule.api";
import { getFlagEmoji } from "./countryFlags";

const EVENT_FORMAT_LABELS: Record<string, string> = {
  conventional: "Race Weekend",
  sprint_qualifying: "Sprint Weekend",
  sprint: "Sprint Weekend",
  sprint_shootout: "Sprint Weekend",
};

function formatDate(dateStr: string): { day: string; month: string } {
  const date = new Date(`${dateStr}T00:00:00Z`);

  return {
    day: date.toLocaleDateString("en-US", {
      day: "2-digit",
      timeZone: "UTC",
    }),
    month: date.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    }),
  };
}

function isPast(dateStr: string): boolean {
  return new Date(`${dateStr}T23:59:59Z`).getTime() < Date.now();
}

function formatCountdown(dateStr: string, now: number): string {
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  const remaining = Math.max(0, target - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);

  return `${days}d ${String(hours).padStart(2, "0")}h`;
}

export default function CalendarPage() {
  const [weekends, setWeekends] = useState<RaceWeekend[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">(
    "all",
  );
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await getSchedule(year);

        if (!cancelled) {
          setWeekends(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load calendar.",
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

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const sortedWeekends = useMemo(
    () =>
      [...weekends].sort(
        (a, b) => a.round_number - b.round_number,
      ),
    [weekends],
  );

  const nextRoundNumber = useMemo(() => {
    const upcoming = sortedWeekends.find((w) => !isPast(w.date));
    return upcoming?.round_number ?? null;
  }, [sortedWeekends]);

  const completedCount = useMemo(
    () => sortedWeekends.filter((w) => isPast(w.date)).length,
    [sortedWeekends],
  );

  const totalCount = sortedWeekends.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const nextWeekend = useMemo(
    () => sortedWeekends.find((w) => w.round_number === nextRoundNumber),
    [sortedWeekends, nextRoundNumber],
  );

  const sprintCount = useMemo(
    () =>
      sortedWeekends.filter((weekend) =>
        weekend.type.toLowerCase().includes("sprint"),
      ).length,
    [sortedWeekends],
  );

  const countryCount = useMemo(
    () => new Set(sortedWeekends.map((weekend) => weekend.country)).size,
    [sortedWeekends],
  );

  const visibleWeekends = useMemo(
    () =>
      sortedWeekends.filter((weekend) => {
        if (filter === "upcoming") return !isPast(weekend.date);
        if (filter === "completed") return isPast(weekend.date);
        return true;
      }),
    [filter, sortedWeekends],
  );

  const selectedWeekend = useMemo(
    () =>
      sortedWeekends.find(
        (weekend) => weekend.round_number === selectedRound,
      ) ?? nextWeekend ?? sortedWeekends[0],
    [nextWeekend, selectedRound, sortedWeekends],
  );

  function handleGridMouseMove(event: MouseEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    grid.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    grid.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
  }

  return (
    <main className="calendar-page">
      <div className="calendar-container">
        <header className="calendar-header">
          <div className="calendar-header-title">
            <p className="calendar-header-eyebrow">
              F1 RACE REPLAY <span /> SEASON ARCHIVE
            </p>
            <h1>{year} Season</h1>
            <p className="calendar-header-description">
              The complete championship journey, from lights out
              to the final chequered flag.
            </p>
          </div>

          <div className="calendar-year-switch">
            <span className="calendar-year-label">SEASON</span>
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
            >
              ←
            </button>
            <span>{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
            >
              →
            </button>
          </div>
        </header>

        {!loading && !error && totalCount > 0 && (
          <>
          {nextWeekend && (
            <section className="calendar-next-panel">
              <div className="calendar-next-panel-art" aria-hidden="true">
                <span>F1</span>
              </div>
              <div className="calendar-next-panel-copy">
                <span className="calendar-next-kicker">NEXT ON THE GRID</span>
                <h2>
                  {getFlagEmoji(nextWeekend.country)}{" "}
                  {nextWeekend.event_name}
                </h2>
                <p>
                  Round {nextWeekend.round_number} ·{" "}
                  {EVENT_FORMAT_LABELS[nextWeekend.type] ?? nextWeekend.type}
                </p>
              </div>
              <div className="calendar-next-panel-countdown">
                <span>LIGHTS OUT IN</span>
                <strong>{formatCountdown(nextWeekend.date, now)}</strong>
                <small>{nextWeekend.date}</small>
              </div>
            </section>
          )}
          <section className="calendar-progress">
            <div className="calendar-progress-info">
              <div>
                <span className="calendar-progress-label">
                  CHAMPIONSHIP STATUS
                </span>
                <strong className="calendar-progress-heading">
                  {completedCount === totalCount
                    ? "Season complete"
                    : `${progressPercent}% of the season complete`}
                </strong>
              </div>
              <span className="calendar-progress-count">
                <b>{String(completedCount).padStart(2, "0")}</b>
                <i>/</i>
                {String(totalCount).padStart(2, "0")} rounds
              </span>
            </div>

            <div className="calendar-progress-track">
              <div
                className="calendar-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {nextWeekend && (
              <span className="calendar-progress-next">
                {getFlagEmoji(nextWeekend.country)} Next up:{" "}
                {nextWeekend.event_name}
              </span>
            )}
            <div className="calendar-season-metrics">
              <div>
                <span>RACE WEEKS</span>
                <strong>{totalCount}</strong>
              </div>
              <div>
                <span>SPRINT EVENTS</span>
                <strong>{sprintCount}</strong>
              </div>
              <div>
                <span>COUNTRIES</span>
                <strong>{countryCount}</strong>
              </div>
            </div>
          </section>
          </>
        )}

        {loading && (
          <section className="calendar-loading">
            <span>LOADING CALENDAR</span>
          </section>
        )}

        {!loading && error && (
          <section className="calendar-error">
            <strong>Unable to load calendar</strong>
            <span>{error}</span>
          </section>
        )}

        {!loading && !error && sortedWeekends.length === 0 && (
          <div className="calendar-empty">
            🏁 {year} calendar coming soon — check back once it's announced.
          </div>
        )}

        {!loading && !error && sortedWeekends.length > 0 && (
          <>
          <div className="calendar-grid-toolbar">
            <div>
              <span className="calendar-grid-kicker">THE FULL GRID</span>
              <strong>{visibleWeekends.length} race weekends</strong>
            </div>
            <div className="calendar-filter" role="tablist" aria-label="Filter races">
              {(["all", "upcoming", "completed"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={filter === option}
                  className={filter === option ? "is-active" : ""}
                  onClick={() => setFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          {selectedWeekend && (
            <section className="calendar-inspector" aria-live="polite">
              <div className="calendar-inspector-index">
                <span>ROUND</span>
                <strong>
                  {String(selectedWeekend.round_number).padStart(2, "0")}
                </strong>
              </div>
              <div className="calendar-inspector-copy">
                <span className="calendar-inspector-kicker">
                  {isPast(selectedWeekend.date) ? "ARCHIVED EVENT" : "UPCOMING EVENT"}
                </span>
                <h2>
                  {getFlagEmoji(selectedWeekend.country)}{" "}
                  {selectedWeekend.event_name}
                </h2>
                <p>
                  {selectedWeekend.country} ·{" "}
                  {EVENT_FORMAT_LABELS[selectedWeekend.type] ?? selectedWeekend.type}
                </p>
              </div>
              <div className="calendar-inspector-date">
                <span>EVENT DATE</span>
                <strong>{selectedWeekend.date}</strong>
                <small>
                  {isPast(selectedWeekend.date)
                    ? "Race weekend complete"
                    : `${formatCountdown(selectedWeekend.date, now)} until lights out`}
                </small>
              </div>
            </section>
          )}
          <div
            className="calendar-grid"
            ref={gridRef}
            onMouseMove={handleGridMouseMove}
          >
            {visibleWeekends.map((weekend, index) => {
              const { day, month } = formatDate(weekend.date);
              const past = isPast(weekend.date);
              const isNext = weekend.round_number === nextRoundNumber;
              const flag = getFlagEmoji(weekend.country);

              const cardStyle = {
                "--card-index": index,
              } as CSSProperties;

              return (
                <div
                  key={weekend.round_number}
                  className={`calendar-card ${past ? "is-past" : ""} ${
                    isNext ? "is-next" : ""
                  } ${
                    selectedWeekend?.round_number === weekend.round_number
                      ? "is-selected"
                      : ""
                  }`}
                  style={cardStyle}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${weekend.event_name} details`}
                  onClick={() => setSelectedRound(weekend.round_number)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedRound(weekend.round_number);
                    }
                  }}
                >
                  <div className="calendar-card-date">
                    <span className="calendar-card-day">{day}</span>
                    <span className="calendar-card-month">{month}</span>
                  </div>

                  <div className="calendar-card-body">
                    <span className="calendar-card-round">
                      ROUND {weekend.round_number}
                    </span>

                    <h3 className="calendar-card-title">
                      {flag && (
                        <span className="calendar-card-flag">
                          {flag}
                        </span>
                      )}
                      {weekend.event_name}
                    </h3>

                    <span className="calendar-card-format">
                      {EVENT_FORMAT_LABELS[weekend.type] ??
                        weekend.type}
                    </span>
                    <span className="calendar-card-location">
                      {weekend.country}
                    </span>
                  </div>

                  {past && (
                    <span className="calendar-card-badge">
                      Completed
                    </span>
                  )}

                  {isNext && !past && (
                    <span className="calendar-card-badge is-next-badge">
                      Up Next
                    </span>
                  )}
                </div>
              );
            })}

            <div className="calendar-spotlight" aria-hidden="true" />
          </div>
          </>
        )}
      </div>
    </main>
  );
}