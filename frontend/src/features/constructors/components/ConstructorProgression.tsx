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

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  round: number;
  country: string;
  points: number;
  cumulativePoints: number;
}

function ConstructorProgression({
  history,
  teamColor,
}: ConstructorProgressionProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const wrapperRef =
    useRef<HTMLDivElement | null>(null);

  const [tooltip, setTooltip] =
    useState<TooltipState | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!canvas || !wrapper || history.length === 0) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const sortedHistory = [...history]
      .filter(
        (entry) =>
          typeof entry.round === "number" &&
          typeof entry.cumulative_points === "number",
      )
      .sort((a, b) => a.round - b.round);

    if (sortedHistory.length === 0) {
      return;
    }

    let animationFrame = 0;
    let startTime = 0;

    const draw = (
      progress: number,
    ) => {
      const rect =
        wrapper.getBoundingClientRect();

      const dpr =
        window.devicePixelRatio || 1;

      const width = Math.max(
        rect.width,
        320,
      );

      const height = 300;

      canvas.width =
        Math.round(width * dpr);

      canvas.height =
        Math.round(height * dpr);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0,
      );

      context.clearRect(
        0,
        0,
        width,
        height,
      );

      const padding = {
        top: 28,
        right: 22,
        bottom: 42,
        left: 52,
      };

      const chartWidth =
        width -
        padding.left -
        padding.right;

      const chartHeight =
        height -
        padding.top -
        padding.bottom;

      const maxPoints = Math.max(
        1,
        ...sortedHistory.map(
          (entry) =>
            entry.cumulative_points,
        ),
      );

      const yMax =
        Math.ceil(maxPoints / 50) * 50 ||
        50;

      const xFor = (index: number) => {
        if (sortedHistory.length === 1) {
          return (
            padding.left +
            chartWidth / 2
          );
        }

        return (
          padding.left +
          (index /
            (sortedHistory.length - 1)) *
            chartWidth
        );
      };

      const yFor = (points: number) =>
        padding.top +
        chartHeight -
        (points / yMax) *
          chartHeight;

      /*
       * Grid
       */
      const gridSteps = 4;

      context.save();

      context.font =
        "10px Inter, system-ui, sans-serif";

      context.textAlign = "right";
      context.textBaseline = "middle";

      for (
        let index = 0;
        index <= gridSteps;
        index += 1
      ) {
        const value =
          (yMax / gridSteps) * index;

        const y =
          yFor(value);

        context.beginPath();
        context.moveTo(
          padding.left,
          y,
        );
        context.lineTo(
          width - padding.right,
          y,
        );

        context.strokeStyle =
          "rgba(255,255,255,0.07)";

        context.lineWidth = 1;
        context.stroke();

        context.fillStyle =
          "rgba(255,255,255,0.42)";

        context.fillText(
          Math.round(value).toString(),
          padding.left - 10,
          y,
        );
      }

      /*
       * X axis labels
       */
      context.textAlign = "center";
      context.textBaseline = "top";

      sortedHistory.forEach(
        (entry, index) => {
          const shouldShow =
            sortedHistory.length <= 10 ||
            index === 0 ||
            index ===
              sortedHistory.length - 1 ||
            index %
              Math.ceil(
                sortedHistory.length / 7,
              ) ===
              0;

          if (!shouldShow) {
            return;
          }

          context.fillStyle =
            "rgba(255,255,255,0.42)";

          context.fillText(
            `R${entry.round}`,
            xFor(index),
            height - padding.bottom + 13,
          );
        },
      );

      /*
       * Chart title axis labels
       */
      context.fillStyle =
        "rgba(255,255,255,0.28)";

      context.font =
        "9px Inter, system-ui, sans-serif";

      context.textAlign = "left";

      context.fillText(
        "CUMULATIVE POINTS",
        padding.left,
        10,
      );

      /*
       * Visible line progress
       */
      const maxVisibleIndex =
        sortedHistory.length === 1
          ? 0
          : Math.min(
              sortedHistory.length - 1,
              Math.floor(
                progress *
                  (sortedHistory.length - 1),
              ),
            );

      const fractionalIndex =
        progress *
        Math.max(
          0,
          sortedHistory.length - 1,
        );

      /*
       * Area
       */
      if (sortedHistory.length > 0) {
        context.beginPath();

        for (
          let index = 0;
          index <= maxVisibleIndex;
          index += 1
        ) {
          const entry =
            sortedHistory[index];

          const x = xFor(index);
          const y = yFor(
            entry.cumulative_points,
          );

          if (index === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        }

        if (maxVisibleIndex >= 0) {
          const lastEntry =
            sortedHistory[
              maxVisibleIndex
            ];

          context.lineTo(
            xFor(maxVisibleIndex),
            padding.top +
              chartHeight,
          );

          context.lineTo(
            xFor(0),
            padding.top +
              chartHeight,
          );

          context.closePath();

          const gradient =
            context.createLinearGradient(
              0,
              padding.top,
              0,
              padding.top +
                chartHeight,
            );

          gradient.addColorStop(
            0,
            hexToRgba(teamColor, 0.22),
          );

          gradient.addColorStop(
            1,
            hexToRgba(teamColor, 0),
          );

          context.fillStyle = gradient;
          context.fill();
        }
      }

      /*
       * Main line
       */
      context.beginPath();

      sortedHistory.forEach(
        (entry, index) => {
          if (
            index >
            maxVisibleIndex
          ) {
            return;
          }

          const x = xFor(index);
          const y = yFor(
            entry.cumulative_points,
          );

          if (index === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        },
      );

      context.strokeStyle =
        teamColor || "#ff1e1e";

      context.lineWidth = 2.5;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.stroke();

      /*
       * Current-point interpolation
       */
      if (
        sortedHistory.length > 0 &&
        progress > 0
      ) {
        const leftIndex =
          Math.floor(fractionalIndex);

        const rightIndex =
          Math.min(
            sortedHistory.length - 1,
            leftIndex + 1,
          );

        const fraction =
          fractionalIndex -
          leftIndex;

        const left =
          sortedHistory[leftIndex];

        const right =
          sortedHistory[rightIndex];

        const interpolated =
          left.cumulative_points +
          (right.cumulative_points -
            left.cumulative_points) *
            fraction;

        const x =
          xFor(leftIndex) +
          (xFor(rightIndex) -
            xFor(leftIndex)) *
            fraction;

        const y =
          yFor(interpolated);

        context.beginPath();
        context.arc(
          x,
          y,
          5,
          0,
          Math.PI * 2,
        );

        context.fillStyle =
          teamColor || "#ff1e1e";

        context.fill();

        context.beginPath();
        context.arc(
          x,
          y,
          8,
          0,
          Math.PI * 2,
        );

        context.strokeStyle =
          hexToRgba(
            teamColor,
            0.28,
          );

        context.lineWidth = 2;
        context.stroke();
      }

      context.restore();
    };

    const animate = (
      timestamp: number,
    ) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed =
        timestamp - startTime;

      const duration = 850;

      const rawProgress = Math.min(
        1,
        elapsed / duration,
      );

      const eased =
        1 -
        Math.pow(
          1 - rawProgress,
          3,
        );

      draw(eased);

      if (rawProgress < 1) {
        animationFrame =
          requestAnimationFrame(
            animate,
          );
      }
    };

    draw(1);

    animationFrame =
      requestAnimationFrame(
        animate,
      );

    const resizeObserver =
      new ResizeObserver(() => {
        draw(1);
      });

    resizeObserver.observe(wrapper);

    return () => {
      cancelAnimationFrame(
        animationFrame,
      );

      resizeObserver.disconnect();
    };
  }, [history, teamColor]);

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const canvas = canvasRef.current;

    if (
      !canvas ||
      history.length === 0
    ) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const x =
      event.clientX - rect.left;

    const paddingLeft = 52;
    const paddingRight = 22;

    const chartWidth =
      rect.width -
      paddingLeft -
      paddingRight;

    if (
      x < paddingLeft ||
      x >
        rect.width - paddingRight
    ) {
      setTooltip(null);
      return;
    }

    const ratio =
      (x - paddingLeft) /
      chartWidth;

    const sortedHistory =
      [...history]
        .filter(
          (entry) =>
            typeof entry.round ===
              "number" &&
            typeof entry.cumulative_points ===
              "number",
        )
        .sort(
          (a, b) =>
            a.round - b.round,
        );

    const index = Math.round(
      ratio *
        Math.max(
          0,
          sortedHistory.length - 1,
        ),
    );

    const entry =
      sortedHistory[index];

    if (!entry) {
      setTooltip(null);
      return;
    }

    setTooltip({
      visible: true,
      x:
        Math.max(
          70,
          Math.min(
            rect.width - 70,
            x,
          ),
        ),
      y: 32,
      round: entry.round,
      country:
        entry.country || "",
      points: entry.points,
      cumulativePoints:
        entry.cumulative_points,
    });
  }

  function handlePointerLeave() {
    setTooltip(null);
  }

  if (history.length === 0) {
    return (
      <div className="constructor-progression-empty">
        <span>
          Championship progression
          unavailable.
        </span>
      </div>
    );
  }

  return (
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
            "--team-color":
              teamColor,
          } as CSSProperties}
        >
          <div className="constructor-progression-tooltip-round">
            R{tooltip.round}
            {tooltip.country
              ? ` · ${tooltip.country}`
              : ""}
          </div>

          <strong>
            {tooltip.cumulativePoints.toLocaleString(
              "en-US",
            )}{" "}
            PTS
          </strong>

          <small>
            +{tooltip.points} this round
          </small>
        </div>
      )}
    </div>
  );
}

function hexToRgba(
  color: string,
  alpha: number,
) {
  const normalized =
    color.replace("#", "");

  if (
    normalized.length !== 6 ||
    !/^[0-9a-fA-F]{6}$/.test(
      normalized,
    )
  ) {
    return `rgba(255,30,30,${alpha})`;
  }

  const red = parseInt(
    normalized.slice(0, 2),
    16,
  );

  const green = parseInt(
    normalized.slice(2, 4),
    16,
  );

  const blue = parseInt(
    normalized.slice(4, 6),
    16,
  );

  return `rgba(${red},${green},${blue},${alpha})`;
}

export default ConstructorProgression;