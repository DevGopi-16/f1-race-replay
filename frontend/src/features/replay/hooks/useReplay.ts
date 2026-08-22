import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { getReplayChunk } from "../replay.api";

import type {
  ReplayDriverStatus,
} from "../replay.types";


const CHUNK_SIZE = 500;

type ReplayQueryLike = {
  year: number;
  grandPrix?: string;
  grand_prix?: string;
  grandPrixName?: string;

  sessionType?: string;
  session_type?: string;

  fps?: number;
};

export function useReplay(query?: ReplayQueryLike | null) {
  const [data, setData] = useState<any>(null);

  const [frames, setFrames] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [track, setTrack] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  const [driverColors, setDriverColors] =
    useState<Record<string, any>>({});

  const [maxTyreLife, setMaxTyreLife] =
    useState<Record<string, any>>({});

  const [driverStatuses, setDriverStatuses] =
    useState<Record<string, ReplayDriverStatus>>({});

  const [totalFrames, setTotalFrames] =
    useState(0);

  const [loadedFrames, setLoadedFrames] =
    useState(0);

  const [frameRate, setFrameRate] =
    useState(8);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* REFS */

  const loadingRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  const framesRef =
    useRef<any[]>([]);

  const loadedStartsRef =
    useRef<Set<number>>(new Set());

  const queryGenerationRef =
    useRef(0);

  /* MOUNT / UNMOUNT */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      queryGenerationRef.current += 1;
    };
  }, []);

  /* RESET INTERNAL STATE */
  const resetInternalState = useCallback(() => {
    framesRef.current = [];
    loadedStartsRef.current.clear();

    setData(null);
    setFrames([]);
    setMeta(null);
    setTrack(null);
    setEvents([]);
    setDriverColors({});
    setMaxTyreLife({});
    setDriverStatuses({});
    setTotalFrames(0);
    setLoadedFrames(0);
    setFrameRate(8);
    setLoading(false);
    setError(null);
  }, []);

  /* LOAD ONE CHUNK */
  const loadChunk = useCallback(
    async (
      year: number,
      grandPrix: string,
      sessionType: string,
      fps: number,
      start: number,
      generation: number,
    ) => {

      /* Do not load the same chunk twice.*/
      if (
        loadedStartsRef.current.has(start)
      ) {
        return null;
      }

      /* if this request belongs to an old replay, silently abandon it.*/
      if (
        generation !==
        queryGenerationRef.current
      ) {
        return null;
      }

      loadedStartsRef.current.add(start);

      try {
        console.log(
          `[Replay] Loading frames ${start} - ${start + CHUNK_SIZE}`,
        );

        const chunk =
          await getReplayChunk(
            {
              year,
              grandPrix,
              sessionType:
                sessionType as
                  | "R"
                  | "S"
                  | "FP1"
                  | "FP2"
                  | "FP3",
              fps,
            },
            start,
            CHUNK_SIZE,
          );

        /*
         * Ignore stale requests.
         */

        if (
          generation !==
          queryGenerationRef.current
        ) {
          return null;
        }

        if (
          !chunk ||
          !Array.isArray(chunk.frames)
        ) {
          throw new Error(
            "Invalid replay chunk received from server.",
          );
        }

        return chunk;
      } catch (err) {
        /*
         * Allow retry if this chunk failed.
         */

        loadedStartsRef.current.delete(
          start,
        );

        throw err;
      }
    },
    [],
  );

  /* APPEND CHUNK */

  const appendChunk = useCallback(
    (
      chunk: any,
      firstChunk: boolean,
    ) => {
      if (!mountedRef.current) {
        return;
      }

      const nextFrames = [
        ...framesRef.current,
        ...chunk.frames,
      ];

      framesRef.current =
        nextFrames;

      if (firstChunk) {
        setMeta(
          chunk.meta ?? null,
        );

        setTrack(
          chunk.track ?? null,
        );

        setEvents(
          chunk.events ?? [],
        );

        setDriverColors(
          chunk.driver_colors ?? {},
        );

        setMaxTyreLife(
          chunk.max_tyre_life ?? {},
        );

        setDriverStatuses(
          chunk.driver_statuses ?? {},
        );

        const backendFrameRate =
          Number(
            chunk.frame_rate,
          );

        if (
          Number.isFinite(
            backendFrameRate,
          ) &&
          backendFrameRate > 0
        ) {
          setFrameRate(
            backendFrameRate,
          );
        }
      }
      setFrames(
        nextFrames,
      );

      setLoadedFrames(
        nextFrames.length,
      );
      setData(
        (previous: any) => ({
          ...(previous ?? chunk),

          frames:
            nextFrames,
          frame_rate:
            Number(
              chunk.frame_rate ??
                previous?.frame_rate ??
                8,
            ),

          meta:
            chunk.meta ??
            previous?.meta,

          track:
            chunk.track ??
            previous?.track,

          events:
            chunk.events ??
            previous?.events ??
            [],

          driver_colors:
            chunk.driver_colors ??
            previous?.driver_colors ??
            {},

          max_tyre_life:
            chunk.max_tyre_life ??
            previous?.max_tyre_life ??
            {},

          driver_statuses:
            chunk.driver_statuses ??
            previous?.driver_statuses ??
            {},
        }),
      );
    },
    [],
  );

  /* LOAD COMPLETE REPLAY */
  const loadReplay = useCallback(
    async (
      year: number,
      grandPrix: string,
      sessionType = "R",
      requestedFps = 8,
    ) => {


      if (loadingRef.current) {
        console.log(
          "[Replay] Load already running.",
        );

        return;
      }
      const generation =
        ++queryGenerationRef.current;

      loadingRef.current = true;

      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      framesRef.current = [];
      loadedStartsRef.current.clear();

      if (mountedRef.current) {
        setData(null);
        setFrames([]);
        setMeta(null);
        setTrack(null);
        setEvents([]);
        setDriverColors({});
        setMaxTyreLife({});
        setDriverStatuses({});
        setTotalFrames(0);
        setLoadedFrames(0);
      }

      const fps = Math.max(
        1,
        Number(requestedFps) || 8,
      );

      try {
        console.log(
          "[Replay] Loading first chunk...",
        );

        const first =
          await loadChunk(
            year,
            grandPrix,
            sessionType,
            fps,
            0,
            generation,
          );

        if (
          !first ||
          generation !==
            queryGenerationRef.current
        ) {
          return;
        }

        const total =
          Number(
            first.total_frames ??
              first.total ??
              first.frames.length,
          );

        console.log(
          `[Replay] First chunk loaded: ${first.frames.length}/${total}`,
        );

        if (mountedRef.current) {
          setTotalFrames(
            total,
          );
        }
        appendChunk(
          first,
          true,
        );

        if (mountedRef.current) {
          setLoading(false);
        }

        /* BACKGROUND LOADING */
        for (
          let start =
            CHUNK_SIZE;
          start < total;
          start += CHUNK_SIZE
        ) {
          if (
            !mountedRef.current ||
            generation !==
              queryGenerationRef.current
          ) {
            return;
          }

          try {
            const chunk =
              await loadChunk(
                year,
                grandPrix,
                sessionType,
                fps,
                start,
                generation,
              );

            if (
              !chunk ||
              generation !==
                queryGenerationRef.current
            ) {
              return;
            }

            appendChunk(
              chunk,
              false,
            );

            console.log(
              `[Replay] Loaded ${framesRef.current.length}/${total}`,
            );
            await new Promise<void>(
              (resolve) =>
                setTimeout(
                  resolve,
                  0,
                ),
            );
          } catch (chunkError) {
            console.error(
              `[Replay] Background chunk ${start} failed:`,
              chunkError,
            );
            continue;
          }
        }

        if (
          mountedRef.current &&
          generation ===
            queryGenerationRef.current
        ) {
          console.log(
            `[Replay] Replay fully loaded: ${framesRef.current.length}/${total}`,
          );
        }
      } catch (err) {
        console.error(
          "[Replay] Load failed:",
          err,
        );

        if (
          !mountedRef.current ||
          generation !==
            queryGenerationRef.current
        ) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Failed to load replay.";

        setError(message);
        setLoading(false);
      } finally {

        if (
          generation ===
          queryGenerationRef.current
        ) {
          loadingRef.current =
            false;

          if (mountedRef.current) {
            setLoading(false);
          }
        }
      }
    },
    [
      appendChunk,
      loadChunk,
    ],
  );

  /* RESET REPLAY */

  const resetReplay =
    useCallback(() => {
      queryGenerationRef.current += 1;

      loadingRef.current = false;

      resetInternalState();
    }, [
      resetInternalState,
    ]);

  /*AUTOMATIC LOAD */
  const queryKey =
    query
      ? JSON.stringify(query)
      : "";

  const previousQueryRef =
    useRef("");

  useEffect(() => {
    if (!query) {
      return;
    }

    if (
      queryKey ===
      previousQueryRef.current
    ) {
      return;
    }

    previousQueryRef.current =
      queryKey;

    const year =
      Number(
        query.year,
      );

    const grandPrix =
      query.grandPrix ??
      query.grand_prix ??
      query.grandPrixName ??
      "";

    const sessionType =
      query.sessionType ??
      query.session_type ??
      "R";

    const fps =
      Number(
        query.fps ?? 8,
      );

    if (
      !year ||
      !grandPrix
    ) {
      return;
    }
    void loadReplay(
      year,
      grandPrix,
      sessionType,
      fps,
    );
  }, [
    query,
    queryKey,
    loadReplay,
  ]);

  return {
    data,
    frames,
    meta,
    track,
    events,

    driverColors,
    maxTyreLife,
    driverStatuses,

    frameRate,


    totalFrames,
    loadedFrames,

    loading,
    isLoading: loading,


    isLoaded:
      totalFrames > 0 &&
      loadedFrames >= totalFrames,



    progress:
      totalFrames > 0
        ? Math.min(
            100,
            (loadedFrames /
              totalFrames) *
              100,
          )
        : 0,
    error,
    loadReplay,
    resetReplay,
  };
}

export default useReplay;