import Button from "../../../components/ui/Button";
import Reveal from "../../../components/motion/Reveal";

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

export default function HomeHero({
  data,
}: HomeHeroProps) {
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