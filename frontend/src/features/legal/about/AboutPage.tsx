import PageContainer from "../../../components/layout/PageContainer";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/ui/Button";
import SectionLabel from "../../../components/ui/SectionLabel";
import Divider from "../../../components/ui/Divider";
import Reveal from "../../../components/motion/Reveal";
import PageTransition from "../../../components/motion/PageTransition";

import "./about.css";

function navigate(path: string) {
  window.location.href = path;
}

const capabilities = [
  {
    number: "01",
    title: "Sessions & Replay",
    description:
      "Every practice, qualifying, sprint and race session, rebuilt as an immersive replay with full track position.",
    path: "/sessions",
  },
  {
    number: "02",
    title: "Telemetry & Timing",
    description:
      "Speed, throttle, braking, gears and tyres, synced to live-style timing, gaps and sector performance.",
    path: "/telemetry",
  },
  {
    number: "03",
    title: "Drivers & Constructors",
    description:
      "Full driver and team profiles, with season history behind every name on the grid.",
    path: "/drivers",
  },
  {
    number: "04",
    title: "Analytics & Head-to-Head",
    description:
      "Pace, strategy and consistency, broken down race by race and driver against driver.",
    path: "/analytics",
  },
];

export default function AboutPage() {
  return (
    <PageTransition>
      <PageContainer className="info-page">
        <Reveal>
          <PageHeader
            eyebrow="ABOUT"
            title="Built for the way you actually watch a race."
            description="F1 Race Vision turns raw session data into something you can read at a glance — every lap, every tyre call, every gap on track, in one place."
            action={
              <Button variant="outline" onClick={() => navigate("/faq")}>
                Read the FAQ
              </Button>
            }
          />
        </Reveal>

        <Reveal delay="short">
          <section className="about-section">
            <SectionLabel number="01">Mission</SectionLabel>

            <div className="about-space-sm" />

            <div className="about-grid-2">
              <div>
                <h2 className="about-section-title">
                  Understand the race,
                  <br />
                  not just watch it.
                </h2>
              </div>

              <div>
                <p className="about-body-lg">
                  A broadcast shows you what happened. F1 Race Vision shows
                  you why — the undercut that worked, the tyre window that
                  closed, the sector where a gap actually opened up. Built
                  for fans who want the full picture, lap by lap.
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delay="medium">
          <section className="about-section">
            <Divider />
            <div className="about-space-sm" />

            <SectionLabel number="02">What's inside</SectionLabel>
            <div className="about-space-sm" />

            <div className="about-capability-list">
              {capabilities.map((item) => (
                <button
                  key={item.number}
                  className="about-capability"
                  onClick={() => navigate(item.path)}
                >
                  <span className="about-capability-number">
                    {item.number}
                  </span>

                  <span className="about-capability-main">
                    <span className="about-capability-title">
                      {item.title}
                    </span>
                    <span className="about-capability-description">
                      {item.description}
                    </span>
                  </span>

                  <span className="about-capability-arrow">↗</span>
                </button>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal delay="medium">
          <section className="about-section about-story">
            <Divider />
            <div className="about-space-sm" />

            <div className="about-grid-2">
              <div>
                <SectionLabel number="03">Story</SectionLabel>
                <div className="about-space-sm" />
                <h2 className="about-section-title">Started on a garage table.</h2>
                <p className="about-body-lg">
                  {/* placeholder founding story — swap in the real one */}
                  F1 Race Vision began as a side project between two
                  engineers tired of squinting at timing screens on race
                  weekends. What started as a spreadsheet of sector deltas
                  is now the tool fans open before every lights-out.
                </p>
              </div>

              <div className="about-stat-list">
                <div className="about-stat">
                  <span className="about-stat-value">24</span>
                  <span className="about-stat-label">
                    races covered per season
                  </span>
                </div>
                <div className="about-stat">
                  <span className="about-stat-value">2021</span>
                  <span className="about-stat-label">founded</span>
                </div>
                <div className="about-stat">
                  <span className="about-stat-value">120K+</span>
                  <span className="about-stat-label">
                    fans on the grid with us
                  </span>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delay="long">
          <section className="about-cta">
            <Divider />
            <div className="about-space-sm" />
            <div className="about-cta-row">
              <h2 className="about-cta-title">Questions before lights out?</h2>
              <Button onClick={() => navigate("/contact")}>
                Contact the team
              </Button>
            </div>
          </section>
        </Reveal>
      </PageContainer>
    </PageTransition>
  );
}