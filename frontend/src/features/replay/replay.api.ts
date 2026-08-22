import { apiGet } from "../../api/client";

import type {
  ReplayResponse,
  ReplaySessionType,
  ReplayDriverStatus,
} from "./replay.types";

export interface ReplayQuery {
  year: number;
  grandPrix: string;
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
  driver_statuses?: Record<string, ReplayDriverStatus>;
}

function buildReplayParams({
  year,
  grandPrix,
  sessionType = "R",
  fps = 8,
}: ReplayQuery) {
  return new URLSearchParams({
    year: String(year),
    grand_prix: grandPrix,
    session_type: sessionType,
    fps: String(fps),
  });
}

export function getReplay({
  year,
  grandPrix,
  sessionType = "R",
  fps = 8,
}: ReplayQuery) {
  const params = buildReplayParams({
    year,
    grandPrix,
    sessionType,
    fps,
  });

  return apiGet<ReplayResponse>(
    `/replay?${params.toString()}`,
  );
}

export function getReplayChunk(
  {
    year,
    grandPrix,
    sessionType = "R",
    fps = 8,
  }: ReplayQuery,
  start: number,
  count = 500,
) {
  const params = buildReplayParams({
    year,
    grandPrix,
    sessionType,
    fps,
  });

  params.set("start", String(start));
  params.set("count", String(count));

  return apiGet<ReplayChunkResponse>(
    `/replay/chunk?${params.toString()}`,
  );
}
