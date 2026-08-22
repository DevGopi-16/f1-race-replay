type ReplayTimelineProps = {
  frameIndex: number;
  totalFrames: number;
  frame: any;
  onFrameChange: (index: number) => void;
};

export default function ReplayTimeline({
  frameIndex,
  totalFrames,
  frame,
  onFrameChange,
}: ReplayTimelineProps) {
  const progress =
    totalFrames > 1
      ? (frameIndex / (totalFrames - 1)) * 100
      : 0;

  const lap = Number(frame?.lap ?? 0);

  const maxLap =
    lap > 0
      ? Math.max(lap, 1)
      : 78;

  const lapPosition =
    totalFrames > 1
      ? `${progress}%`
      : "0%";

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onFrameChange(
      Number(event.target.value),
    );
  };

  return (
    <section className="replay-timeline">

      <div className="replay-timeline-header">
        <span>RACE TIMELINE</span>

        <strong>
          LAP {lap || "—"} / {maxLap}
        </strong>
      </div>

      <div className="replay-timeline-events">
        <span>START</span>
        <span>SC</span>
        <span>PIT</span>
        <span>VSC</span>
        <span>FINISH</span>
      </div>

      <div className="replay-timeline-track">

        <div
          className="replay-timeline-fill"
          style={{
            width: lapPosition,
          }}
        />

        <input
          className="replay-timeline-input"
          type="range"
          min="0"
          max={Math.max(
            0,
            totalFrames - 1,
          )}
          value={Math.min(
            frameIndex,
            Math.max(
              0,
              totalFrames - 1,
            ),
          )}
          onChange={handleChange}
          aria-label="Race replay timeline"
        />

        <div
          className="replay-timeline-marker"
          style={{
            left: lapPosition,
          }}
        />
      </div>

      <div className="replay-timeline-laps">
        <span>L1</span>
        <span>L20</span>
        <span>L30</span>
        <span>L40</span>

        <strong>
          L{lap || "—"}
        </strong>

        <span>L78</span>
      </div>

    </section>
  );
}
