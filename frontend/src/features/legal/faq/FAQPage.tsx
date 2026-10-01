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

export type FaqEntry = { id: string; q: string; a: string };
export type FaqCategory = { number: string; title: string; items: FaqEntry[] };

export const FAQ_DATA: FaqCategory[] = [
  {
    number: "01",
    title: "Getting started",
    items: [
      {
        id: "what-is",
        q: "What is F1 Race Vision?",
        a: "F1 Race Vision is a companion for following Formula 1 in depth. It brings live-style timing, session replay, telemetry, driver and constructor profiles, head-to-head comparisons and season analytics into one place, so you don't have to piece the story together from a broadcast, a timing screen and several spreadsheets. It's built for fans who want to understand not just who won, but how and why.",
      },
      {
        id: "account",
        q: "Do I need an account?",
        a: "You can browse sessions, the calendar and public pages such as Analytics, Constructors and Head-to-Head without signing in. Creating a free account unlocks replay, telemetry, driver profiles and your personal settings, and it lets the site remember your replay history and preferences across devices.",
      },
      {
        id: "sign-in-methods",
        q: "How can I sign in?",
        a: "You can create an account with your email address and a password, or choose Continue with Google for a faster sign-in. If you start with one method, you can connect the other later from your profile page, so you're never locked out of your account if you change how you prefer to log in.",
      },
      {
        id: "forgot-password",
        q: "I forgot my password. What do I do?",
        a: "Choose the password reset option on the sign-in page and enter your email address. We'll send you a single-use link that lets you set a new password. The link expires after a short time, so use it soon after it arrives, and check your spam folder if you don't see the email within a few minutes.",
      },
      {
        id: "devices",
        q: "Does it work on phones and tablets?",
        a: "Yes, the layout is responsive and works on phones, tablets and desktops. That said, some views such as telemetry charts, the replay track map and side-by-side comparisons carry a lot of information, so they're easiest to read on a larger screen. On a phone, landscape orientation usually gives the best result.",
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
        a: "Practice, qualifying, sprint qualifying, sprint and race sessions are covered for the rounds on the calendar. Each session has its own results, timing history and replay, so you can look back at a Friday practice run just as easily as at Sunday's race.",
      },
      {
        id: "replay-accuracy",
        q: "How accurate is the replay?",
        a: "The replay is rebuilt from recorded session timing and car position data, so the on-track order, gaps and lap times reflect what actually happened. It is a reconstruction rather than a video, which means small differences in exact car placement between position samples are possible, especially in tight battles or under yellow flags.",
      },
      {
        id: "replay-loading",
        q: "Why does a replay take a moment to load?",
        a: "A full session contains a very large amount of position and timing data, so the replay loads in chunks rather than all at once. You can usually start watching as soon as the first part is ready while the rest keeps loading in the background. The loading indicator shows how much of the session is ready, and you can scrub forward once that part has loaded.",
      },
      {
        id: "replay-controls",
        q: "Can I change the replay speed or jump to a moment?",
        a: "Yes. The transport controls let you play, pause, change the playback speed and drag along the timeline to jump to any point in the session. Key moments such as flags are marked on the timeline, so you can skip straight to an incident or a safety car period instead of watching from the start.",
      },
      {
        id: "replay-history",
        q: "Does the site remember what I've watched?",
        a: "When you're signed in, your replay history is saved to your account so you can find sessions you've watched and return to them quickly. This history is tied to your account and can be seen only by you. If you sign out or use a different device, you'll still see the same history after signing back in.",
      },
    ],
  },
  {
    number: "03",
    title: "Live sessions",
    items: [
      {
        id: "live-how",
        q: "How does live timing work?",
        a: "During a live session, the site connects to the official timing feed and shows positions, gaps, intervals, last lap and sector times, tyre compounds and pit status as the information arrives. The feed is processed on our servers and passed on to your browser, so you see the same live picture as everyone else watching.",
      },
      {
        id: "live-start",
        q: "Do I need to do anything when a session starts?",
        a: "No. Live sessions are detected automatically from the season schedule, and the live view switches on by itself when a session begins. There's nothing to refresh or configure. If you open the site a few minutes before the start, you'll see the session appear as soon as the feed comes alive.",
      },
      {
        id: "timing-delay",
        q: "Is timing delayed compared to the broadcast?",
        a: "Live timing follows the latency of the official data feed, which is typically only a few seconds behind what happens on track. Broadcast delay varies a lot between TV, streaming and radio, so you may see a result on the timing screen slightly before or after your video does. If you're watching a stream, expect small differences.",
      },
      {
        id: "live-missing",
        q: "Why is some live information missing?",
        a: "Live data depends entirely on the official feed. If the feed drops, or a particular data type isn't provided for a session, that panel may stay empty or pause until the information comes back. Some details, such as detailed car telemetry, may be limited during live sessions and are more complete after the session has been processed.",
      },
      {
        id: "live-replay-after",
        q: "When can I replay a session after it ends?",
        a: "Once the session's results and timing have been published and processed, the full replay becomes available. This is not instant, because the data has to be released and prepared first, so it can take some time after the chequered flag. If a replay isn't there yet, check back a little later.",
      },
    ],
  },
  {
    number: "04",
    title: "Telemetry & timing",
    items: [
      {
        id: "telemetry-covers",
        q: "What does the telemetry view show?",
        a: "The telemetry view shows how a driver's car behaved over a lap: speed, throttle, braking, gear and DRS use, plotted against distance around the track. Because everything is lined up on the same track position, you can see exactly where a lap was won or lost, such as who braked later into a corner or who got on the power earlier on the exit.",
      },
      {
        id: "compare-laps",
        q: "Can I compare two drivers' laps?",
        a: "Yes. Choose two drivers and a lap for each, and the charts overlay their speed and throttle over distance, with sector-by-sector time differences alongside. It's most useful for comparing qualifying laps or the fastest laps of a race, because both drivers are pushing at a similar level.",
      },
      {
        id: "telemetry-gaps",
        q: "Why is telemetry missing for some sessions?",
        a: "Telemetry depends on what the timing feed recorded and what has been published. If a session's data was incomplete, has not been released yet or is not available for that season, some views may be empty or partial. Data for very recent sessions typically becomes available after the session has been processed, so it's worth checking back later.",
      },
      {
        id: "telemetry-units",
        q: "Can I change the units used on the charts?",
        a: "Yes. The units setting on your profile controls how values such as speed and temperature are displayed, so you can switch between metric and imperial. The change is saved to your account and applies across the site.",
      },
    ],
  },
  {
    number: "05",
    title: "Drivers & constructors",
    items: [
      {
        id: "driver-profiles",
        q: "What's on a driver's page?",
        a: "A driver's profile brings together their season results, points progression, qualifying and race performance, racecraft stats and how they compare against teammates. You can move from the list of drivers into a full profile, and the page uses the team's colors as an accent so it's easy to tell whose page you're on.",
      },
      {
        id: "constructor-compare",
        q: "Can I compare two constructors directly?",
        a: "Yes. Constructor pages break down season progression, results and pace across the field, so you can see how teams stack up over a season. This makes it easy to spot which team improved through the year and which one lost ground.",
      },
      {
        id: "driver-photos",
        q: "Why don't some drivers have a photo?",
        a: "We only show clear photos of drivers in their race suit, and not every driver in the roster has a suitable image yet. Where a photo is missing, you'll see a placeholder instead. Photos are added over time, starting with drivers on the current grid.",
      },
      {
        id: "team-colors",
        q: "What do the team colors mean?",
        a: "Each driver and constructor uses their team's color as an accent, so you can identify who is who at a glance across charts, track maps and tables. If two teammates appear together, small variations in shade help tell them apart.",
      },
    ],
  },
  {
    number: "06",
    title: "Analytics & head-to-head",
    items: [
      {
        id: "analytics-scope",
        q: "What does the analytics page cover?",
        a: "The analytics page gives you a season-level view: championship standings and progression, a Performance Index, racecraft stats, teammate battles and a journey through the season. It uses the same underlying results data as the rest of the site, so the numbers match what you see on driver and constructor pages.",
      },
      {
        id: "head-to-head",
        q: "How does head-to-head work?",
        a: "Choose any two drivers and the page builds a side-by-side view: career stats, driving style, direct race results, relative performance, and a career trajectory across seasons. Search by name or number to pick each driver, and the comparison appears once both are selected.",
      },
      {
        id: "h2h-teammates",
        q: "Why are some head-to-head numbers only for teammates?",
        a: "A fair comparison needs both drivers to have the same car. Metrics such as relative performance are therefore calculated only for seasons in which the two drivers shared a team. If you compare drivers who never were teammates, those sections may show limited data, while career stats and trajectory still appear.",
      },
      {
        id: "performance-index",
        q: "What is the Performance Index?",
        a: "The Performance Index is a single score that summarises how a driver has performed across a season, combining results and race performance into one number. It's designed to help you rank and compare drivers quickly, but it's a summary rather than a full picture, so use it alongside the detailed stats.",
      },
      {
        id: "stats-official",
        q: "Are these stats official?",
        a: "No. The statistics on F1 Race Vision are calculated by us from publicly available timing and results data. They are not official Formula 1 or FIA figures, and definitions and rounding may differ, so numbers can occasionally vary from other sources.",
      },
    ],
  },
  {
    number: "07",
    title: "Data & accuracy",
    items: [
      {
        id: "data-sources",
        q: "Where does the data come from?",
        a: "Season, driver and team information and championship standings come from Jolpica, an open Formula 1 data API. Race and qualifying results, lap data and session timing are processed using FastF1, an open-source library built on official timing data. Live sessions use the official live timing feed.",
      },
      {
        id: "data-refresh",
        q: "How often is the data updated?",
        a: "Live sessions update in near real time while they're running. Season-level statistics and standings are refreshed once a day, so a result from a race that just finished can take a few hours to show up in season totals and analytics.",
      },
      {
        id: "data-mismatch",
        q: "Why do the numbers differ from another site?",
        a: "Different sites use different sources, update at different times and define some statistics differently, for example how a fastest lap, an average finish or a points-scoring race is counted. Small differences are normal. If something looks clearly wrong, please tell us through the Contact page so we can check it.",
      },
      {
        id: "affiliation",
        q: "Is F1 Race Vision affiliated with Formula 1?",
        a: "No. F1 Race Vision is an independent project. It is not affiliated with, endorsed by or connected to Formula 1, the FIA, or any team or driver. All team and driver names are used for identification only.",
      },
    ],
  },
  {
    number: "08",
    title: "Calendar, settings & privacy",
    items: [
      {
        id: "calendar",
        q: "Does the calendar stay updated through the season?",
        a: "Yes. The calendar follows the official season schedule, and session times update automatically if the schedule changes, such as a rescheduled session or a changed start time. Times are shown clearly so you can plan when to watch.",
      },
      {
        id: "settings-saved",
        q: "What settings can I customise?",
        a: "You can change the theme, accent color, units and notification preferences from your profile. Settings are saved to your account, so they follow you when you sign in on another device instead of resetting each time.",
      },
      {
        id: "data-collected",
        q: "What data do you collect from me?",
        a: "Only what's needed to run your account and remember your settings, such as your email, name, preferences and replay history. We don't ask for more than the site needs to work. The Privacy Policy has the complete breakdown of what is stored and why.",
      },
      {
        id: "sessions-devices",
        q: "Can I see where I'm signed in?",
        a: "Yes. Your active sessions are listed in your account, and you can sign out of any device you don't recognise. If you ever suspect someone else has access, end those sessions and change your password.",
      },
    ],
  },
  {
    number: "09",
    title: "Account & security",
    items: [
      {
        id: "password-storage",
        q: "How is my password stored?",
        a: "Passwords are never stored in plain text. They're hashed before being saved, which means we can't see or recover your original password. That's also why the only way to regain access is to reset it with a new one.",
      },
      {
        id: "google-signin",
        q: "What do you get when I sign in with Google?",
        a: "Only the basic profile details needed to create and identify your account, such as your name and email address. We never see your Google password, and signing in this way does not give the site access to your other Google data.",
      },
      {
        id: "session-security",
        q: "How long do I stay signed in?",
        a: "Sessions stay active for a limited time and refresh quietly in the background while you use the site. You can sign out at any time, and you can review and end your active sessions from your account, which is useful on shared or public computers.",
      },
      {
        id: "rate-limit",
        q: "Why was I told to slow down or try again later?",
        a: "To protect accounts from abuse, actions such as signing in and requesting a password reset are rate limited. If you see this message, wait a few minutes and try again. Repeated failed attempts can trigger it, so check that your email and password are correct.",
      },
      {
        id: "reset-link",
        q: "My password reset link doesn't work.",
        a: "Reset links can be used only once and expire after a short time. If yours doesn't work, request a new one from the sign-in page and use the newest email you receive, because older links stop working when a new one is issued.",
      },
      {
        id: "delete-account",
        q: "How do I delete my account?",
        a: "Contact us through the Contact page from the email address on your account, and we'll remove your account and the data linked to it. This can't be undone, so make sure you no longer need your saved settings and history.",
      },
    ],
  },
  {
    number: "10",
    title: "Technical & troubleshooting",
    items: [
      {
        id: "browsers",
        q: "Which browsers are supported?",
        a: "The latest versions of Chrome, Edge, Firefox and Safari are supported. Older browsers may struggle with the track map and replay, which rely on WebGL for 3D graphics. If something looks broken, update your browser first.",
      },
      {
        id: "track-map-blank",
        q: "The track map is blank or not loading. Why?",
        a: "The track map uses WebGL. Make sure hardware acceleration is turned on in your browser settings and refresh the page. Some privacy extensions, battery-saver modes and very old graphics cards can also block WebGL, so try disabling extensions for this site.",
      },
      {
        id: "slow-replay",
        q: "The replay is laggy or stuttering. How do I fix it?",
        a: "Close heavy tabs and other demanding apps, let the replay finish loading before scrubbing, and try a lower playback speed. Replays draw a lot of moving elements at once, so a recent laptop or desktop gives the smoothest result.",
      },
      {
        id: "no-data-session",
        q: "Why is there no data for a session?",
        a: "Data usually appears some time after a session ends, once results and timing have been published and processed. Very old seasons and some individual sessions may have limited coverage, and future sessions naturally have nothing yet.",
      },
      {
        id: "stale-data",
        q: "The page shows old data. What should I do?",
        a: "Do a hard refresh with Ctrl + Shift + R on Windows or Cmd + Shift + R on Mac. Season-level stats and standings refresh once a day, so they can lag behind a fresh result by a few hours even after a refresh.",
      },
      {
        id: "mobile-data",
        q: "Does it use a lot of mobile data?",
        a: "Replays download a large amount of position and timing data, so on a mobile connection it's best to load them over Wi-Fi. Browsing standings, the calendar and profiles uses far less.",
      },
    ],
  },
  {
    number: "11",
    title: "Help & feedback",
    items: [
      {
        id: "report-bug",
        q: "How do I report a bug?",
        a: "Send it through the Contact page. Tell us which page you were on, what you expected to happen and what happened instead. Your browser, device and a screenshot help a lot, and the more detail you include, the faster we can find and fix the problem.",
      },
      {
        id: "suggest-feature",
        q: "Can I suggest a feature?",
        a: "Please do. Ideas sent through the Contact page are read by the team and help shape what gets built next. Explaining what you're trying to do, and not only the feature you have in mind, makes suggestions much easier to act on.",
      },
      {
        id: "page-not-loading",
        q: "A page isn't loading. What should I try?",
        a: "Refresh the page first. If it still fails, sign out and back in, then try a different browser. If the problem continues, contact us with the page, the time it happened and any error message you saw.",
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