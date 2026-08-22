import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ReplayDriverColors,
  ReplayFrame,
  ReplayTrack as ReplayTrackData,
} from "../replay.types";

import "./replay-track.css";

interface ReplayTrackProps {
  track: ReplayTrackData;
  frames: ReplayFrame[];
  frameIndex: number;
  playing: boolean;
  frameRate: number;
  driverColors: ReplayDriverColors;
}

interface Point {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface Size {
  width: number;
  height: number;
  dpr: number;
}

function getDriverColor(
  driverColors: ReplayDriverColors,
  code: string,
): string {
  const value = driverColors[code];

  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.color === "string"
  ) {
    return value.color;
  }

  return "#ffffff";
}

function getTrackPoints(
  track: ReplayTrackData,
): Point[] {
  if (
    Array.isArray(track.centerline) &&
    track.centerline.length > 1
  ) {
    const points = track.centerline
      .filter(
        (point): point is [number, number] =>
          Array.isArray(point) &&
          point.length >= 2 &&
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1]),
      )
      .map(([x, y]) => ({ x, y }));

    if (points.length > 1) {
      return points;
    }
  }

  if (
    Array.isArray(track.points) &&
    track.points.length > 1
  ) {
    return track.points.filter(
      (point) =>
        Number.isFinite(point.x) &&
        Number.isFinite(point.y),
    );
  }

  if (
    Array.isArray(track.x) &&
    Array.isArray(track.y) &&
    track.x.length === track.y.length &&
    track.x.length > 1
  ) {
    const points: Point[] = [];

    for (let i = 0; i < track.x.length; i++) {
      const x = track.x[i];
      const y = track.y[i];

      if (
        Number.isFinite(x) &&
        Number.isFinite(y)
      ) {
        points.push({ x, y });
      }
    }

    if (points.length > 1) {
      return points;
    }
  }

  return [];
}

function getBounds(
  track: ReplayTrackData,
  points: Point[],
): Bounds | null {
  const raw = track.bounds;

  if (
    raw &&
    typeof raw === "object"
  ) {
    const value =
      raw as Record<string, unknown>;

    const minX = value.x_min;
    const maxX = value.x_max;
    const minY = value.y_min;
    const maxY = value.y_max;

    if (
      typeof minX === "number" &&
      typeof maxX === "number" &&
      typeof minY === "number" &&
      typeof maxY === "number" &&
      Number.isFinite(minX) &&
      Number.isFinite(maxX) &&
      Number.isFinite(minY) &&
      Number.isFinite(maxY) &&
      maxX > minX &&
      maxY > minY
    ) {
      return {
        minX,
        maxX,
        minY,
        maxY,
      };
    }
  }

  if (points.length < 2) {
    return null;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY)
  ) {
    return null;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

function getStartFinish(
  track: ReplayTrackData,
): [Point, Point] | null {
  if (
    !Array.isArray(track.start_finish) ||
    track.start_finish.length < 2
  ) {
    return null;
  }

  const a = track.start_finish[0];
  const b = track.start_finish[1];

  if (
    !Array.isArray(a) ||
    !Array.isArray(b) ||
    a.length < 2 ||
    b.length < 2 ||
    typeof a[0] !== "number" ||
    typeof a[1] !== "number" ||
    typeof b[0] !== "number" ||
    typeof b[1] !== "number"
  ) {
    return null;
  }

  return [
    { x: a[0], y: a[1] },
    { x: b[0], y: b[1] },
  ];
}


const SECTOR_COLORS = {
  1: "#ff3344",
  2: "#3b82f6",
  3: "#ffd23f",
};

function getNumericValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function findNearestPointIndex(
  points: Point[],
  target: Point,
): number {
  let nearestIndex = 0;
  let nearestDistance = Infinity;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - target.x;
    const dy = points[i].y - target.y;

    const distance = dx * dx + dy * dy;

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

function getSectorIndex(
  track: ReplayTrackData,
  pointIndex: number,
  totalPoints: number,
): 1 | 2 | 3 {
  const segments = track.sector_segments;

  if (Array.isArray(segments) && segments.length >= 3) {
    const progress = pointIndex / Math.max(1, totalPoints - 1);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (!segment || typeof segment !== "object") continue;

      const obj = segment as Record<string, unknown>;

      const start = getNumericValue(
        obj.start ?? obj.start_index ?? obj.from ?? obj.start_dist,
      );

      const end = getNumericValue(
        obj.end ?? obj.end_index ?? obj.to ?? obj.end_dist,
      );

      if (start !== null && end !== null) {
        if (pointIndex >= start && pointIndex <= end) {
          return (i + 1) as 1 | 2 | 3;
        }
      }

      if (
        start !== null &&
        end !== null &&
        start <= 1 &&
        end <= 1 &&
        progress >= start &&
        progress <= end
      ) {
        return (i + 1) as 1 | 2 | 3;
      }
    }
  }

  if (pointIndex < totalPoints / 3) return 1;
  if (pointIndex < (totalPoints * 2) / 3) return 2;
  return 3;
}

function getTrackDistanceIndex(
  track: ReplayTrackData,
  driver: { dist?: number; rel_dist?: number },
  totalPoints: number,
): number {
  const dist = getNumericValue(driver.dist);

  if (dist !== null) {
    const maxDist = getNumericValue(
      (track as Record<string, unknown>).length,
    );

    if (maxDist && maxDist > 0) {
      return Math.max(
        0,
        Math.min(
          totalPoints - 1,
          Math.round((dist / maxDist) * (totalPoints - 1)),
        ),
      );
    }
  }

  const rel = getNumericValue(driver.rel_dist);

  if (rel !== null) {
    return Math.max(
      0,
      Math.min(
        totalPoints - 1,
        Math.round(rel * (totalPoints - 1)),
      ),
    );
  }

  return 0;
}

const ReplayTrack = memo(function ReplayTrack({
  track,
  frames,
  frameIndex,
  playing,
  frameRate,
  driverColors,
}: ReplayTrackProps) {
  const [showSectors, setShowSectors] = useState(true);
  const [showDRS, setShowDRS] = useState(true);

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const viewportRef =
    useRef<HTMLDivElement | null>(null);

  const sizeRef = useRef<Size>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  /*
   * Current logical frame.
   */
  const frameIndexRef =
    useRef(frameIndex);

  /*
   * Cached canvas track path.
   */
  const trackPathRef =
    useRef<Path2D | null>(null);

  const startFinishRef =
    useRef<[Point, Point] | null>(null);

  /*
   * ---------------------------------------------------------
   * STATIC TRACK DATA
   * ---------------------------------------------------------
   */
  const points = useMemo(
    () => getTrackPoints(track),
    [track],
  );

  const bounds = useMemo(
    () => getBounds(track, points),
    [track, points],
  );

  const startFinish = useMemo(
    () => getStartFinish(track),
    [track],
  );

  /*
   * ---------------------------------------------------------
   * FRAME INDEX SYNC
   * ---------------------------------------------------------
   *
   * React frameIndex is the single source of truth.
   *
   * ReplayTrack does not advance time and does not
   * interpolate between telemetry frames.
   */
  useEffect(() => {
    frameIndexRef.current = frameIndex;
  }, [frameIndex]);

  /*
   * ---------------------------------------------------------
   * CANVAS RESIZE
   * ---------------------------------------------------------
   */
  const resizeCanvas = useCallback(() => {
    const canvas =
      canvasRef.current;

    const viewport =
      viewportRef.current;

    if (!canvas || !viewport) {
      return;
    }

    const rect =
      viewport.getBoundingClientRect();

    const width =
      Math.max(
        320,
        Math.floor(rect.width),
      );

    const height =
      Math.max(
        1,
        Math.floor(rect.height),
      );

    const dpr =
      Math.min(
        window.devicePixelRatio || 1,
        2,
      );

    sizeRef.current = {
      width,
      height,
      dpr,
    };

    canvas.width =
      Math.floor(width * dpr);

    canvas.height =
      Math.floor(height * dpr);

    canvas.style.width =
      `${width}px`;

    canvas.style.height =
      `${height}px`;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0,
    );

    /*
     * Rebuild cached track path after resize.
     */
    trackPathRef.current =
      null;
  }, []);

  useEffect(() => {
    resizeCanvas();

    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer =
      new ResizeObserver(() => {
        resizeCanvas();
      });

    observer.observe(viewport);

    window.addEventListener(
      "resize",
      resizeCanvas,
    );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        "resize",
        resizeCanvas,
      );
    };
  }, [resizeCanvas]);

  /*
   * ---------------------------------------------------------
   * TRACK TRANSFORM
   * ---------------------------------------------------------
   */
  const getTransform = useCallback(() => {
    const {
      width,
      height,
    } = sizeRef.current;

    if (
      !bounds ||
      width <= 1 ||
      height <= 1
    ) {
      return null;
    }

    const paddingX =
      Math.max(
        45,
        width * 0.075,
      );

    const paddingY =
      Math.max(
        55,
        height * 0.12,
      );

    const rangeX =
      Math.max(
        1,
        bounds.maxX - bounds.minX,
      );

    const rangeY =
      Math.max(
        1,
        bounds.maxY - bounds.minY,
      );

    const usableWidth =
      Math.max(
        1,
        width - paddingX * 2,
      );

    const usableHeight =
      Math.max(
        1,
        height - paddingY * 2,
      );

    const scale =
      Math.min(
        usableWidth / rangeX,
        usableHeight / rangeY,
      );

    const drawnWidth =
      rangeX * scale;

    const drawnHeight =
      rangeY * scale;

    const offsetX =
      (width - drawnWidth) / 2;

    const offsetY =
      (height - drawnHeight) / 2;

    return {
      scale,
      offsetX,
      offsetY,
    };
  }, [bounds]);

  const transformPoint = useCallback(
    (
      point: Point,
      transform: {
        scale: number;
        offsetX: number;
        offsetY: number;
      },
    ): Point => ({
      x:
        transform.offsetX +
        (point.x - bounds!.minX) *
          transform.scale,

      y:
        transform.offsetY +
        (bounds!.maxY - point.y) *
          transform.scale,
    }),
    [bounds],
  );

  /*
   * ---------------------------------------------------------
   * TRACK PATH CACHE
   * ---------------------------------------------------------
   */
  const buildTrackPath = useCallback(
    (
      transform: {
        scale: number;
        offsetX: number;
        offsetY: number;
      },
    ) => {
      if (
        points.length < 2
      ) {
        return null;
      }

      const path =
        new Path2D();

      for (
        let i = 0;
        i < points.length;
        i++
      ) {
        const p =
          transformPoint(
            points[i],
            transform,
          );

        if (i === 0) {
          path.moveTo(
            p.x,
            p.y,
          );
        } else {
          path.lineTo(
            p.x,
            p.y,
          );
        }
      }

      return path;
    },
    [points, transformPoint],
  );

  /*
   * ---------------------------------------------------------
   * DRAW
   * ---------------------------------------------------------
   */
  const draw = useCallback(
    (
      visualFrame: number,
      interpolate: boolean,
    ) => {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return;
      }

      const ctx =
        canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      const {
        width,
        height,
        dpr,
      } = sizeRef.current;

      if (
        width <= 1 ||
        height <= 1
      ) {
        return;
      }

      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0,
      );

      ctx.clearRect(
        0,
        0,
        width,
        height,
      );

      /*
       * Background
       */
      ctx.fillStyle =
        "#07090d";

      ctx.fillRect(
        0,
        0,
        width,
        height,
      );

      if (
        points.length < 2 ||
        !bounds
      ) {
        ctx.fillStyle =
          "#8b93a1";

        ctx.font =
          "600 14px system-ui, sans-serif";

        ctx.textAlign =
          "center";

        ctx.fillText(
          "TRACK DATA UNAVAILABLE",
          width / 2,
          height / 2,
        );

        return;
      }

      const transform =
        getTransform();

      if (!transform) {
        return;
      }

      /*
       * -------------------------------------------------------
       * SECTORS + DRS
       * -------------------------------------------------------
       */

      const drawColoredTrack = (
        color: string,
        start: number,
        end: number,
      ) => {
        if (points.length < 2) return;

        const safeStart = Math.max(
          0,
          Math.min(points.length - 1, Math.floor(start)),
        );

        const safeEnd = Math.max(
          safeStart + 1,
          Math.min(points.length - 1, Math.ceil(end)),
        );

        ctx.save();

        ctx.strokeStyle = color;
        ctx.lineWidth = 4.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 0.95;

        ctx.beginPath();

        for (let i = safeStart; i <= safeEnd; i++) {
          const p = transformPoint(
            points[i],
            transform,
          );

          if (i === safeStart) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }

        ctx.stroke();
        ctx.restore();
      };

      /*
       * Sector colours are painted ON the circuit.
       * Cars remain completely independent dots.
       */
      if (showSectors) {
        const total = points.length;

        drawColoredTrack(
          SECTOR_COLORS[1],
          0,
          total / 3,
        );

        drawColoredTrack(
          SECTOR_COLORS[2],
          total / 3,
          (total * 2) / 3,
        );

        drawColoredTrack(
          SECTOR_COLORS[3],
          (total * 2) / 3,
          total - 1,
        );
      }

      /*
       * DRS zones.
       *
       * Supports common backend formats:
       * [
       *   {start: 100, end: 180},
       *   {start: 400, end: 470}
       * ]
       */
      if (showDRS) {
        const rawDRS = track.drs_zones;

        if (Array.isArray(rawDRS)) {
          for (const zone of rawDRS) {
            if (
              !zone ||
              typeof zone !== "object"
            ) {
              continue;
            }

            const z =
              zone as Record<string, unknown>;

            const rawStart = z.start;
            const rawEnd = z.end;

            /*
             * Backend track_geometry.py sends:
             *
             * {
             *   start: {x: ..., y: ...},
             *   end:   {x: ..., y: ...}
             * }
             *
             * Convert those coordinates to the
             * nearest points on the rendered track.
             */

            if (
              !rawStart ||
              !rawEnd ||
              typeof rawStart !== "object" ||
              typeof rawEnd !== "object"
            ) {
              continue;
            }

            const startObj =
              rawStart as Record<string, unknown>;

            const endObj =
              rawEnd as Record<string, unknown>;

            if (
              typeof startObj.x !== "number" ||
              typeof startObj.y !== "number" ||
              typeof endObj.x !== "number" ||
              typeof endObj.y !== "number"
            ) {
              continue;
            }

            const startIndex =
              findNearestPointIndex(
                points,
                {
                  x: startObj.x,
                  y: startObj.y,
                },
              );

            const endIndex =
              findNearestPointIndex(
                points,
                {
                  x: endObj.x,
                  y: endObj.y,
                },
              );

            drawColoredTrack(
              "#00e5ff",
              Math.min(
                startIndex,
                endIndex,
              ),
              Math.max(
                startIndex,
                endIndex,
              ),
            );
          }
        }
      }

      /*
       * -------------------------------------------------------
       * TRACK
       * -------------------------------------------------------
       */
      if (
        !trackPathRef.current
      ) {
        trackPathRef.current =
          buildTrackPath(
            transform,
          );
      }

      const trackPath =
        trackPathRef.current;

      if (trackPath) {
        /*
         * Glow
         */
        ctx.save();

        ctx.strokeStyle =
          "rgba(255,255,255,0.10)";

        ctx.lineWidth = 9;

        ctx.lineCap =
          "round";

        ctx.lineJoin =
          "round";

        ctx.shadowBlur = 14;

        ctx.shadowColor =
          "rgba(255,255,255,0.15)";

        ctx.stroke(trackPath);

        ctx.restore();

        /*
         * Main track
         */
        ctx.save();

        ctx.strokeStyle =
          "rgba(255,255,255,0.78)";

        ctx.lineWidth = 2.2;

        ctx.lineCap =
          "round";

        ctx.lineJoin =
          "round";

        ctx.stroke(trackPath);

        ctx.restore();
      }

      /*
       * -------------------------------------------------------
       * START / FINISH
       * -------------------------------------------------------
       */
      if (startFinish) {
        const a =
          transformPoint(
            startFinish[0],
            transform,
          );

        const b =
          transformPoint(
            startFinish[1],
            transform,
          );

        ctx.save();

        ctx.strokeStyle =
          "rgba(255,255,255,0.9)";

        ctx.lineWidth = 4;

        ctx.beginPath();

        ctx.moveTo(
          a.x,
          a.y,
        );

        ctx.lineTo(
          b.x,
          b.y,
        );

        ctx.stroke();

        ctx.restore();
      }

      /*
       * -------------------------------------------------------
       * FRAME SELECTION
       * -------------------------------------------------------
       */
      const maxFrame =
        Math.max(
          0,
          frames.length - 1,
        );

      const safeFrame =
        Math.max(
          0,
          Math.min(
            maxFrame,
            visualFrame,
          ),
        );

      const lowerIndex =
        Math.floor(safeFrame);

      const upperIndex =
        Math.min(
          maxFrame,
          lowerIndex + 1,
        );

      const fraction =
        interpolate
          ? Math.max(
              0,
              Math.min(
                1,
                safeFrame -
                  lowerIndex,
              ),
            )
          : 0;

      const frameA =
        frames[lowerIndex];

      const frameB =
        frames[upperIndex];

      if (!frameA?.drivers) {
        return;
      }

      /*
       * -------------------------------------------------------
       * CARS
       * -------------------------------------------------------
       *
       * No collision solver.
       *
       * No expensive geometry calculation.
       *
       * Only:
       *
       *   telemetry → transform → circle
       */
      const driverCodes =
        Object.keys(
          frameA.drivers,
        );

      for (
        let i = 0;
        i < driverCodes.length;
        i++
      ) {
        const code =
          driverCodes[i];

        const driverA =
          frameA.drivers[code];

        if (
          !driverA ||
          typeof driverA.x !== "number" ||
          typeof driverA.y !== "number" ||
          !Number.isFinite(driverA.x) ||
          !Number.isFinite(driverA.y)
        ) {
          continue;
        }

        const driverB =
          frameB?.drivers?.[code];

        let x =
          driverA.x;

        let y =
          driverA.y;

        /*
         * Interpolate ONLY during playback.
         *
         * Manual seeking uses fraction = 0,
         * therefore it always draws the exact frame.
         */
        if (
          interpolate &&
          driverB &&
          typeof driverB.x === "number" &&
          typeof driverB.y === "number" &&
          Number.isFinite(driverB.x) &&
          Number.isFinite(driverB.y)
        ) {
          x =
            driverA.x +
            (driverB.x - driverA.x) *
              fraction;

          y =
            driverA.y +
            (driverB.y - driverA.y) *
              fraction;
        }

        const position =
          transformPoint(
            { x, y },
            transform,
          );

        const color =
          getDriverColor(
            driverColors,
            code,
          );

        /*
         * Glow
         */
        ctx.save();

        ctx.beginPath();

        ctx.arc(
          position.x,
          position.y,
          8,
          0,
          Math.PI * 2,
        );

        ctx.fillStyle =
          color;

        ctx.globalAlpha =
          0.16;

        ctx.shadowBlur = 12;

        ctx.shadowColor =
          color;

        ctx.fill();

        ctx.restore();

        /*
         * Driver dot marker
         *
         * Simple, clean circuit-map marker:
         * - team/driver colour
         * - white outer ring
         * - no car silhouette
         * - same exact track position
         */
        ctx.save();

        const markerRadius = 4.5;

        /*
         * White outer ring.
         */
        ctx.beginPath();

        ctx.arc(
          position.x,
          position.y,
          markerRadius + 1.5,
          0,
          Math.PI * 2,
        );

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fill();

        /*
         * Coloured driver dot.
         */
        ctx.beginPath();

        ctx.arc(
          position.x,
          position.y,
          markerRadius,
          0,
          Math.PI * 2,
        );

        ctx.fillStyle = color;
        ctx.fill();

        ctx.restore();
      }

      /*
       * -------------------------------------------------------
       * DRIVER LABELS
       * -------------------------------------------------------
       *
       * Labels intentionally use a deterministic small
       * offset instead of running collision optimization
       * every frame.
       *
       * This is dramatically cheaper and prevents labels
       * from constantly shuffling during playback.
       */
      for (
        let i = 0;
        i < driverCodes.length;
        i++
      ) {
        const code =
          driverCodes[i];

        const driverA =
          frameA.drivers[code];

        if (
          !driverA ||
          typeof driverA.x !== "number" ||
          typeof driverA.y !== "number" ||
          !Number.isFinite(driverA.x) ||
          !Number.isFinite(driverA.y)
        ) {
          continue;
        }

        const driverB =
          frameB?.drivers?.[code];

        let x =
          driverA.x;

        let y =
          driverA.y;

        if (
          interpolate &&
          driverB &&
          typeof driverB.x === "number" &&
          typeof driverB.y === "number" &&
          Number.isFinite(driverB.x) &&
          Number.isFinite(driverB.y)
        ) {
          x =
            driverA.x +
            (driverB.x - driverA.x) *
              fraction;

          y =
            driverA.y +
            (driverB.y - driverA.y) *
              fraction;
        }

        const position =
          transformPoint(
            { x, y },
            transform,
          );

        const color =
          getDriverColor(
            driverColors,
            code,
          );

        /*
         * Stable alternating offsets.
         */
        const row =
          i % 3;

        const offsetX =
          row === 1
            ? -28
            : row === 2
              ? 8
              : 8;

        const offsetY =
          row === 1
            ? -18
            : row === 2
              ? 18
              : -18;

        const labelWidth = 30;
        const labelHeight = 16;

        let labelX =
          position.x +
          offsetX;

        let labelY =
          position.y +
          offsetY;

        labelX =
          Math.max(
            6,
            Math.min(
              labelX,
              width -
                labelWidth -
                6,
            ),
          );

        labelY =
          Math.max(
            6,
            Math.min(
              labelY,
              height -
                labelHeight -
                6,
            ),
          );

        ctx.save();

        /*
         * Background
         */
        ctx.fillStyle =
          "rgba(5,7,11,0.90)";

        ctx.strokeStyle =
          color;

        ctx.lineWidth = 1;

        ctx.beginPath();

        if (
          typeof ctx.roundRect ===
          "function"
        ) {
          ctx.roundRect(
            labelX,
            labelY,
            labelWidth,
            labelHeight,
            4,
          );
        } else {
          ctx.rect(
            labelX,
            labelY,
            labelWidth,
            labelHeight,
          );
        }

        ctx.fill();

        ctx.stroke();

        /*
         * Text
         */
        ctx.fillStyle =
          "#ffffff";

        ctx.font =
          "700 9px system-ui, sans-serif";

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          code,
          labelX +
            labelWidth / 2,
          labelY +
            labelHeight / 2,
        );

        ctx.restore();
      }
    },
    [
      bounds,
      buildTrackPath,
      driverColors,
      frames,
      getTransform,
      points,
      startFinish,
      transformPoint,
    ],
  );

  /*
   * ---------------------------------------------------------
   * EXACT FRAME RENDER
   * ---------------------------------------------------------
   *
   * ReplayPage owns playback timing.
   *
   * ReplayTrack is ONLY a renderer:
   *
   *   frameIndex 100 -> draw frame 100
   *   frameIndex 101 -> draw frame 101
   *
   * There is intentionally:
   *
   *   - no requestAnimationFrame
   *   - no interpolation
   *   - no visual playback clock
   *   - no stale animation callback
   *
   * This makes timeline seeking deterministic.
   */
  useEffect(() => {
    if (!frames.length) {
      return;
    }

    draw(frameIndex, false);
  }, [
    draw,
    frameIndex,
    frames.length,
  ]);

  return (
    <section className="replay-track-panel">
      <div
        ref={viewportRef}
        className="track-viewport"
      >
        <canvas
          ref={canvasRef}
          className="replay-track-canvas"
        />

        <div className="track-overlay">
          <span>
            LIVE TRACK
          </span>

          <strong>
            {
              Object.keys(
                frames[frameIndex]?.drivers ??
                  {},
              ).length
            }{" "}
            CARS
          </strong>
        </div>

        <div className="track-frame-info">
          FRAME{" "}
          <strong>
            {(
              Math.max(
                0,
                Math.min(
                  frames.length - 1,
                  frameIndex,
                ),
              ) + 1
            ).toLocaleString()}
          </strong>
        </div>
      </div>
    </section>
  );
});

export default ReplayTrack;
