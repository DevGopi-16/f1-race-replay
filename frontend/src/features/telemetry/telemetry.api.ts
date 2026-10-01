import { apiGet } from "../../api/client";

export interface TelemetryPoint {
  distance: number;
  speed?: number;
  throttle?: number;
  brake?: number;
  gear?: number;
  rpm?: number;
}

export interface TelemetryLap {
  driver_number: string;
  driver_code: string;
  lap_number: number;
  lap_time: number | null;
  sector_times: Array<number | null>;
  points: TelemetryPoint[];
  compound?: string | null;
  tyre_age?: number | null;
  stint_number?: number | null;
  total_laps?: number | null;
}

export interface Stint {
  stint_number: number;
  compound: string;
  tyre_age_at_start: number | null;
  lap_start: number | null;
  lap_end: number | null;
}

export interface SessionDriver {
  code: string;
  name: string;
  team: string;
  position: number | null;
  points: number | null;
  color: string;
}

export function getSessionDrivers(
  year: number,
  round: number,
  sessionType: string,
) {
  const params = new URLSearchParams({
    year: String(year),
    round: String(round),
    session_type: sessionType,
  });

  return apiGet<SessionDriver[]>(`/api/drivers?${params.toString()}`);
}

export function getLapTelemetry(
  sessionKey: string,
  driverNumber: string,
  lapNumber: number,
) {
  return apiGet<TelemetryLap>(
    `/api/replay/${encodeURIComponent(sessionKey)}/telemetry/${encodeURIComponent(driverNumber)}/${lapNumber}`,
  );
}

export function getDriverStints(
  sessionKey: string,
  driverNumber: string,
) {
  return apiGet<Stint[]>(
    `/api/replay/${encodeURIComponent(sessionKey)}/stints/${encodeURIComponent(driverNumber)}`,
  );
}
