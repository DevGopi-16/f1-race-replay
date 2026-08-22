import type { ReactNode } from "react";

type ReplayRaceInfoProps = {
  frame: any;
  meta?: any;
};

function value(
  value: unknown,
  fallback: string,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
}

function Metric({
  label,
  value: metricValue,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="race-info-metric">
      <span>{label}</span>
      <strong>{metricValue}</strong>
    </div>
  );
}

export default function ReplayRaceInfo({
  frame,
  meta,
}: ReplayRaceInfoProps) {
  const lap = value(frame?.lap, "—");
  const speed = value(frame?.speed, "—");

  const trackTemp = value(
    meta?.track_temperature ??
      meta?.track_temp,
    "42°C",
  );

  const airTemp = value(
    meta?.air_temperature ??
      meta?.air_temp,
    "27°C",
  );

  const humidity = value(
    meta?.humidity,
    "61%",
  );

  const wind = value(
    meta?.wind_speed ??
      meta?.wind,
    "11 km/h",
  );

  const inPit = Boolean(frame?.in_pit);

  return (
    <section className="replay-race-info">

      <div className="race-info-column">
        <div className="race-info-title">
          WEATHER
        </div>

        <Metric
          label="TRACK"
          value={trackTemp}
        />

        <Metric
          label="AIR"
          value={airTemp}
        />

        <Metric
          label="HUMID"
          value={humidity}
        />

        <Metric
          label="WIND"
          value={wind}
        />
      </div>

      <div className="race-info-column">
        <div className="race-info-title">
          TRACK STATUS
        </div>

        <Metric
          label="STATUS"
          value={
            <span className="status-green">
              ● GREEN
            </span>
          }
        />

        <Metric
          label="SC"
          value="— NONE"
        />

        <Metric
          label="VSC"
          value="— OFF"
        />

        <Metric
          label="FLAGS"
          value={
            inPit
              ? "PIT"
              : "— NONE"
          }
        />
      </div>

      <div className="race-info-column">
        <div className="race-info-title">
          RACE INFO
        </div>

        <Metric
          label="LAP"
          value={lap}
        />

        <Metric
          label="TIME"
          value="—"
        />

        <Metric
          label="SPEED"
          value={`${speed} km/h`}
        />

        <Metric
          label="SECTOR"
          value="—"
        />
      </div>

    </section>
  );
}
