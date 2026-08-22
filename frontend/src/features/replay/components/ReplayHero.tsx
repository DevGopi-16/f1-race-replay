import type {
  ReplayFrame,
  ReplayMeta,
} from "../replay.types";

interface Props {
  meta: ReplayMeta;
  frame: ReplayFrame | null;
}

export default function ReplayHero({
  meta,
  frame,
}: Props) {
  const lap = frame?.lap ?? 0;

  return (
    <section className="replay-race-header">

      <div className="replay-race-heading">

        <div className="replay-race-kicker">
          <span className="replay-live-dot" />
          F1 RACE REPLAY
        </div>

        <h1>
          {meta.event_name || "RACE REPLAY"}
        </h1>

        <p>
          {meta.circuit_name || "SELECT A SESSION"}
          {meta.country
            ? ` · ${meta.country}`
            : ""}
        </p>

      </div>

      <div className="replay-race-meta">

        <div className="replay-meta-item">
          <span>SEASON</span>
          <strong>{meta.year}</strong>
        </div>

        <div className="replay-meta-divider" />

        <div className="replay-meta-item">
          <span>ROUND</span>
          <strong>{meta.round}</strong>
        </div>

        <div className="replay-meta-divider" />

        <div className="replay-meta-item replay-lap-meta">
          <span>LAP</span>

          <strong>
            {lap || "—"}
            <small>
              / {meta.total_laps || "—"}
            </small>
          </strong>
        </div>

      </div>

    </section>
  );
}
