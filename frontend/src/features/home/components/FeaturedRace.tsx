import type { NextSession } from "../home.types";
import { LiveCircuit } from "./LiveCircuit";

interface FeaturedRaceProps {
  data: NextSession;
}

function formatStartTime(startUtc: string) {
  const date = new Date(startUtc);

  return date.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export default function FeaturedRace({ data }: FeaturedRaceProps) {
  return (
    <section className="home-featured-race">
      <div className="home-featured-track">
        {/* Pass country and event_name to derive track layout dynamically */}
        <LiveCircuit country={data.country} eventName={data.event_name} />

        <div className="home-next-session-mark">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="home-featured-info">
        <div className="home-featured-topline">
          <span>NEXT SESSION</span>
          <span>
            ROUND {String(data.round).padStart(2, "0")}
          </span>
        </div>

        <h2>{data.event_name}</h2>

        <div className="home-featured-location">
          <span>{data.session_name}</span>
          <span>·</span>
          <span>{data.country}</span>
        </div>

        <div className="home-featured-date">
          {formatStartTime(data.start_utc)}
        </div>
      </div>

      <div className="home-featured-stats">
        <div className="home-featured-stat">
          <span>SESSION</span>
          <strong>
            {data.session_type ?? "—"}
          </strong>
          <small>{data.session_name}</small>
        </div>

        <div className="home-featured-stat">
          <span>ROUND</span>
          <strong>
            {String(data.round).padStart(2, "0")}
          </strong>
          <small>2026 SEASON</small>
        </div>

        <div className="home-featured-stat">
          <span>STARTS</span>
          <strong className="home-featured-start">
            {new Date(data.start_utc).toLocaleTimeString(
              undefined,
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
          </strong>
          <small>
            {new Date(data.start_utc).toLocaleDateString(
              undefined,
              {
                day: "2-digit",
                month: "short",
              },
            )}
          </small>
        </div>
      </div>
    </section>
  );
}