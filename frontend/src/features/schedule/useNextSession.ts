import { useEffect, useState } from "react";
import { getNextSession, type NextSessionData } from "./nextSession.api";

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
}

function getCountdown(startUtc: string): Countdown {
  const diff = new Date(startUtc).getTime() - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isPast: true };
  }

  const totalMinutes = Math.floor(diff / 60_000);

  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    isPast: false,
  };
}

export function useNextSession() {
  const [session, setSession] = useState<NextSessionData | null>(null);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const year = new Date().getFullYear();

    getNextSession(year)
      .then(async (data) => {
        if (cancelled) return;

        if ("start_utc" in data) {
          setSession(data as NextSessionData);
          return;
        }

        // empty object means no more sessions this year — try next year
        const next = await getNextSession(year + 1);
        if (!cancelled && "start_utc" in next) {
          setSession(next as NextSessionData);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const tick = () => setCountdown(getCountdown(session.start_utc));
    tick();

    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  return { session, countdown, loading };
}