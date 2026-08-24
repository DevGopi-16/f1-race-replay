import { apiGet } from "../../api/client";

import type {
  ReplayResponse,
  ReplaySessionType,
} from "./replay.types";

/* =========================================================
   TYPES
========================================================= */

export interface ReplayRequest {
  year: number;

  /**
   * Frontend uses camelCase.
   *
   * Converted to backend:
   * grand_prix
   */
  grandPrix: string;

  /**
   * Frontend uses camelCase.
   *
   * Converted to backend:
   * session_type
   */
  sessionType: ReplaySessionType;

  fps?: number;
}

export interface ReplayEvent {
  name: string;
  location?: string;
  country?: string;
}

export interface ReplayEventsResponse {
  year: number;
  events: ReplayEvent[];
}

export interface ReplayChunkResponse
  extends ReplayResponse {
  total?: number;
  total_frames?: number;
  start?: number;
  count?: number;
}

/* =========================================================
   GET REPLAY EVENTS
========================================================= */

/**
 * Backend:
 *
 * GET /api/replay/events?year=2026
 */
export function getReplayEvents(
  year: number,
) {
  const searchParams =
    new URLSearchParams({
      year: String(year),
    });

  return apiGet<ReplayEventsResponse>(
    `/api/replay/events?${searchParams.toString()}`,
  );
}

/* =========================================================
   GET INITIAL REPLAY
========================================================= */

/**
 * Backend:
 *
 * GET /api/replay
 *
 * Example:
 *
 * /api/replay
 *   ?year=2026
 *   &grand_prix=Dutch%20Grand%20Prix
 *   &session_type=R
 *   &fps=8
 */
export function getReplay(
  params: ReplayRequest,
) {
  const searchParams =
    new URLSearchParams({
      year: String(params.year),

      grand_prix:
        params.grandPrix,

      session_type:
        params.sessionType,
    });

  if (params.fps !== undefined) {
    searchParams.set(
      "fps",
      String(params.fps),
    );
  }

  return apiGet<ReplayResponse>(
    `/api/replay?${searchParams.toString()}`,
  );
}

/* =========================================================
   GET REPLAY CHUNK
========================================================= */

/**
 * Backend:
 *
 * GET /api/replay/chunk
 *
 * Example:
 *
 * /api/replay/chunk
 *   ?year=2026
 *   &grand_prix=Dutch%20Grand%20Prix
 *   &session_type=R
 *   &start=0
 *   &count=500
 *   &fps=8
 */
export function getReplayChunk(
  params: ReplayRequest & {
    start: number;
    count: number;
  },
) {
  const searchParams =
    new URLSearchParams({
      year: String(params.year),

      grand_prix:
        params.grandPrix,

      session_type:
        params.sessionType,

      start:
        String(params.start),

      count:
        String(params.count),
    });

  if (params.fps !== undefined) {
    searchParams.set(
      "fps",
      String(params.fps),
    );
  }

  return apiGet<ReplayChunkResponse>(
    `/api/replay/chunk?${searchParams.toString()}`,
  );
}