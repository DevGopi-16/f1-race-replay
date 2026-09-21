import React, { useState } from "react";

interface LiveCircuitProps {
  country?: string;
  eventName?: string;
}

export const LiveCircuit: React.FC<LiveCircuitProps> = ({ country, eventName }) => {
  const [hasError, setHasError] = useState(false);

  // Normalize name for asset lookup (e.g. "Azerbaijan" -> "azerbaijan")
  const trackSlug = (country || eventName || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  const trackImageUrl = `https://media.formula1.com/image/upload/v1677244985/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${trackSlug}_Circuit.png`;

  return (
    <div className="home-hero-circuit-live">
      {!hasError && trackSlug ? (
        <div className="dynamic-track-container">
          <img
            src={trackImageUrl}
            alt={`${country || eventName || "Circuit"} Layout`}
            className="dynamic-track-img"
            onError={() => setHasError(true)}
          />
        </div>
      ) : (
        <div className="track-fallback-placeholder" />
      )}
    </div>
  );
};