import { apiGet } from "../../api/client";

export interface DriverRef {
  id: string;
  code: string;
  name: string;
  team: string;
}

export interface RaceRow {
  position: number | null;
  id: string;
  code: string;
  name: string;
  team: string;
  grid: number | null;
  gap: string;
  points: number;
  fastest_lap: boolean;
}

export interface QualiRow {
  position: number | null;
  id: string;
  code: string;
  name: string;
  team: string;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export interface SessionDetail {
  meta: {
    year: number;
    round: number;
    event_name: string;
    circuit_id: string;
    circuit_name: string;
    locality: string;
    country: string;
    date: string;
    time_utc: string;
  };
  highlights: {
    winner: DriverRef | null;
    pole: DriverRef | null;
    fastest_lap: DriverRef | null;
  };
  results: {
    race: RaceRow[];
    qualifying: QualiRow[] | null;
    sprint: RaceRow[] | null;
    sprint_quali: QualiRow[] | null;
  };

  circuit_years: number[];
  circuit_races: { year: number; round: number }[];
}

export interface LegendEntry {
  id: string;
  code: string;
  name: string;
  count: number;
}

export interface LegendGroup {
  wins: LegendEntry[];
  poles: LegendEntry[];
  podiums: LegendEntry[];
}

export interface CircuitLegends {
  circuit_id: string;
  races_held: number;
  drivers: LegendGroup;
  constructors: LegendGroup;
  winners: {
    year: number;
    round: number;
    driver: string;
    id: string;
    code: string;
    team: string;
  }[];
}

export function getSessionDetail(
  year: number,
  round: number,
): Promise<SessionDetail> {
  // Sprints only exist from 2021. For non-sprint weekends the backend just
  // returns sprint: null (finished races are cached, so this costs one call once).
  const sprint = year >= 2021;
  return apiGet<SessionDetail>(
    `/api/session-detail?year=${year}&round=${round}&sprint=${sprint}`,
  );
}

export function getCircuitLegends(circuit: string): Promise<CircuitLegends> {
  return apiGet<CircuitLegends>(
    `/api/circuit-legends?circuit=${encodeURIComponent(circuit)}`,
  );
}