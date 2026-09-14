import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNextSession } from "../../features/schedule/useNextSession";
import { getFlagEmoji } from "../../features/schedule/countryFlags";

export default function NextSessionBadge() {
  const navigate = useNavigate();
  const { session, countdown, loading } = useNextSession();
  const [ticking, setTicking] = useState(false);
  const lastMinutes = useRef<number | null>(null);

  useEffect(() => {
    if (!countdown) return;

    if (
      lastMinutes.current !== null &&
      lastMinutes.current !== countdown.minutes
    ) {
      setTicking(true);
      const timeout = setTimeout(() => setTicking(false), 400);
      return () => clearTimeout(timeout);
    }

    lastMinutes.current = countdown.minutes;
  }, [countdown]);

  if (loading || !session || !countdown || countdown.isPast) {
    return null;
  }

  const flag = getFlagEmoji(session.country);

  return (
    <button
      type="button"
      className="next-session-badge"
      onClick={() => navigate("/calendar")}
      aria-label="View full F1 calendar"
    >
      <span className="next-session-label">
        {flag && <span className="next-session-flag">{flag}</span>}
        Next: {session.country} - {session.session_name}
      </span>
      <span className={`next-session-countdown ${ticking ? "is-ticking" : ""}`}>
        {countdown.days} DAYS {countdown.hours}H {countdown.minutes}M
      </span>
    </button>
  );
}