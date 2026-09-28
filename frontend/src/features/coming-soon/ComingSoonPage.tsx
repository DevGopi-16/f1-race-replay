import PageHeader from "../../components/layout/PageHeader";
import Button from "../../components/ui/Button";
import SectionLabel from "../../components/ui/SectionLabel";
import Divider from "../../components/ui/Divider";
import Reveal from "../../components/motion/Reveal";
import PageTransition from "../../components/motion/PageTransition";

import "./coming-soon.css";

function navigate(path: string) {
  window.location.href = path;
}

type ComingSoonPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
};

export default function ComingSoonPage({
  eyebrow,
  title,
  description,
  features,
}: ComingSoonPageProps) {
  return (
    <PageTransition>
      <div className="coming-soon-shell">
        <Reveal>
          <PageHeader eyebrow={eyebrow} title={title} description={description} />
        </Reveal>

        <Reveal delay="short">
          <div className="coming-soon-pill">
            <span className="coming-soon-dot" />
            <span>Coming soon</span>
          </div>
        </Reveal>

        <Reveal delay="medium">
          <section className="coming-soon-section">
            <Divider />
            <div className="coming-soon-space" />
            <SectionLabel number="01">What's coming</SectionLabel>
            <div className="coming-soon-space" />

            <ul className="coming-soon-list">
              {features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal delay="long">
          <section className="coming-soon-section coming-soon-actions-wrap">
            <Divider />
            <div className="coming-soon-space" />
            <div className="coming-soon-actions">
              <Button onClick={() => navigate("/replay")}>Explore replays</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Back to home</Button>
            </div>
          </section>
        </Reveal>
      </div>
    </PageTransition>
  );
}