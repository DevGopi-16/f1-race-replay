import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { ConstructorHistory } from "../constructors.types";

interface ConstructorProgressionProps {
  history: ConstructorHistory[];
  teamColor: string;
}


type ChartMode = "cumulative" | "rollingAvg" | "position";
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  round: number;
  country: string;
  points: number;
  cumulativePoints: number;
  position: number;
  rollingAvg?: number;
}

const CHART_TABS: { id: ChartMode; label: string }[] = [
  { id: "cumulative", label: "Cumulative Points" },
  { id: "rollingAvg", label: "Rolling Avg (3 Rounds)" },
  { id: "position", label: "Position Trend" },
];

function ConstructorProgression({
  history,
  teamColor,
}: ConstructorProgressionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [chartMode, setChartMode] = useState<ChartMode>("cumulative");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const lastDrawRef = useRef<(() => void) | null>(null);

  const sortedHistory = [...history]
    .filter(
      (entry) =>
        typeof entry.round === "number" &&
        typeof entry.cumulative_points === "number",
    )
    .sort((a, b) => a.round - b.round);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!canvas || !wrapper || sortedHistory.length === 0) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let animationFrame = 0;
    let startTime = 0;

    const padding = {
      top: 28,
      right: 22,
      bottom: 42,
      left: 52,
    };

    const setupCanvas = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(rect.width, 320);
      const height = 300;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      return { width, height };
    };

    const xFor = (index: number, chartWidth: number) => {
      if (sortedHistory.length === 1) {
        return padding.left + chartWidth / 2;
      }

      return (
        padding.left +
        (index / (sortedHistory.length - 1)) * chartWidth
      );
    };

    const drawGrid = (
      width: number,
      chartWidth: number,
      chartHeight: number,
      yMax: number,
      yFor: (value: number) => number,
      formatLabel: (value: number) => string,
      gridSteps = 4,
    ) => {
      context.save();
      context.font = "10px Inter, system-ui, sans-serif";
      context.textAlign = "right";
      context.textBaseline = "middle";

      for (let index = 0; index <= gridSteps; index += 1) {
        const value = (yMax / gridSteps) * index;
        const y = yFor(value);

        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.strokeStyle = "rgba(255,255,255,0.07)";
        context.lineWidth = 1;
        context.stroke();

        context.fillStyle = "rgba(255,255,255,0.42)";
        context.fillText(formatLabel(value), padding.left - 10, y);
      }

      context.textAlign = "center";
      context.textBaseline = "top";

      sortedHistory.forEach((entry, index) => {
        const shouldShow =
          sortedHistory.length <= 10 ||
          index === 0 ||
          index === sortedHistory.length - 1 ||
          index % Math.ceil(sortedHistory.length / 7) === 0;

        if (!shouldShow) {
          return;
        }

        context.fillStyle = "rgba(255,255,255,0.42)";
        context.fillText(
          `R${entry.round}`,
          xFor(index, chartWidth),
          300 - padding.bottom + 13,
        );
      });

      context.restore();
    };

    const drawTitle = (label: string) => {
      context.fillStyle = "rgba(255,255,255,0.28)";
      context.font = "9px Inter, system-ui, sans-serif";
      context.textAlign = "left";
      context.fillText(label, padding.left, 10);
    };

    const drawLineChart = (
      progress: number,
      valueFor: (entry: ConstructorHistory) => number,
      label: string,
      invert = false,
    ) => {
      const { width, height } = setupCanvas();
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      const values = sortedHistory.map(valueFor);
      const rawMax = Math.max(1, ...values);
      const yMax = invert
        ? Math.max(1, ...values)
        : Math.ceil(rawMax / 50) * 50 || 50;

      const yFor = (value: number) => {
        if (invert) {
          return (
            padding.top +
            ((value - 1) / Math.max(1, yMax - 1)) * chartHeight
          );
        }

        return padding.top + chartHeight - (value / yMax) * chartHeight;
      };

      drawGrid(
        width,
        chartWidth,
        chartHeight,
        yMax,
        yFor,
        (value) =>
          invert
            ? `P${Math.max(1, Math.round(yMax - value + 1))}`
            : Math.round(value).toString(),
      );

      drawTitle(label);

      const maxVisibleIndex =
        sortedHistory.length === 1
          ? 0
          : Math.min(
              sortedHistory.length - 1,
              Math.floor(progress * (sortedHistory.length - 1)),
            );

      const fractionalIndex =
        progress * Math.max(0, sortedHistory.length - 1);

      if (!invert) {
        context.beginPath();

        for (let index = 0; index <= maxVisibleIndex; index += 1) {
          const x = xFor(index, chartWidth);
          const y = yFor(values[index]);

          if (index === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        }

        if (maxVisibleIndex >= 0) {
          context.lineTo(xFor(maxVisibleIndex, chartWidth), padding.top + chartHeight);
          context.lineTo(xFor(0, chartWidth), padding.top + chartHeight);
          context.closePath();

          const gradient = context.createLinearGradient(
            0,
            padding.top,
            0,
            padding.top + chartHeight,
          );

          gradient.addColorStop(0, hexToRgba(teamColor, 0.22));
          gradient.addColorStop(1, hexToRgba(teamColor, 0));

          context.fillStyle = gradient;
          context.fill();
        }
      }

      context.beginPath();

      sortedHistory.forEach((_, index) => {
        if (index > maxVisibleIndex) {
          return;
        }

        const x = xFor(index, chartWidth);
        const y = yFor(values[index]);

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });

      context.strokeStyle = teamColor || "#ff1e1e";
      context.lineWidth = 2.5;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.stroke();

      if (progress > 0) {
        const leftIndex = Math.floor(fractionalIndex);
        const rightIndex = Math.min(sortedHistory.length - 1, leftIndex + 1);
        const fraction = fractionalIndex - leftIndex;

        const interpolated =
          values[leftIndex] +
          (values[rightIndex] - values[leftIndex]) * fraction;

        const x =
          xFor(leftIndex, chartWidth) +
          (xFor(rightIndex, chartWidth) - xFor(leftIndex, chartWidth)) *
            fraction;

        const y = yFor(interpolated);

        context.beginPath();
        context.arc(x, y, 5, 0, Math.PI * 2);
        context.fillStyle = teamColor || "#ff1e1e";
        context.fill();

        context.beginPath();
        context.arc(x, y, 8, 0, Math.PI * 2);
        context.strokeStyle = hexToRgba(teamColor, 0.28);
        context.lineWidth = 2;
        context.stroke();
      }
    };

        const getRollingAverages = (windowSize = 3) => {
      return sortedHistory.map((_, index) => {
        const start = Math.max(0, index - windowSize + 1);
        const slice = sortedHistory.slice(start, index + 1);
        const sum = slice.reduce((total, entry) => total + entry.points, 0);
        return sum / slice.length;
      });
    };

    const drawRollingAvgChart = (progress: number) => {
      const { width, height } = setupCanvas();
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      const values = getRollingAverages(3);
      const rawMax = Math.max(1, ...values);
      const yMax = Math.ceil(rawMax / 10) * 10 || 10;

      const yFor = (value: number) =>
        padding.top + chartHeight - (value / yMax) * chartHeight;

      drawGrid(width, chartWidth, chartHeight, yMax, yFor, (value) =>
        value.toFixed(0),
      );

      drawTitle("ROLLING AVG POINTS (3 ROUNDS)");

      const maxVisibleIndex =
        sortedHistory.length === 1
          ? 0
          : Math.min(
              sortedHistory.length - 1,
              Math.floor(progress * (sortedHistory.length - 1)),
            );

      const fractionalIndex =
        progress * Math.max(0, sortedHistory.length - 1);

      context.beginPath();

      for (let index = 0; index <= maxVisibleIndex; index += 1) {
        const x = xFor(index, chartWidth);
        const y = yFor(values[index]);

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      if (maxVisibleIndex >= 0) {
        context.lineTo(xFor(maxVisibleIndex, chartWidth), padding.top + chartHeight);
        context.lineTo(xFor(0, chartWidth), padding.top + chartHeight);
        context.closePath();

        const gradient = context.createLinearGradient(
          0,
          padding.top,
          0,
          padding.top + chartHeight,
        );

        gradient.addColorStop(0, hexToRgba(teamColor, 0.22));
        gradient.addColorStop(1, hexToRgba(teamColor, 0));

        context.fillStyle = gradient;
        context.fill();
      }

      context.beginPath();

      sortedHistory.forEach((_, index) => {
        if (index > maxVisibleIndex) {
          return;
        }

        const x = xFor(index, chartWidth);
        const y = yFor(values[index]);

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });

      context.strokeStyle = teamColor || "#ff1e1e";
      context.lineWidth = 2.5;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.stroke();

      if (progress > 0) {
        const leftIndex = Math.floor(fractionalIndex);
        const rightIndex = Math.min(sortedHistory.length - 1, leftIndex + 1);
        const fraction = fractionalIndex - leftIndex;

        const interpolated =
          values[leftIndex] +
          (values[rightIndex] - values[leftIndex]) * fraction;

        const x =
          xFor(leftIndex, chartWidth) +
          (xFor(rightIndex, chartWidth) - xFor(leftIndex, chartWidth)) *
            fraction;

        const y = yFor(interpolated);

        context.beginPath();
        context.arc(x, y, 5, 0, Math.PI * 2);
        context.fillStyle = teamColor || "#ff1e1e";
        context.fill();

        context.beginPath();
        context.arc(x, y, 8, 0, Math.PI * 2);
        context.strokeStyle = hexToRgba(teamColor, 0.28);
        context.lineWidth = 2;
        context.stroke();
      }
    };
     const drawHoverGuides = (
      chartWidth: number,
      chartHeight: number,
      width: number,
    ) => {
      const index = hoverIndexRef.current;

      if (index == null || !sortedHistory[index]) {
        return;
      }

      const x = xFor(index, chartWidth);

      context.save();
      context.strokeStyle = "rgba(255,255,255,0.18)";
      context.lineWidth = 1;
      context.setLineDash([4, 4]);

      context.beginPath();
      context.moveTo(x, padding.top);
      context.lineTo(x, padding.top + chartHeight);
      context.stroke();

      context.setLineDash([]);
      context.restore();
    };

    const draw = (progress: number) => {
      if (chartMode === "cumulative") {
        drawLineChart(
          progress,
          (entry) => entry.cumulative_points,
          "CUMULATIVE POINTS",
        );
      } else if (chartMode === "rollingAvg") {
        drawRollingAvgChart(progress);
      } else {
        drawLineChart(
          progress,
          (entry) => entry.position,
          "CHAMPIONSHIP POSITION",
          true,
        );
      }



      const width = Math.max(wrapper.getBoundingClientRect().width, 320);
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = 300 - padding.top - padding.bottom;

      drawHoverGuides(chartWidth, chartHeight, width);
    };

    lastDrawRef.current = () => draw(1);

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const duration = 850;
      const rawProgress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - rawProgress, 3);

      draw(eased);

      if (rawProgress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    draw(1);
    animationFrame = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(() => {
      draw(1);
    });

    resizeObserver.observe(wrapper);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, teamColor, chartMode]);

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const canvas = canvasRef.current;

    if (!canvas || sortedHistory.length === 0) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;

    const paddingLeft = 52;
    const paddingRight = 22;
    const chartWidth = rect.width - paddingLeft - paddingRight;

    if (x < paddingLeft || x > rect.width - paddingRight) {
      setTooltip(null);
      hoverIndexRef.current = null;
      lastDrawRef.current?.();
      return;
    }

    const ratio = (x - paddingLeft) / chartWidth;

    const index = Math.round(
      ratio * Math.max(0, sortedHistory.length - 1),
    );

    const entry = sortedHistory[index];

    if (!entry) {
      setTooltip(null);
      hoverIndexRef.current = null;
      lastDrawRef.current?.();
      return;
    }

    hoverIndexRef.current = index;
    lastDrawRef.current?.();

    const windowSize = 3;
    const start = Math.max(0, index - windowSize + 1);
    const slice = sortedHistory.slice(start, index + 1);
    const rollingAvg =
      slice.reduce((total, item) => total + item.points, 0) / slice.length;

    setTooltip({
      visible: true,
      x: Math.max(70, Math.min(rect.width - 70, x)),
      y: 32,
      round: entry.round,
      country: entry.country || "",
      points: entry.points,
      cumulativePoints: entry.cumulative_points,
      position: entry.position,
      rollingAvg,
    });


  }

  function handlePointerLeave() {
    setTooltip(null);
    hoverIndexRef.current = null;
    lastDrawRef.current?.();
  }


  



  if (sortedHistory.length === 0) {
    return (
      <div className="constructor-progression-empty">
        <span>Championship progression unavailable.</span>
      </div>
    );
  }

  return (
    <div className="constructor-progression-wrap">
      <div className="constructor-progression-tabs">
        {CHART_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              chartMode === tab.id
                ? "constructor-progression-tab active"
                : "constructor-progression-tab"
            }
            onClick={() => setChartMode(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        ref={wrapperRef}
        className="constructor-progression"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <canvas ref={canvasRef} />

        {tooltip?.visible && (
          <div
            className="constructor-progression-tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              "--team-color": teamColor,
            } as CSSProperties}
          >
            <div className="constructor-progression-tooltip-round">
              R{tooltip.round}
              {tooltip.country ? ` · ${tooltip.country}` : ""}
            </div>

            {chartMode === "cumulative" && (
              <>
                <strong>
                  {tooltip.cumulativePoints.toLocaleString("en-US")} PTS
                </strong>
                <small>+{tooltip.points} this round</small>
              </>
            )}

            {chartMode === "rollingAvg" && (
              <>
                <strong>
                  {tooltip.rollingAvg?.toFixed(1) ?? "—"} AVG
                </strong>
                <small>{tooltip.points} pts this round</small>
              </>
            )}



            {chartMode === "position" && (
              <>
                <strong>P{tooltip.position}</strong>
                <small>{tooltip.points} pts this round</small>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function hexToRgba(color: string, alpha: number) {
  const normalized = color.replace("#", "");

  if (normalized.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(255,30,30,${alpha})`;
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
}

export default ConstructorProgression;