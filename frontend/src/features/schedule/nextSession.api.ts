import { apiGet } from "../../api/client";

export interface NextSessionData {
  event_name: string;
  country: string;
  round: number;
  session_name: string;
  session_type: string | null;
  start_utc: string;
}

export function getNextSession(year: number): Promise<NextSessionData | Record<string, never>> {
  return apiGet<NextSessionData | Record<string, never>>(`/api/next-session?year=${year}`);
}