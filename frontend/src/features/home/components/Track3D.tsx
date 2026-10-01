import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "./track3d.css";

type Pt = [number, number] | { x: number; y: number };

export type Track3DDriver = {
  code: string;
  /** seconds behind the leader (leader = 0) */
  gapSeconds: number;
  /** optional team colour, e.g. "#3671C6" */
  color?: string;
};

type Props = {
  /** URL of the circuit SVG (e.g. from getCircuitSvgUrl). The track path is read from it. */
  url?: string | null;
  /** Shown if the SVG can't be loaded or has no usable path */
  fallback?: ReactNode;
  /** Circuit outline from your API: [[x,y],...] or [{x,y},...] (raw lap trace is fine) */
  points?: Pt[];
  /** ...or an SVG path string ("M0 0 C ... Z") if the API already gives one */
  path?: string;
  /** Set true if y grows upward in your data (typical for telemetry x/y) */
  flipY?: boolean;
  drivers?: Track3DDriver[];
  lapSeconds?: number;
  showHud?: boolean;
  label?: string;
};

const svgCache = new Map<string, string>();

/** Pull the main track outline out of a circuit SVG file. */
function pathFromSvgText(text: string): string {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  let best = "";
  doc.querySelectorAll("path").forEach((el) => {
    const dAttr = el.getAttribute("d") ?? "";
    if (dAttr.length > best.length) best = dAttr;
  });

  if (!best) {
    const nums = (doc.querySelector("polyline, polygon")?.getAttribute("points") ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter(Number.isFinite);
    if (nums.length >= 8) {
      best = nums.reduce((acc, n, i) => acc + (i % 2 === 0 ? `${i === 0 ? "M" : "L"}${n} ` : `${n} `), "");
    }
  }
  if (!best) return "";

  // keep one continuous loop so the cars never jump between sub-paths
  const first = best.trim().split(/(?=[Mm])/)[0];
  return /[zZ]\s*$/.test(first) ? first : `${first} Z`;
}

const LAYERS = 8;
const MAX_POINTS = 220;

function toXY(p: Pt): [number, number] {
  return Array.isArray(p) ? p : [p.x, p.y];
}

function smoothClosedPath(raw: Pt[], flipY: boolean) {
  let pts = raw.map(toXY).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pts.length > MAX_POINTS) {
    const step = Math.ceil(pts.length / MAX_POINTS);
    pts = pts.filter((_, i) => i % step === 0);
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (pts.length > 3 && first && last && first[0] === last[0] && first[1] === last[1]) pts.pop();
  if (pts.length < 4) return "";
  if (flipY) pts = pts.map(([x, y]) => [x, -y]);

  const n = pts.length;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return `${d}Z`;
}

const fmtLap = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, "0")}`;
const wrapAngle = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
const FALLBACK_CLASS = ["t3d-car-0", "t3d-car-1", "t3d-car-2"];

export default function Track3D({
  url,
  fallback,
  points,
  path,
  flipY = false,
  drivers = [],
  lapSeconds = 90,
  showHud = true,
  label = "Circuit",
}: Props) {
  const [remote, setRemote] = useState<{ d: string; status: "idle" | "loading" | "ready" | "error" }>({
    d: "",
    status: "idle",
  });
  const hasDirectData = Boolean(path || points);

  useEffect(() => {
    if (!url || hasDirectData) {
      setRemote({ d: "", status: "idle" });
      return;
    }
    const cached = svgCache.get(url);
    if (cached) {
      setRemote({ d: cached, status: "ready" });
      return;
    }
    const ctrl = new AbortController();
    setRemote({ d: "", status: "loading" });
    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((text) => {
        const parsed = pathFromSvgText(text);
        if (!parsed) throw new Error("no path in svg");
        svgCache.set(url, parsed);
        setRemote({ d: parsed, status: "ready" });
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setRemote({ d: "", status: "error" });
      });
    return () => ctrl.abort();
  }, [url, hasDirectData]);

  const d = useMemo(
    () => path ?? (points ? smoothClosedPath(points, flipY) : remote.d),
    [path, points, flipY, remote.d],
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const roadRef = useRef<SVGPathElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const bodies = useRef<(SVGGElement | null)[]>([]);
  const shadows = useRef<(SVGCircleElement | null)[]>([]);
  const driversRef = useRef(drivers);
  driversRef.current = drivers;
  const driverKey = drivers.map((x) => `${x.code}:${x.gapSeconds}`).join("|");

  const [view, setView] = useState<"iso" | "top">("iso");
  const [hud, setHud] = useState({ lap: "0:00.000", speed: 0, sector: 1 });
  const [geo, setGeo] = useState({ x: 0, y: 0, w: 100, h: 100, u: 1, sx: 0, sy: 0, angle: 0 });

  // measure the real path so any circuit, in any coordinate system, fits and scales
  useLayoutEffect(() => {
    const road = roadRef.current;
    if (!road || !d) return;
    const b = road.getBBox();
    if (!b.width || !b.height) return;
    const u = Math.max(b.width, b.height) / 620;
    const pad = 40 * u;
    const p0 = road.getPointAtLength(0);
    const p1 = road.getPointAtLength(6 * u);
    setGeo({
      x: b.x - pad,
      y: b.y - pad,
      w: b.width + pad * 2,
      h: b.height + pad * 2,
      u,
      sx: p0.x,
      sy: p0.y,
      angle: (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI,
    });
  }, [d]);

  useEffect(() => {
    const road = roadRef.current;
    const root = rootRef.current;
    if (!road || !root || !d) return;

    const len = road.getTotalLength();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let t = lapSeconds * 0.2;
    let last = performance.now();
    let lastHud = 0;
    const at = (s: number) => road.getPointAtLength(((s % len) + len) % len);
    const bb = road.getBBox();
    const u = Math.max(bb.width, bb.height) / 620;

    // Speed profile: slow in corners, fast on straights, smoothed so cars brake and accelerate gradually
    const N = 480;
    const seg = len / N;
    const samples = Array.from({ length: N }, (_, i) => road.getPointAtLength(i * seg));
    const turns = samples.map((_, i) => {
      const a = samples[(i - 4 + N) % N];
      const b = samples[i];
      const c = samples[(i + 4) % N];
      return wrapAngle(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x));
    });
    let spd = turns.map((tn) => 90 + 240 * (1 - Math.min(1, tn / 0.45)));
    for (let pass = 0; pass < 8; pass++) {
      const prev = spd;
      spd = prev.map((_, i) => {
        let sum = 0;
        for (let j = -4; j <= 4; j++) sum += prev[(i + j + N) % N];
        return sum / 9;
      });
    }
    // time to reach each sample, scaled so one full lap takes lapSeconds
    const cum = new Float64Array(N + 1);
    for (let i = 0; i < N; i++) cum[i + 1] = cum[i] + seg / spd[i];
    const scale = lapSeconds / cum[N];
    for (let i = 0; i <= N; i++) cum[i] *= scale;

    const profile = (lapT: number) => {
      let lo = 0;
      let hi = N - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (cum[mid] <= lapT) lo = mid;
        else hi = mid - 1;
      }
      const frac = (lapT - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
      return { s: (lo + Math.min(1, Math.max(0, frac))) * seg, kmh: spd[lo] };
    };
    const wrapT = (x: number) => ((x % lapSeconds) + lapSeconds) % lapSeconds;
    const LANES = [0, -3.5, 3.5];
    let kmh = 220;
    let leadS = 0;

    const place = () => {
      driversRef.current.forEach((drv, i) => {
        const { s } = profile(wrapT(t - drv.gapSeconds));
        const p = at(s);
        const q = at(s + 2 * u);
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const n = Math.hypot(dx, dy) || 1;
        const off = LANES[i % LANES.length] * u;
        const tf = `translate(${p.x - (dy / n) * off} ${p.y + (dx / n) * off})`;
        bodies.current[i]?.setAttribute("transform", tf);
        shadows.current[i]?.setAttribute("transform", tf);
      });

      const lead = profile(wrapT(t));
      leadS = lead.s;
      const trail = len * 0.05;
      trailRef.current?.setAttribute("stroke-dasharray", `${trail} ${len}`);
      trailRef.current?.setAttribute("stroke-dashoffset", `${-(leadS - trail)}`);
      kmh += (lead.kmh - kmh) * 0.15;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible) {
        t += dt;
        place();
        if (now - lastHud > 100) {
          lastHud = now;
          setHud({
            lap: fmtLap(wrapT(t)),
            speed: Math.round(kmh),
            sector: Math.min(3, Math.floor((leadS / len) * 3) + 1),
          });
        }
      }
      raf = requestAnimationFrame(tick);
    };

    place();
    if (!reduce) raf = requestAnimationFrame(tick);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.1 });
    io.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [d, driverKey, lapSeconds]);

  const onMove = (e: React.PointerEvent) => {
    const r = rootRef.current?.getBoundingClientRect();
    const plane = planeRef.current;
    if (!r || !plane) return;
    plane.style.setProperty("--tx", `${((e.clientX - r.left) / r.width - 0.5) * 14}deg`);
    plane.style.setProperty("--ty", `${-((e.clientY - r.top) / r.height - 0.5) * 10}deg`);
  };
  const onLeave = () => {
    planeRef.current?.style.setProperty("--tx", "0deg");
    planeRef.current?.style.setProperty("--ty", "0deg");
  };

  if (!d) {
    if (remote.status === "error" && fallback) return <>{fallback}</>;
    return (
      <div className="t3d">
        <div className="t3d-empty">{remote.status === "loading" ? "LOADING TRACK" : "TRACK DATA UNAVAILABLE"}</div>
      </div>
    );
  }

  const viewBox = `${geo.x} ${geo.y} ${geo.w} ${geo.h}`;
  const ratio = `${geo.w} / ${geo.h}`;
  const layer = (z: number, extra?: React.CSSProperties) => ({
    className: "t3d-layer",
    viewBox,
    "aria-hidden": true as const,
    style: { transform: `translateZ(${z}px)`, ...extra },
  });

  return (
    <div
      ref={rootRef}
      className={`t3d is-${view}`}
      style={{ aspectRatio: ratio, ["--u" as string]: geo.u }}
      role="img"
      aria-label={`${label} circuit in 3D${drivers.length ? " with live car positions" : ""}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="t3d-stage">
        <div className="t3d-plane" ref={planeRef} style={{ aspectRatio: ratio }} aria-hidden="true">
          <svg {...layer(-8)}>
            <path d={d} className="t3d-glow" />
          </svg>

          {Array.from({ length: LAYERS }, (_, i) => (
            <svg key={i} {...layer(i * 2, { opacity: 0.3 + i * 0.09 })}>
              <path d={d} className="t3d-wall" />
            </svg>
          ))}

          <svg {...layer(LAYERS * 2)}>
            <path d={d} className="t3d-kerb" />
            <path ref={roadRef} d={d} className="t3d-asphalt" />
            <path d={d} className="t3d-sector t3d-sector-1" pathLength={1000} strokeDasharray="333 667" />
            <path d={d} className="t3d-sector t3d-sector-2" pathLength={1000} strokeDasharray="333 667" strokeDashoffset={-333} />
            <path d={d} className="t3d-sector t3d-sector-3" pathLength={1000} strokeDasharray="334 666" strokeDashoffset={-666} />
            <path d={d} className="t3d-racing-line" />
            <path ref={trailRef} d={d} className="t3d-trail" />
            <line
              className="t3d-start"
              x1={geo.sx} y1={geo.sy - 13 * geo.u} x2={geo.sx} y2={geo.sy + 13 * geo.u}
              transform={`rotate(${geo.angle} ${geo.sx} ${geo.sy})`}
            />
            {drivers.map((drv, i) => (
              <circle key={drv.code} ref={(el) => { shadows.current[i] = el; }} r={9 * geo.u} className="t3d-car-shadow" />
            ))}
          </svg>

          <svg {...layer(LAYERS * 2 + 14)}>
            {drivers.map((drv, i) => (
              <g
                key={drv.code}
                ref={(el) => { bodies.current[i] = el; }}
                className={`t3d-car ${drv.color ? "" : FALLBACK_CLASS[i % 3]}`}
              >
                <circle r={(i === 0 ? 8 : 6.5) * geo.u} style={drv.color ? { fill: drv.color } : undefined} />
                <text x={13 * geo.u} y={4 * geo.u}>{drv.code}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {showHud && drivers.length > 0 && (
        <>
          <div className="t3d-hud t3d-hud-lap"><span>LAP TIME</span><strong>{hud.lap}</strong></div>
          <div className="t3d-hud t3d-hud-speed"><span>SPEED</span><strong>{hud.speed} <small>KM/H</small></strong></div>
          <div className="t3d-sectors" aria-hidden="true">
            {[1, 2, 3].map((s) => (
              <i key={s} className={hud.sector === s ? "is-on" : ""}>S{s}</i>
            ))}
          </div>
        </>
      )}

      <div className="t3d-views" role="group" aria-label="Camera">
        <button type="button" aria-pressed={view === "iso"} onClick={() => setView("iso")}>3D</button>
        <button type="button" aria-pressed={view === "top"} onClick={() => setView("top")}>Top</button>
      </div>
    </div>
  );
}