import { useEffect, useRef, useState } from "react";
import { getTeamColor } from "../constructors.colors";
import type { ConstructorTeam } from "../constructors.types";
import "./ConstructorPointsPerRound.css";

interface ConstructorPointsPerRoundProps {
  team: ConstructorTeam;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  round: number;
  points: number;
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");

  if (value.length !== 6) {
    return `rgba(225, 6, 0, ${alpha})`;
  }

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ConstructorPointsPerRound({
  team,
}: ConstructorPointsPerRoundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const [tooltip, setTooltip] =
    useState<TooltipState>({
      visible: false,
      x: 0,
      y: 0,
      round: 0,
      points: 0,
    });

  const history = team.history ?? [];

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = chartRef.current;

    if (!canvas || !container || history.length === 0) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let animationFrame = 0;
    let startTime = performance.now();

    const draw = (timestamp: number) => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(320, rect.width);
      const height = 300;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
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
        top: 22,
        right: 18,
        bottom: 42,
        left: 42,
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
        10,
        ...history.map((item) =>
          Math.max(0, item.points),
        ),
      );

      const progress = Math.min(
        1,
        (timestamp - startTime) / 700,
      );

      const eased =
        1 -
        Math.pow(
          1 - progress,
          3,
        );


      context.fillStyle =
        "rgba(255, 255, 255, 0.012)";

      context.fillRect(
        0,
        0,
        width,
        height,
      );


      const gridLines = 5;

      context.font =
        "9px Inter, system-ui, sans-serif";
      context.textAlign = "right";
      context.textBaseline = "middle";

      for (let i = 0; i <= gridLines; i += 1) {
        const ratio = i / gridLines;
        const y =
          padding.top +
          chartHeight -
          chartHeight * ratio;

        context.strokeStyle =
          "rgba(255, 255, 255, 0.055)";
        context.lineWidth = 1;

        context.beginPath();
        context.moveTo(
          padding.left,
          y,
        );
        context.lineTo(
          width - padding.right,
          y,
        );
        context.stroke();

        const value = Math.round(
          maxPoints * ratio,
        );

        context.fillStyle =
          "rgba(255, 255, 255, 0.28)";

        context.fillText(
          String(value),
          padding.left - 9,
          y,
        );
      }

      const count = history.length;
      const gap = Math.min(
        14,
        chartWidth / Math.max(count * 2, 1),
      );

      const barWidth = Math.max(
        8,
        (chartWidth -
          gap * Math.max(count - 1, 0)) /
          Math.max(count, 1),
      );

      history.forEach((item, index) => {
        const points = Math.max(
          0,
          item.points,
        );

        const targetHeight =
          (points / maxPoints) *
          chartHeight;

        const animatedHeight =
          targetHeight * eased;

        const x =
          padding.left +
          index *
            (barWidth + gap);

        const y =
          padding.top +
          chartHeight -
          animatedHeight;

        const radius = Math.min(
          5,
          barWidth / 2,
        );

        context.fillStyle =
          hexToRgba(
            getTeamColor(team),
            0.78,
          );

        context.beginPath();
        context.moveTo(
          x,
          y + radius,
        );
        context.quadraticCurveTo(
          x,
          y,
          x + radius,
          y,
        );
        context.lineTo(
          x +
            barWidth -
            radius,
          y,
        );
        context.quadraticCurveTo(
          x + barWidth,
          y,
          x + barWidth,
          y + radius,
        );
        context.lineTo(
          x + barWidth,
          padding.top +
            chartHeight,
        );
        context.lineTo(
          x,
          padding.top +
            chartHeight,
        );
        context.closePath();
        context.fill();

        if (
          progress >= 0.9 &&
          points > 0
        ) {
          context.fillStyle =
            "rgba(255, 255, 255, 0.72)";
          context.font =
            "700 8px Inter, system-ui, sans-serif";
          context.textAlign = "center";
          context.textBaseline = "bottom";

          context.fillText(
            Number.isInteger(points)
              ? String(points)
              : points.toFixed(1),
            x + barWidth / 2,
            y - 5,
          );
        }

        context.fillStyle =
          "rgba(255, 255, 255, 0.32)";
        context.font =
          "700 8px Inter, system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "top";

        context.fillText(
          `R${item.round}`,
          x + barWidth / 2,
          padding.top +
            chartHeight +
            12,
        );
      });

      if (progress < 1) {
        animationFrame =
          requestAnimationFrame(draw);
      }
    };

    animationFrame =
      requestAnimationFrame(draw);

    const resizeObserver =
      new ResizeObserver(() => {
        startTime = performance.now();

        cancelAnimationFrame(
          animationFrame,
        );

        animationFrame =
          requestAnimationFrame(draw);
      });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(
        animationFrame,
      );

      resizeObserver.disconnect();
    };
  }, [history, getTeamColor(team)]);

  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const container = chartRef.current;

    if (
      !container ||
      history.length === 0
    ) {
      return;
    }

    const rect =
      container.getBoundingClientRect();

    const paddingLeft = 42;
    const paddingRight = 18;
    const usableWidth =
      rect.width -
      paddingLeft -
      paddingRight;

    const relativeX =
      event.clientX -
      rect.left -
      paddingLeft;

    if (
      relativeX < 0 ||
      relativeX > usableWidth
    ) {
      setTooltip((current) => ({
        ...current,
        visible: false,
      }));

      return;
    }

    const index = Math.round(
      (relativeX / usableWidth) *
        (history.length - 1),
    );

    const item =
      history[
        Math.max(
          0,
          Math.min(
            history.length - 1,
            index,
          ),
        )
      ];

    if (!item) {
      return;
    }

    setTooltip({
      visible: true,
      x:
        event.clientX -
        rect.left,
      y:
        event.clientY -
        rect.top -
        12,
      round: item.round,
      points: item.points,
    });
  }

  function hideTooltip() {
    setTooltip((current) => ({
      ...current,
      visible: false,
    }));
  }

  return (
    <section className="constructor-profile-card constructor-points-round">
      <div className="constructor-card-heading">
        <div>
          <span>
            06 / POINTS DISTRIBUTION
          </span>

          <h2>Points per round</h2>
        </div>

        <span className="constructor-points-round-total">
          {history.length} ROUNDS
        </span>
      </div>

      {history.length === 0 ? (
        <div className="constructor-points-round-empty">
          <p>
            No round-by-round points data is
            available yet.
          </p>
        </div>
      ) : (
        <div
          className="constructor-points-round-chart"
          ref={chartRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={hideTooltip}
        >
          <canvas ref={canvasRef} />

          {tooltip.visible && (
            <div
              className="constructor-points-round-tooltip"
              style={{
                left: tooltip.x,
                top: tooltip.y,
              }}
            >
              <span>
                ROUND {tooltip.round}
              </span>

              <strong>
                {Number.isInteger(
                  tooltip.points,
                )
                  ? tooltip.points
                  : tooltip.points.toFixed(1)}
                <small> PTS</small>
              </strong>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ConstructorPointsPerRound;
