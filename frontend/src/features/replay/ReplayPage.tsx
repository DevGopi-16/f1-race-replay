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

export default function ReplayPage() {
  const [year, setYear] = useState(2026);
  const [round, setRound] = useState(11);
  const [sessionType, setSessionType] = useState<ReplaySessionType>("R");
  const [fps, setFps] = useState(2);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);

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

  const framesCountRef = useRef(0);
  framesCountRef.current = data?.frames?.length ?? 0;

  /*
   * Stop playback when the selected race/session/FPS changes.
   */
  useEffect(() => {
    setFrameIndex(0);
    setPlaying(false);
  }, [year, round, sessionType, fps]);

  /*
   * ---------------------------------------------------------
   * REPLAY ANIMATION LOOP (Fixed: Doesn't restart on chunk load)
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (!playing || framesCountRef.current === 0) {
      return;
    }

    const frameDuration = 1000 / Math.max(1, fps);

    const animate = (timestamp: number) => {
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed >= frameDuration) {
        const steps = Math.max(
          1,
          Math.floor(elapsed / frameDuration),
        );

        lastFrameTimeRef.current = timestamp;

        setFrameIndex((current) => {
          const next = current + steps;
          const total = framesCountRef.current;

          if (next >= total) {
            setPlaying(false);
            return Math.max(0, total - 1);
          }

          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastFrameTimeRef.current = 0;
    };
  }, [playing, fps]);

  const totalFrames = data?.frames?.length ?? 0;
  const currentFrame = data?.frames?.[frameIndex] ?? null;

  const handlePlayPause = () => {
    if (!data || data.frames.length === 0) {
      return;
    }

    if (frameIndex >= data.frames.length - 1) {
      setFrameIndex(0);
      setPlaying(true);
      return;
    }

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
                setFrameIndex(index);
              }}
            />
          </Reveal>
        </>
      )}
    </PageContainer>
  );
}
