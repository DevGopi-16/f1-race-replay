interface ReplayControlsProps {
  frameIndex: number;
  totalFrames: number;
  frameRate: number;
  playing: boolean;
  onPlayPause: () => void;
  onFrameChange: (index: number) => void;
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
  const safeFrame = Math.min(Math.max(0, frameIndex), maxFrame);
  const elapsed = frameRate > 0 ? safeFrame / frameRate : 0;
  const duration = frameRate > 0 ? maxFrame / frameRate : 0;
  const skipAmount = Math.max(1, Math.round(frameRate * 5));

  const skipBackward = () => {
    onFrameChange(Math.max(0, safeFrame - skipAmount));
  };

  const skipForward = () => {
    onFrameChange(Math.min(maxFrame, safeFrame + skipAmount));
  };

  return (
    <section className="replay-controls">
      <div className="replay-section-heading">
        <span>PLAYBACK CONTROLS</span>
        <small>{playing ? "PLAYING" : "PAUSED"}</small>
      </div>

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
            <img src="/images/controls/rewind.png" alt="Rewind" />
          </button>

          <button
            type="button"
            className="replay-play-button"
            onClick={onPlayPause}
            disabled={totalFrames === 0}
            aria-label={playing ? "Pause replay" : "Play replay"}
            title={playing ? "Pause" : "Play"}
          >
            <img
              src={playing ? "/images/controls/pause.png" : "/images/controls/play.png"}
              alt={playing ? "Pause" : "Play"}
            />
          </button>

          <button
            type="button"
            className="replay-skip-button"
            onClick={skipForward}
            disabled={totalFrames <= 1}
            aria-label="Skip forward five seconds"
            title="Skip forward 5 seconds"
          >
            <img src="/images/controls/forward.png" alt="Forward" />
          </button>

        </div>

        <div className="replay-time-info">
          <strong>{formatTime(elapsed)}</strong>
          <span>/</span>
          <small>{formatTime(duration)}</small>
        </div>

        <div className="replay-frame-info">
          FRAME {safeFrame + 1} / {totalFrames}
        </div>

        <div className="replay-fps-label">
          <span>PLAYBACK</span>
          <strong>{frameRate} FPS</strong>
        </div>

      </div>
    </section>
  );
}

    