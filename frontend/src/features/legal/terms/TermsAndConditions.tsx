import React, { useEffect, useState } from "react";
import LegalPage from "../LegalPage";
import SectionLabel from "../../../components/ui/SectionLabel";
import Divider from "../../../components/ui/Divider";
import Reveal from "../../../components/motion/Reveal";
import "./terms.css";
import { sections } from "./termsSections";

const delays: Array<"none" | "short" | "medium" | "long"> = [
  "none",
  "short",
  "medium",
  "long",
];

export default function TermsAndConditions() {
  const [activeId, setActiveId] = useState<string>(sections[0].number);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(`terms-section-${s.number}`))
      .filter((el): el is HTMLElement => el !== null);

    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id.replace("terms-section-", ""));
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <LegalPage title="Terms & Conditions" lastUpdated="28 September 2026">
      <div className="terms-page">
        <div className="terms-layout">
          <aside className="terms-toc">
            <nav aria-label="On this page">
              <p className="terms-toc-title">On this page</p>
              <ol>
                {sections.map((s) => {
                  const cls =
                    activeId === s.number
                      ? "terms-toc-link terms-toc-link--active"
                      : "terms-toc-link";
                  return (
                    <li key={s.number}>
                      <a href={`#terms-section-${s.number}`} className={cls}>
                        <span>{s.number}</span>
                        <span>{s.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>

          <div className="terms-content">
            <Reveal delay="short">
              <p className="legal-intro">
                By using F1 Race Vision ("the site"), you agree to the following
                terms. If you don't agree, please don't use the site.
              </p>
            </Reveal>

            {sections.map((section, i) => (
              <Reveal key={section.number} delay={delays[i % delays.length]}>
                <section id={`terms-section-${section.number}`} className="legal-section">
                  <Divider />
                  <div className="legal-space-sm" />
                  <SectionLabel number={section.number}>{section.title}</SectionLabel>
                  <div className="legal-space-sm" />
                  {section.body}
                </section>
              </Reveal>
            ))}

            <Reveal delay="medium">
              <div className="legal-contact">
                Questions? Contact us at{" "}
                <a href="mailto:f1racevision.contact@gmail.com">f1racevision.contact@gmail.com</a>.
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </LegalPage>
  );
}