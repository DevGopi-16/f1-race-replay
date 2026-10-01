import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
} from "lucide-react";

import { getSchedule } from "../schedule/schedule.api";
import {
  getDriverStints,
  getLapTelemetry,
  getSessionDrivers,
  type SessionDriver,
  type Stint,
  type TelemetryLap,
  type TelemetryPoint,
} from "./telemetry.api";
import "./telemetry.css";

type Tab =
  | "overview"
  | "speed"
  | "throttle"
  | "brake"
  | "gear"
  | "tyres"
  | "ers"
  | "fuel";
type Metric = "speed" | "throttle" | "brake" | "gear";

interface SessionRoute {
  year: number;
  round: number;
  sessionType: string;
}

interface DriverTelemetryState {
  data?: TelemetryLap;
  error?: string;
}

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "speed", label: "Speed" },
  { id: "throttle", label: "Throttle" },
  { id: "brake", label: "Brake" },
  { id: "gear", label: "Gear" },
  { id: "tyres", label: "Tyres" },
  { id: "ers", label: "ERS" },
  { id: "fuel", label: "Fuel" },
];

function parseSessionKey(sessionKey: string): SessionRoute | null {
  const match = /^(\d{4})-(\d+)-(R|S|Q|SQ|FP1|FP2|FP3)$/i.exec(sessionKey);
  if (!match) return null;
  return {
    year: Number(match[1]),
    round: Number(match[2]),
    sessionType: match[3].toUpperCase(),
  };
}

function formatLapTime(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const minutes = Math.floor(value / 60);
  return `${minutes}:${(value - minutes * 60).toFixed(3).padStart(6, "0")}`;
}

function getDriverColor(driver: SessionDriver | undefined): string {
  return driver?.color || "currentColor";
}

function metricValue(value: number | undefined, metric: Metric): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (metric === "speed") return `${Math.round(value)} km/h`;
  if (metric === "gear") return `Gear ${Math.round(value)}`;
  return `${Math.round(value)}%`;
}

function getLapInsights(points: TelemetryPoint[]) {
  const speeds = points.flatMap((point) =>
    typeof point.speed === "number" && Number.isFinite(point.speed)
      ? [point.speed]
      : [],
  );
  const throttle = points.flatMap((point) =>
    typeof point.throttle === "number" && Number.isFinite(point.throttle)
      ? [point.throttle]
      : [],
  );
  const brake = points.flatMap((point) =>
    typeof point.brake === "number" && Number.isFinite(point.brake)
      ? [point.brake]
      : [],
  );

  return {
    peakSpeed: speeds.length ? Math.max(...speeds) : null,
    averageSpeed: speeds.length
      ? speeds.reduce((total, speed) => total + speed, 0) / speeds.length
      : null,
    fullThrottle: throttle.length
      ? (throttle.filter((value) => value >= 98).length / throttle.length) * 100
      : null,
    braking: brake.length
      ? (brake.filter((value) => value > 10).length / brake.length) * 100
      : null,
  };
}

function TelemetryChart({
  points,
  metric,
  color,
  label,
  comparison,
}: {
  points: TelemetryPoint[];
  metric: Metric;
  color: string;
  label: string;
  comparison?: { points: TelemetryPoint[]; color: string; label: string };
}) {
  const chartId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [hoverDistance, setHoverDistance] = useState<number | null>(null);
  const width = 920;
  const height = 270;
  const pad = { x: 46, y: 18, bottom: 30 };
  const plotRight = width - 8;
  const baseline = height - pad.bottom;
  const values = [...points, ...(comparison?.points ?? [])]
    .map((point) => point[metric])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const dataMax = Math.max(...values, 0);
  const max = metric === "throttle" || metric === "brake"
    ? 100
    : metric === "gear"
      ? Math.max(1, Math.ceil(dataMax))
      : Math.max(1, Math.ceil(dataMax / 50) * 50);
  const distanceMax = Math.max(
    ...points.map((point) => point.distance),
    ...(comparison?.points.map((point) => point.distance) ?? []),
    1,
  );
  const coordinates = (items: TelemetryPoint[]) =>
    items.reduce<Array<{ x: number; y: number; distance: number; value: number }>>((result, point) => {
      const value = point[metric];
      if (typeof value !== "number" || !Number.isFinite(value)) return result;
      const x = pad.x + (point.distance / distanceMax) * (plotRight - pad.x);
      const y = baseline - (value / max) * (baseline - pad.y);
      result.push({ x, y, distance: point.distance, value });
      return result;
    }, []);
  const primaryCoordinates = useMemo(
    () => coordinates(points),
    [points, metric, distanceMax, max],
  );
  const comparisonCoordinates = useMemo(
    () => coordinates(comparison?.points ?? []),
    [comparison?.points, metric, distanceMax, max],
  );
  const tracePath = (items: typeof primaryCoordinates) =>
    items.map(({ x, y }, index) =>
      `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`,
    ).join(" ");
  const areaPath = (items: typeof primaryCoordinates) => {
    if (items.length < 2) return "";
    const first = items[0];
    const last = items.at(-1)!;
    return `${tracePath(items)} L ${last.x.toFixed(1)} ${baseline} L ${first.x.toFixed(1)} ${baseline} Z`;
  };
  const nearest = (items: typeof primaryCoordinates) => {
    if (hoverDistance == null || !items.length) return undefined;
    return items.reduce((best, item) =>
      Math.abs(item.distance / distanceMax - hoverDistance)
        < Math.abs(best.distance / distanceMax - hoverDistance)
        ? item
        : best,
    );
  };
  const hoverPrimary = nearest(primaryCoordinates);
  const hoverComparison = nearest(comparisonCoordinates);
  const hoverX = hoverDistance == null
    ? null
    : pad.x + hoverDistance * (plotRight - pad.x);
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const viewX = ((event.clientX - rect.left) / rect.width) * width;
    setHoverDistance(Math.max(0, Math.min(
      1,
      (viewX - pad.x) / (plotRight - pad.x),
    )));
  };

  return (
    <div className="telemetry-chart-wrap">
      {points.length ? (
        <>
          <div className="telemetry-chart-legend" aria-label="Team color key">
            <span>
              <i style={{ "--team-color": color } as React.CSSProperties} />
              {label}
            </span>
            {comparison && (
              <span>
                <i className="is-comparison" style={{ "--team-color": comparison.color } as React.CSSProperties} />
                {comparison.label}
              </span>
            )}
          </div>
          <svg
            className="telemetry-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${metric} by lap distance`}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHoverDistance(null)}
          >
          <defs>
            <linearGradient id={`${chartId}-primary`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.24" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            {comparison && (
              <linearGradient id={`${chartId}-comparison`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={comparison.color} stopOpacity="0.12" />
                <stop offset="100%" stopColor={comparison.color} stopOpacity="0" />
              </linearGradient>
            )}
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const y = baseline - step * (baseline - pad.y);
            return (
              <g key={step}>
                <line
                  x1={pad.x}
                  x2={width - 8}
                  y1={y}
                  y2={y}
                  className="telemetry-grid-line"
                />
                <text x={4} y={y + 4}>{Math.round(max * step)}</text>
              </g>
            );
          })}
          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const x = pad.x + step * (plotRight - pad.x);
            return (
              <g key={step}>
                <line
                  x1={x}
                  x2={x}
                  y1={pad.y}
                  y2={baseline}
                  className="telemetry-distance-line"
                />
                <text x={x} y={height - 8} textAnchor={step === 0 ? "start" : step === 1 ? "end" : "middle"}>
                  {Math.round(step * 100)}%
                </text>
              </g>
            );
          })}
          {comparison && (
            <path
              d={areaPath(comparisonCoordinates)}
              fill={`url(#${chartId}-comparison)`}
              className="telemetry-data-area"
            />
          )}
          {comparison && (
            <path
              pathLength={1}
              d={tracePath(comparisonCoordinates)}
              style={{ stroke: comparison.color }}
              className="telemetry-data-line telemetry-data-line-muted telemetry-trace-draw is-comparison"
            />
          )}
          <path
            d={areaPath(primaryCoordinates)}
            fill={`url(#${chartId}-primary)`}
            className="telemetry-data-area"
          />
          <path
            pathLength={1}
            d={tracePath(primaryCoordinates)}
            style={{ stroke: color }}
            className="telemetry-data-line telemetry-trace-draw"
          />
          {hoverX != null && (
            <g
              className="telemetry-hover-indicator"
              transform={`translate(${hoverX}, 0)`}
            >
              <line x1="0" x2="0" y1={pad.y} y2={baseline} />
              {hoverPrimary && (
                <circle cx={hoverPrimary.x - hoverX} cy={hoverPrimary.y} r="5" style={{ fill: color }} />
              )}
              {hoverComparison && comparison && (
                <circle cx={hoverComparison.x - hoverX} cy={hoverComparison.y} r="5" style={{ fill: comparison.color }} />
              )}
            </g>
          )}
          </svg>
          {hoverDistance != null && (
            <div
              className="telemetry-chart-tooltip"
              style={{ left: `${Math.max(8, Math.min(92, hoverDistance * 100))}%` }}
              aria-live="polite"
            >
              <strong>{Math.round(hoverDistance * 100)}% distance</strong>
              {hoverPrimary && (
                <span>
                  <i style={{ backgroundColor: color }} />
                  {label} <b>{metricValue(hoverPrimary.value, metric)}</b>
                </span>
              )}
              {comparison && hoverComparison && (
                <span>
                  <i style={{ backgroundColor: comparison.color }} />
                  {comparison.label} <b>{metricValue(hoverComparison.value, metric)}</b>
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="telemetry-chart-empty">No telemetry points for this lap.</div>
      )}
    </div>
  );
}

export default function TelemetryPage() {
  const { sessionKey = "" } = useParams();
  const [params] = useSearchParams();
  const route = useMemo(() => parseSessionKey(sessionKey), [sessionKey]);
  const queryYearParam = params.get("year");
  const queryYear = queryYearParam === null ? null : Number(queryYearParam);
  const grandPrix = params.get("grandPrix")?.trim() ?? "";
  const sessionType = route?.sessionType ?? params.get("sessionType")?.toUpperCase() ?? "";
  const chartRef = useRef<HTMLDivElement>(null);

  const [eventName, setEventName] = useState(grandPrix);
  const [drivers, setDrivers] = useState<SessionDriver[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [driverA, setDriverA] = useState("");
  const [driverB, setDriverB] = useState("");
  const [lap, setLap] = useState(1);
  const [tab, setTab] = useState<Tab>("overview");
  const [telemetry, setTelemetry] = useState<Record<string, DriverTelemetryState>>({});
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [stints, setStints] = useState<Record<string, Stint[]>>({});
  const [stintsLoading, setStintsLoading] = useState(false);
  const [stintsError, setStintsError] = useState("");

  useEffect(() => {
    if (!route || (queryYear !== null && (!Number.isFinite(queryYear) || queryYear !== route.year))) {
      setDrivers([]);
      setDriversLoading(false);
      setPageError("This telemetry link has invalid or inconsistent session details.");
      return;
    }

    let active = true;
    setEventName(grandPrix);
    setDriversLoading(true);
    setPageError("");
    setCalendarError("");
    setDrivers([]);
    setTelemetry({});
    setStints({});
    setLap(1);

    getSessionDrivers(route.year, route.round, route.sessionType)
      .then((items) => {
        if (!active) return;
        setDrivers(items);
        if (!items.length) {
          setPageError("No driver roster is available for this session.");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPageError(
            error instanceof Error ? error.message : "Could not load this session's drivers.",
          );
        }
      })
      .finally(() => {
        if (active) setDriversLoading(false);
      });

    getSchedule(route.year)
      .then((weekends) => {
        if (!active) return;
        const weekend = weekends.find((item) => item.round_number === route.round);
        if (weekend) setEventName(weekend.event_name);
      })
      .catch((error: unknown) => {
        if (active) {
          setCalendarError(
            error instanceof Error ? error.message : "The event name could not be loaded.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [grandPrix, route, queryYear]);

  useEffect(() => {
    if (!drivers.length) {
      setDriverA("");
      setDriverB("");
      return;
    }
    const codes = drivers.map((driver) => driver.code);
    setDriverA((current) => codes.includes(current) ? current : codes[0]);
    setDriverB((current) => codes.includes(current)
      ? current
      : codes[1] ?? codes[0]);
  }, [drivers]);

  const selectedDrivers = useMemo(
    () => [drivers.find((driver) => driver.code === driverA),
      drivers.find((driver) => driver.code === driverB)],
    [drivers, driverA, driverB],
  );
  const uniqueCodes = useMemo(
    () => [...new Set([driverA, driverB].filter(Boolean))],
    [driverA, driverB],
  );

  useEffect(() => {
    if (!route || !uniqueCodes.length) {
      setTelemetry({});
      setTelemetryLoading(false);
      return;
    }
    let active = true;
    setTelemetryLoading(true);
    setTelemetry({});

    Promise.all(uniqueCodes.map(async (code) => {
      try {
        const data = await getLapTelemetry(sessionKey, code, lap);
        return [code, { data }] as const;
      } catch (error) {
        return [code, {
          error: error instanceof Error ? error.message : "Telemetry unavailable for this lap.",
        }] as const;
      }
    }))
      .then((results) => {
        if (active) setTelemetry(Object.fromEntries(results));
      })
      .finally(() => {
        if (active) setTelemetryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lap, route, sessionKey, uniqueCodes]);

  useEffect(() => {
    if (!route || !uniqueCodes.length) {
      setStints({});
      setStintsLoading(false);
      return;
    }
    let active = true;
    setStintsLoading(true);
    setStintsError("");
    setStints({});

    Promise.all(uniqueCodes.map(async (code) => {
      try {
        return [code, await getDriverStints(sessionKey, code)] as const;
      } catch (error) {
        return [code, error instanceof Error ? error.message : "Stint data unavailable."] as const;
      }
    }))
      .then((results) => {
        if (!active) return;
        const loadedStints: Record<string, Stint[]> = {};
        const errors: string[] = [];
        for (const [code, result] of results) {
          if (typeof result === "string") errors.push(`${code}: ${result}`);
          else loadedStints[code] = result;
        }
        setStints(loadedStints);
        setStintsError(errors.join(" "));
        setStintsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [route, sessionKey, uniqueCodes]);

  const lapCount = useMemo(
    () => Math.max(
      0,
      ...Object.values(stints).flat().map((stint) => stint.lap_end ?? 0),
      ...Object.values(telemetry).map((result) => result.data?.total_laps ?? 0),
    ),
    [stints, telemetry],
  );
  const lapNumbers = useMemo(
    () => Array.from({ length: lapCount }, (_, index) => index + 1),
    [lapCount],
  );
  const dataA = telemetry[driverA]?.data;
  const dataB = telemetry[driverB]?.data;
  const stintForLap = (code: string) =>
    stints[code]?.find((stint) =>
      lap >= (stint.lap_start ?? 1) && lap <= (stint.lap_end ?? lap),
    );
  const colorA = getDriverColor(selectedDrivers[0]);
  const colorB = getDriverColor(selectedDrivers[1]);
  const metric: Metric = tab === "overview" ? "speed" : tab === "throttle" || tab === "brake" || tab === "gear"
    ? tab
    : "speed";
  const bestLap = [dataA?.lap_time, dataB?.lap_time]
    .filter((time): time is number => time != null && Number.isFinite(time))
    .reduce<number | null>((best, time) => best == null || time < best ? time : best, null);
  const insightA = useMemo(
    () => getLapInsights(dataA?.points ?? []),
    [dataA],
  );
  const insightB = useMemo(
    () => getLapInsights(dataB?.points ?? []),
    [dataB],
  );
  const unavailable = tab === "ers" || tab === "fuel";

  function updateDriverA(code: string) {
    setDriverA(code);
    if (code === driverB) {
      setDriverB(drivers.find((driver) => driver.code !== code)?.code ?? code);
    }
  }

  function updateDriverB(code: string) {
    setDriverB(code);
    if (code === driverA) {
      setDriverA(drivers.find((driver) => driver.code !== code)?.code ?? code);
    }
  }

  function exportCsv() {
    const rows = [
      ["driver", "distance", "speed", "throttle", "brake", "gear", "rpm"],
      ...uniqueCodes.flatMap((code) =>
        (telemetry[code]?.data?.points ?? []).map((point) => [
          code,
          point.distance,
          point.speed ?? "",
          point.throttle ?? "",
          point.brake ?? "",
          point.gear ?? "",
          point.rpm ?? "",
        ]),
      ),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sessionKey}-lap-${lap}-telemetry.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!route) {
    return (
      <main className="telemetry-page">
        <section className="telemetry-unavailable">
          <span>INVALID SESSION</span>
          <h2>Telemetry session not found</h2>
          <p>The URL must include a valid year, round, and session type.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="telemetry-page">
      <header className="telemetry-header">
        <div>
          <span className="telemetry-kicker">RACE CONTROL / DATA ROOM</span>
          <h1>TELEMETRY</h1>
          <p>{eventName || `${route.year} · Round ${route.round}`} <b>·</b> {sessionType} · LAP {lap}</p>
        </div>
        <div className="telemetry-driver-selectors">
          <label>
            DRIVER A
            <span className="telemetry-driver-team">
              <i style={{ backgroundColor: getDriverColor(selectedDrivers[0]) }} />
              {selectedDrivers[0]?.team || "Team unavailable"}
            </span>
            <select value={driverA} onChange={(event) => updateDriverA(event.target.value)} disabled={driversLoading}>
              {drivers.map((driver) => (
                <option key={driver.code} value={driver.code}>
                  {driver.code} · {driver.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            DRIVER B
            <span className="telemetry-driver-team">
              <i style={{ backgroundColor: getDriverColor(selectedDrivers[1]) }} />
              {selectedDrivers[1]?.team || "Team unavailable"}
            </span>
            <select value={driverB} onChange={(event) => updateDriverB(event.target.value)} disabled={driversLoading}>
              {drivers.map((driver) => (
                <option key={driver.code} value={driver.code}>
                  {driver.code} · {driver.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="telemetry-icon-button"
            aria-label="Swap selected drivers"
            onClick={() => {
              setDriverA(driverB);
              setDriverB(driverA);
            }}
            disabled={!driverA || !driverB}
          >
            <ArrowLeftRight size={18} />
          </button>
        </div>
      </header>

      <nav className="telemetry-tabs" aria-label="Telemetry views">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${tab === item.id ? "is-active" : ""} ${item.id === "ers" || item.id === "fuel" ? "is-muted" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {pageError && <div className="telemetry-error" role="alert">{pageError}</div>}
      {driversLoading && <div className="telemetry-loading">Loading session drivers…</div>}
      {calendarError && <div className="telemetry-error" role="status">{calendarError}</div>}

      {!driversLoading && !pageError && unavailable && (
        <section className="telemetry-unavailable">
          <span>NO DATA SOURCE</span>
          <h2>{tab.toUpperCase()} unavailable</h2>
          <p>This session does not provide {tab.toUpperCase()} telemetry.</p>
        </section>
      )}

      {!driversLoading && !pageError && !unavailable && tab === "tyres" && (
        <>
          {stintsError && <div className="telemetry-error" role="status">{stintsError}</div>}
          <section className="telemetry-tyres">
            {selectedDrivers.map((driver) => {
              if (!driver) return null;
              const driverStints = stints[driver.code] ?? [];
              const current = stintForLap(driver.code);
              return (
                <article
                  key={driver.code}
                  className="telemetry-card tyre-card"
                  style={{ "--driver-color": getDriverColor(driver) } as React.CSSProperties}
                >
                  <span className="telemetry-label">{driver.name} · {driver.code}</span>
                  <strong>{current?.compound ?? "—"}</strong>
                  <p>
                    {current
                      ? `STINT ${current.stint_number} · TYRE AGE ${current.tyre_age_at_start ?? "—"} LAPS`
                      : "No tyre stint recorded for this lap."}
                  </p>
                  <div className="tyre-timeline" aria-label={`${driver.code} tyre stint timeline`}>
                    {driverStints.map((stint) => {
                      const start = stint.lap_start ?? 1;
                      const end = stint.lap_end ?? start;
                      const width = lapCount ? ((end - start + 1) / lapCount) * 100 : 0;
                      return (
                        <i
                          key={stint.stint_number}
                          className={`compound-${stint.compound.toLowerCase()}`}
                          style={{ width: `${width}%` }}
                          title={`Stint ${stint.stint_number}: laps ${start}–${end}`}
                        />
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}

      {!driversLoading && !pageError && !unavailable && tab !== "tyres" && (
        <>
        <section className="telemetry-grid">
          <aside className="telemetry-card telemetry-lap-info">
            <span className="telemetry-label">LAP INFO</span>
            <strong>
              LAP {lap} <small>/ {lapCount || "—"}</small>
            </strong>
            {selectedDrivers.map((driver) => {
              if (!driver) return null;
              return (
                <div className="lap-driver-row" key={driver.code}>
                  <span className="telemetry-driver-name" style={{ color: getDriverColor(driver) }}>
                    <i style={{ backgroundColor: getDriverColor(driver) }} />
                    {driver.code}
                  </span>
                  <b>{formatLapTime(telemetry[driver.code]?.data?.lap_time)}</b>
                </div>
              );
            })}
            <dl>
              <dt>STINT</dt>
              <dd>{selectedDrivers.map((driver) =>
                driver ? stintForLap(driver.code)?.stint_number ?? "—" : "—",
              ).join(" / ")}</dd>
              <dt>COMPOUND</dt>
              <dd>{selectedDrivers.map((driver) =>
                driver ? stintForLap(driver.code)?.compound ?? telemetry[driver.code]?.data?.compound ?? "—" : "—",
              ).join(" / ")}</dd>
            </dl>
          </aside>

          <div className="telemetry-card telemetry-main-chart">
            <div className="telemetry-card-heading">
              <div>
                <span className="telemetry-label">{tab === "overview" ? "SPEED + THROTTLE" : tab.toUpperCase()}</span>
                <h2>{metric.toUpperCase()} <small>BY DISTANCE</small></h2>
              </div>
              <button
                type="button"
                className="telemetry-icon-button"
                onClick={() => chartRef.current?.requestFullscreen()}
                aria-label="Full screen chart"
              >
                <Maximize2 size={17} />
              </button>
            </div>

            <div ref={chartRef}>
              {telemetryLoading && <div className="telemetry-chart-empty">Loading lap telemetry…</div>}
              {!telemetryLoading && !dataA && (
                <div className="telemetry-chart-empty">
                  {telemetry[driverA]?.error ?? "No telemetry is available for the selected lap."}
                </div>
              )}
              {!telemetryLoading && dataA && (
                <TelemetryChart
                  key={`${lap}-${metric}-${driverA}-${driverB}`}
                  points={dataA.points}
                  label={selectedDrivers[0]?.code ?? driverA}
                  comparison={dataB ? {
                    points: dataB.points,
                    color: colorB,
                    label: selectedDrivers[1]?.code ?? driverB,
                  } : undefined}
                  metric={metric}
                  color={colorA}
                />
              )}
            </div>

            {tab === "overview" && dataA && (
              <div className="telemetry-secondary-chart">
                <span className="telemetry-label">THROTTLE COMPARISON</span>
                <TelemetryChart
                  key={`${lap}-throttle-${driverA}-${driverB}`}
                  points={dataA.points}
                  label={selectedDrivers[0]?.code ?? driverA}
                  comparison={dataB ? {
                    points: dataB.points,
                    color: colorB,
                    label: selectedDrivers[1]?.code ?? driverB,
                  } : undefined}
                  metric="throttle"
                  color={colorA}
                />
              </div>
            )}
            {dataA && !dataB && telemetry[driverB]?.error && (
              <div className="telemetry-error" role="status">
                {driverB}: {telemetry[driverB].error}
              </div>
            )}
          </div>

          <aside className="telemetry-card telemetry-sectors">
            <span className="telemetry-label">SECTOR TIMES</span>
            <div className="telemetry-sector-legend">
              <span />
              {selectedDrivers.map((driver) => (
                <span key={driver?.code ?? "empty"} style={{ color: getDriverColor(driver) }}>
                  {driver?.code ?? "—"}
                </span>
              ))}
            </div>
            {[0, 1, 2].map((index) => (
              <div className="sector-row" key={index}>
                <span>S{index + 1}</span>
                <b style={{ color: colorA }}>{formatLapTime(dataA?.sector_times[index])}</b>
                <b style={{ color: colorB }}>{formatLapTime(dataB?.sector_times[index])}</b>
              </div>
            ))}
            <div className="sector-best">
              <span>BEST LAP</span>
              <strong>{formatLapTime(bestLap)}</strong>
            </div>
          </aside>
        </section>
        {(dataA || dataB) && (
          <section className="telemetry-insights" aria-label="Lap telemetry insights">
            {([
              ["Peak speed", insightA.peakSpeed, insightB.peakSpeed, "km/h"],
              ["Average speed", insightA.averageSpeed, insightB.averageSpeed, "km/h"],
              ["Full throttle", insightA.fullThrottle, insightB.fullThrottle, "%"],
              ["Braking", insightA.braking, insightB.braking, "%"],
            ] as const).map(([title, valueA, valueB, unit]) => (
              <article className="telemetry-card telemetry-insight" key={title}>
                <span className="telemetry-label">{title}</span>
                <div>
                  <span style={{ color: colorA }}>
                    <i style={{ backgroundColor: colorA }} />
                    {selectedDrivers[0]?.code ?? driverA}
                    <b>{valueA == null ? "—" : `${Math.round(valueA)} ${unit}`}</b>
                  </span>
                  <span style={{ color: colorB }}>
                    <i style={{ backgroundColor: colorB }} />
                    {selectedDrivers[1]?.code ?? driverB}
                    <b>{valueB == null ? "—" : `${Math.round(valueB)} ${unit}`}</b>
                  </span>
                </div>
              </article>
            ))}
          </section>
        )}
        </>
      )}

      {!driversLoading && !pageError && drivers.length > 0 && (
        <footer className="telemetry-footer">
          <button
            type="button"
            aria-label="Previous lap"
            disabled={lap <= 1}
            onClick={() => setLap((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <div aria-label="Choose lap">
            {lapNumbers.length
              ? lapNumbers.map((number) => (
                  <button
                    key={number}
                    type="button"
                    className={number === lap ? "is-current" : ""}
                    aria-pressed={number === lap}
                    style={number === lap
                      ? { backgroundColor: colorA, borderColor: colorA }
                      : undefined}
                    onClick={() => setLap(number)}
                  >
                    {number}
                  </button>
                ))
              : <span className="telemetry-footer-note">{stintsError || (stintsLoading ? "Loading available laps…" : "No lap data available.")}</span>}
          </div>
          <button
            type="button"
            aria-label="Next lap"
            disabled={lapCount === 0 || lap >= lapCount}
            onClick={() => setLap((value) => Math.min(lapCount, value + 1))}
          >
            <ChevronRight size={16} />
          </button>
          <span className="telemetry-footer-spacer" />
          <button
            type="button"
            className="telemetry-export"
            disabled={!Object.values(telemetry).some((result) => result.data)}
            onClick={exportCsv}
          >
            <Download size={15} /> Export data
          </button>
        </footer>
      )}
    </main>
  );
}
