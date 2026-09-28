import Button from "../../../components/ui/Button";
import Reveal from "../../../components/motion/Reveal";
import { useEffect, useState } from "react";

import type { NextSession } from "../home.types";

interface HomeHeroProps {
  data: NextSession;
}

function navigate(path: string) {
  window.location.href = path;
}

function formatStartTime(startUtc: string) {
  const date = new Date(startUtc);

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getCountdown(startUtc: string): string {
  const remaining = new Date(startUtc).getTime() - Date.now();

  if (remaining <= 0) {
    return "LIVE NOW";
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(seconds).padStart(2, "0")}`;
}

export default function HomeHero({
  data,
}: HomeHeroProps) {
  const [countdown, setCountdown] = useState(() =>
    getCountdown(data.start_utc),
  );

  useEffect(() => {
    const updateCountdown = () =>
      setCountdown(getCountdown(data.start_utc));

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [data.start_utc]);

  return (
    <section className="home-hero-new">
      <div className="home-hero-grid" />

      <div className="home-hero-glow" />

      <div className="home-hero-content">
        <Reveal>
          <div className="home-season-label">
            <span className="home-live-dot" />

            {new Date().getFullYear()} FORMULA 1 SEASON
          </div>
        </Reveal>

        <Reveal delay="short">
          <div className="home-event-context">
            NEXT SESSION
            <span> / </span>
            ROUND {String(data.round).padStart(2, "0")}
          </div>
        </Reveal>

        <Reveal delay="short">
          <h1 className="home-hero-title">
            EXPERIENCE
            <br />
            EVERY <span>LAP.</span>
          </h1>
        </Reveal>

        <Reveal delay="medium">
          <p className="home-hero-description">
            Relive every lap. Explore every session.
            Experience Formula 1 through an immersive
            race replay built around the moments that
            matter.
          </p>
        </Reveal>

        <Reveal delay="long">
          <div className="home-hero-actions">
            <Button
              size="lg"
              onClick={() => navigate("/replay")}
            >
              Watch Replay
            </Button>

            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate("/sessions")}
            >
              Explore Sessions →
            </Button>
          </div>
        </Reveal>

        <div className="home-hero-feature">
          <span>NEXT SESSION</span>

          <strong>
            {data.session_name.toUpperCase()}
          </strong>

          <small>
            {formatStartTime(data.start_utc)}
          </small>
        </div>
      </div>

      <div className="home-hero-live-panel" aria-label="Next session status">
        <div className="home-hero-live-panel-header">
          <span className="home-live-dot" />
          <span>LIVE RACE FEED</span>
          <span className="home-hero-live-line" />
        </div>

        <div className="home-hero-live-event">
          <span>{data.country}</span>
          <strong>{data.event_name}</strong>
          <small>{data.session_name}</small>
        </div>

        <div className="home-hero-countdown">
          <span>{countdown === "LIVE NOW" ? "SESSION STATUS" : "STARTS IN"}</span>
          <strong>{countdown}</strong>
        </div>

        <div className="home-hero-signal">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="home-hero-meta">
        <span>F1 RACE REPLAY</span>

        <span>
          {data.event_name.toUpperCase()}
          {" / "}
          {data.country.toUpperCase()}
        </span>
      </div>
    </section>
  );
}