import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSchedule, type RaceWeekend } from "../schedule/schedule.api";
import { getFlagEmoji } from "../schedule/countryFlags";

type SessionKey = "FP1" | "FP2" | "FP3" | "Q" | "S" | "R";

interface SessionDef {
  key: SessionKey;
  label: string;
}

const SESSION_DEFS: SessionDef[] = [
  { key: "FP1", label: "Practice 1" },
  { key: "FP2", label: "Practice 2" },
  { key: "FP3", label: "Practice 3" },
  { key: "Q", label: "Qualifying" },
  { key: "S", label: "Sprint" },
  { key: "R", label: "Race" },
];

// Placeholder shape for now — Phase 2 replaces this with a real
// backend call returning fastest lap / top 3 / weather per session.
interface SessionCardData {
  key: SessionKey;
  label: string;
  status: "not-started" | "no-data";
}

function isSprintWeekend(type: string): boolean {
  return type.toLowerCase().includes("sprint");
}

export default function SessionsPage() {
  const navigate = useNavigate();

  const [year, setYear] = useState(new Date().getFullYear());
  const [weekends, setWeekends] = useState<RaceWeekend[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

          // default to the first weekend if none selected yet,
          // or if the previous selection doesn't exist in this year
          setSelectedRound((current) => {
            if (current && sorted.some((w) => w.round_number === current)) {
              return current;
            }
            return sorted[0]?.round_number ?? null;
          });
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

  const selectedWeekend = useMemo(
    () => weekends.find((w) => w.round_number === selectedRound) ?? null,
    [weekends, selectedRound],
  );

  const sessionCards: SessionCardData[] = useMemo(() => {
    if (!selectedWeekend) return [];

    const sprintWeekend = isSprintWeekend(selectedWeekend.type);

    return SESSION_DEFS.filter(
      (def) => def.key !== "S" || sprintWeekend,
    ).map((def) => ({
      key: def.key,
      label: def.label,
      // Phase 1: everything is a placeholder. Phase 2 wires real
      // results in and this becomes "completed" | "not-started".
      status: "no-data",
    }));
  }, [selectedWeekend]);

  function handleOpenSession(sessionKey: SessionKey) {
    if (!selectedWeekend) return;

    navigate(
      `/replay?year=${year}&round=${selectedWeekend.round_number}&session=${sessionKey}`,
    );
  }

  return (
    <main className="sessions-page">
      <div className="sessions-container">
        <header className="sessions-header">
          <div className="sessions-header-title">
            <p className="sessions-header-eyebrow">
              F1 RACE REPLAY / SESSIONS
            </p>
            <h1>Race Weekend</h1>
          </div>

          <div className="sessions-controls">
            <select
              className="sessions-select"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {[2026, 2025, 2024, 2023, 2022].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              className="sessions-select"
              value={selectedRound ?? ""}
              onChange={(event) =>
                setSelectedRound(Number(event.target.value))
              }
              disabled={weekends.length === 0}
            >
              {weekends.map((weekend) => (
                <option
                  key={weekend.round_number}
                  value={weekend.round_number}
                >
                  {weekend.event_name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {loading && (
          <section className="sessions-loading">
            <span>LOADING WEEKEND</span>
          </section>
        )}

        {!loading && error && (
          <section className="sessions-error">
            <strong>Unable to load schedule</strong>
            <span>{error}</span>
          </section>
        )}

        {!loading && !error && selectedWeekend && (
          <>
            <div className="sessions-weekend-banner">
              <span className="sessions-weekend-flag">
                {getFlagEmoji(selectedWeekend.country)}
              </span>
              <div>
                <h2>{selectedWeekend.event_name}</h2>
                <span className="sessions-weekend-date">
                  {selectedWeekend.date}
                </span>
              </div>
            </div>

            <div className="sessions-grid">
              {sessionCards.map((card) => (
                <button
                  type="button"
                  key={card.key}
                  className="session-card"
                  onClick={() => handleOpenSession(card.key)}
                >
                  <span className="session-card-label">{card.label}</span>

                  <span className="session-card-status">
                    {card.status === "no-data"
                      ? "Tap to open in Replay"
                      : "Not started"}
                  </span>

                  <span className="session-card-arrow">→</span>
                </button>
              ))}
            </div>
          </>
        )}

        {!loading && !error && !selectedWeekend && (
          <div className="sessions-empty">
            No race weekends found for {year}.
          </div>
        )}
      </div>
    </main>
  );
}