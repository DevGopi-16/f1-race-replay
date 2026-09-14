import { apiGet } from "../../api/client";

export interface RaceWeekend {
  round_number: number;
  event_name: string;
  date: string;
  country: string;
  type: string;
}

export function getSchedule(year: number): Promise<RaceWeekend[]> {
  return apiGet<RaceWeekend[]>(`/api/schedule/${year}`);
}