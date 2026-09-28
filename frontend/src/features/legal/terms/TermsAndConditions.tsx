import React, { useEffect, useState } from "react";
import LegalPage from "../LegalPage";
import SectionLabel from "../../../components/ui/SectionLabel";
import Divider from "../../../components/ui/Divider";
import Reveal from "../../../components/motion/Reveal";
import "./terms.css";

const delays: Array<"none" | "short" | "medium" | "long"> = [
  "none",
  "short",
  "medium",
  "long",
];

const sections = [
  {
    number: "01",
    title: "Not affiliated with F1 or FIA",
    body: (
      <p>
        F1 Race Vision is an independent, fan-made project. It is{" "}
        <strong>not affiliated with, endorsed by, or connected to</strong>{" "}
        Formula 1, the FIA, Formula One Group, or any F1 team or driver. All
        F1-related names, logos, and trademarks belong to their respective
        owners.
      </p>
    ),
  },
  {
    number: "02",
    title: "Data accuracy",
    body: (
      <p>
        Race, timing, and statistical data is sourced from public APIs
        (Jolpica, FastF1, OpenF1) and may be incomplete, delayed, or contain
        errors. Head-to-head, analytics, and comparison figures reflect
        teammate-season data only and are provided for entertainment purposes —
        they are not official statistics and should not be relied upon for
        betting, journalism, or any decision requiring verified accuracy.
      </p>
    ),
  },
  {
    number: "03",
    title: "Account use",
    body: (
      <ul>
        <li>You must provide accurate information when creating an account.</li>
        <li>You're responsible for keeping your account credentials secure.</li>
        <li>
          We reserve the right to suspend accounts used for abuse, scraping, or
          attempts to disrupt the service.
        </li>
      </ul>
    ),
  },
  {
    number: "04",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use automated tools to scrape or overload the site</li>
          <li>Attempt to access another user's account or data</li>
          <li>Use the site for any unlawful purpose</li>
        </ul>
      </>
    ),
  },
  {
    number: "05",
    title: "Intellectual property",
    body: (
      <p>
        Site design, code, and original written content belong to the site
        owner. Driver and team imagery may be sourced from third parties; rights
        to such images remain with their original owners. See our note on
        images below.
      </p>
    ),
  },
  {
    number: "06",
    title: "No warranty",
    body: (
      <p>
        The site is provided "as is," without warranties of any kind. We do not
        guarantee uninterrupted availability, and features (including live
        timing and telemetry) may be limited by upstream data availability
        outside our control.
      </p>
    ),
  },
  {
    number: "07",
    title: "Limitation of liability",
    body: (
      <p>
        To the fullest extent permitted by law, F1 Race Vision and its creator
        are not liable for any damages arising from your use of the site.
      </p>
    ),
  },
  {
    number: "08",
    title: "Changes to these terms",
    body: (
      <p>
        These terms may be updated from time to time. Continued use of the site
        after changes means you accept the revised terms.
      </p>
    ),
  },
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