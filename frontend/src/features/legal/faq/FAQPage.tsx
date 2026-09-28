import { useState } from "react";

import PageContainer from "../../../components/layout/PageContainer";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/ui/Button";
import SectionLabel from "../../../components/ui/SectionLabel";
import Divider from "../../../components/ui/Divider";
import Reveal from "../../../components/motion/Reveal";
import PageTransition from "../../../components/motion/PageTransition";

import "./faq.css";

function navigate(path: string) {
  window.location.href = path;
}

type FaqEntry = { id: string; q: string; a: string };
type FaqCategory = { number: string; title: string; items: FaqEntry[] };

const FAQ_DATA: FaqCategory[] = [
  {
    number: "01",
    title: "Getting started",
    items: [
      {
        id: "what-is",
        q: "What is F1 Race Vision?",
        a: "A companion for watching Formula 1 — live-style timing, replay, telemetry, driver and constructor data and analytics, all in one place instead of scattered across a broadcast.",
      },
      {
        id: "account",
        q: "Do I need an account?",
        a: "You can browse sessions and the calendar without one. Signing in unlocks replay, telemetry, driver profiles and your saved settings.",
      },
    ],
  },
  {
    number: "02",
    title: "Sessions & replay",
    items: [
      {
        id: "session-types",
        q: "Which sessions can I look at?",
        a: "Practice, qualifying, sprint and race sessions for every round on the calendar, each with its own replay and timing history.",
      },
      {
        id: "replay-accuracy",
        q: "How accurate is the replay?",
        a: "Replay is rebuilt directly from recorded session timing and track position, so gaps and on-track order match what actually happened.",
      },
    ],
  },
  {
    number: "03",
    title: "Telemetry & timing",
    items: [
      {
        id: "telemetry-covers",
        q: "What does the telemetry view show?",
        a: "Speed, throttle, braking, gear and tyre data, mapped against track position so you can see exactly where a lap was won or lost.",
      },
      {
        id: "timing-delay",
        q: "Is timing delayed compared to the broadcast?",
        a: "For live sessions, timing follows official feed latency — typically only a few seconds behind the world feed.",
      },
    ],
  },
  {
    number: "04",
    title: "Drivers & constructors",
    items: [
      {
        id: "driver-profiles",
        q: "What's on a driver's page?",
        a: "Season results, head-to-head history against teammates and rivals, and every session they've driven, in one profile.",
      },
      {
        id: "constructor-compare",
        q: "Can I compare two constructors directly?",
        a: "Yes — constructor pages break down season progression, strategy patterns and pace across the field.",
      },
    ],
  },
  {
    number: "05",
    title: "Analytics & head-to-head",
    items: [
      {
        id: "analytics-scope",
        q: "What does the analytics page cover?",
        a: "Pace, consistency and strategy trends across a season, built from the same session data behind replay and telemetry.",
      },
      {
        id: "head-to-head",
        q: "How does head-to-head work?",
        a: "Pick any two drivers to compare qualifying, race pace and results directly, race by race.",
      },
    ],
  },
  {
    number: "06",
    title: "Calendar, settings & privacy",
    items: [
      {
        id: "calendar",
        q: "Does the calendar stay updated through the season?",
        a: "Yes — session times update automatically, including any schedule changes.",
      },
      {
        id: "data-collected",
        q: "What data do you collect from me?",
        a: "Only what's needed to run your account and remember your settings. See the Privacy Policy for the full breakdown.",
      },
    ],
  },
];

const delays: Array<"none" | "short" | "medium" | "long"> = [
  "none",
  "short",
  "medium",
  "long",
];

function PlusIcon() {
  return (
    <svg
      className="faq-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export default function FAQPage() {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PageTransition>
      <PageContainer className="info-page">
        <Reveal>
          <PageHeader
            eyebrow="SUPPORT"
            title="Frequently asked questions"
            description="Can't find what you're after? The team reads every message on the Contact page."
            action={
              <Button variant="outline" onClick={() => navigate("/contact")}>
                Contact support
              </Button>
            }
          />
        </Reveal>

        {FAQ_DATA.map((cat, i) => (
          <Reveal key={cat.number} delay={delays[i % delays.length]}>
            <section className="faq-category">
              <Divider />
              <div className="faq-space-sm" />

              <SectionLabel number={cat.number}>{cat.title}</SectionLabel>
              <div className="faq-space-sm" />

              {cat.items.map((item) => {
                const isOpen = openIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="faq-item"
                    data-open={isOpen}
                  >
                    <button
                      className="faq-question"
                      aria-expanded={isOpen}
                      aria-controls={`${item.id}-answer`}
                      onClick={() => toggle(item.id)}
                    >
                      {item.q}
                      <PlusIcon />
                    </button>
                    <div className="faq-answer-wrap">
                      <div className="faq-answer-inner">
                        <p id={`${item.id}-answer`} className="faq-answer">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          </Reveal>
        ))}
      </PageContainer>
    </PageTransition>
  );
}