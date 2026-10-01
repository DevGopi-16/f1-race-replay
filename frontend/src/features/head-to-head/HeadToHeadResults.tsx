import { useState, type MouseEvent as ReactMouseEvent } from "react";
import LoadingBar from "./LoadingBar";
import { getTeamLogo } from "./teamLogo";
import "./head-to-head-results-v2.css";

interface Driver {
  driverId: string;
  code: string;
  number: number;
  fullName: string;
  team: string;
  teamColor: string;
  headshotUrl?: string;
}

interface Career {
  wins: number;
  podiums: number;
  poles: number;
  fastest_laps: number;
  starts: number;
  championships: number;
  seasons: number;
}

interface H2HRecord {
  shared_races: number;
  qualifying: Record<string, number>;
  race: Record<string, number>;
  by_season: Record<string, { shared_races: number; race: Record<string, number>; qualifying: Record<string, number> }>;
}

export interface ResultsData {
  driverA: Driver;
  driverB: Driver;
  careerStats: { driverA: Career | null; driverB: Career | null } | null;
  headToHeadRecord: H2HRecord | null;
  careerTrajectory: unknown;
}



interface Season { season: number; position: number | null; points: number | null; wins: number | null; team: string | null }

const num = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

function pick(o: Record<string, unknown>, names: string[], re: RegExp): unknown {
  for (const n of names) if (o[n] !== undefined && o[n] !== null) return o[n];
  const k = Object.keys(o).find((key) => re.test(key) && o[key] !== null && typeof o[key] !== "object");
  return k ? o[k] : null;
}

function seasonsOf(raw: unknown, key: "driverA" | "driverB"): Season[] {
  const src = (raw as Record<string, unknown> | null)?.[key] as Record<string, unknown> | unknown[] | null | undefined;
  const inner = Array.isArray(src) ? src : (src?.seasons ?? src?.season_journey ?? src?.journey ?? null);
  const list: unknown[] = Array.isArray(inner)
    ? inner
    : inner && typeof inner === "object"
      ? Object.entries(inner).map(([k, v]) => ({ season: k, ...(v as object) }))
      : [];
  return list
    .map((item) => {
      const o = item as Record<string, unknown>;
      const team = pick(o, ["team", "team_name", "constructor", "constructor_name"], /^(?!.*color).*(team|constructor)/i);
      return {
        season: Number(o.season ?? o.year),
        position: num(pick(o, ["position", "pos", "final_position", "championship_position", "standing", "rank"], /^(?!.*(quali|grid|start)).*(pos|rank|standing)/i)),
        points: num(pick(o, ["points", "pts", "total_points"], /point/i)),
        wins: num(pick(o, ["wins", "race_wins"], /win/i)),
        team: typeof team === "string" ? team : null,
      };
    })
    .filter((s) => Number.isFinite(s.season));
}



function Radar({ axes, colorA, colorB }: { axes: { label: string; a: number; b: number }[]; colorA: string; colorB: string }) {
  const R = 108, C = 150, n = axes.length;
  const pt = (i: number, r: number) => {
    const t = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [C + Math.cos(t) * r, C + Math.sin(t) * r] as const;
  };
  const poly = (k: "a" | "b") =>
    axes.map((ax, i) => pt(i, (ax[k] / (Math.max(ax.a, ax.b) || 1)) * R).map((v) => v.toFixed(1)).join(",")).join(" ");
  return (
    <svg className="h2r-radar" viewBox="0 0 300 300" role="img" aria-label="Driver profile radar">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} className="ring" points={axes.map((_, i) => pt(i, R * f).join(",")).join(" ")} />
      ))}
      {axes.map((ax, i) => {
        const [x, y] = pt(i, R);
        const [lx, ly] = pt(i, R + 24);
        return (
          <g key={ax.label}>
            <line className="spoke" x1={C} y1={C} x2={x} y2={y} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle">{ax.label}</text>
          </g>
        );
      })}
      <polygon className="shape b" points={poly("b")} style={{ stroke: colorB, fill: colorB }} />
      <polygon className="shape a" points={poly("a")} style={{ stroke: colorA, fill: colorA }} />
    </svg>
  );
}

function VersusRow({ label, left, right, lt, rt }: { label: string; left: number; right: number; lt: string; rt: string }) {
  const max = Math.max(left, right) || 1;
  return (
    <div className="h2r-vrow">
      <span className="lab">{label}</span>
      <b className={`lv${left > right ? " lead" : ""}`}>{lt}</b>
      <div className="trk">
        <i className={`l${left < right ? " dim" : ""}`} style={{ width: `${(left / max) * 100}%` }} />
        <i className={`r${right < left ? " dim" : ""}`} style={{ width: `${(right / max) * 100}%` }} />
      </div>
      <b className={`rv${right > left ? " lead" : ""}`}>{rt}</b>
    </div>
  );
}



interface ArcSeries { label: string; color: string; values: (number | null)[] }

function ArcChart({ years, series, active, onPick }: { years: number[]; series: ArcSeries[]; active?: number; onPick: (y: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = 260, L = 46, R = 16, T = 16, B = 30;
  const hi = Math.max(1, ...series.flatMap((s) => s.values).filter((v): v is number => v !== null));
  const x = (i: number) => (years.length === 1 ? (L + W - R) / 2 : L + (i / (years.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / hi) * (H - T - B);
  const path = (s: ArcSeries) => {
    let d = "", down = false;
    s.values.forEach((v, i) => {
      if (v === null) { down = false; return; }
      d += `${down ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      down = true;
    });
    return d;
  };
  const move = (e: ReactMouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    let n = 0;
    years.forEach((_, i) => { if (Math.abs(x(i) - vx) < Math.abs(x(n) - vx)) n = i; });
    setHover(n);
  };
  const ai = active !== undefined ? years.indexOf(active) : -1;
  return (
    <div className="h2r-arc" onMouseLeave={() => setHover(null)}>
      {hover !== null && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>{years[hover]}</b>
          {series.map((s) => (
            <span key={s.label}><i style={{ background: s.color }} />{s.label} <strong>{s.values[hover] === null ? "—" : Math.round(s.values[hover] as number)}</strong></span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Career arc" onMouseMove={move} onClick={() => hover !== null && onPick(years[hover])}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line className="grid" x1={L} x2={W - R} y1={y(hi * f)} y2={y(hi * f)} />
            <text className="ax" x={L - 8} y={y(hi * f)} textAnchor="end" dominantBaseline="middle">{Math.round(hi * f)}</text>
          </g>
        ))}
        {years.map((yr, i) => (years.length <= 12 || i % 2 === 0) && <text className="ax" key={yr} x={x(i)} y={H - 8} textAnchor="middle">{yr}</text>)}
        {ai >= 0 && <line className="sel" x1={x(ai)} x2={x(ai)} y1={T} y2={H - B} />}
        {hover !== null && <line className="cross" x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} />}
        {series.map((s) => <path key={s.label} className="ln" pathLength={100} d={path(s)} style={{ stroke: s.color }} />)}
        {series.map((s) => s.values.map((v, i) => v === null ? null : (
          <circle key={`${s.label}-${years[i]}`} cx={x(i)} cy={y(v)} r={i === hover || i === ai ? 6 : 3.5} style={{ fill: s.color }} />
        )))}
      </svg>
    </div>
  );
}

function Donut({ label, a, b, ca, cb, na, nb }: { label: string; a: number; b: number; ca: string; cb: string; na: string; nb: string }) {
  const total = a + b;
  const share = total ? (a / total) * 100 : 50;
  const leadShare = Math.max(share, 100 - share);
  return (
    <div className="h2r-donut">
      <svg viewBox="0 0 120 120" role="img" aria-label={`${label}: ${a} to ${b}`}>
        <circle className="ring" cx="60" cy="60" r="46" pathLength={100} style={{ stroke: cb }} />
        <circle className="ring fg" cx="60" cy="60" r="46" pathLength={100} strokeDasharray={`${share} ${100 - share}`} transform="rotate(-90 60 60)" style={{ stroke: ca }} />
        <text x="60" y="58" textAnchor="middle" className="pct">{total ? Math.round(leadShare) : 0}%</text>
        <text x="60" y="76" textAnchor="middle" className="who">{total ? (a === b ? "level" : a > b ? na : nb) : "no data"}</text>
      </svg>
      <b>{label}</b>
      <small>{a}–{b}</small>
    </div>
  );
}

function Momentum({ years, deltas, colorA, colorB, nameA, nameB }: { years: number[]; deltas: number[]; colorA: string; colorB: string; nameA: string; nameB: string }) {
  const W = 760, H = 240, L = 16, R = 16, T = 28, B = 32;
  const cum = deltas.reduce<number[]>((acc, d) => [...acc, (acc.at(-1) ?? 0) + d], []);
  const hi = Math.max(0, ...cum), lo = Math.min(0, ...cum), span = hi - lo || 1;
  const x = (i: number) => (years.length === 1 ? W / 2 : L + (i / (years.length - 1)) * (W - L - R));
  const y = (v: number) => T + ((hi - v) / span) * (H - T - B);
  const zero = y(0);
  const pts = cum.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p}`).join("");
  const area = `M${x(0).toFixed(1)} ${zero.toFixed(1)}${pts.map((p) => `L${p}`).join("")}L${x(cum.length - 1).toFixed(1)} ${zero.toFixed(1)}Z`;
  return (
    <svg className="h2r-momentum" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Running head-to-head lead">
      <defs>
        <clipPath id="h2r-up"><rect x="0" y="0" width={W} height={zero} /></clipPath>
        <clipPath id="h2r-down"><rect x="0" y={zero} width={W} height={H - zero} /></clipPath>
      </defs>
      <path d={area} style={{ fill: colorA }} fillOpacity="0.38" clipPath="url(#h2r-up)" />
      <path d={area} style={{ fill: colorB }} fillOpacity="0.38" clipPath="url(#h2r-down)" />
      <line className="zero" x1={L} x2={W - R} y1={zero} y2={zero} />
      <path className="line" pathLength={100} d={line} />
      {cum.map((v, i) => (
        <g key={years[i]}>
          <circle cx={x(i)} cy={y(v)} r="4.5"><title>{`${years[i]}: ${v === 0 ? "level" : `${v > 0 ? nameA : nameB} +${Math.abs(v)}`}`}</title></circle>
          <text className="yr" x={x(i)} y={H - 10} textAnchor="middle">{years[i]}</text>
        </g>
      ))}
      <text className="tag" x={L} y="14">{nameA} ahead</text>
      <text className="tag" x={L} y={H - B - 6}>{nameB} ahead</text>
    </svg>
  );
}



export default function HeadToHeadResults({ result, loading, onReset, onSwap }: { result: ResultsData; loading: boolean; onReset: () => void; onSwap?: () => void }) {
  const [mode, setMode] = useState<"race" | "qualifying">("race");
  const [picked, setPicked] = useState<number | null>(null);
  const [metric, setMetric] = useState<"points" | "cumulative" | "wins">("points");
  const [copied, setCopied] = useState(false);

  const a = result.driverA;
  const b = result.driverB;
  const last = (d: Driver) => d.fullName.split(" ").slice(1).join(" ") || d.fullName;


  const h = result.headToHeadRecord;
  const by = h?.by_season ?? {};
  const shared = h?.shared_races ?? 0;
  const rA = h?.race?.[a.code] ?? 0, rB = h?.race?.[b.code] ?? 0;
  const qA = h?.qualifying?.[a.code] ?? 0, qB = h?.qualifying?.[b.code] ?? 0;
  const confidence = shared >= 50 ? "High confidence" : shared >= 15 ? "Medium confidence" : "Low confidence";
  const years = Object.keys(by).map(Number).filter(Number.isFinite).sort((x, y) => y - x);
  const at = (y: number, d: Driver, k: "race" | "qualifying") => by[String(y)]?.[k]?.[d.code] ?? 0;
  const bfMax = Math.max(1, ...years.flatMap((y) => [at(y, a, mode), at(y, b, mode)]));
  const ledA = years.filter((y) => at(y, a, "race") > at(y, b, "race")).length;
  const ledB = years.filter((y) => at(y, b, "race") > at(y, a, "race")).length;
  const verdict = rA === rB ? "All square" : `${last(rA > rB ? a : b)} leads`;


  const ca = result.careerStats?.driverA, cb = result.careerStats?.driverB;
  const rate = (n?: number, s?: number) => (s ? Math.round(((n ?? 0) / s) * 1000) / 10 : 0);
  const per = (n?: number, s?: number) => (s ? Math.round(((n ?? 0) / s) * 10) / 10 : 0);
  const rateRows = [
    ["Win rate", "wins"], ["Podium rate", "podiums"], ["Pole rate", "poles"], ["Fastest-lap rate", "fastest_laps"],
  ] as const;
  const tiles = [
    ["Titles", "championships"], ["Wins", "wins"], ["Podiums", "podiums"], ["Poles", "poles"], ["Fastest laps", "fastest_laps"], ["Starts", "starts"],
  ] as const;
  const axes = [
    { label: "Wins", a: rate(ca?.wins, ca?.starts), b: rate(cb?.wins, cb?.starts) },
    { label: "Podiums", a: rate(ca?.podiums, ca?.starts), b: rate(cb?.podiums, cb?.starts) },
    { label: "Poles", a: rate(ca?.poles, ca?.starts), b: rate(cb?.poles, cb?.starts) },
    { label: "Fast laps", a: rate(ca?.fastest_laps, ca?.starts), b: rate(cb?.fastest_laps, cb?.starts) },
    { label: "Wins/yr", a: per(ca?.wins, ca?.seasons), b: per(cb?.wins, cb?.seasons) },
    { label: "Podiums/yr", a: per(ca?.podiums, ca?.seasons), b: per(cb?.podiums, cb?.seasons) },
  ];


  const tA = seasonsOf(result.careerTrajectory, "driverA");
  const tB = seasonsOf(result.careerTrajectory, "driverB");
  const seasons = Array.from(new Set([...tA, ...tB].map((s) => s.season))).sort((x, y) => x - y);
  const active = picked !== null && seasons.includes(picked) ? picked : seasons.at(-1);
  const sA = tA.find((s) => s.season === active), sB = tB.find((s) => s.season === active);

  const arcValues = (t: Season[]) => {
    let run = 0;
    return seasons.map((yr) => {
      const r = t.find((x) => x.season === yr);
      if (metric === "cumulative") { run += r?.points ?? 0; return run || null; }
      return (metric === "points" ? r?.points : r?.wins) ?? null;
    });
  };


  const yearsAsc = [...years].reverse();
  const leadName = last(rA >= rB ? a : b);
  const raceShare = rA + rB ? Math.round((Math.max(rA, rB) / (rA + rB)) * 100) : 50;
  const bestYear = years
    .map((yr) => ({ yr, da: at(yr, a, "race"), db: at(yr, b, "race") }))
    .sort((p, q) => Math.abs(q.da - q.db) - Math.abs(p.da - p.db))[0];
  const gaps = rateRows
    .map(([label, k]) => ({ label, d: rate(ca?.[k], ca?.starts) - rate(cb?.[k], cb?.starts) }))
    .sort((p, q) => Math.abs(q.d) - Math.abs(p.d))[0];
  const insights: { k: string; t: string }[] = [];
  if (rA + rB > 0) insights.push({ k: "Race edge", t: rA === rB ? "Level on race results" : `${leadName} came out ahead in ${raceShare}% of shared races` });
  if (years.length > 0) insights.push({ k: "Seasons", t: ledA === ledB ? `Level on seasons led (${ledA} each)` : `${last(ledA > ledB ? a : b)} led ${Math.max(ledA, ledB)} of ${years.length} shared seasons` });
  if (bestYear && bestYear.da !== bestYear.db) insights.push({ k: "Biggest season", t: `${last(bestYear.da > bestYear.db ? a : b)} ruled ${bestYear.yr}, ${Math.max(bestYear.da, bestYear.db)}–${Math.min(bestYear.da, bestYear.db)} in races` });
  if (gaps && Math.abs(gaps.d) >= 0.05) insights.push({ k: "Widest career gap", t: `${last(gaps.d > 0 ? a : b)} is ${Math.abs(gaps.d).toFixed(1)} points better on ${gaps.label.toLowerCase()}` });

  const share = async () => {
    const text = `${a.fullName} vs ${b.fullName}: races ${rA}–${rB}, qualifying ${qA}–${qB} over ${shared} shared races.`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {                             }
  };

  const Side = ({ d, side }: { d: Driver; side: "a" | "b" }) => {
    const logo = getTeamLogo(d.team);
    return (
      <div className={`h2r-side ${side}${(side === "a" ? rA >= rB : rB >= rA) ? " lead" : ""}`} style={{ ["--c" as string]: d.teamColor }}>
        {d.headshotUrl && <img className="photo" src={d.headshotUrl} alt="" />}
        <div className="info">
          <h2>{d.fullName}</h2>
          <p>
            {logo && <img src={logo} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
            {d.team} · #{d.number}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h2r" style={{ ["--ca" as string]: a.teamColor, ["--cb" as string]: b.teamColor }}>
      <div className="h2r-top">
        <span>Head-to-head · {shared} shared races · {confidence}</span>
        <div className="actions">
          {onSwap && <button type="button" onClick={onSwap}>Swap drivers</button>}
          <button type="button" onClick={share}>{copied ? "Copied" : "Copy summary"}</button>
          <button type="button" onClick={onReset}>Change drivers</button>
        </div>
      </div>

      {loading ? <LoadingBar /> : (
        <>
          <section className="h2r-hero">
            <Side d={a} side="a" />
            <div className="h2r-verdict">
              <small>Race head-to-head</small>
              <div className="score"><b>{rA}</b><span>–</span><b>{rB}</b></div>
              <div className="split"><i style={{ width: `${(rA / (rA + rB || 1)) * 100}%`, background: "var(--ca)" }} /><i style={{ width: `${(rB / (rA + rB || 1)) * 100}%`, background: "var(--cb)" }} /></div>
              <p>{verdict}{rA !== rB ? ` by ${Math.abs(rA - rB)}` : ""}</p>
              <p className="sub">Qualifying {qA}–{qB}{ledA + ledB > 0 ? ` · seasons led ${ledA}–${ledB}` : ""}</p>
            </div>
            <Side d={b} side="b" />
          </section>

          {insights.length > 0 && (
            <div className="h2r-insights">
              {insights.map((i) => <div key={i.k}><small>{i.k}</small><p>{i.t}</p></div>)}
            </div>
          )}

          <div className="h2r-grid">
            <section className="h2r-card c8">
              <header><div><h2>Career efficiency</h2><p>Rates use races started: {ca?.starts ?? 0} for {last(a)}, {cb?.starts ?? 0} for {last(b)}.</p></div></header>
              <div className="h2r-names"><span style={{ color: "var(--ca)" }}>{last(a)}</span><span style={{ color: "var(--cb)" }}>{last(b)}</span></div>
              {rateRows.map(([label, k]) => {
                const l = rate(ca?.[k], ca?.starts), r = rate(cb?.[k], cb?.starts);
                return <VersusRow key={label} label={label} left={l} right={r} lt={`${l.toFixed(1)}%`} rt={`${r.toFixed(1)}%`} />;
              })}
            </section>

            <section className="h2r-card c4">
              <header><div><h2>Career totals</h2><p>The bigger number is highlighted.</p></div></header>
              <div className="h2r-tiles">
                {tiles.map(([label, k]) => {
                  const l = ca?.[k] ?? 0, r = cb?.[k] ?? 0;
                  return (
                    <div className="tile" key={label}>
                      <small>{label}</small>
                      <div><b className={l > r ? "lead" : ""}>{l}</b><b className={r > l ? "lead" : ""}>{r}</b></div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="h2r-card c5">
              <header><div><h2>Driver profile</h2><p>Each axis is scaled to the better driver, so the outer ring is the best of the two.</p></div></header>
              <Radar axes={axes} colorA={a.teamColor} colorB={b.teamColor} />
              <div className="h2r-legend"><span style={{ ["--k" as string]: a.teamColor }}>{a.fullName}</span><span className="dashed" style={{ ["--k" as string]: b.teamColor }}>{b.fullName}</span></div>
            </section>

            <section className="h2r-card c7">
              <header>
                <div><h2>Season by season</h2><p>{mode === "race" ? "Race" : "Qualifying"} wins against each other in the seasons they shared.</p></div>
                <div className="h2r-seg">
                  <button type="button" className={mode === "race" ? "on" : ""} onClick={() => setMode("race")}>Races</button>
                  <button type="button" className={mode === "qualifying" ? "on" : ""} onClick={() => setMode("qualifying")}>Qualifying</button>
                </div>
              </header>
              {years.length === 0 ? <p className="h2r-empty">These drivers have no shared seasons yet.</p> : (
                <div className="h2r-bf" key={mode}>
                  <div className="h2r-names"><span style={{ color: "var(--ca)" }}>{last(a)}</span><span style={{ color: "var(--cb)" }}>{last(b)}</span></div>
                  {years.map((y) => {
                    const l = at(y, a, mode), r = at(y, b, mode);
                    return (
                      <div className="row" key={y}>
                        <div className="half l"><b className={l > r ? "lead" : ""}>{l}</b><span className="bar"><i style={{ width: `${(l / bfMax) * 100}%`, background: "var(--ca)" }} /></span></div>
                        <span className="yr">{y}</span>
                        <div className="half r"><span className="bar"><i style={{ width: `${(r / bfMax) * 100}%`, background: "var(--cb)" }} /></span><b className={r > l ? "lead" : ""}>{r}</b></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="h2r-card c7">
              <header><div><h2>Momentum</h2><p>Running total of {mode === "race" ? "race" : "qualifying"} wins against each other. Above the line, {last(a)} is ahead overall. Use the toggle in Season by season to switch.</p></div></header>
              {years.length === 0 ? <p className="h2r-empty">These drivers have no shared seasons yet.</p> : (
                <Momentum years={yearsAsc} deltas={yearsAsc.map((yr) => at(yr, a, mode) - at(yr, b, mode))} colorA={a.teamColor} colorB={b.teamColor} nameA={last(a)} nameB={last(b)} />
              )}
            </section>

            <section className="h2r-card c5">
              <header><div><h2>Who wins more</h2><p>Share of decided head-to-heads.</p></div></header>
              <div className="h2r-donuts">
                <Donut label="Races" a={rA} b={rB} ca={a.teamColor} cb={b.teamColor} na={last(a)} nb={last(b)} />
                <Donut label="Qualifying" a={qA} b={qB} ca={a.teamColor} cb={b.teamColor} na={last(a)} nb={last(b)} />
                <Donut label="Seasons" a={ledA} b={ledB} ca={a.teamColor} cb={b.teamColor} na={last(a)} nb={last(b)} />
              </div>
            </section>

            <section className="h2r-card c12">
              <header>
                <div><h2>Career arc</h2><p>Hover to compare both drivers, click a season for the detail.</p></div>
                <div className="h2r-seg">
                  {([["points", "Points"], ["cumulative", "Career total"], ["wins", "Wins"]] as const).map(([m, label]) => (
                    <button type="button" key={m} className={metric === m ? "on" : ""} onClick={() => setMetric(m)}>{label}</button>
                  ))}
                </div>
              </header>
              {seasons.length === 0 ? <p className="h2r-empty">No season history available.</p> : (
                <>
                  <ArcChart
                    key={metric}
                    years={seasons}
                    active={active}
                    onPick={setPicked}
                    series={[
                      { label: last(a), color: a.teamColor, values: arcValues(tA) },
                      { label: last(b), color: b.teamColor, values: arcValues(tB) },
                    ]}
                  />
                  <div className="h2r-season" key={active}>
                    {([[a, sA, "var(--ca)"], [b, sB, "var(--cb)"]] as const).map(([d, sn, c]) => (
                      <div className="card" key={d.driverId} style={{ ["--c" as string]: c }}>
                        <b>{d.fullName}</b>
                        <span>{active ?? ""} · {sn?.team ?? "—"}</span>
                        <strong>{sn?.position ? `P${sn.position}` : sn ? `${sn.points ?? 0} pts` : "—"}</strong>
                        <small>{sn ? `${sn.points ?? 0} pts · ${sn.wins ?? 0} ${sn.wins === 1 ? "win" : "wins"}` : "Did not race this season"}</small>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          <p className="h2r-disclaimer">
            Stats come from publicly available F1 data and are for information only. Accuracy may vary. Head-to-head
            metrics reflect teammate seasons only. Not affiliated with F1, the FIA, or any driver or team.
          </p>
        </>
      )}
    </div>
  );
}