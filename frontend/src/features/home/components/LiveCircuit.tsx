import React from "react";

import { CircuitTrack } from "../../schedule/CircuitTrack";
import { getCircuitSvgUrl } from "../../schedule/circuitAssets";

interface LiveCircuitProps {
  country?: string;
  eventName?: string;
}

export const LiveCircuit: React.FC<LiveCircuitProps> = ({ country, eventName }) => {
  const trackUrl = getCircuitSvgUrl(eventName || "", country);

  return (
    <div className="home-hero-circuit-live">
      <div className="dynamic-track-container">
        <CircuitTrack
          url={trackUrl}
          className="dynamic-track-svg"
          animate
          fallback={<span className="track-fallback-placeholder">TRACK DATA UNAVAILABLE</span>}
        />
      </div>
    </div>
  );
};