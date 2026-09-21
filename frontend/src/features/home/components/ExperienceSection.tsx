import { useEffect, useRef, useState } from "react";

const stages = [
  {
    number: "01",
    title: "Replay",
    headline: "Watch the race.",
    copy: "Relive every lap with synchronized car positions, race events and playback.",
  },
  {
    number: "02",
    title: "Timing",
    headline: "Follow the battle.",
    copy: "Every position. Every gap. Every lap.",
  },
  {
    number: "03",
    title: "Telemetry",
    headline: "Analyze the car.",
    copy: "Speed. Throttle. Braking. Precision.",
  },
];

const timingRows = [
  ["P1", "VER", "—"],
  ["P2", "NOR", "+2.341"],
  ["P3", "LEC", "+5.892"],
  ["P4", "HAM", "+8.214"],
];

export default function ExperienceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActiveStage((current) => (current + 1) % stages.length);
        }
      },
      { threshold: 0.55 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="home-experience"
      aria-labelledby="experience-title"
    >
      <div className="home-experience-grid" aria-hidden="true" />

      <div className="home-experience-header">
        <div>
          <span className="home-experience-number">01</span>
          <span className="home-experience-label">THE EXPERIENCE</span>
        </div>

        <div className="home-experience-heading">
          <h2 id="experience-title">
            FORMULA 1,
            <br />
            <span>RECONSTRUCTED.</span>
          </h2>
          <p>
            Replay every lap.
            <br />
            Follow every position.
            <br />
            Analyze every detail.
          </p>
        </div>
      </div>

      <div className="home-experience-stage">
        <div className="home-experience-visual">
          <div className="home-experience-data home-experience-data-lap">
            <span>LAP</span>
            <strong>42 / 58</strong>
          </div>
          <div className="home-experience-data home-experience-data-speed">
            <span>SPEED</span>
            <strong>287 <small>KM/H</small></strong>
          </div>
          <div className="home-experience-data home-experience-data-gap">
            <span>GAP</span>
            <strong>+2.341</strong>
          </div>

          <svg
            className="home-experience-track"
            viewBox="0 0 760 420"
            role="img"
            aria-label="Animated circuit with race cars"
          >
            <defs>
              <linearGradient id="experience-track-line" x1="0" x2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
                <stop offset="0.5" stopColor="currentColor" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.22" />
              </linearGradient>
            </defs>
            <path
              className="home-experience-track-shadow"
              d="M130 300 C75 250 78 145 150 105 C230 60 312 116 365 80 C430 38 488 62 550 103 C636 160 682 242 604 307 C541 360 456 304 391 332 C320 363 245 374 190 342 C166 328 146 316 130 300Z"
            />
            <path
              className="home-experience-track-line"
              pathLength="1"
              d="M130 300 C75 250 78 145 150 105 C230 60 312 116 365 80 C430 38 488 62 550 103 C636 160 682 242 604 307 C541 360 456 304 391 332 C320 363 245 374 190 342 C166 328 146 316 130 300Z"
            />
            <path
              className="home-experience-racing-line"
              d="M130 300 C75 250 78 145 150 105 C230 60 312 116 365 80 C430 38 488 62 550 103 C636 160 682 242 604 307 C541 360 456 304 391 332 C320 363 245 374 190 342 C166 328 146 316 130 300Z"
            />
            {["VER", "NOR", "LEC"].map((driver, index) => (
              <g key={driver} className={`home-experience-car home-experience-car-${index}`}>
                <circle r={index === 0 ? 9 : 7} />
                <text x="14" y="4">{driver}</text>
                <animateMotion
                  dur={`${8 + index * 2}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                  begin={`${index * -2}s`}
                >
                  <mpath href="#experience-motion-path" />
                </animateMotion>
              </g>
            ))}
            <path
              id="experience-motion-path"
              d="M130 300 C75 250 78 145 150 105 C230 60 312 116 365 80 C430 38 488 62 550 103 C636 160 682 242 604 307 C541 360 456 304 391 332 C320 363 245 374 190 342 C166 328 146 316 130 300Z"
              fill="none"
            />
          </svg>

          <div className="home-experience-telemetry" aria-hidden="true">
            <span>DRS OPEN</span>
            <span>SECTOR 2</span>
            <span>1:32.421</span>
          </div>
        </div>

        <div className="home-experience-detail">
          <div className="home-experience-detail-top">
            <span>LIVE EXPERIENCE</span>
            <span>0{activeStage + 1} / 03</span>
          </div>

          <div className="home-experience-copy" aria-live="polite">
            <span>{stages[activeStage].number} / {stages[activeStage].title}</span>
            <h3>{stages[activeStage].headline}</h3>
            <p>{stages[activeStage].copy}</p>
          </div>

          {activeStage === 0 && (
            <div className="home-experience-replay-control">
              <span className="home-experience-play">▶</span>
              <span>01:24:32</span>
              <i><b /></i>
            </div>
          )}

          {activeStage === 1 && (
            <div className="home-experience-timing">
              {timingRows.map(([position, driver, gap], index) => (
                <div className={index === 1 ? "is-highlighted" : ""} key={driver}>
                  <span>{position}</span>
                  <strong>{driver}</strong>
                  <small>{gap}</small>
                </div>
              ))}
            </div>
          )}

          {activeStage === 2 && (
            <div className="home-experience-telemetry-chart">
              <span>SPEED</span>
              <svg viewBox="0 0 300 90" role="img" aria-label="Speed telemetry graph">
                <polyline points="0,67 34,61 62,64 93,30 124,18 154,33 183,25 212,59 244,48 276,58 300,42" />
              </svg>
              <div><span>THROTTLE</span><b /><span>GEAR 7</span></div>
            </div>
          )}
        </div>
      </div>

      <div className="home-experience-stages" role="tablist" aria-label="Experience stages">
        {stages.map((stage, index) => (
          <button
            key={stage.title}
            type="button"
            role="tab"
            aria-selected={activeStage === index}
            className={activeStage === index ? "is-active" : ""}
            onClick={() => setActiveStage(index)}
          >
            <span>{stage.number}</span>
            <strong>{stage.title.toUpperCase()}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
