import PageContainer from "../../components/layout/PageContainer";
import Button from "../../components/ui/Button";
import SectionLabel from "../../components/ui/SectionLabel";
import Reveal from "../../components/motion/Reveal";

import HomeHero from "./components/HomeHero";
import FeaturedRace from "./components/FeaturedRace";
import ExperienceSection from "./components/ExperienceSection";
import RacePredictionSection from "./components/RacePredictionSection";
import ConstructorPulse from "./components/ConstructorPulse";
import { useNextSession } from "./home.api";

import "./home.css";

const destinations = [
  {
    number: "01",
    title: "Replay",
    description:
      "Relive every lap with immersive race replay and track position.",
    path: "/replay",
  },
  {
    number: "02",
    title: "Sessions",
    description:
      "Explore practice, qualifying, sprint and race sessions.",
    path: "/sessions",
  },
  {
    number: "03",
    title: "Drivers",
    description:
      "Discover driver performance and race intelligence.",
    path: "/drivers",
  },
  {
    number: "04",
    title: "Constructors",
    description:
      "Compare teams, strategy and season progression.",
    path: "/constructors",
  },
];

function navigate(path: string) {
  window.location.href = path;
}

function HomeLoading() {
  return (
    <main className="home-page-new home-state">
      <div className="home-state-inner">
        <span className="home-live-dot" />

        <p>INITIALIZING RACE DATA</p>

        <div className="home-state-line" />
      </div>
    </main>
  );
}

function HomeError() {
  return (
    <main className="home-page-new home-state">
      <div className="home-state-inner">
        <p className="home-error-label">
          CONNECTION ERROR
        </p>

        <h1>
          RACE DATA
          <br />
          UNAVAILABLE.
        </h1>

        <p>
          The F1 data service could not be reached.
        </p>

        <Button
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    </main>
  );
}

export default function HomePage() {
  const query = useNextSession();

  if (query.isLoading) {
    return <HomeLoading />;
  }

  if (query.isError || !query.data) {
    return <HomeError />;
  }

  const data = query.data;

  return (
    <main className="home-page-new">

      <HomeHero data={data} />

      <ExperienceSection />

      <PageContainer wide>
        <Reveal delay="short">
          <RacePredictionSection eventName={data.event_name} />
        </Reveal>
      </PageContainer>

      <PageContainer wide>
        <Reveal delay="short">
          <section className="home-featured-section">
            <FeaturedRace data={data} />
          </section>
        </Reveal>
      </PageContainer>

      <PageContainer wide>
        <Reveal delay="short">
          <section className="home-destinations">
            <div className="home-section-heading">
              <SectionLabel number="03">
                Explore
              </SectionLabel>

              <h2>
                Everything
                <br />
                in one place.
              </h2>
            </div>

            <div className="home-destination-list">
              {destinations.map((item) => (
                <button
                  key={item.number}
                  className="home-destination"
                  onClick={() => navigate(item.path)}
                >
                  <span className="home-destination-number">
                    {item.number}
                  </span>

                  <span className="home-destination-main">
                    <span className="home-destination-title">
                      {item.title}
                    </span>

                    <span className="home-destination-description">
                      {item.description}
                    </span>
                  </span>

                  <span className="home-destination-arrow">
                    ↗
                  </span>
                </button>
              ))}
            </div>
          </section>
        </Reveal>
      </PageContainer>

      <section className="home-footer-statement">
        <PageContainer>
          <Reveal>
            <p>F1 RACE REPLAY</p>

            <h2>
              EVERY LAP.
              <br />
              EVERY DETAIL.
            </h2>

            <span>
              BUILT FOR THE RACE.
            </span>

            <ConstructorPulse />
          </Reveal>
        </PageContainer>
      </section>

    </main>
  );
}
