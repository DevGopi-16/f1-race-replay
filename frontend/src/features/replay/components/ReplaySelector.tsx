import { useEffect, useState } from "react";
import type { ReplaySessionType } from "../replay.types";

interface ReplayEvent {
  name: string;
  location?: string;
  country?: string;
}

interface Props {
  year: number;
  grandPrix: string;
  sessionType: ReplaySessionType;
  fps: number;

  onYearChange: (value: number) => void;
  onGrandPrixChange: (value: string) => void;
  onSessionChange: (value: ReplaySessionType) => void;
  onFpsChange: (value: number) => void;

  onLoadReplay?: () => void;
  loading?: boolean;
}

const sessions: ReplaySessionType[] = [
  "R",
  "S",
  "FP1",
  "FP2",
  "FP3",
];

const years = [
  2026,
  2025,
  2024,
  2023,
  2022,
  2021,
  2020,
  2019,
];

export default function ReplaySelector({
  year,
  grandPrix,
  sessionType,
  fps,
  onYearChange,
  onGrandPrixChange,
  onSessionChange,
  onFpsChange,
  onLoadReplay,
  loading = false,
}: Props) {
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setEventsLoading(true);
      setEventsError("");

      try {
        const response = await fetch(
          `/api/replay/events?year=${year}`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load ${year} Grand Prix calendar`,
          );
        }

        const data = await response.json();

        if (cancelled) return;

        const nextEvents: ReplayEvent[] =
          Array.isArray(data.events)
            ? data.events
            : [];

        setEvents(nextEvents);

        if (nextEvents.length > 0) {
          const exists = nextEvents.some(
            (event) =>
              event.name.trim().toLowerCase() ===
              grandPrix.trim().toLowerCase(),
          );

          if (!exists) {
            onGrandPrixChange(nextEvents[0].name);
          }
        }
      } catch (error) {
        if (cancelled) return;

        console.error(
          "[ReplaySelector] Failed to load events:",
          error,
        );

        setEvents([]);
        setEventsError(
          "Unable to load Grand Prix calendar.",
        );
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [year]);

  return (
    <section className="replay-selector">

      <label>
        <span>YEAR</span>

        <select
          value={year}
          disabled={loading}
          onChange={(event) =>
            onYearChange(
              Number(event.target.value),
            )
          }
        >
          {years.map((season) => (
            <option
              key={season}
              value={season}
            >
              {season}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>GRAND PRIX</span>

        <select
          value={grandPrix}
          disabled={
            loading ||
            eventsLoading ||
            events.length === 0
          }
          onChange={(event) =>
            onGrandPrixChange(
              event.target.value,
            )
          }
        >
          {eventsLoading && (
            <option value={grandPrix}>
              LOADING GRAND PRIX...
            </option>
          )}

          {!eventsLoading &&
            events.length === 0 && (
              <option value={grandPrix}>
                NO EVENTS
              </option>
            )}

          {events.map((event) => (
            <option
              key={event.name}
              value={event.name}
            >
              {event.name}
            </option>
          ))}
        </select>

        {eventsError && (
          <small className="replay-selector-error">
            {eventsError}
          </small>
        )}
      </label>

      <label>
        <span>SESSION</span>

        <select
          value={sessionType}
          disabled={loading}
          onChange={(event) =>
            onSessionChange(
              event.target.value as ReplaySessionType,
            )
          }
        >
          {sessions.map((session) => (
            <option
              key={session}
              value={session}
            >
              {session === "R"
                ? "RACE"
                : session === "S"
                  ? "SPRINT"
                  : session}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>FPS</span>

        <select
          value={fps}
          disabled={loading}
          onChange={(event) =>
            onFpsChange(
              Number(event.target.value),
            )
          }
        >
          <option value={1}>1 FPS</option>
          <option value={2}>2 FPS</option>
          <option value={4}>4 FPS</option>
          <option value={8}>8 FPS</option>
        </select>
      </label>

      <button
        type="button"
        className="replay-load-button"
        disabled={
          loading ||
          eventsLoading ||
          events.length === 0 ||
          !grandPrix
        }
        onClick={onLoadReplay}
      >
        {loading ? "LOADING..." : "LOAD REPLAY"}
      </button>

    </section>
  );
}
