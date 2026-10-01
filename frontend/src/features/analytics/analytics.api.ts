import type { AnalyticsResponse } from "./analytics.types";
import { API_BASE_URL } from "../../api/config";

export const YEAR = 2026;

export async function fetchAnalytics(): Promise<AnalyticsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/analytics?year=${YEAR}`,
  );

  if (!response.ok) {
    throw new Error(`Analytics request failed (${response.status})`);
  }

  return (await response.json()) as AnalyticsResponse;
}