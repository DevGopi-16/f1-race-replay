import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import PageContainer from "../../components/layout/PageContainer";
import Reveal from "../../components/motion/Reveal";

import { useReplay } from "./hooks/useReplay";

import ReplayHero from "./components/ReplayHero";
import ReplaySelector from "./components/ReplaySelector";
import ReplayStatus from "./components/ReplayStatus";
import ReplayTrack from "./components/ReplayTrack";
import ReplayControls from "./components/ReplayControls";

import type {
  ReplaySessionType,
} from "./replay.types";

import "./replay.css";

export default function ReplayPage() {
  const [year, setYear] = useState(2026);
  const [round, setRound] = useState(11);
  const [sessionType, setSessionType] = useState<ReplaySessionType>("R");
  const [fps, setFps] = useState(8);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  /*
   * ReplayPage owns the ONLY playback clock.
   *
   * A generation token prevents an old animation callback
   * from changing frameIndex after PAUSE or manual SEEK.
   */
  const playbackGenerationRef = useRef(0);

  const query = useMemo(
    () => ({
      year,
      round,
      sessionType,
      fps,
    }),
    [year, round, sessionType, fps],
  );

  const { data, loading, error } = useReplay(query);

  /*
   * Stop playback when the selected race/session/FPS changes.
   */
  useEffect(() => {
    playbackGenerationRef.current += 1;
    setFrameIndex(0);
    setPlaying(false);
  }, [year, round, sessionType, fps]);

  /*
   * ---------------------------------------------------------
   * REPLAY PLAYBACK CLOCK
   * ---------------------------------------------------------
   *
   * Telemetry is sampled at `fps`.
   *
   * React should only receive a new frame index when the
   * telemetry frame actually changes.
   *
   * This avoids ~60 React updates/sec for an 8 FPS replay.
   */

  useEffect(() => {
    if (!playing || !data?.frames?.length) {
      return;
    }

    const generation = ++playbackGenerationRef.current;
    const total = data.frames.length;
    const frameDuration = 1000 / Math.max(1, fps);

    const startFrame = Math.min(
      Math.max(0, frameIndex),
      total - 1,
    );

    const startTime = performance.now();

    let rafId: number | null = null;
    let lastFrame = startFrame;

    const animate = (now: number) => {
      if (
        playbackGenerationRef.current !== generation
      ) {
        return;
      }

      const elapsed = now - startTime;

      const offset = Math.floor(
        elapsed / frameDuration,
      );

      const nextFrame = startFrame + offset;

      if (nextFrame >= total - 1) {
        setFrameIndex(total - 1);
        setPlaying(false);
        return;
      }

      /*
       * IMPORTANT:
       *
       * Only update React when the telemetry frame
       * actually changes.
       */
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
    data?.frames?.length,
  ]);

  const totalFrames = data?.frames?.length ?? 0;
  const currentFrame = data?.frames?.[frameIndex] ?? null;

  const handlePlayPause = () => {
    if (
      !data ||
      data.frames.length === 0
    ) {
      return;
    }

    const lastFrame =
      data.frames.length - 1;

    /*
     * If the replay is at the end,
     * Play starts a new replay from frame 0.
     */
    if (frameIndex >= lastFrame) {
      playbackGenerationRef.current += 1;
      setFrameIndex(0);
      setPlaying(true);
      return;
    }

    playbackGenerationRef.current += 1;

    setPlaying((current) => !current);
  };

  return (
    <PageContainer className="replay-page" wide>
      <Reveal>
        <section className="replay-intro">
          <div className="replay-intro-copy">
            <div className="replay-intro-eyebrow">
              <span />
              <span>RACE REPLAY</span>
            </div>

            <h1>
              EXPERIENCE
              <br />
              <span>EVERY LAP.</span>
            </h1>

            <p>
              Relive every lap through telemetry, track position,
              driver movement and race events.
            </p>
          </div>

          <div className="replay-intro-mark">
            <span>LIVE</span>
            <strong>REPLAY</strong>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <ReplaySelector
          year={year}
          round={round}
          sessionType={sessionType}
          fps={fps}
          onYearChange={setYear}
          onRoundChange={setRound}
          onSessionChange={setSessionType}
          onFpsChange={setFps}
        />
      </Reveal>

      {loading && (
        <Reveal>
          <ReplayStatus
            type="loading"
            message="Loading race telemetry…"
          />
        </Reveal>
      )}

      {error && !loading && (
        <Reveal>
          <ReplayStatus type="error" message={error} />
        </Reveal>
      )}

      {data && !loading && !error && (
        <>
          <Reveal>
            <ReplayHero meta={data.meta} frame={currentFrame} />
          </Reveal>

          <Reveal delay="short">
            <ReplayTrack
              track={data.track}
              frames={data.frames}
              frameIndex={frameIndex}
              playing={playing}
              frameRate={data.frame_rate}
              driverColors={data.driver_colors}
            />
          </Reveal>

          <Reveal delay="medium">
            <ReplayControls
              frameIndex={frameIndex}
              totalFrames={totalFrames}
              frameRate={data.frame_rate}
              playing={playing}
              onPlayPause={handlePlayPause}
              onFrameChange={(index) => {
                /*
                 * Manual seeking must stop playback first.
                 *
                 * Otherwise the requestAnimationFrame loop can
                 * immediately overwrite the frame selected by
                 * the slider.
                 */
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
              }}
            />
          </Reveal>
        </>
      )}
    </PageContainer>
  );
}
