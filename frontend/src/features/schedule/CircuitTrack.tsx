import type { ReactNode } from "react";
import { useCircuitTrack } from "./useCircuitTrack";

interface CircuitTrackProps {
  url: string | null;
  className?: string;
  animate?: boolean;
  hoverOnly?: boolean;
  fallback?: ReactNode;
}

export function CircuitTrack({
  url,
  className,
  animate = false,
  hoverOnly = false,
  fallback,
}: CircuitTrackProps) {
  const { track } = useCircuitTrack(url);

  if (!track) {
    return fallback ? <div className={`circuit-track-empty ${className ?? ""}`}>{fallback}</div> : null;
  }

  const strokeWidth = Math.max(2, track.width * 0.006);
  const dotRadius = Math.max(4, track.width * 0.016);

  return (
    <svg
      className={className}
      viewBox={track.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <path
        d={track.path}
        className="circuit-track-outline"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {animate && (
        <>
          <circle
            r={dotRadius * 1.8}
            className={`circuit-track-dot-glow${hoverOnly ? " circuit-track-dot--hover" : ""}`}
          >
            <animateMotion
              dur="6s"
              repeatCount="indefinite"
              path={track.path}
              rotate="auto"
            />
          </circle>
          <circle
            r={dotRadius}
            className={`circuit-track-dot${hoverOnly ? " circuit-track-dot--hover" : ""}`}
          >

            <animateMotion
              dur="6s"
              repeatCount="indefinite"
              path={track.path}
              rotate="auto"
            />
          </circle>
        </>
      )}
    </svg>
  );
}