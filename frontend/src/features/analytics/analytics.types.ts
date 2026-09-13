export type Standing = {
  code: string;
  name: string;
  team: string | null;
  country: string | null;
  position: number | null;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
};

export type Performance = {
  overall: number;
  race_pace: number;
  qualifying: number;
  consistency: number;
  racecraft: number;
  overtaking: number;
  tyre_mgmt: number | null;
};

export type Racecraft = {
  overtakes: number;
  positions_gained: number;
  positions_lost: number;
  pit_stops: number;
};

export type HistoryEntry = {
  round?: number;
  position?: number | null;
  points?: number;
  cumulative_points?: number;
  quali_position?: number | null;
};

export type AnalyticsDriver = {
  code: string;
  name: string;
  team: string | null;
  country: string | null;
  championship: {
    position: number | null;
    points: number;
    wins: number;
    podiums: number;
    poles: number;
  };
  performance: Performance;
  racecraft: Racecraft;
  history: HistoryEntry[];
};

export type TeammateBattleDriver = {
  code: string;
  name: string;
  team: string | null;
  country: string | null;
  position: number | null;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  fastest_laps: number;
  avg_finish: number | null;
};

export type TeammateBattle = {
  driver: TeammateBattleDriver;
  teammate: TeammateBattleDriver;
  leader: string | null;
};

export type AnalyticsResponse = {
  meta: {
    season: number;
    round: number | null;
  };
  overview: {
    drivers: number;
    total_points: number;
    total_wins: number;
    total_podiums: number;
    total_poles: number;
  };
  standings: Standing[];
  drivers: AnalyticsDriver[];
  teammate_battles: TeammateBattle[];
};