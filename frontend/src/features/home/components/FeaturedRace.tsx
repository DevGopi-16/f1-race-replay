import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { NextSession } from "../home.types";
import { getCircuitSvgUrl } from "../../schedule/circuitAssets";
import { LiveCircuit } from "./LiveCircuit";
import Track3D, { type Track3DDriver } from "./Track3D";

/**
 * Optional live-race extras. Add these to NextSession in home.types.ts
 * when your API sends them, then delete this type. Without them the 3D
 * track still renders, just without cars and the lap HUD.
 */
const DEFAULT_LAP_SECONDS = 92.4;

/** Placeholder field until your API sends real drivers (gap = seconds behind the leader). */
const DEFAULT_DRIVERS: Track3DDriver[] = [
  { code: "VER", gapSeconds: 0 },
  { code: "NOR", gapSeconds: 2.341 },
  { code: "LEC", gapSeconds: 5.892 },
];

type RaceExtras = {
  lap_seconds?: number;
  drivers?: Track3DDriver[];
};

interface FeaturedRaceProps {
  data: NextSession;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  started: boolean;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCountdown(target: Date | null, now: number): Countdown {
  if (!target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, started: false };
  }

  const difference = target.getTime() - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, started: true };
  }

  const totalSeconds = Math.floor(difference / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    started: false,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function sessionLabel(data: NextSession): string {
  return data.session_name?.trim() || data.session_type?.trim() || "Session";
}

export default function FeaturedRace({ data }: FeaturedRaceProps) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const startDate = useMemo(() => parseDate(data.start_utc), [data.start_utc]);
  const countdown = getCountdown(startDate, now);
  const year = startDate?.getFullYear();
  const round = Number.isFinite(data.round) ? String(data.round).padStart(2, "0") : "—";
  const eventName = data.event_name?.trim() || "Next event";
  const country = data.country?.trim() || "Location unavailable";
  const type = data.session_type?.trim() || "—";

  const extras = data as NextSession & RaceExtras;
  const trackUrl = getCircuitSvgUrl(data.event_name || "", data.country);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedDate = startDate
    ? {
        weekday: startDate.toLocaleDateString(undefined, { weekday: "long" }),
        date: startDate.toLocaleDateString(undefined, {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        time: startDate.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }
    : null;

  return (
    <div className="home-next-session">
      <header className="home-next-session-header">
        <div className="home-next-session-header-label">
          <span>02</span>
          <i />
          <strong>NEXT SESSION</strong>
          <em>{countdown.started ? "LIVE" : "UPCOMING"}</em>
        </div>
        <span className="home-next-session-season">○ {year || "—"} SEASON</span>
      </header>

      <div className="home-next-session-main">
        <div className="home-next-session-track">
          <div className="home-next-session-current">
            <span>CURRENT GRAND PRIX</span>
            <h2>{eventName}</h2>
            <p>ROUND {round} · {year || "—"} SEASON</p>
          </div>

          <Track3D
            url={trackUrl ?? undefined}
            label={eventName}
            lapSeconds={extras.lap_seconds ?? DEFAULT_LAP_SECONDS}
            drivers={extras.drivers ?? DEFAULT_DRIVERS}
            fallback={<LiveCircuit country={data.country} eventName={data.event_name} />}
          />

          <span className="home-next-session-track-label">
            {country.toUpperCase()} / TRACK OUTLINE
          </span>
        </div>

        <span className="home-next-session-round" aria-hidden="true">
          {round}
        </span>

        <div className="home-next-session-content">
          <div className="home-next-session-topline">
            <span className="home-next-session-status">
              <i />
              {countdown.started ? "LIVE" : "NEXT SESSION"}
            </span>
            <span>{type}</span>
          </div>

          <div className="home-next-session-heading">
            <div className="home-next-session-badge">
              <strong>{type}</strong>
              <span>{sessionLabel(data)}</span>
            </div>
            <h2>{eventName}</h2>
            <p>{country}</p>
          </div>

          <div className="home-next-session-details">
            <div>
              <span>DATE</span>
              <strong>{formattedDate?.weekday.toUpperCase() || "DATE UNAVAILABLE"}</strong>
              <small>{formattedDate?.date.toUpperCase() || "—"}</small>
            </div>
            <div>
              <span>LOCAL START</span>
              <strong>{formattedDate?.time || "—"}</strong>
              <small>SESSION START</small>
            </div>
            <div>
              <span>SEASON</span>
              <strong>{year || "—"}</strong>
              <small>F1 CHAMPIONSHIP</small>
            </div>
          </div>

          <div className="home-next-session-countdown">
            <div className="home-next-session-countdown-label">
              {countdown.started ? "SESSION IN PROGRESS" : "SESSION STARTS IN"}
            </div>
            {!countdown.started && startDate ? (
              <div className="home-next-session-countdown-value">
                <span>{pad(countdown.days)}<small>DAYS</small></span>
                <b>:</b>
                <span>{pad(countdown.hours)}<small>HRS</small></span>
                <b>:</b>
                <span>{pad(countdown.minutes)}<small>MIN</small></span>
                <b>:</b>
                <span>{pad(countdown.seconds)}<small>SEC</small></span>
              </div>
            ) : (
              <strong className="home-next-session-unavailable">
                {startDate ? "LIVE NOW" : "NO SESSION TIME"}
              </strong>
            )}
          </div>

          <button
            type="button"
            className="home-next-session-cta"
            onClick={() => {
              if (year && Number.isFinite(data.round)) {
                navigate(`/sessions/${year}/${data.round}`);
              } else {
                navigate("/sessions");
              }
            }}
          >
            VIEW SESSION <span>→</span>
          </button>
        </div>
      </div>

      <footer className="home-next-session-footer">
        <span>CURRENT GP <strong>{eventName}</strong></span>
        <span>R{round}</span>
        <span>NEXT <strong>{type}</strong></span>
        <span>{formattedDate?.date || "—"}</span>
        <span>{formattedDate?.time || "—"}</span>
      </footer>
    </div>
  );
}