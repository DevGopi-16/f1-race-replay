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

export default function CalendarPage() {
  const [weekends, setWeekends] = useState<RaceWeekend[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
              F1 RACE REPLAY / CALENDAR
            </p>
            <h1>{year} Season</h1>
          </div>

          <div className="calendar-year-switch">
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
          <section className="calendar-progress">
            <div className="calendar-progress-info">
              <span className="calendar-progress-label">
                SEASON PROGRESS
              </span>
              <span className="calendar-progress-count">
                {completedCount} / {totalCount} completed
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
          </section>
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
          <div
            className="calendar-grid"
            ref={gridRef}
            onMouseMove={handleGridMouseMove}
          >
            {sortedWeekends.map((weekend, index) => {
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
                  }`}
                  style={cardStyle}
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
        )}
      </div>
    </main>
  );
}