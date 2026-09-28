type ReplayTimelineProps = {
  frameIndex: number;
  totalFrames: number;
  frame: any;
  onFrameChange: (index: number) => void;
  fps?: number;
  totalLaps?: number;
};

export default function ReplayTimeline({
  frameIndex,
  totalFrames,
  frame,
  onFrameChange,
  fps = 8,
  totalLaps = 58,
}: ReplayTimelineProps) {
  const progress = totalFrames > 1 ? (frameIndex / (totalFrames - 1)) * 100 : 0;
  const lap = Number(frame?.lap ?? 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFrameChange(Number(e.target.value));
  };

  return (
    <section className="replay-timeline-section">
      <div className="replay-timeline-topline">
        <div className="replay-timeline-live">
          <i className="replay-timeline-live-dot" />
          LIVE REPLAY
        </div>
        <div className="replay-timeline-current-lap">
          LAP {lap || "—"} <span>/ {totalLaps}</span>
        </div>
      </div>

      <div className="replay-timeline-events">
        <div className="timeline-event active"><i />START</div>
        <div className="timeline-event"><i />SC</div>
        <div className="timeline-event"><i />PIT</div>
        <div className="timeline-event"><i />VSC</div>
        <div className="timeline-event finish"><i />FINISH</div>
      </div>

      <div className="replay-timeline-track">
        <div className="replay-timeline-progress" style={{ width: `${progress}%` }} />
        <input
          className="replay-timeline-slider"
          type="range"
          min={0}
          max={Math.max(0, totalFrames - 1)}
          value={Math.min(frameIndex, Math.max(0, totalFrames - 1))}
          onChange={handleChange}
          aria-label="Race replay timeline"
        />
      </div>

      <div className="replay-timeline-laps">
        <div><small>LAP</small>1</div>
        <div><small>LAP</small>20</div>
        <div><small>LAP</small>30</div>
        <div><small>LAP</small>40</div>
        <div className="current"><small>CURRENT LAP</small>{lap || "—"}</div>
        <div><small>FINAL</small>{totalLaps}</div>
      </div>

      <div className="replay-timeline-footer">
        <div><b>FRAME</b>{(frameIndex + 1).toLocaleString()} / {totalFrames.toLocaleString()}</div>
        <div><b>PLAYBACK</b>{fps} FPS</div>
        <div><b>POSITION</b>{progress.toFixed(0)}%</div>
      </div>
    </section>
  );
}