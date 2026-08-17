import Button from "../../../components/ui/Button";
import Reveal from "../../../components/motion/Reveal";

import type { HomeOverview } from "../home.types";

interface HomeHeroProps {
  data: HomeOverview;
}

function navigate(path: string) {
  window.location.href = path;
}

export default function HomeHero({
  data,
}: HomeHeroProps) {
  const { meta, fastest_lap } = data;

  return (
    <section className="home-hero-new">
      <div className="home-hero-grid" />

      <div className="home-hero-glow" />

      <div className="home-hero-circuit">
        <img
          src={meta.circuit_svg}
          alt=""
          aria-hidden="true"
        />
      </div>

      <div className="home-hero-content">
        <Reveal>
          <div className="home-season-label">
            <span className="home-live-dot" />

            {meta.year} FORMULA 1 SEASON
          </div>
        </Reveal>

        <Reveal delay="short">
          <div className="home-event-context">
            ROUND {String(meta.round).padStart(2, "0")}
            <span> / </span>
            {meta.event_name}
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
            Advanced telemetry. Race intelligence.
            Every detail of Formula 1, reconstructed
            for the ultimate replay experience.
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
          <span>FASTEST LAP</span>

          <strong>{fastest_lap.time}</strong>

          <small>
            {fastest_lap.driver}
            {" · "}
            {fastest_lap.compound}
          </small>
        </div>
      </div>

      <div className="home-hero-meta">
        <span>F1 RACE REPLAY</span>

        <span>
          {meta.circuit_name.toUpperCase()}
          {" / "}
          {meta.country.toUpperCase()}
        </span>
      </div>
    </section>
  );
}
