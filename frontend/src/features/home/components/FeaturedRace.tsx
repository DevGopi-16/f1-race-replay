import type { HomeOverview } from "../home.types";

interface FeaturedRaceProps {
  data: HomeOverview;
}

export default function FeaturedRace({
  data,
}: FeaturedRaceProps) {
  const {
    meta,
    fastest_lap,
    track_overview,
  } = data;

  return (
    <section className="home-featured-race">
      <div className="home-featured-track">
        <img
          src={meta.circuit_svg}
          alt={`${meta.circuit_name} circuit`}
          className="home-circuit-outline"
        />
      </div>

      <div className="home-featured-info">
        <div className="home-featured-topline">
          <span>FEATURED EVENT</span>

          <span>
            ROUND {String(meta.round).padStart(2, "0")}
          </span>
        </div>

        <h2>{meta.event_name}</h2>

        <div className="home-featured-location">
          <span>{meta.circuit_name}</span>
          <span>·</span>
          <span>{meta.country}</span>
        </div>

        <div className="home-featured-date">
          {meta.date}
        </div>
      </div>

      <div className="home-featured-stats">
        <div className="home-featured-stat">
          <span>FASTEST LAP</span>

          <strong>{fastest_lap.time}</strong>

          <small>
            {fastest_lap.driver}
            <span> · </span>
            {fastest_lap.compound}
          </small>
        </div>

        <div className="home-featured-stat">
          <span>CIRCUIT</span>

          <strong>
            {track_overview.length_km == null ? "—" : track_overview.length_km.toFixed(3)}
            <small> KM</small>
          </strong>

          <small>
            {track_overview.turns == null ? "—" : track_overview.turns} TURNS
          </small>
        </div>

        <div className="home-featured-stat">
          <span>LONGEST STRAIGHT</span>

          <strong>
            {track_overview.longest_straight_km == null ? "—" : track_overview.longest_straight_km.toFixed(3)}
            <small> KM</small>
          </strong>

          <small>
            LAP RECORD {track_overview.lap_record}
          </small>
        </div>
      </div>
    </section>
  );
}
