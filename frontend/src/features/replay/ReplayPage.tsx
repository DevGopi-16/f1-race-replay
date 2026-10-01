import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import PageContainer from "../../components/layout/PageContainer";
import Reveal from "../../components/motion/Reveal";

import { useReplay } from "./hooks/useReplay";

import ReplayStatus from "./components/ReplayStatus";
import ReplayTrack, {
  hasReplayDrsZones,
} from "./components/ReplayTrack";
import ReplayLeaderboard from "./components/ReplayLeaderboard";
import ReplayDriverFocus from "./components/ReplayDriverFocus";
import ReplayControls from "./components/ReplayControls";

import type {
  ReplayOverlayState,
  ReplaySessionType,
} from "./replay.types";

import { saveReplayHistory } from "./replay-history.api";

import "./replay.css";

export default function ReplayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [overlays, setOverlays] = useState<ReplayOverlayState>(() => {
    const defaults: ReplayOverlayState = {
      drs: true,
      sectors: true,
    };

    try {
      const stored = window.localStorage.getItem("replay-live-overlays");

      if (!stored) {
        return defaults;
      }

      const parsed: unknown = JSON.parse(stored);

      if (
        parsed &&
        typeof parsed === "object" &&
        "drs" in parsed &&
        "sectors" in parsed &&
        typeof parsed.drs === "boolean" &&
        typeof parsed.sectors === "boolean"
      ) {
        return {
          drs: parsed.drs,
          sectors: parsed.sectors,
        };
      }
    } catch {
      return defaults;
    }

    return defaults;
  });

  const toggleReplayOverlay = useCallback(
    (overlay: keyof ReplayOverlayState) => {
      setOverlays((current) => ({
        ...current,
        [overlay]: !current[overlay],
      }));
    },
    [],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "replay-live-overlays",
        JSON.stringify(overlays),
      );
    } catch {

    }
  }, [overlays]);





  const [selectedDrivers, setSelectedDrivers] =
    useState<string[]>([]);

  const toggleSelectedDriver = (
    code: string,
  ) => {
    setSelectedDrivers((current) => {
      const normalized = code.trim().toUpperCase();

      if (current.includes(normalized)) {
        return current.filter(
          (driver) => driver !== normalized,
        );
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, normalized];
    });
  };




  const year = Number(searchParams.get("year") ?? 2026);

  const grandPrix = searchParams.get("grandPrix") ?? "";

  const sessionType =
    (searchParams.get("sessionType") as ReplaySessionType) ?? "R";

  const fps = Number(searchParams.get("fps") ?? 8);

  const [frameIndex, setFrameIndex] =
    useState(0);


  const [playing, setPlaying] =
    useState(false);

  const [speed, setSpeed] = useState(1);

  const [loadedQuery, setLoadedQuery] =
    useState<{
      year: number;
      grandPrix: string;
      sessionType: ReplaySessionType;
      fps: number;
    } | null>(null);

  const playbackGenerationRef =
    useRef(0);





  const query = useMemo(
    () => loadedQuery,
    [loadedQuery],
  );

  const {
    data,
    loading,
    error,
    driverStatuses,
    totalFrames: expectedFrameCount,
  } = useReplay(query);





  const totalFrames =
    data?.frames?.length ?? 0;

  const availableFrameCountRef = useRef(totalFrames);
  availableFrameCountRef.current = totalFrames;

  const expectedFrameCountRef = useRef(expectedFrameCount);
  expectedFrameCountRef.current = expectedFrameCount;

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

  const replayRound =
    Number(
      meta?.round ??
        meta?.round_number ??
        0,
    );








  const latestFrameIndexRef =
    useRef(frameIndex);

  const latestLoadedQueryRef =
    useRef(loadedQuery);

  const latestDataRef =
    useRef(data);

  const latestFpsRef =
    useRef(fps);

  const latestMetaRef =
    useRef(meta);

  const historyLastSavedProgressRef =
    useRef(-1);

  const historyLastSaveTimeRef =
    useRef(0);










  const historySaveQueueRef =
    useRef<Promise<void>>(Promise.resolve());


  latestFrameIndexRef.current =
    frameIndex;

  latestLoadedQueryRef.current =
    loadedQuery;

  latestDataRef.current =
    data;

  latestFpsRef.current =
    fps;

  latestMetaRef.current =
    meta;





  const persistReplayHistory = useCallback(
    (
      completed = false,
    ): Promise<void> => {
      const currentQuery =
        latestLoadedQueryRef.current;

      const currentData =
        latestDataRef.current;

      const currentMeta =
        latestMetaRef.current;

      const currentFrameIndex =
        latestFrameIndexRef.current;

      const currentFps =
        latestFpsRef.current;





      if (!currentQuery) {
        return Promise.resolve();
      }

      if (!currentData?.frames?.length) {
        return Promise.resolve();
      }





      const round =
        Number(
          currentMeta?.round ??
            currentMeta?.round_number ??
            0,
        );

      if (round < 1) {
        console.warn(
          "[ReplayPage] Replay round unavailable; history not saved.",
        );

        return Promise.resolve();
      }

      const total =
        currentData.frames.length;

      const normalizedFrameIndex =
        Math.max(
          0,
          Math.min(
            currentFrameIndex,
            Math.max(
              0,
              total - 1,
            ),
          ),
        );







      const normalizedProgress =
        completed
          ? 1
          : total > 1
            ? Math.min(
                1,
                Math.max(
                  0,
                  normalizedFrameIndex /
                    (total - 1),
                ),
              )
            : 0;





      const durationSeconds =
        total > 1
          ? normalizedFrameIndex /
            Math.max(
              1,
              currentFps,
            )
          : 0;





      if (
        !completed &&
        historyLastSavedProgressRef.current ===
          normalizedProgress
      ) {
        return Promise.resolve();
      }

      const payload = {
        year: currentQuery.year,
        round,
        session_type:
          currentQuery.sessionType,
        progress:
          normalizedProgress,
        duration_seconds:
          durationSeconds,
        completed,
      };





      const savePromise =
        historySaveQueueRef.current
          .catch(() => {


          })
          .then(async () => {
            try {
              await saveReplayHistory(
                payload,
              );

              historyLastSavedProgressRef.current =
                normalizedProgress;

              historyLastSaveTimeRef.current =
                Date.now();
            } catch (historyError) {



              console.warn(
                "[ReplayPage] Failed to save replay history:",
                historyError,
              );
            }
          });

      historySaveQueueRef.current =
        savePromise;

      return savePromise;
    },
    [],
  );








  useEffect(() => {
    if (
      !loadedQuery ||
      !data?.frames?.length
    ) {
      return;
    }

    historyLastSavedProgressRef.current =
      -1;

    historyLastSaveTimeRef.current =
      0;

    latestFrameIndexRef.current = 0;

    void persistReplayHistory(false);
  }, [
    loadedQuery,
    data,
    persistReplayHistory,
  ]);








  useEffect(() => {
    if (
      !playing ||
      !loadedQuery ||
      !data?.frames?.length
    ) {
      return;
    }

    const now = Date.now();

    if (
      now -
        historyLastSaveTimeRef.current <
      10000
    ) {
      return;
    }

    void persistReplayHistory(false);
  }, [
    frameIndex,
    playing,
    loadedQuery,
    data,
    persistReplayHistory,
  ]);





  useEffect(() => {
    if (
      !loadedQuery ||
      !data?.frames?.length
    ) {
      return;
    }

    const lastFrame =
      data.frames.length - 1;

    if (
      lastFrame > 0 &&
      frameIndex === lastFrame
    ) {




      void persistReplayHistory(true);
    }
  }, [
    frameIndex,
    loadedQuery,
    data,
    persistReplayHistory,
  ]);





  useEffect(() => {
    return () => {
      const currentQuery =
        latestLoadedQueryRef.current;

      const currentData =
        latestDataRef.current;

      const currentFrameIndex =
        latestFrameIndexRef.current;

      const currentFps =
        latestFpsRef.current;

      const currentMeta =
        latestMetaRef.current;

      if (
        !currentQuery ||
        !currentData?.frames?.length
      ) {
        return;
      }

      const round =
        Number(
          currentMeta?.round ??
            currentMeta?.round_number ??
            0,
        );

      if (round < 1) {
        return;
      }

      const total =
        currentData.frames.length;

      const normalizedFrameIndex =
        Math.max(
          0,
          Math.min(
            currentFrameIndex,
            Math.max(
              0,
              total - 1,
            ),
          ),
        );

      const progress =
        total > 1
          ? Math.min(
              1,
              Math.max(
                0,
                normalizedFrameIndex /
                  (total - 1),
              ),
            )
          : 0;

      const durationSeconds =
        total > 1
          ? normalizedFrameIndex /
            Math.max(
              1,
              currentFps,
            )
          : 0;







      void saveReplayHistory({
        year: currentQuery.year,
        round,
        session_type:
          currentQuery.sessionType,
        progress,
        duration_seconds:
          durationSeconds,
        completed:
          progress >= 1,
      }).catch(
        (historyError) => {
          console.warn(
            "[ReplayPage] Failed to save replay history on unmount:",
            historyError,
          );
        },
      );
    };
  }, []);





  useEffect(() => {
    playbackGenerationRef.current +=
      1;

    latestFrameIndexRef.current = 0;

    setFrameIndex(0);
    setPlaying(false);
  }, [loadedQuery]);






  useEffect(() => {
    if (
      !playing ||
      !data?.frames?.length
    ) {
      return;
    }

    const generation =
      ++playbackGenerationRef.current;

    const frameDuration =
      1000 /
      Math.max(
        1,
        fps * speed,
      );

    const startFrame =
      Math.min(
        Math.max(
          0,
          frameIndex,
        ),
        availableFrameCountRef.current - 1,
      );

    let startTime =
      performance.now();
    let bufferingStartedAt: number | null = null;

    let rafId: number | null =
      null;

    let lastFrame =
      startFrame;

    const animate = (
      now: number,
    ) => {
      if (
        playbackGenerationRef.current !==
        generation
      ) {
        return;
      }

      const elapsed =
        now - startTime;

      const offset =
        Math.floor(
          elapsed /
            frameDuration,
        );

      const nextFrame =
        startFrame + offset;

      const expectedLastFrame =
        Math.max(0, expectedFrameCountRef.current - 1);

      if (nextFrame >= expectedLastFrame) {
        latestFrameIndexRef.current =
          expectedLastFrame;

        setFrameIndex(
          expectedLastFrame,
        );

        setPlaying(false);

        return;
      }

      if (nextFrame >= availableFrameCountRef.current) {
        bufferingStartedAt ??= now;
        rafId = requestAnimationFrame(animate);
        return;
      }

      if (bufferingStartedAt !== null) {
        startTime += now - bufferingStartedAt;
        bufferingStartedAt = null;
      }

      if (
        nextFrame !==
        lastFrame
      ) {
        lastFrame =
          nextFrame;

        latestFrameIndexRef.current =
          nextFrame;

        setFrameIndex(
          nextFrame,
        );
      }

      rafId =
        requestAnimationFrame(
          animate,
        );
    };

    rafId =
      requestAnimationFrame(
        animate,
      );

    return () => {
      if (
        rafId !== null
      ) {
        cancelAnimationFrame(
          rafId,
        );
      }

      playbackGenerationRef.current +=
        1;
    };
  }, [
    playing,
    fps,
    speed,
    data,
  ]);





  const currentDriverCodes =
    Object.keys(
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
        | Record<
            string,
            Record<
              string,
              unknown
            >
          >
        | undefined
    )?.[
      primaryDriverCode
    ] ?? {};

  const speedValue =
    Number(
      primaryDriver?.speed ??
        0,
    );



  const drs =
    Number(
      primaryDriver?.drs ??
        0,
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
    if (
      !Number.isFinite(
        seconds,
      )
    ) {
      return "0:00:00";
    }

    const total =
      Math.max(
        0,
        Math.floor(
          seconds,
        ),
      );

    const h =
      Math.floor(
        total / 3600,
      );

    const m =
      Math.floor(
        (total % 3600) /
          60,
      );

    const s =
      total % 60;

    return `${h}:${String(
      m,
    ).padStart(
      2,
      "0",
    )}:${String(
      s,
    ).padStart(
      2,
      "0",
    )}`;
  };






  const replaySeconds =
    totalFrames > 1
      ? (frameIndex /
          fps) /
        speed
      : 0;

  const totalReplaySeconds =
    totalFrames > 1
      ? (totalFrames - 1) /
        fps
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

    if (
      frameIndex >=
      lastFrame
    ) {
      playbackGenerationRef.current +=
        1;

      latestFrameIndexRef.current = 0;

      setFrameIndex(0);
      setPlaying(true);

      historyLastSavedProgressRef.current =
        -1;

      historyLastSaveTimeRef.current =
        0;

      return;
    }

    playbackGenerationRef.current +=
      1;

    setPlaying((current) => {
      const nextPlaying =
        !current;




      if (
        current &&
        !nextPlaying
      ) {
        void persistReplayHistory(
          false,
        );
      }

      return nextPlaying;
    });
  };





  const handleFrameChange = (
    index: number,
  ) => {
    playbackGenerationRef.current +=
      1;

    setPlaying(false);

    const nextFrame =
      Math.max(
        0,
        Math.min(
          index,
          Math.max(
            0,
            totalFrames - 1,
          ),
        ),
      );





    latestFrameIndexRef.current =
      nextFrame;

    setFrameIndex(
      nextFrame,
    );

    void persistReplayHistory(
      nextFrame >=
        Math.max(
          0,
          totalFrames - 1,
        ),
    );
  };





  const handleSpeedChange = (
    value: number,
  ) => {
    playbackGenerationRef.current +=
      1;

    setSpeed(value);
  };








  useEffect(() => {
    if (!grandPrix) {
      navigate("/replay");
      return;
    }

    setLoadedQuery({ year, grandPrix, sessionType, fps });

  }, [year, grandPrix, sessionType, fps]);

  useEffect(() => {
    const handleKeyboard = (

      event: KeyboardEvent,
    ) => {
    const target = event.target;

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
      const key = event.key.toLowerCase();

      if (key === "d") {
        if (data?.track && hasReplayDrsZones(data.track)) {
          toggleReplayOverlay("drs");
        }
        return;
      }

      if (key === "s") {
        toggleReplayOverlay("sectors");
        return;
      }
    }

      if (
        event.code === "Space"
      ) {
        event.preventDefault();

        handlePlayPause();
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        event.preventDefault();

        handleFrameChange(
          frameIndex - fps,
        );
      }

      if (
        event.key ===
        "ArrowRight"
      ) {
        event.preventDefault();

        handleFrameChange(
          frameIndex + fps,
        );
      }

      if (
        event.key ===
        "ArrowUp"
      ) {
        event.preventDefault();

        const speeds = [
          0.5,
          1,
          2,
          4,
        ];

        const index =
          speeds.indexOf(
            speed,
          );

        if (
          index <
          speeds.length - 1
        ) {
          handleSpeedChange(
            speeds[
              index + 1
            ],
          );
        }
      }

      if (
        event.key ===
        "ArrowDown"
      ) {
        event.preventDefault();

        const speeds = [
          0.5,
          1,
          2,
          4,
        ];

        const index =
          speeds.indexOf(
            speed,
          );

        if (index > 0) {
          handleSpeedChange(
            speeds[
              index - 1
            ],
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
      className="replay-page replay-live-page"
      wide
    >
      <div className="replay-shell">

        {            }

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

            {data && (
              <button
                className="replay-telemetry-link"
                type="button"
                onClick={() =>
                  navigate(
                    `/replay/${year}-${data.meta.round}-${sessionType}/telemetry?year=${year}&grandPrix=${encodeURIComponent(eventName)}&sessionType=${sessionType}`,
                  )
                }
              >
                TELEMETRY
              </button>
            )}

          </header>
        </Reveal>

        {               }

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
          {loading && (
            <>
              <ReplayStatus
                type="loading"
                message="Loading race replay…"
              />
              <section className="replay-loading-stage" aria-live="polite">
                <div className="replay-loading-orbit" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="replay-loading-copy">
                  <span className="replay-loading-kicker">
                    {year} / {eventName}
                  </span>
                  <strong>Preparing race control</strong>
                  <p>
                    Fetching circuit geometry, timing frames, and driver
                    telemetry for your replay.
                  </p>
                </div>
                <div className="replay-loading-metrics">
                  <div>
                    <span>TRACK DATA</span>
                    <i />
                  </div>
                  <div>
                    <span>TELEMETRY</span>
                    <i />
                  </div>
                  <div>
                    <span>RACE FRAMES</span>
                    <i />
                  </div>
                </div>
              </section>
            </>
          )}

        {error &&
          !loading && (
            <ReplayStatus
              type="error"
              message={error}
            />
          )}

        {data &&
          !loading &&
          !error && (
            <>

              {                         }

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
                      track={
                        data.track
                      }
                      overlays={overlays}

                      frames={
                        data.frames
                      }

                      frameIndex={
                        frameIndex
                      }

                      playing={
                        playing
                      }

                      frameRate={
                        fps * speed
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

                      selectedDrivers={
                        selectedDrivers
                      }

                      onDriverSelect={
                        toggleSelectedDriver
                      }
                    />

                  </aside>

                </main>
              </Reveal>
              {                   }

              <Reveal delay="short">

                <section className="replay-timeline-section">

                  <div className="replay-section-heading">

                    <span>
                      RACE TIMELINE
                    </span>

                    <small>
                      LAP{" "}
                      {lap || "--"}
                    </small>

                  </div>
                  <div className="replay-timeline-body">
                    <div className="replay-timeline-topline">
                      <div className="replay-timeline-live">

                        <span className="replay-timeline-live-dot" />

                        LIVE REPLAY

                      </div>

                      <div className="replay-timeline-current-lap">

                        LAP{" "}
                        {lap || "--"}

                        <span>
                          / {totalLaps}
                        </span>

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
                        onChange={(
                          event,
                        ) => {
                          handleFrameChange(
                            Number(
                              event
                                .target
                                .value,
                            ),
                          );
                        }}
                        aria-label="Replay timeline"
                      />

                    </div>

                    <div className="replay-timeline-laps">

                      <span
                        className={
                          lap === 1
                            ? "active"
                            : ""
                        }
                      >
                        <small>
                          LAP
                        </small>
                        1
                      </span>

                      <span
                        className={
                          lap === 20
                            ? "active"
                            : ""
                        }
                      >
                        <small>
                          LAP
                        </small>
                        20
                      </span>

                      <span
                        className={
                          lap === 30
                            ? "active"
                            : ""
                        }
                      >
                        <small>
                          LAP
                        </small>
                        30
                      </span>

                      <span
                        className={
                          lap === 40
                            ? "active"
                            : ""
                        }
                      >
                        <small>
                          LAP
                        </small>
                        40
                      </span>

                      <strong className="current">
                        <small>
                          CURRENT LAP
                        </small>

                        {lap || "--"}
                      </strong>

                      <span>
                        <small>
                          FINAL
                        </small>

                        {totalLaps}
                      </span>

                    </div>

                    <div className="replay-timeline-footer">

                      <span>
                        <b>
                          FRAME
                        </b>

                        {frameIndex.toLocaleString()}
                        {" / "}
                        {totalFrames.toLocaleString()}
                      </span>

                      <span>
                        <b>
                          PLAYBACK
                        </b>

                        {data.frame_rate} FPS
                      </span>

                      <span>
                        <b>
                          POSITION
                        </b>

                        {Math.round(
                          progress,
                        )}
                        %
                      </span>

                    </div>

                    <div className="replay-controls-block">

                      <ReplayControls
                        frameIndex={frameIndex}
                        totalFrames={totalFrames}
                        frameRate={data.frame_rate}
                        playing={playing}
                        onPlayPause={handlePlayPause}
                        onFrameChange={handleFrameChange}
                        overlays={overlays}
                        drsAvailable={hasReplayDrsZones(data.track)}
                        onOverlayToggle={toggleReplayOverlay}
                      >
                        <section className="replay-info-grid replay-controls-info-grid">
                          <div className="replay-info-panel">
                            <span className="replay-info-title">WEATHER</span>
                            <div className="replay-info-items">
                              <div className="replay-weather-item replay-weather-track">
                                <div className="replay-weather-icon">
                                  <img src="/images/weather/thermometer.png" alt="" />
                                </div>
                                <div className="replay-weather-copy"><small>TRACK</small><strong>42°C</strong></div>
                              </div>
                              <div className="replay-weather-item replay-weather-air">
                                <div className="replay-weather-icon">
                                  <img src="/images/weather/rain.png" alt="" />
                                </div>
                                <div className="replay-weather-copy"><small>AIR</small><strong>27°C</strong></div>
                              </div>
                              <div className="replay-weather-item replay-weather-humid">
                                <div className="replay-weather-icon">
                                  <img src="/images/weather/drop.png" alt="" />
                                </div>
                                <div className="replay-weather-copy"><small>HUMID</small><strong>61%</strong></div>
                              </div>
                              <div className="replay-weather-item replay-weather-wind">
                                <div className="replay-weather-icon">
                                  <img src="/images/weather/wind.png" alt="" />
                                </div>
                                <div className="replay-weather-copy"><small>WIND</small><strong>11 km/h</strong></div>
                              </div>
                            </div>
                          </div>

                          <div className="replay-info-panel">
                            <span className="replay-info-title">TRACK STATUS</span>
                            <div className="replay-status-list">
                              <div><span className="status-green" />GREEN</div>
                              <div>SC<strong>NONE</strong></div>
                              <div>VSC<strong>OFF</strong></div>
                              <div>FLAGS<strong>NONE</strong></div>
                            </div>
                          </div>

                          <div className="replay-info-panel">
                            <span className="replay-info-title">RACE INFO</span>
                            <div className="replay-race-info">
                              <div><small>LAP</small><strong>{lap || "--"} / {totalLaps}</strong></div>
                              <div><small>TIME</small><strong>{formatTime(replaySeconds)}</strong></div>
                              <div><small>SPEED</small><strong>{Math.round(speedValue)} km/h</strong></div>
                              <div><small>SECTOR</small><strong>2</strong></div>
                            </div>
                          </div>
                        </section>
                      </ReplayControls>

                      <div className="replay-playback-meta">

                        <div className="replay-speed">
                          {[0.5, 1, 2, 4].map((value) => (
                            <button
                              key={value}
                              type="button"
                              className={speed === value ? "active" : ""}
                              onClick={() => handleSpeedChange(value)}
                            >
                              {value}×
                            </button>
                          ))}
                        </div>

                        <div className="replay-keyboard">
                          <span>
                            SPACE
                            <small>Play/Pause</small>
                          </span>
                          <span>
                            <img src="/images/controls/arrow-left.png" alt="" className="replay-key-icon" />
                            <img src="/images/controls/arrow-right.png" alt="" className="replay-key-icon" />
                            <small>Seek</small>
                          </span>
                          <span>
                            <img src="/images/controls/arrow-up.png" alt="" className="replay-key-icon" />
                            <img src="/images/controls/arrow-down.png" alt="" className="replay-key-icon" />
                            <small>Speed</small>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

              </Reveal>

              {                      }
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

                    selectedDrivers={
                      selectedDrivers
                    }

                    onDriverSelect={
                      toggleSelectedDriver
                    }
                  />

                </section>

              </Reveal>

            </>
          )}

      </div>
    </PageContainer>
  );
}