import { apiGet } from "../../api/client";

import type {
  ReplayResponse,
  ReplaySessionType,
} from "./replay.types";

export interface ReplayQuery {
  year: number;
  round: number;
  sessionType?: ReplaySessionType;
  fps?: number;
}

export interface ReplayChunkResponse {
  start: number;
  end: number;
  total: number;
  total_frames: number;
  frame_rate: number;

  frames: ReplayResponse["frames"];

  meta?: ReplayResponse["meta"];
  driver_colors?: ReplayResponse["driver_colors"];
  max_tyre_life?: ReplayResponse["max_tyre_life"];
  track?: ReplayResponse["track"];
  events?: ReplayResponse["events"];
}

export function getReplay({
  year,
  round,
  sessionType = "R",
  fps = 8,
}: ReplayQuery) {
  const params = new URLSearchParams({
    year: String(year),
    round: String(round),
    session_type: sessionType,
    fps: String(fps),
  });

  return apiGet<ReplayResponse>(
    `/replay?${params.toString()}`,
  );
}

export function getReplayChunk(
  {
    year,
    round,
    sessionType = "R",
    fps = 8,
  }: ReplayQuery,
  start: number,
  count = 500,
) {
  const params = new URLSearchParams({
    year: String(year),
    round: String(round),
    session_type: sessionType,
    fps: String(fps),
    start: String(start),
    count: String(count),
  });

  return apiGet<ReplayChunkResponse>(
    `/replay/chunk?${params.toString()}`,
  );
}
