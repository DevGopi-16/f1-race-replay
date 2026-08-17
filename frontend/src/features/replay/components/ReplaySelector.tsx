import type {
  ReplaySessionType,
} from "../replay.types";

interface Props {
  year: number;
  round: number;
  sessionType: ReplaySessionType;
  fps: number;

  onYearChange: (value: number) => void;
  onRoundChange: (value: number) => void;
  onSessionChange: (
    value: ReplaySessionType,
  ) => void;
  onFpsChange: (value: number) => void;
}

const sessions: ReplaySessionType[] = [
  "R",
  "S",
  "FP1",
  "FP2",
  "FP3",
];

export default function ReplaySelector({
  year,
  round,
  sessionType,
  fps,
  onYearChange,
  onRoundChange,
  onSessionChange,
  onFpsChange,
}: Props) {
  return (
    <section className="replay-selector">
      <label>
        <span>YEAR</span>

        <select
          value={year}
          onChange={(event) =>
            onYearChange(
              Number(event.target.value),
            )
          }
        >
          <option value={2026}>2026</option>
          <option value={2025}>2025</option>
          <option value={2024}>2024</option>
        </select>
      </label>

      <label>
        <span>ROUND</span>

        <input
          type="number"
          min={1}
          max={30}
          value={round}
          onChange={(event) =>
            onRoundChange(
              Number(event.target.value),
            )
          }
        />
      </label>

      <label>
        <span>SESSION</span>

        <select
          value={sessionType}
          onChange={(event) =>
            onSessionChange(
              event.target
                .value as ReplaySessionType,
            )
          }
        >
          {sessions.map((session) => (
            <option
              key={session}
              value={session}
            >
              {session}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>FPS</span>

        <select
          value={fps}
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
    </section>
  );
}
