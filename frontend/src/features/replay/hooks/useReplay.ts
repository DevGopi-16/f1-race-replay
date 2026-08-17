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

/*
 * Number of replay chunks allowed to load at the same time.
 *
 * We still assemble the final frame array in exact backend order.
 * Parallel loading only removes the unnecessary network wait.
 */
const PARALLEL_CHUNKS = 8;

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
        console.log(
          "[Replay] Loading replay...",
          replayQuery,
        );

        /*
         * ---------------------------------------------------------
         * FIRST CHUNK
         * ---------------------------------------------------------
         *
         * The first request gives us:
         *
         *   - metadata
         *   - track
         *   - driver colors
         *   - total frame count
         *   - first 500 frames
         *
         * Nothing is exposed to ReplayPage yet.
         */

        const first = await getReplayChunk(
          replayQuery,
          0,
          CHUNK_SIZE,
        );

        if (cancelled) {
          return;
        }

        if (
          !first.meta ||
          !first.track ||
          !first.driver_colors
        ) {
          throw new Error(
            "Replay metadata is missing from the server.",
          );
        }

        if (!Array.isArray(first.frames)) {
          throw new Error(
            "Replay first chunk returned invalid frame data.",
          );
        }

        const total =
          Number.isFinite(first.total)
            ? first.total
            : first.total_frames;

        if (
          !Number.isFinite(total) ||
          total <= 0
        ) {
          throw new Error(
            "Replay returned an invalid total frame count.",
          );
        }

        console.log(
          `[Replay] Replay contains ${total.toLocaleString()} frames.`,
        );

        /*
         * ---------------------------------------------------------
         * CHUNK STORAGE
         * ---------------------------------------------------------
         *
         * IMPORTANT:
         *
         * We do NOT append chunks as they arrive.
         *
         * Network responses can finish in any order.
         *
         * Example:
         *
         *   request 500
         *   request 1000
         *   request 1500
         *
         * could finish as:
         *
         *   1500
         *   500
         *   1000
         *
         * Therefore every chunk is stored using its exact
         * backend start index.
         */

        const chunks = new Map<
          number,
          typeof first.frames
        >();

        chunks.set(0, first.frames);

        const starts: number[] = [];

        for (
          let start = CHUNK_SIZE;
          start < total;
          start += CHUNK_SIZE
        ) {
          starts.push(start);
        }

        console.log(
          `[Replay] ${starts.length + 1} total chunks required.`,
        );

        /*
         * ---------------------------------------------------------
         * PARALLEL CHUNK LOADING
         * ---------------------------------------------------------
         *
         * Only a limited number of requests run at once.
         *
         * This avoids:
         *
         *   - 70+ sequential network waits
         *   - browser connection flooding
         *   - unnecessary server pressure
         *
         * But is dramatically faster than the old loader.
         */

        for (
          let batchStart = 0;
          batchStart < starts.length;
          batchStart += PARALLEL_CHUNKS
        ) {
          if (cancelled) {
            return;
          }

          const batch =
            starts.slice(
              batchStart,
              batchStart + PARALLEL_CHUNKS,
            );

          console.log(
            `[Replay] Loading chunks: ${batch
              .map((value) => `${value}-${Math.min(value + CHUNK_SIZE, total)}`)
              .join(", ")}`,
          );

          const results =
            await Promise.all(
              batch.map(async (start) => {
                const chunk =
                  await getReplayChunk(
                    replayQuery,
                    start,
                    CHUNK_SIZE,
                  );

                return {
                  start,
                  chunk,
                };
              }),
            );

          if (cancelled) {
            return;
          }

          /*
           * Store each response using its requested start.
           *
           * Arrival order is irrelevant.
           */
          for (const {
            start,
            chunk,
          } of results) {
            if (!Array.isArray(chunk.frames)) {
              throw new Error(
                `Replay chunk ${start} returned invalid frame data.`,
              );
            }

            chunks.set(
              start,
              chunk.frames,
            );
          }

          const loaded =
            Array.from(chunks.values())
              .reduce(
                (sum, frames) =>
                  sum + frames.length,
                0,
              );

          console.log(
            `[Replay] Chunks loaded: ${loaded.toLocaleString()}/${total.toLocaleString()} frames`,
          );
        }

        if (cancelled) {
          return;
        }

        /*
         * ---------------------------------------------------------
         * ASSEMBLE EXACT FRAME ORDER
         * ---------------------------------------------------------
         *
         * This is the critical part.
         *
         * We reconstruct:
         *
         *   chunk 0
         *   chunk 500
         *   chunk 1000
         *   chunk 1500
         *   ...
         *
         * regardless of which network request completed first.
         */

        const allFrames: typeof first.frames = [];

        for (
          let start = 0;
          start < total;
          start += CHUNK_SIZE
        ) {
          const chunk =
            chunks.get(start);

          if (!chunk) {
            throw new Error(
              `Replay chunk ${start} is missing.`,
            );
          }

          allFrames.push(...chunk);
        }

        /*
         * ---------------------------------------------------------
         * FRAME COUNT VALIDATION
         * ---------------------------------------------------------
         */

        if (allFrames.length !== total) {
          throw new Error(
            `Replay frame count mismatch: ` +
            `loaded ${allFrames.length}, expected ${total}`,
          );
        }

        /*
         * ---------------------------------------------------------
         * FAST TIMESTAMP SANITY CHECK
         * ---------------------------------------------------------
         *
         * Chunks are already assembled in exact backend order.
         *
         * Do NOT scan all 50,000+ frames here.
         * A small sample is enough to detect an obvious
         * timestamp ordering problem without delaying replay start.
         */

        const validationStep = Math.max(
          1,
          Math.floor(allFrames.length / 100),
        );

        let timestampWarnings = 0;

        for (
          let i = validationStep;
          i < allFrames.length;
          i += validationStep
        ) {
          const previous = allFrames[i - 1]?.t;
          const current = allFrames[i]?.t;

          if (
            typeof previous === "number" &&
            typeof current === "number" &&
            current < previous
          ) {
            timestampWarnings += 1;

            if (timestampWarnings <= 3) {
              console.warn(
                "[Replay] Timestamp order warning:",
                {
                  index: i,
                  previous,
                  current,
                },
              );
            }
          }
        }

        /*
         * ---------------------------------------------------------
         * FINAL IMMUTABLE REPLAY DATA
         * ---------------------------------------------------------
         *
         * ReplayPage receives frames exactly once.
         *
         * After this point:
         *
         *   frames.length === total_frames
         *
         * and the array order never changes.
         */

        const completeData: ReplayResponse = {
          meta: first.meta,
          driver_colors:
            first.driver_colors,
          max_tyre_life:
            first.max_tyre_life ?? {},
          track: first.track,
          events:
            first.events ?? [],
          frames: allFrames,
          frame_rate:
            first.frame_rate,
          total_frames: total,
        };

        console.log(
          `[Replay] COMPLETE replay loaded: ${allFrames.length.toLocaleString()} frames`,
        );

        setState({
          data: completeData,
          loading: false,
          error: null,
        });
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        console.error(
          "[Replay] Failed to load replay:",
          error,
        );

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
