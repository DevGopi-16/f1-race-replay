import React, { useEffect, useState } from "react";
import LegalPage from "../LegalPage";
import SectionLabel from "../../../components/ui/SectionLabel";
import Divider from "../../../components/ui/Divider";
import Reveal from "../../../components/motion/Reveal";
import "./privacy-policy.css";

const delays: Array<"none" | "short" | "medium" | "long"> = [
  "none",
  "short",
  "medium",
  "long",
];

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}

const sections = [
  {
    number: "01",
    title: "Information we collect",
    body: (
      <>
        <p>When you create an account or use the site, we may collect:</p>
        <ul>
          <li>
            <strong>Account information:</strong> your name, email address,
            profile picture and account ID from the provider you sign in with
            (Google, Discord or X), depending on what that provider shares with
            us.
          </li>
          <li>
            <strong>Profile preferences:</strong> settings you choose, such as
            units (metric/imperial), accent color, and notification
            preferences.
          </li>
          <li>
            <strong>Usage data:</strong> pages visited and features used, for
            basic debugging and improving the site. We do not sell or share
            this with advertisers.
          </li>
          <li>
            <strong>Technical information:</strong> basic details your browser
            sends automatically with every request, such as browser type and
            device type.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect payment information, government
          IDs, or any sensitive personal data.
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "How we use your information",
    body: (
      <>
        <ul>
          <li>To sign you in and keep your session secure</li>
          <li>To save and apply your saved preferences across visits</li>
          <li>To diagnose bugs and improve site performance</li>
          <li>To reply to messages you send us by email</li>
        </ul>
        <p>
          We do not use your data for advertising or sell it to third parties.
        </p>
      </>
    ),
  },
  {
    number: "03",
    title: "Sign-in and third-party services",
    body: (
      <>
        <p>
          This site relies on the following third-party services, each with its
          own privacy practices:
        </p>
        <ul>
          <li>
            <strong>Google Sign-In, Discord and X</strong> — used for
            authentication. See{" "}
            <ExtLink href="https://policies.google.com/privacy">Google's Privacy Policy</ExtLink>,{" "}
            <ExtLink href="https://discord.com/privacy">Discord's Privacy Policy</ExtLink> and{" "}
            <ExtLink href="https://x.com/en/privacy">X's Privacy Policy</ExtLink>.
          </li>
          <li>
            <strong>Jolpica API, FastF1, and OpenF1</strong> — public F1 data
            sources used to display race, driver, and timing statistics. No
            personal data is sent to these services on your behalf.
          </li>
        </ul>
      </>
    ),
  },
  {
    number: "04",
    title: "Information we share",
    body: (
      <>
        <p>
          We do not sell your personal information, and we do not share it with
          advertisers.
        </p>
        <p>
          We may disclose information only if required by law, or where
          necessary to protect the rights and security of the site and its
          users.
        </p>
      </>
    ),
  },
  {
    number: "05",
    title: "Data storage and security",
    body: (
      <>
        <p>
          We take reasonable steps to protect your information and limit who can
          access account data. No method of storage or transmission over the
          internet is completely secure, so we cannot guarantee absolute
          security.
        </p>
        <p>
          You are responsible for keeping your sign-in provider account
          (Google, Discord or X) secure.
        </p>
      </>
    ),
  },
  {
    number: "06",
    title: "Data retention",
    body: (
      <p>
        Account data is retained as long as your account is active. You can
        request deletion of your account and associated data at any time by
        contacting us (see below).
      </p>
    ),
  },
  {
    number: "07",
    title: "Cookies and local storage",
    body: (
      <p>
        We use only essential cookies required to keep you signed in.
        Non-sensitive interface preferences may also be saved in your browser's
        local storage. See our <a href="/cookie-policy">Cookie Policy</a> for
        details.
      </p>
    ),
  },
  {
    number: "08",
    title: "Your rights and choices",
    body: (
      <>
        <p>
          You may request access to, correction of, or deletion of your
          personal data at any time. You may also withdraw consent by deleting
          your account, which removes your stored profile data.
        </p>
        <p>
          You can change your saved preferences at any time in Settings. To
          make any other request, email us at the address below and we will
          respond within a reasonable time.
        </p>
      </>
    ),
  },
  {
    number: "09",
    title: "Children's privacy",
    body: (
      <p>
        This site is not directed at children under 13, and we do not knowingly
        collect data from them.
      </p>
    ),
  },
  {
    number: "10",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy occasionally. The "last updated" date above
        reflects the most recent revision.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  const [activeId, setActiveId] = useState<string>(sections[0].number);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(`section-${s.number}`))
      .filter((el): el is HTMLElement => el !== null);

    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id.replace("section-", ""));
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <LegalPage title="Privacy Policy" lastUpdated="28 September 2026">
      <div className="privacy-page">
        <div className="privacy-layout">
          <aside className="privacy-toc">
            <nav aria-label="On this page">
              <p className="privacy-toc-title">On this page</p>
              <ol>
                {sections.map((s) => {
                  const cls =
                    activeId === s.number
                      ? "privacy-toc-link privacy-toc-link--active"
                      : "privacy-toc-link";
                  return (
                    <li key={s.number}>
                      <a href={`#section-${s.number}`} className={cls}>
                        <span>{s.number}</span>
                        <span>{s.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>

          <div className="privacy-content">
            <Reveal delay="short">
              <p className="legal-intro">
                F1 Race Vision ("we", "the site") is a personal, non-commercial
                project built for F1 fans to explore race replays, analytics,
                and driver statistics. This page explains what information we
                collect, why, and how it's handled.
              </p>
            </Reveal>

            {sections.map((section, i) => (
              <Reveal key={section.number} delay={delays[i % delays.length]}>
                <section id={`section-${section.number}`} className="legal-section">
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
                Questions about this policy? Contact us at{" "}
                <a href="mailto:f1racevision.contact@gmail.com">f1racevision.contact@gmail.com</a>.
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </LegalPage>
  );
}