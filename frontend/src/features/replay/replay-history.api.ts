import type { ReplaySessionType } from "./replay.types";
import { API_BASE_URL } from "../../api/config";

const AUTH_BASE = `${API_BASE_URL}/auth`;

export interface ReplayHistory {
  id: number;
  year: number;
  round: number;
  session_type: ReplaySessionType;
  progress: number;
  duration_seconds: number;
  started_at: string | null;
  last_watched_at: string;
  completed_at: string | null;
}

export interface SaveReplayHistoryPayload {
  year: number;
  round: number;
  session_type: ReplaySessionType;
  progress: number;
  duration_seconds: number;
  completed?: boolean;
}

async function authRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${AUTH_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      text || `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export function saveReplayHistory(
  payload: SaveReplayHistoryPayload,
): Promise<ReplayHistory> {
  return authRequest<ReplayHistory>(
    "/replay-history",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getReplayHistory(): Promise<ReplayHistory[]> {
  return authRequest<ReplayHistory[]>(
    "/replay-history",
  );
}

export function getContinueReplay(): Promise<ReplayHistory | null> {
  return authRequest<ReplayHistory | null>(
    "/replay-history/continue",
  );
}

export function deleteReplayHistory(
  historyId: number,
): Promise<{ message: string }> {
  return authRequest<{ message: string }>(
    `/replay-history/${historyId}`,
    {
      method: "DELETE",
    },
  );
}
