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
  ReplayOverlayState,
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
  overlays: ReplayOverlayState;
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

const SECTOR_COLORS = ["#E8312A", "#3DA5E0", "#F5D31F"] as const;
const DRS_OFFSET_SIDE: 1 | -1 = 1;

interface MapTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface MapGeometry {
  path: string;
  scale: number;
  ribbonWidth: number;
  sectorRanges: { start: number; length: number }[];
  drsPaths: { path: string }[];
}

function toTrackPoint(value: unknown): Point | null {
  if (
    value &&
    typeof value === "object" &&
    "x" in value &&
    "y" in value &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y)
  ) {
    return { x: value.x, y: value.y };
  }

  return null;
}

export function hasReplayDrsZones(track: ReplayTrackData): boolean {
  return Boolean(
    Array.isArray(track.drs_zones) &&
      track.drs_zones.some(
      (zone) =>
        Boolean(zone) &&
        toTrackPoint(zone.start) !== null &&
        toTrackPoint(zone.end) !== null,
      ),
  );
}

function getPathString(points: Point[]): string {
  return points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
    )
    .join(" ");
}

function getCumulativeLengths(points: Point[]): number[] {
  const cumulative = [0];

  for (let index = 1; index < points.length; index++) {
    const dx = points[index].x - points[index - 1].x;
    const dy = points[index].y - points[index - 1].y;
    cumulative.push(cumulative[index - 1] + Math.hypot(dx, dy));
  }

  return cumulative;
}

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

const ReplaySectorLayer = memo(function ReplaySectorLayer({
  geometry,
  visible,
}: {
  geometry: MapGeometry;
  visible: boolean;
}) {
  return (
    <g
      className={visible ? undefined : "replay-map-layer-hidden"}
      aria-hidden="true"
    >
      {geometry.sectorRanges.map(({ start, length }, index) => (
        <path
          key={index}
          d={geometry.path}
          pathLength={1000}
          fill="none"
          stroke={SECTOR_COLORS[index]}
          strokeWidth={geometry.ribbonWidth * 0.27}
          strokeLinecap="butt"
          strokeLinejoin="round"
          strokeDasharray={`${length} ${Math.max(0, 1000 - length)}`}
          strokeDashoffset={-start}
        />
      ))}
    </g>
  );
});

const ReplayDrsLayer = memo(function ReplayDrsLayer({
  geometry,
  visible,
}: {
  geometry: MapGeometry;
  visible: boolean;
}) {
  return (
    <g
      className={visible ? undefined : "replay-map-layer-hidden"}
      aria-hidden="true"
    >
      {geometry.drsPaths.map(({ path }, index) => (
        <path
          key={index}
          d={path}
          fill="none"
          stroke="#4CC23A"
          strokeWidth={Math.max(1.5, geometry.ribbonWidth * 0.22)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${1.5 * geometry.scale} ${3.5 * geometry.scale}`}
        />
      ))}
    </g>
  );
});

const ReplayTrack = memo(function ReplayTrack({
  track,
  frames,
  frameIndex,
  playing,
  frameRate,
  driverColors,
  overlays,
}: ReplayTrackProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const viewportRef =
    useRef<HTMLDivElement | null>(null);

  const sizeRef = useRef<Size>({
    width: 0,
    height: 0,
    dpr: 1,
  });
  const [viewportSize, setViewportSize] = useState({
    width: 0,
    height: 0,
  });




  const frameIndexRef =
    useRef(frameIndex);






  const points = useMemo(
    () => getTrackPoints(track),
    [track],
  );

  const driverColorByCode = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(driverColors).map((code) => [
          code,
          getDriverColor(driverColors, code),
        ]),
      ),
    [driverColors],
  );

  const bounds = useMemo(
    () => getBounds(track, points),
    [track, points],
  );











  useEffect(() => {
    frameIndexRef.current = frameIndex;
  }, [frameIndex]);






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
    setViewportSize({ width, height });

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
      transform: MapTransform,
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

  const mapGeometry = useMemo<MapGeometry | null>(() => {
    const transform = getTransform();

    if (!transform || points.length < 2 || !bounds) {
      return null;
    }

    const mappedPoints = points.map((point) =>
      transformPoint(point, transform),
    );
    const path = getPathString(mappedPoints);
    const cumulative = getCumulativeLengths(mappedPoints);
    const totalLength = cumulative[cumulative.length - 1];
    const normalizedLength = 1000;
    const segments = track.sector_segments;
    let boundaries: [number, number] | null = null;

    if (
      Array.isArray(segments) &&
      segments.length >= 2 &&
      segments[0]?.centerline?.length &&
      segments[1]?.centerline?.length
    ) {
      const firstEnd = segments[0].centerline.at(-1);
      const secondEnd = segments[1].centerline.at(-1);

      if (firstEnd && secondEnd) {
        const firstIndex = findNearestPointIndex(points, {
          x: firstEnd[0],
          y: firstEnd[1],
        });
        const secondIndex = findNearestPointIndex(points, {
          x: secondEnd[0],
          y: secondEnd[1],
        });

        boundaries = [
          cumulative[firstIndex] / Math.max(1, totalLength) * normalizedLength,
          cumulative[secondIndex] / Math.max(1, totalLength) * normalizedLength,
        ];
      }
    }



    const [firstBoundary, secondBoundary] = boundaries ?? [
      normalizedLength / 3,
      (normalizedLength * 2) / 3,
    ];
    const sectorRanges = [
      { start: 0, length: firstBoundary },
      { start: firstBoundary, length: Math.max(0, secondBoundary - firstBoundary) },
      { start: secondBoundary, length: Math.max(0, normalizedLength - secondBoundary) },
    ];
    const drawnTrackSize = Math.min(
      (bounds.maxX - bounds.minX) * transform.scale,
      (bounds.maxY - bounds.minY) * transform.scale,
    );
    const scaleFactor = drawnTrackSize / 350;
    const ribbonWidth = Math.max(8, 12 * scaleFactor);
    const centroid = mappedPoints.reduce(
      (sum, point) => ({
        x: sum.x + point.x / mappedPoints.length,
        y: sum.y + point.y / mappedPoints.length,
      }),
      { x: 0, y: 0 },
    );
    const drsZones = Array.isArray(track.drs_zones)
      ? track.drs_zones
      : [];
    const drsPaths = drsZones.flatMap((zone) => {
      if (!zone) {
        return [];
      }

      const start = toTrackPoint(zone.start);
      const end = toTrackPoint(zone.end);

      if (!start || !end) {
        return [];
      }

      const startIndex = findNearestPointIndex(points, start);
      const endIndex = findNearestPointIndex(points, end);
      const indices: number[] = [];
      let index = startIndex;

      while (indices.length < points.length) {
        indices.push(index);
        if (index === endIndex) break;
        index = (index + 1) % points.length;
      }

      if (indices.length < 2) {
        return [];
      }

      const offsetPoints = indices.map((pointIndex) => {
        const previous = mappedPoints[
          (pointIndex - 1 + mappedPoints.length) % mappedPoints.length
        ];
        const current = mappedPoints[pointIndex];
        const next = mappedPoints[(pointIndex + 1) % mappedPoints.length];
        const tangentX = next.x - previous.x;
        const tangentY = next.y - previous.y;
        const tangentLength = Math.max(1, Math.hypot(tangentX, tangentY));
        let normalX = -tangentY / tangentLength;
        let normalY = tangentX / tangentLength;
        const towardCenterX = centroid.x - current.x;
        const towardCenterY = centroid.y - current.y;

        if (normalX * towardCenterX + normalY * towardCenterY < 0) {
          normalX *= -1;
          normalY *= -1;
        }

        normalX *= DRS_OFFSET_SIDE;
        normalY *= DRS_OFFSET_SIDE;
        const offset = ribbonWidth / 2 + 6 * scaleFactor;
        return {
          x: current.x + normalX * offset,
          y: current.y + normalY * offset,
        };
      });

      return [{
        path: getPathString(offsetPoints),
      }];
    });

    return {
      path,
      scale: scaleFactor,
      ribbonWidth,
      sectorRanges,
      drsPaths,
    };
  }, [bounds, getTransform, points, track.drs_zones, track.sector_segments, transformPoint, viewportSize]);






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














      const driverCodes = Object.keys(frameA.drivers);
      ctx.font = "700 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

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

        const color = driverColorByCode[code] ?? "#ffffff";
        ctx.beginPath();
        ctx.arc(
          position.x,
          position.y,
          6,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(position.x, position.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();




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

        ctx.fillStyle =
          "#ffffff";

        ctx.fillText(
          code,
          labelX +
            labelWidth / 2,
          labelY +
            labelHeight / 2,
        );

      }
    },
    [
      bounds,
      driverColorByCode,
      frames,
      getTransform,
      points,
      transformPoint,
    ],
  );





  useEffect(() => {
    if (!frames.length) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!playing || reduceMotion || frameRate <= 0) {
      draw(frameIndex, false);
      return;
    }

    const startTime = performance.now();
    let animationId = 0;

    const animate = (now: number) => {
      const interpolatedFrame = Math.min(
        frames.length - 1,
        frameIndex + ((now - startTime) * frameRate) / 1000,
      );

      draw(interpolatedFrame, true);

      if (interpolatedFrame < frames.length - 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    draw,
    frameIndex,
    frameRate,
    playing,
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

        {mapGeometry && (
          <svg
            className="replay-track-map-svg"
            viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{
              width: `${viewportSize.width}px`,
              height: `${viewportSize.height}px`,
            }}
          >
            <path
              d={mapGeometry.path}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={mapGeometry.ribbonWidth + 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={mapGeometry.path}
              fill="none"
              stroke="#171b22"
              strokeWidth={mapGeometry.ribbonWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <ReplaySectorLayer
              geometry={mapGeometry}
              visible={overlays.sectors}
            />
            <ReplayDrsLayer
              geometry={mapGeometry}
              visible={overlays.drs}
            />
          </svg>
        )}

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
