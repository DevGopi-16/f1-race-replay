import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import PageContainer from "../../components/layout/PageContainer";
import Reveal from "../../components/motion/Reveal";

import { useReplay } from "./hooks/useReplay";

import ReplaySelector from "./components/ReplaySelector";
import ReplayStatus from "./components/ReplayStatus";
import ReplayTrack from "./components/ReplayTrack";
import ReplayLeaderboard from "./components/ReplayLeaderboard";
import ReplayDriverFocus from "./components/ReplayDriverFocus";
import ReplayControls from "./components/ReplayControls";

import type { ReplaySessionType } from "./replay.types";

import "./replay.css";

export default function ReplayPage() {
  // Drivers selected from the replay leaderboard.
  // Maximum 3 drivers.
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);

  const toggleSelectedDriver = (code: string) => {
    setSelectedDrivers((current) => {
      const normalized = code.trim().toUpperCase();

      if (current.includes(normalized)) {
        return current.filter((driver) => driver !== normalized);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, normalized];
    });
  };


  const [year, setYear] = useState(2026);
  const [grandPrix, setGrandPrix] = useState("");
  const [sessionType, setSessionType] =
    useState<ReplaySessionType>("R");
  const [fps, setFps] = useState(8);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const [loadedQuery, setLoadedQuery] = useState<{
    year: number;
    grandPrix: string;
    sessionType: ReplaySessionType;
    fps: number;
  } | null>(null);

  const playbackGenerationRef = useRef(0);

  const query = useMemo(
    () => loadedQuery,
    [loadedQuery],
  );

  const {
    data,
    loading,
    error,
    driverStatuses,
  } = useReplay(query);

  useEffect(() => {
    playbackGenerationRef.current += 1;
    setFrameIndex(0);
    setPlaying(false);
  }, [loadedQuery]);

  const handleLoadReplay = () => {
    playbackGenerationRef.current += 1;
    setFrameIndex(0);
    setPlaying(false);

    if (!grandPrix) {
      return;
    }

    setLoadedQuery({
      year,
      grandPrix,
      sessionType,
      fps,
    });
  };

  useEffect(() => {
    if (!playing || !data?.frames?.length) {
      return;
    }

    const generation =
      ++playbackGenerationRef.current;

    const total = data.frames.length;

    const frameDuration =
      1000 /
      Math.max(1, fps * speed);

    const startFrame = Math.min(
      Math.max(0, frameIndex),
      total - 1,
    );

    const startTime = performance.now();

    let rafId: number | null = null;
    let lastFrame = startFrame;

    const animate = (now: number) => {
      if (
        playbackGenerationRef.current !==
        generation
      ) {
        return;
      }

      const elapsed = now - startTime;

      const offset = Math.floor(
        elapsed / frameDuration,
      );

      const nextFrame =
        startFrame + offset;

      if (nextFrame >= total - 1) {
        setFrameIndex(total - 1);
        setPlaying(false);
        return;
      }

      if (nextFrame !== lastFrame) {
        lastFrame = nextFrame;
        setFrameIndex(nextFrame);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      playbackGenerationRef.current += 1;
    };
  }, [
    playing,
    fps,
    speed,
    data?.frames?.length,
  ]);

  const totalFrames =
    data?.frames?.length ?? 0;

  const currentFrame =
    data?.frames?.[frameIndex] ?? null;

  const meta = data?.meta as
    | Record<string, unknown>
    | undefined;

  const frame = currentFrame as
    | Record<string, unknown>
    | null;

  const eventName =
    meta?.event_name
      ? String(meta.event_name)
          .toUpperCase()
          .replace("GRAND PRIX", "GP")
      : "RACE";

  const lap =
    Number(frame?.lap ?? 0);

  const totalLaps =
    Number(
      meta?.total_laps ??
        meta?.laps ??
        78,
    );

  const currentDriverCodes = Object.keys(
    frame?.drivers ?? {},
  );

  const primaryDriverCodes =
    selectedDrivers.length > 0
      ? selectedDrivers
      : currentDriverCodes;

  const primaryDriverCode =
    primaryDriverCodes[0] ?? "";

  const primaryDriver =
    (
      frame?.drivers as
        Record<string, Record<string, unknown>> | undefined
    )?.[primaryDriverCode] ?? {};

  const speedValue =
    Number(
      primaryDriver?.speed ?? 0,
    );

  const drs = Number(
    primaryDriver?.drs ?? 0,
  );

  const tyre =
    String(
      primaryDriver?.tyre ??
        primaryDriver?.compound ??
        frame?.tyre ??
        frame?.compound ??
        "M",
    ).toUpperCase();

  const tyreLife =
    Number(
      primaryDriver?.tyre_life ??
        primaryDriver?.tyreLife ??
        frame?.tyre_life ??
        frame?.tyreLife ??
        0,
    );

  const gear =
    Number(
      primaryDriver?.gear ??
        frame?.gear ??
        0,
    );

  const throttle =
    Number(
      primaryDriver?.throttle ??
        frame?.throttle ??
        0,
    );

  const brake =
    Number(
      primaryDriver?.brake ??
        frame?.brake ??
        0,
    );

  const inPit =
    Boolean(
      frame?.in_pit ??
        frame?.inPit ??
        false,
    );

  const formatTime = (
    seconds: number,
  ) => {
    if (!Number.isFinite(seconds)) {
      return "0:00:00";
    }

    const total = Math.max(
      0,
      Math.floor(seconds),
    );

    const h = Math.floor(
      total / 3600,
    );

    const m = Math.floor(
      (total % 3600) / 60,
    );

    const s = total % 60;

    return `${h}:${String(m).padStart(
      2,
      "0",
    )}:${String(s).padStart(
      2,
      "0",
    )}`;
  };

  const replaySeconds =
    totalFrames > 1
      ? (frameIndex / fps) / speed
      : 0;

  const totalReplaySeconds =
    totalFrames > 1
      ? (totalFrames - 1) / fps
      : 0;

  const progress =
    totalFrames > 1
      ? (frameIndex /
          (totalFrames - 1)) *
        100
      : 0;

  const handlePlayPause = () => {
    if (
      !data ||
      data.frames.length === 0
    ) {
      return;
    }

    const lastFrame =
      data.frames.length - 1;

    if (frameIndex >= lastFrame) {
      playbackGenerationRef.current += 1;
      setFrameIndex(0);
      setPlaying(true);
      return;
    }

    playbackGenerationRef.current += 1;
    setPlaying((current) => !current);
  };

  const handleFrameChange = (
    index: number,
  ) => {
    playbackGenerationRef.current += 1;
    setPlaying(false);

    setFrameIndex(
      Math.max(
        0,
        Math.min(
          index,
          Math.max(
            0,
            totalFrames - 1,
          ),
        ),
      ),
    );
  };

  const handleSpeedChange = (
    value: number,
  ) => {
    playbackGenerationRef.current += 1;
    setSpeed(value);
  };

  useEffect(() => {
    const handleKeyboard = (
      event: KeyboardEvent,
    ) => {
      if (
        event.target instanceof
          HTMLInputElement ||
        event.target instanceof
          HTMLTextAreaElement ||
        event.target instanceof
          HTMLSelectElement
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        handlePlayPause();
      }

      if (
        event.key === "ArrowLeft"
      ) {
        event.preventDefault();
        handleFrameChange(
          frameIndex - fps,
        );
      }

      if (
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        handleFrameChange(
          frameIndex + fps,
        );
      }

      if (
        event.key === "ArrowUp"
      ) {
        event.preventDefault();

        const speeds = [
          0.5,
          1,
          2,
          4,
        ];

        const index =
          speeds.indexOf(speed);

        if (
          index <
          speeds.length - 1
        ) {
          handleSpeedChange(
            speeds[index + 1],
          );
        }
      }

      if (
        event.key === "ArrowDown"
      ) {
        event.preventDefault();

        const speeds = [
          0.5,
          1,
          2,
          4,
        ];

        const index =
          speeds.indexOf(speed);

        if (index > 0) {
          handleSpeedChange(
            speeds[index - 1],
          );
        }
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyboard,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard,
      );
    };
  });

  return (
    <PageContainer
      className="replay-page"
      wide
    >
      <div className="replay-shell">

        {/* HEADER */}

        <Reveal>
          <header className="replay-header">

            <div className="replay-header-brand">
              <span className="replay-brand-mark" />

              <strong>
                F1 RACE REPLAY
              </strong>
            </div>

            <div className="replay-header-session">
              <span>
                {year}
              </span>

              <i>·</i>

              <strong>
                {eventName}
              </strong>

              <i>·</i>

              <span>
                {sessionType === "R"
                  ? "RACE"
                  : sessionType === "S"
                    ? "SPRINT"
                    : sessionType}
              </span>
            </div>

            <div className="replay-live">
              <span />
              {loading
                ? "LOADING REPLAY"
                : data
                  ? "REPLAY READY"
                  : "SELECT REPLAY"}
            </div>

          </header>
        </Reveal>

        {/* RACE META */}

        <section className="replay-race-meta">

          <div>
            <strong>
              {year}
            </strong>

            <span>
              {eventName}
            </span>

            <span>
              RACE
            </span>
          </div>

          <div className="replay-race-lap">
            LAP{" "}
            <strong>
              {lap || "--"}
            </strong>
            {" / "}
            {totalLaps}
          </div>

          <div className="replay-clock">
            {formatTime(
              replaySeconds,
            )}
            {" / "}
            {formatTime(
              totalReplaySeconds,
            )}
          </div>

        </section>

        {/* SESSION SELECTOR */}

        <details className="replay-selector-drawer">
          <summary>
            SESSION
          </summary>

          <div className="replay-selector-inner">
            <ReplaySelector
              grandPrix={grandPrix}
              onGrandPrixChange={setGrandPrix}
              year={year}
                  sessionType={
                sessionType
              }
              fps={fps}
              onYearChange={
                setYear
              }
              onSessionChange={
                setSessionType
              }
              onFpsChange={
                setFps
              }
              onLoadReplay={
                handleLoadReplay
              }
              loading={loading}
            />
          </div>
        </details>

        {loading && (
          <ReplayStatus
            type="loading"
            message="Loading race replay…"
          />
        )}

        {error && !loading && (
          <ReplayStatus
            type="error"
            message={error}
          />
        )}

        {data &&
          !loading &&
          !error && (
            <>
              {/* TRACK + LEADERBOARD */}

              <Reveal>
                <main className="replay-main-grid">

                  <section className="replay-track-section">

                    <div className="replay-map-label">
                      <span>
                        CIRCUIT MAP
                      </span>

                      <small>
                        {eventName}
                      </small>
                    </div>

                    <ReplayTrack
                      track={data.track}
                      frames={data.frames}
                      frameIndex={
                        frameIndex
                      }
                      playing={playing}
                      frameRate={
                        data.frame_rate
                      }
                      driverColors={
                        data.driver_colors
                      }
                    />

                  </section>

                  <aside className="replay-leaderboard-wrap">

                    <ReplayLeaderboard
                      frame={
                        currentFrame
                      }
                      driverColors={
                        data.driver_colors
                      }
                      driverStatuses={
                        driverStatuses
                      }

              selectedDrivers={selectedDrivers}
              onDriverSelect={toggleSelectedDriver}
/>

                  </aside>

                </main>
              </Reveal>

              {/* REPLAY CONTROLS */}
              <Reveal delay="short">
                <ReplayControls
                  frameIndex={frameIndex}
                  totalFrames={totalFrames}
                  frameRate={data.frame_rate}
                  playing={playing}
                  onPlayPause={handlePlayPause}
                  onFrameChange={handleFrameChange}
                />
              </Reveal>

              {/* SELECTED DRIVERS */}
              <Reveal delay="short">
                <section className="replay-driver-section">

                  <div className="replay-section-heading">
                    <span>
                      SELECTED DRIVERS
                    </span>

                    <small>
                      UP TO 3
                    </small>
                  </div>

                  <ReplayDriverFocus
                    frame={
                      currentFrame
                    }
                    driverColors={
                      data.driver_colors
                    }
                    selectedDrivers={selectedDrivers}
                    onDriverSelect={toggleSelectedDriver}

                  />

                </section>
              </Reveal>

              {/* WEATHER / STATUS / RACE INFO */}
               <Reveal delay="short">
                <section className="replay-info-grid">

                  <div className="replay-info-panel">

                    <span className="replay-info-title">
                      WEATHER
                    </span>

                    <div className="replay-info-items">

                      <div className="replay-weather-item replay-weather-track">
                        <div className="replay-weather-icon">
                          <img
                            src="/images/weather/thermometer.png"
                            alt=""
                          />
                        </div>
                        <div className="replay-weather-copy">
                          <small>TRACK</small>
                          <strong>42°C</strong>
                        </div>
                      </div>

                      <div className="replay-weather-item replay-weather-air">
                        <div className="replay-weather-icon">
                          <img
                            src="/images/weather/rain.png"
                            alt=""
                          />
                        </div>
                        <div className="replay-weather-copy">
                          <small>AIR</small>
                          <strong>27°C</strong>
                        </div>
                      </div>

                      <div className="replay-weather-item replay-weather-humid">
                        <div className="replay-weather-icon">
                          <img
                            src="/images/weather/drop.png"
                            alt=""
                          />
                        </div>
                        <div className="replay-weather-copy">
                          <small>HUMID</small>
                          <strong>61%</strong>
                        </div>
                      </div>

                      <div className="replay-weather-item replay-weather-wind">
                        <div className="replay-weather-icon">
                          <img
                            src="/images/weather/wind.png"
                            alt=""
                          />
                        </div>
                        <div className="replay-weather-copy">
                          <small>WIND</small>
                          <strong>11 km/h</strong>
                        </div>
                      </div>

                    </div>

                  </div>

                  <div className="replay-info-panel">

                    <span className="replay-info-title">
                      TRACK STATUS
                    </span>

                    <div className="replay-status-list">

                      <div>
                        <span className="status-green" />
                        GREEN
                      </div>

                      <div>
                        SC
                        <strong>
                          NONE
                        </strong>
                      </div>

                      <div>
                        VSC
                        <strong>
                          OFF
                        </strong>
                      </div>

                      <div>
                        FLAGS
                        <strong>
                          NONE
                        </strong>
                      </div>

                    </div>

                  </div>

                  <div className="replay-info-panel">

                    <span className="replay-info-title">
                      RACE INFO
                    </span>

                    <div className="replay-race-info">

                      <div>
                        <small>
                          LAP
                        </small>

                        <strong>
                          {lap || "--"} /{" "}
                          {totalLaps}
                        </strong>
                      </div>

                      <div>
                        <small>
                          TIME
                        </small>

                        <strong>
                          {formatTime(
                            replaySeconds,
                          )}
                        </strong>
                      </div>

                      <div>
                        <small>
                          SPEED
                        </small>

                        <strong>
                          {Math.round(
                            speedValue,
                          )}{" "}
                          km/h
                        </strong>
                      </div>

                      <div>
                        <small>
                          SECTOR
                        </small>

                        <strong>
                          2
                        </strong>
                      </div>

                    </div>

                  </div>

                </section>
              </Reveal>

              {/* RACE TIMELINE */}
              <Reveal delay="medium">
                <section className="replay-timeline-section">

                  <div className="replay-section-heading">
                    <span>
                      RACE TIMELINE
                    </span>

                    <small>
                      LAP {lap || "--"}
                    </small>
                  </div>

                  <div className="replay-timeline">

                    <div className="replay-timeline-topline">
                      <div className="replay-timeline-live">
                        <span className="replay-timeline-live-dot" />
                        LIVE REPLAY
                      </div>

                      <div className="replay-timeline-current-lap">
                        LAP {lap || "--"}
                        <span>/ {totalLaps}</span>
                      </div>
                    </div>

                    <div className="replay-timeline-events">

                      <span className="timeline-event active">
                        <i />
                        START
                      </span>

                      <span className="timeline-event">
                        <i />
                        SC
                      </span>

                      <span className="timeline-event">
                        <i />
                        PIT
                      </span>

                      <span className="timeline-event">
                        <i />
                        VSC
                      </span>

                      <span className="timeline-event finish">
                        <i />
                        FINISH
                      </span>

                    </div>

                    <div className="replay-timeline-track">

                      <div className="replay-timeline-track-glow" />

                      <div
                        className="replay-timeline-progress"
                        style={{
                          width: `${progress}%`,
                        }}
                      />

                      <div
                        className="replay-timeline-marker"
                        style={{
                          left: `${progress}%`,
                        }}
                      >
                        <span />
                      </div>

                      <input
                        className="replay-timeline-slider"
                        type="range"
                        min={0}
                        max={Math.max(0, totalFrames - 1)}
                        value={Math.min(
                          frameIndex,
                          Math.max(0, totalFrames - 1),
                        )}
                        onChange={(event) => {
                          handleFrameChange(
                            Number(event.target.value),
                          );
                        }}
                        aria-label="Replay timeline"
                      />

                    </div>

                    <div className="replay-timeline-laps">

                      <span className={lap === 1 ? "active" : ""}>
                        <small>LAP</small>
                        1
                      </span>

                      <span className={lap === 20 ? "active" : ""}>
                        <small>LAP</small>
                        20
                      </span>

                      <span className={lap === 30 ? "active" : ""}>
                        <small>LAP</small>
                        30
                      </span>

                      <span className={lap === 40 ? "active" : ""}>
                        <small>LAP</small>
                        40
                      </span>

                      <strong className="current">
                        <small>CURRENT LAP</small>
                        {lap || "--"}
                      </strong>

                      <span>
                        <small>FINAL</small>
                        {totalLaps}
                      </span>

                    </div>

                    <div className="replay-timeline-footer">

                      <span>
                        <b>FRAME</b>
                        {frameIndex.toLocaleString()} /{" "}
                        {totalFrames.toLocaleString()}
                      </span>

                      <span>
                        <b>PLAYBACK</b>
                        {data.frame_rate} FPS
                      </span>

                      <span>
                        <b>POSITION</b>
                        {Math.round(progress)}%
                      </span>

                    </div>

                  </div>

                </section>
              </Reveal>

              {/* PLAYBACK */}
              <Reveal delay="medium">
                <section className="replay-playback-section">

                  <div className="replay-playback-main">

                    <button
                      type="button"
                      className="replay-control-button"
                      onClick={() =>
                        handleFrameChange(
                          frameIndex - fps * 5,
                        )
                      }
                      aria-label="Seek backward 5 seconds"
                      title="Seek backward 5 seconds"
                    >
                      <img
                        src="/images/controls/rewind.png"
                        alt="Rewind"
                      />
                    </button>

                    <button
                      type="button"
                      className="replay-play-button"
                      onClick={handlePlayPause}
                      aria-label={
                        playing
                          ? "Pause replay"
                          : "Play replay"
                      }
                      title={
                        playing
                          ? "Pause"
                          : "Play"
                      }
                    >
                      <img
                        src={
                          playing
                            ? "/images/controls/pause.png"
                            : "/images/controls/play.png"
                        }
                        alt={
                          playing
                            ? "Pause"
                            : "Play"
                        }
                      />
                    </button>

                    <button
                      type="button"
                      className="replay-control-button"
                      onClick={() =>
                        handleFrameChange(
                          frameIndex + fps * 5,
                        )
                      }
                      aria-label="Seek forward 5 seconds"
                      title="Seek forward 5 seconds"
                    >
                      <img
                        src="/images/controls/forward.png"
                        alt="Forward"
                      />
                    </button>

                  </div>

                  <div className="replay-speed">

                    {[0.5, 1, 2, 4].map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          className={
                            speed === value
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            handleSpeedChange(
                              value,
                            )
                          }
                        >
                          {value}×
                        </button>
                      ),
                    )}

                  </div>

                  <div className="replay-keyboard">

                    <span>
                      SPACE
                      <small>
                        Play/Pause
                      </small>
                    </span>

                    <span>
                      ← →
                      <small>
                        Seek
                      </small>
                    </span>

                    <span>
                      ↑ ↓
                      <small>
                        Speed
                      </small>
                    </span>

                  </div>
                </section>
              </Reveal>
            </>
          )}

      </div>
    </PageContainer>
  );
}
