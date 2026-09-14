export interface NextSession {
  event_name: string;
  country: string;
  round: number;
  session_name: string;
  session_type: string | null;
  start_utc: string;
}
