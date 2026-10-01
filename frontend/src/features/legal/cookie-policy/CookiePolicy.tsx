import React, { useEffect, useState } from "react";
import LegalPage from "../LegalPage";
import SectionLabel from "../../../components/ui/SectionLabel";
import Divider from "../../../components/ui/Divider";
import "./cookie-policy.css";

const sections = [
  {
    number: "01",
    title: "Acceptance of terms",
    body: (
      <>
        <p>
          By accessing or using F1 Race Vision ("the site", "we", "us"), you
          agree to be bound by these Terms &amp; Conditions and by our{" "}
          <a href="/privacy-policy">Privacy Policy</a> and{" "}
          <a href="/cookie-policy">Cookie Policy</a>, which form part of this
          agreement.
        </p>
        <p>
          If you do not agree with any part of these terms, please do not use
          the site.
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "About the service",
    body: (
      <>
        <p>
          F1 Race Vision is a personal, non-commercial project built for
          Formula 1 fans. It lets you explore race sessions, replays, driver
          and constructor statistics, telemetry, timing, analytics and
          head-to-head comparisons.
        </p>
        <p>
          The site is provided free of charge. We do not sell products or
          subscriptions through it and we do not collect payment information.
        </p>
      </>
    ),
  },
  {
    number: "03",
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
    number: "04",
    title: "Eligibility",
    body: (
      <>
        <p>
          You must be at least 13 years old, or the minimum age required by the
          laws where you live, to create an account or use features that need
          one.
        </p>
        <p>
          If you are under the age of majority where you live, you should have
          the permission of a parent or guardian before using the site.
        </p>
      </>
    ),
  },
  {
    number: "05",
    title: "Accounts and sign-in",
    body: (
      <>
        <p>
          Some features, such as replay, telemetry, driver profiles and saved
          settings, require you to sign in. You can sign in using a supported
          third-party provider such as Google, Discord or X.
        </p>
        <ul>
          <li>You must provide accurate information when creating an account.</li>
          <li>You're responsible for keeping your account credentials secure.</li>
          <li>
            You're responsible for all activity that happens under your
            account, and should tell us promptly if you suspect unauthorized
            use.
          </li>
          <li>
            We reserve the right to suspend accounts used for abuse, scraping,
            or attempts to disrupt the service.
          </li>
        </ul>
      </>
    ),
  },
  {
    number: "06",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use automated tools to scrape or overload the site</li>
          <li>Attempt to access another user's account or data</li>
          <li>Probe, scan or test the security of the site, or bypass any protections</li>
          <li>Interfere with or disrupt the service or the servers behind it</li>
          <li>Copy, resell or redistribute the site's content in bulk without permission</li>
          <li>Use the site for any unlawful purpose</li>
        </ul>
      </>
    ),
  },
  {
    number: "07",
    title: "Data accuracy",
    body: (
      <>
        <p>
          Race, timing, and statistical data is sourced from public APIs
          (Jolpica, FastF1, OpenF1) and may be incomplete, delayed, or contain
          errors.
        </p>
        <p>
          Head-to-head, analytics, and comparison figures reflect
          teammate-season data only and are provided for entertainment
          purposes. They are not official statistics and should not be relied
          upon for betting, journalism, or any decision requiring verified
          accuracy.
        </p>
      </>
    ),
  },
  {
    number: "08",
    title: "Third-party data and services",
    body: (
      <>
        <p>
          The site relies on services and data we do not own or control,
          including sign-in providers and public Formula 1 data sources such as
          Jolpica, FastF1 and OpenF1.
        </p>
        <p>
          Those services have their own terms and privacy practices. We are not
          responsible for their content, availability or accuracy, and changes
          on their side may limit or break features of the site without notice.
        </p>
      </>
    ),
  },
  {
    number: "09",
    title: "Intellectual property",
    body: (
      <>
        <p>
          Site design, code, and original written content belong to the site
          owner. You may view and use the site for your own personal,
          non-commercial purposes.
        </p>
        <p>
          You may not copy, modify, distribute or create derivative works from
          our original content or code without written permission, except where
          the law allows it.
        </p>
      </>
    ),
  },
  {
    number: "10",
    title: "Images, names and trademarks",
    body: (
      <>
        <p>
          Driver and team imagery, names, logos and other F1-related materials
          may be sourced from third parties. Rights to those materials remain
          with their original owners, and their appearance on the site does not
          imply any endorsement or partnership.
        </p>
        <p>
          If you are a rights holder and believe something on the site should
          be credited or removed, please contact us using the details below and
          we will look into it promptly.
        </p>
      </>
    ),
  },
  {
    number: "11",
    title: "Privacy and cookies",
    body: (
      <p>
        How we collect and use information is explained in our{" "}
        <a href="/privacy-policy">Privacy Policy</a>, and how we use cookies
        and local storage is explained in our{" "}
        <a href="/cookie-policy">Cookie Policy</a>. By using the site you
        acknowledge those documents.
      </p>
    ),
  },
  {
    number: "12",
    title: "Availability and changes to the service",
    body: (
      <>
        <p>
          We do not guarantee uninterrupted availability. Features, including
          live timing and telemetry, may be limited by upstream data
          availability outside our control.
        </p>
        <p>
          We may add, change, suspend or remove features, or shut down the site
          entirely, at any time and without notice.
        </p>
      </>
    ),
  },
  {
    number: "13",
    title: "Termination",
    body: (
      <>
        <p>
          You can stop using the site at any time, and you can ask us to delete
          your account and associated data by contacting us.
        </p>
        <p>
          We may suspend or terminate your access if you break these terms, if
          we need to protect the site or other users, or if we discontinue the
          service.
        </p>
      </>
    ),
  },
  {
    number: "14",
    title: "No warranty",
    body: (
      <p>
        The site is provided "as is" and "as available," without warranties of
        any kind, whether express or implied, including any implied warranties
        of accuracy, reliability, fitness for a particular purpose or
        non-infringement. We do not warrant that the site will be error-free
        or that data will always be current.
      </p>
    ),
  },
  {
    number: "15",
    title: "Limitation of liability",
    body: (
      <p>
        To the fullest extent permitted by law, F1 Race Vision and its creator
        are not liable for any indirect, incidental, special or consequential
        damages, or for any loss of data or profits, arising from your use of
        or inability to use the site. Because the site is free, our total
        liability for any claim relating to it is limited to the extent
        permitted by applicable law.
      </p>
    ),
  },
  {
    number: "16",
    title: "Links to other sites",
    body: (
      <p>
        The site may link to third-party websites or services. We do not
        control them and are not responsible for their content, policies or
        practices. Visiting them is at your own risk.
      </p>
    ),
  },
  {
    number: "17",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the country in which the site
        owner is based, without regard to conflict-of-law rules. Any dispute
        will be handled by the courts of that jurisdiction, unless the law
        where you live gives you mandatory rights to another forum.
      </p>
    ),
  },
  {
    number: "18",
    title: "Changes to these terms",
    body: (
      <>
        <p>
          These terms may be updated from time to time. The "last updated" date
          at the top of this page shows the most recent revision.
        </p>
        <p>
          Continued use of the site after changes means you accept the revised
          terms.
        </p>
      </>
    ),
  },
];

const SCROLL_OFFSET_RATIO = 0.4;

export default function TermsAndConditions() {
  const [activeId, setActiveId] = useState<string>(sections[0].number);

  useEffect(() => {
    const update = () => {
      const threshold = window.innerHeight * SCROLL_OFFSET_RATIO;
      let current = sections[0].number;

      for (const s of sections) {
        const el = document.getElementById(`tc-section-${s.number}`);
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = s.number;
        }
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) current = sections[sections.length - 1].number;

      setActiveId(current);
    };

    update();

    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  const goTo = (e: React.MouseEvent<HTMLAnchorElement>, number: string) => {
    e.preventDefault();
    const el = document.getElementById(`tc-section-${number}`);
    if (!el) return;
    setActiveId(number);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <LegalPage title="Terms & Conditions" lastUpdated="28 September 2026">
      <div className="tc-page">
        <div className="tc-layout">
          <aside className="tc-toc">
            <nav aria-label="On this page">
              <p className="tc-toc-title">On this page</p>
              <ol>
                {sections.map((s) => {
                  const cls =
                    activeId === s.number
                      ? "tc-toc-link tc-toc-link--active"
                      : "tc-toc-link";
                  return (
                    <li key={s.number}>
                      <a href={`#tc-section-${s.number}`} className={cls} onClick={(e) => goTo(e, s.number)}>
                        <span>{s.number}</span>
                        <span>{s.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>

          <div className="tc-content">
            <p className="legal-intro">
              Please read these Terms &amp; Conditions carefully before using
              F1 Race Vision. They explain the rules for using the site, what
              you can expect from us, and the limits of what we provide.
            </p>

            {sections.map((section) => (
              <section key={section.number} id={`tc-section-${section.number}`} className="legal-section">
                <Divider />
                <div className="legal-space-sm" />
                <SectionLabel number={section.number}>{section.title}</SectionLabel>
                <div className="legal-space-sm" />
                {section.body}
              </section>
            ))}

            <div className="legal-contact">
              Questions about these terms? Contact us at{" "}
              <a href="mailto:f1racevision.contact@gmail.com">f1racevision.contact@gmail.com</a>.
            </div>
          </div>
        </div>
      </div>
    </LegalPage>
  );
}