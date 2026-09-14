export interface ConstructorHistory {
  round: number;
  points: number;
  cumulative_points: number;
  position: number;
  wins: number;
  country: string;
}

export interface ConstructorDriverHistory {
  round: number;
  event_name: string;
  position: number;
  points: number;
  cumulative_points: number;
  quali_position: number;
}

export interface ConstructorDriver {
  code: string;
  name: string;
  number: number;
  nationality: string;
  image: string;
  points: number;
  position: number;
  wins: number;
  podiums: number;
  poles: number;
  fastest_laps: number;
  avg_finish: number;
  history: ConstructorDriverHistory[];
}

export interface ConstructorTeamStats {
  points_finishes: number;
  dnfs: number;
  mechanical_failures: number;
  retirements: number;
  reliability_rate: number;
  classified_finishes: number;
  race_starts: number;
  avg_start: number;
  avg_finish: number;
  best_finish: number;
}

export interface ConstructorTeam {
  id: string;
  name: string;
  nationality: string;
  color: string;
  teamLogo: string;
  position: number;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  fastest_laps: number;
  dnfs: number;
  mechanical_failures: number;
  retirements: number;
  reliability_rate: number;
  avg_pit_stop: number | null;
  fastest_pit_stop: number | null;
  history: ConstructorHistory[];
  team_stats: ConstructorTeamStats;
  pace_by_circuit_type: Record<string, number>;
  drivers: ConstructorDriver[];
}

export interface ConstructorsPanelResponse {
  teams: ConstructorTeam[];
  total_points: number;
  races_completed: number;
  total_rounds: number;
  next_round: {
    round?: number;
    country?: string;
    event_name?: string;
    date?: string;
  } | null;
}
