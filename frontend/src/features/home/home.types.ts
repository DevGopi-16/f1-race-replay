export interface HomeOverview {
  meta: {
    event_name: string;
    circuit_name: string;
    country: string;
    year: number;
    round: number;
    date: string;
    circuit_svg: string;
  };

  fastest_lap: {
    time: string;
    driver: string;
    compound: string;
  };

  track_overview: {
    length_km: number | null;
    turns: number | null;
    longest_straight_km: number | null;
    lap_record: string;
  };
}
