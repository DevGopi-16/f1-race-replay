import { CalendarDays, Flag } from "lucide-react";

interface NextRound {
  round?: number;
  country?: string;
  event_name?: string;
  date?: string;
}

interface NextRaceProps {
  nextRound: NextRound;
}

function NextRace({ nextRound }: NextRaceProps) {
  const eventName =
    nextRound.event_name ||
    nextRound.country ||
    "Next Grand Prix";

  const date = nextRound.date || "Date TBA";

  return (
    <section className="constructors-next-race">
      <div className="constructors-section-heading">
        <div>
          <span className="constructors-section-kicker">
            NEXT ON THE CALENDAR
          </span>

          <h2>Next race</h2>
        </div>

        {nextRound.round != null && (
          <span className="constructors-next-round">
            ROUND {nextRound.round}
          </span>
        )}
      </div>

      <div className="constructors-next-race-card">
        <div className="constructors-next-race-icon">
          <Flag size={22} />
        </div>

        <div className="constructors-next-race-info">
          <span className="constructors-next-race-label">
            NEXT GRAND PRIX
          </span>

          <h3>{eventName}</h3>

          {nextRound.country && (
            <p>{nextRound.country}</p>
          )}
        </div>

        <div className="constructors-next-race-date">
          <CalendarDays size={16} />
          <span>{date}</span>
        </div>
      </div>
    </section>
  );
}

export default NextRace;
