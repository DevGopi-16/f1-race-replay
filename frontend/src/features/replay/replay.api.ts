import { apiGet } from "../../api/client";

import type {
  ReplayResponse,
  ReplaySessionType,
} from "./replay.types";





export interface ReplayRequest {
  year: number;







  grandPrix: string;







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