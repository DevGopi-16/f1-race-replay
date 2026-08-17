import { useEffect, useState } from "react";

import {
  getReplayChunk,
  type ReplayQuery,
} from "../replay.api";

import type { ReplayResponse } from "../replay.types";

interface ReplayState {
  data: ReplayResponse | null;
  loading: boolean;
  error: string | null;
}

const CHUNK_SIZE = 500;

export function useReplay(
  query: ReplayQuery | null,
): ReplayState {
  const [state, setState] = useState<ReplayState>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!query) {
      setState({
        data: null,
        loading: false,
        error: null,
      });
      return;
    }

    const replayQuery = query;
    let cancelled = false;

    setState({
      data: null,
      loading: true,
      error: null,
    });

    async function loadReplay() {
      try {
        console.log("[Replay] Loading first chunk...", replayQuery);

        const first = await getReplayChunk(replayQuery, 0, CHUNK_SIZE);
        if (cancelled) return;

        if (!first.meta || !first.track || !first.driver_colors) {
          throw new Error("Replay metadata is missing from the server.");
        }

        const initialData: ReplayResponse = {
          meta: first.meta,
          driver_colors: first.driver_colors,
          max_tyre_life: first.max_tyre_life ?? {},
          track: first.track,
          events: first.events ?? [],
          frames: first.frames,
          frame_rate: first.frame_rate,
          total_frames: first.total,
        };

        console.log(`[Replay] First chunk loaded: ${first.frames.length}/${first.total}`);

        setState({
          data: initialData,
          loading: false,
          error: null,
        });

        let start = CHUNK_SIZE;

        while (start < first.total && !cancelled) {
          const end = Math.min(start + CHUNK_SIZE, first.total);
          console.log(`[Replay] Loading frames ${start} - ${end}`);

          const chunk = await getReplayChunk(replayQuery, start, CHUNK_SIZE);
          if (cancelled) return;

          setState((current) => {
            if (!current.data) return current;
            return {
              ...current,
              data: {
                ...current.data,
                frames: [...current.data.frames, ...chunk.frames],
                total_frames: chunk.total,
              },
            };
          });

          // Force step forward by CHUNK_SIZE to eliminate infinite loop risk
          start += CHUNK_SIZE;
        }

        if (!cancelled) {
          console.log(`[Replay] All frames loaded: ${first.total}`);
        }
      } catch (error: unknown) {
        if (cancelled) return;

        console.error("[Replay] Failed to load replay:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load replay data.";

        setState({
          data: null,
          loading: false,
          error: message,
        });
      }
    }

    loadReplay();

    return () => {
      cancelled = true;
    };
  }, [
    query?.year,
    query?.round,
    query?.sessionType,
    query?.fps,
  ]);

  return state;
}
