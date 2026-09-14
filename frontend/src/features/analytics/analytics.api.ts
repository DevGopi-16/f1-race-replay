import type { AnalyticsResponse } from "./analytics.types";

const API_ORIGIN = "http://127.0.0.1:8000";
export const YEAR = 2026;

export async function fetchAnalytics(): Promise<AnalyticsResponse> {
  const response = await fetch(
    `${API_ORIGIN}/api/analytics?year=${YEAR}`,
  );

  if (!response.ok) {
    throw new Error(`Analytics request failed (${response.status})`);
  }

  return (await response.json()) as AnalyticsResponse;
}