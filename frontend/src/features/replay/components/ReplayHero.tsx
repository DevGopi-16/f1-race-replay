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
    <section className="session-info-overlay">
      <div className="replay-hero">

        <div className="replay-hero-copy">
          <span className="replay-kicker">
            {meta.year} · ROUND {meta.round}
          </span>

          <h2>{meta.event_name}</h2>

          <p>
            {meta.circuit_name}
            {meta.country
              ? ` · ${meta.country}`
              : ""}
          </p>
        </div>

        <div className="replay-hero-stat">
          <span>LAP</span>

          <strong className="replay-lap-value">
            <span className="replay-lap-current">
              {lap || "—"}
            </span>

            <span className="replay-lap-separator">
              /
            </span>

            <span className="replay-lap-total">
              {meta.total_laps || "—"}
            </span>
          </strong>
        </div>

      </div>
    </section>
  );
}
