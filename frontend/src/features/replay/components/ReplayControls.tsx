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
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h3v14H6zM10 12l9-7v14z" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15 5h3v14h-3zM5 5l9 7-9 7z" />
    </svg>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function ReplayControls({
  frameIndex,
  totalFrames,
  frameRate,
  playing,
  onPlayPause,
  onFrameChange,
}: ReplayControlsProps) {
  const maxFrame = Math.max(0, totalFrames - 1);

  const safeFrame = Math.min(
    Math.max(0, frameIndex),
    maxFrame,
  );

  const progress =
    maxFrame > 0
      ? (safeFrame / maxFrame) * 100
      : 0;

  const elapsed =
    frameRate > 0
      ? safeFrame / frameRate
      : 0;

  const duration =
    frameRate > 0
      ? maxFrame / frameRate
      : 0;

  const skipAmount = Math.max(
    1,
    Math.round(frameRate * 5),
  );

  const skipBackward = () => {
    onFrameChange(
      Math.max(0, safeFrame - skipAmount),
    );
  };

  const skipForward = () => {
    onFrameChange(
      Math.min(maxFrame, safeFrame + skipAmount),
    );
  };

  return (
    <section className="replay-controls">

      <div className="replay-controls-main">

        <div className="replay-control-actions">

          <button
            type="button"
            className="replay-skip-button"
            onClick={skipBackward}
            disabled={totalFrames <= 1}
            aria-label="Skip backward five seconds"
            title="Skip backward 5 seconds"
          >
            <SkipBackIcon />
          </button>

          <button
            type="button"
            className="replay-play-button"
            onClick={onPlayPause}
            disabled={totalFrames === 0}
            aria-label={playing ? "Pause replay" : "Play replay"}
            title={playing ? "Pause" : "Play"}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            className="replay-skip-button"
            onClick={skipForward}
            disabled={totalFrames <= 1}
            aria-label="Skip forward five seconds"
            title="Skip forward 5 seconds"
          >
            <SkipForwardIcon />
          </button>

        </div>

        <div className="replay-time-info">

          <strong>
            {formatTime(elapsed)}
          </strong>

          <span>/</span>

          <small>
            {formatTime(duration)}
          </small>

        </div>

        <div className="replay-frame-info">
          FRAME {safeFrame + 1} / {totalFrames}
        </div>

        <div className="replay-speed">
          <span>PLAYBACK</span>
          <strong>{frameRate} FPS</strong>
        </div>

      </div>

      <div className="replay-timeline-wrap">

        <div className="replay-timeline-labels">
          <span>START</span>
          <span>REPLAY</span>
          <span>FINISH</span>
        </div>

        <input
          className="replay-timeline"
          type="range"
          min={0}
          max={maxFrame}
          value={safeFrame}
          style={
            {
              "--replay-progress": `${progress}%`,
            } as React.CSSProperties
          }
          onChange={(event) =>
            onFrameChange(
              Number(event.target.value),
            )
          }
          disabled={totalFrames <= 1}
          aria-label="Replay timeline"
        />

      </div>

    </section>
  );
}
