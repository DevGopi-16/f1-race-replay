interface ReplayControlsProps {
  frameIndex: number;
  totalFrames: number;
  frameRate: number;
  playing: boolean;
  onPlayPause: () => void;
  onFrameChange: (index: number) => void;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

export default function ReplayControls({
  frameIndex,
  totalFrames,
  frameRate,
  playing,
  onPlayPause,
  onFrameChange,
}: ReplayControlsProps) {
  const maxFrame =
    Math.max(
      0,
      totalFrames - 1,
    );

  const safeFrame =
    Math.min(
      Math.max(0, frameIndex),
      maxFrame,
    );

  const percentage =
    maxFrame > 0
      ? (safeFrame / maxFrame) * 100
      : 0;

  return (
    <section className="replay-controls">
      <div className="replay-controls-row">
        <button
          type="button"
          className="replay-play-button"
          onClick={onPlayPause}
          disabled={totalFrames === 0}
          aria-label={
            playing ? "Pause" : "Play"
          }
        >
          {playing
            ? <PauseIcon />
            : <PlayIcon />}
        </button>

        <div className="replay-frame-counter">
          FRAME{" "}
          <strong>
            {(safeFrame + 1).toLocaleString()}
          </strong>
          {" / "}
          {totalFrames.toLocaleString()}
        </div>

        <div className="replay-fps">
          {frameRate} FPS
        </div>
      </div>

      <input
        className="replay-timeline"
        type="range"
        min={0}
        max={maxFrame}
        value={safeFrame}
        style={
          {
            "--replay-progress": `${percentage}%`,
          } as React.CSSProperties
        }
        onChange={(event) => {
          onFrameChange(
            Number(
              event.target.value,
            ),
          );
        }}
        disabled={
          totalFrames <= 1
        }
      />
    </section>
  );
}
