import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Download, Maximize2, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";

import { getDriverStints, getLapTelemetry, type Stint, type TelemetryLap, type TelemetryPoint } from "./telemetry.api";
import { useReplay } from "../replay/hooks/useReplay";
import type { ReplaySessionType } from "../replay/replay.types";

import "./telemetry.css";

type Tab = "overview" | "speed" | "throttle" | "brake" | "gear" | "tyres" | "ers" | "fuel";
type Metric = "speed" | "throttle" | "brake" | "gear";

const tabs: Array<{ id: Tab; label: string; available: boolean }> = [
  { id: "overview", label: "Overview", available: true },
  { id: "speed", label: "Speed", available: true },
  { id: "throttle", label: "Throttle", available: true },
  { id: "brake", label: "Brake", available: true },
  { id: "gear", label: "Gear", available: true },
  { id: "tyres", label: "Tyres", available: true },
  { id: "ers", label: "ERS", available: false },
  { id: "fuel", label: "Fuel", available: false },
];

function formatLapTime(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--.---";
  const minutes = Math.floor(value / 60);
  return `${minutes}:${(value - minutes * 60).toFixed(3).padStart(6, "0")}`;
}

function TelemetryChart({ points, metric, color, comparison, fullscreenRef }: {
  points: TelemetryPoint[];
  metric: Metric;
  color: string;
  comparison?: { points: TelemetryPoint[]; color: string };
  fullscreenRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const width = 920;
  const height = 270;
  const pad = { x: 38, y: 18, bottom: 30 };
  const values = points.map((point) => Number(point[metric] ?? 0));
  const otherValues = comparison?.points.map((point) => Number(point[metric] ?? 0)) ?? [];
  const max = Math.max(metric === "gear" ? 8 : 100, ...values, ...otherValues, 1);
  const path = (items: TelemetryPoint[]) => items.map((point, index) => {
    const x = pad.x + ((point.distance || index) / Math.max(items.at(-1)?.distance ?? 1, 1)) * (width - pad.x - 8);
    const y = height - pad.bottom - (Number(point[metric] ?? 0) / max) * (height - pad.y - pad.bottom);
    return `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="telemetry-chart-wrap" ref={fullscreenRef}>
      <svg className="telemetry-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metric} over distance`}>
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const y = height - pad.bottom - step * (height - pad.y - pad.bottom);
          return <g key={step}><line x1={pad.x} x2={width - 8} y1={y} y2={y} className="telemetry-grid-line" /><text x={4} y={y + 4}>{Math.round(max * step)}</text></g>;
        })}
        {[0.33, 0.66].map((step) => <line key={step} x1={pad.x + step * (width - pad.x)} x2={pad.x + step * (width - pad.x)} y1={pad.y} y2={height - pad.bottom} className="telemetry-sector-line" />)}
        {comparison && <path d={path(comparison.points)} style={{ stroke: comparison.color }} className="telemetry-data-line telemetry-data-line-muted" />}
        <path d={path(points)} style={{ stroke: color }} className="telemetry-data-line" />
        <text x={pad.x} y={height - 8}>START</text><text x={width - 42} y={height - 8}>DISTANCE</text>
      </svg>
    </div>
  );
}

export default function TelemetryPage() {
  const { sessionKey = "" } = useParams();
  const [params] = useSearchParams();
  const year = Number(params.get("year") ?? sessionKey.split("-")[0] ?? 2026);
  const grandPrix = params.get("grandPrix") ?? "";
  const sessionType = (params.get("sessionType") ?? sessionKey.split("-").at(-1) ?? "R") as ReplaySessionType;
  const replay = useReplay({ year, grandPrix, sessionType, fps: 8 });
  const driverCodes = useMemo(() => Object.keys(replay.driverColors ?? {}), [replay.driverColors]);
  const [driverA, setDriverA] = useState("");
  const [driverB, setDriverB] = useState("");
  const [lap, setLap] = useState(1);
  const [tab, setTab] = useState<Tab>("overview");
  const [telemetry, setTelemetry] = useState<Record<string, TelemetryLap>>({});
  const [stints, setStints] = useState<Record<string, Stint[]>>({});
  const [error, setError] = useState("");
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!driverCodes.length) return;
    setDriverA((value) => value || driverCodes[0]);
    setDriverB((value) => value || driverCodes[1] || driverCodes[0]);
  }, [driverCodes]);

  const lapNumbers = useMemo(() => {
    const max = replay.meta?.total_laps ?? Math.max(...replay.frames.map((frame) => Number(frame.lap ?? 0)), 1);
    return Array.from({ length: Math.max(1, Math.floor(max)) }, (_, index) => index + 1);
  }, [replay.frames, replay.meta]);

  useEffect(() => {
    if (!driverA || !driverB || !sessionKey) return;
    let active = true;
    setError("");
    Promise.all([driverA, driverB].map((driver) => getLapTelemetry(sessionKey, driver, lap)))
      .then((items) => { if (active) setTelemetry({ [driverA]: items[0], [driverB]: items[1] }); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Telemetry unavailable"); });
    return () => { active = false; };
  }, [driverA, driverB, lap, sessionKey]);

  useEffect(() => {
    if (!driverA || !driverB || !sessionKey) return;
    Promise.all([driverA, driverB].map((driver) => getDriverStints(sessionKey, driver)))
      .then((items) => setStints({ [driverA]: items[0], [driverB]: items[1] }))
      .catch(() => setStints({}));
  }, [driverA, driverB, sessionKey]);

  const a = telemetry[driverA];
  const b = telemetry[driverB];
  const color = (code: string, fallback: string) => {
    const value = replay.driverColors?.[code];
    return typeof value === "string" ? value : value?.color || fallback;
  };
  const colorA = color(driverA, "#e10600");
  const colorB = color(driverB, "#5b8cff");
  const metric: Metric = tab === "overview" ? "speed" : (tab as Metric);
  const unavailable = tab === "ers" || tab === "fuel";

  const exportCsv = () => {
    const rows = [["driver", "distance", "speed", "throttle", "brake", "gear"], ...(a ? a.points.map((point) => [driverA, point.distance, point.speed ?? "", point.throttle ?? "", point.brake ?? "", point.gear ?? ""]) : []), ...(b ? b.points.map((point) => [driverB, point.distance, point.speed ?? "", point.throttle ?? "", point.brake ?? "", point.gear ?? ""]) : [])];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `telemetry-lap-${lap}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="telemetry-page">
      <header className="telemetry-header">
        <div><span className="telemetry-kicker">RACE CONTROL / DATA ROOM</span><h1>TELEMETRY</h1><p>{replay.meta?.event_name ?? grandPrix ?? "Session telemetry"} <b>·</b> LAP {lap}</p></div>
        <div className="telemetry-driver-selectors"><label>DRIVER A<select value={driverA} onChange={(event) => setDriverA(event.target.value)}>{driverCodes.map((code) => <option key={code}>{code}</option>)}</select></label><label>DRIVER B<select value={driverB} onChange={(event) => setDriverB(event.target.value)}>{driverCodes.map((code) => <option key={code}>{code}</option>)}</select></label><button className="telemetry-icon-button" aria-label="Settings"><Settings2 size={18} /></button></div>
      </header>
      <nav className="telemetry-tabs" aria-label="Telemetry views">{tabs.map((item) => <button key={item.id} className={`${tab === item.id ? "is-active" : ""} ${!item.available ? "is-muted" : ""}`} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
      {error && <div className="telemetry-error">{error}</div>}
      {unavailable ? <section className="telemetry-unavailable"><span>NO DATA SOURCE</span><h2>{tab.toUpperCase()} unavailable</h2><p>OpenF1 does not publish {tab.toUpperCase()} telemetry for this session. No values are being estimated.</p></section> : tab === "tyres" ? <section className="telemetry-tyres">{[driverA, driverB].map((driver, index) => { const current = stints[driver]?.at(-1); return <article key={driver} className="telemetry-card tyre-card" style={{ "--driver-color": index ? colorB : colorA } as React.CSSProperties}><span className="telemetry-label">{driver}</span><strong>{current?.compound ?? "--"}</strong><p>STINT {current?.stint_number ?? "--"} · AGE {current?.tyre_age_at_start ?? "--"} LAPS</p><div className="tyre-timeline">{(stints[driver] ?? []).map((stint) => <i key={stint.stint_number} className={`compound-${stint.compound.toLowerCase()}`} style={{ width: `${Math.max(8, (stint.lap_end ?? lap) - (stint.lap_start ?? 1))}%` }} />)}</div></article>})}</section> : <section className="telemetry-grid"><aside className="telemetry-card telemetry-lap-info"><span className="telemetry-label">LAP INFO</span><strong>LAP {lap} <small>/ {replay.meta?.total_laps ?? "--"}</small></strong><div className="lap-driver-row"><span style={{ color: colorA }}>{driverA}</span><b>{formatLapTime(a?.lap_time)}</b></div><div className="lap-driver-row"><span style={{ color: colorB }}>{driverB}</span><b>{formatLapTime(b?.lap_time)}</b></div><dl><dt>STINT</dt><dd>{a?.stint_number ?? "--"} / {b?.stint_number ?? "--"}</dd><dt>COMPOUND</dt><dd>{a?.compound ?? "--"} / {b?.compound ?? "--"}</dd></dl></aside><div className="telemetry-card telemetry-main-chart"><div className="telemetry-card-heading"><div><span className="telemetry-label">{tab === "overview" ? "SPEED + THROTTLE" : tab.toUpperCase()}</span><h2>{metric.toUpperCase()} <small>BY DISTANCE</small></h2></div><button className="telemetry-icon-button" onClick={() => chartRef.current?.requestFullscreen()} aria-label="Full screen chart"><Maximize2 size={17} /></button></div><div ref={chartRef}>{a && <TelemetryChart points={a.points} comparison={b ? { points: b.points, color: colorB } : undefined} metric={metric} color={colorA} />}</div>{tab === "overview" && a && <div className="telemetry-secondary-chart"><span className="telemetry-label">THROTTLE COMPARISON</span><TelemetryChart points={a.points} comparison={b ? { points: b.points, color: colorB } : undefined} metric="throttle" color={colorA} /></div>}</div><aside className="telemetry-card telemetry-sectors"><span className="telemetry-label">SECTOR TIMES</span>{["S1", "S2", "S3"].map((sector, index) => <div className="sector-row" key={sector}><span>{sector}</span><b style={{ color: colorA }}>{formatLapTime(a?.sector_times?.[index])}</b><b style={{ color: colorB }}>{formatLapTime(b?.sector_times?.[index])}</b></div>)}<div className="sector-best"><span>BEST LAP</span><strong>{formatLapTime(Math.min(a?.lap_time ?? Infinity, b?.lap_time ?? Infinity))}</strong></div></aside></section>}
      <footer className="telemetry-footer"><button onClick={() => setLap((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><div>{lapNumbers.map((number) => <button key={number} className={number === lap ? "is-current" : ""} onClick={() => setLap(number)}>{number}</button>)}</div><button onClick={() => setLap((value) => Math.min(lapNumbers.at(-1) ?? value, value + 1))}><ChevronRight size={16} /></button><span className="telemetry-footer-spacer" /><button className="telemetry-export" onClick={exportCsv}><Download size={15} /> Export data</button></footer>
    </main>
  );
}
