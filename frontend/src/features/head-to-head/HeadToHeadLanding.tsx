import type { ReactNode } from "react";
import LoadingBar from "./LoadingBar";

export interface LandingDriver {
  driverId: string;
  fullName: string;
  number: number;
  team: string;
  teamColor: string;
  headshotUrl?: string;
}

interface LandingCard {
  icon: ReactNode;
  title: string;
  body: string;
}


const PRESETS: { label: string; a: string; b: string }[] = [
  { label: "Hamilton vs Verstappen", a: "Hamilton", b: "Verstappen" },
  { label: "Senna vs Prost", a: "Senna", b: "Prost" },
  { label: "Leclerc vs Norris", a: "Leclerc", b: "Norris" },
  { label: "Schumacher vs Alonso", a: "Michael Schumacher", b: "Alonso" },
];

function Slot({ side, driver, picker }: { side: "a" | "b"; driver: LandingDriver | null; picker: ReactNode }) {
  return (
    <div
      className={`h2l-slot ${side}${driver ? " filled" : ""}`}
      style={driver ? { ["--c" as string]: driver.teamColor } : undefined}
    >
      <div className="h2l-stage">
        <span className="h2l-stage-mark" aria-hidden>{driver ? driver.number : side === "a" ? "A" : "B"}</span>
        {driver?.headshotUrl && (
          <img key={driver.driverId} className="h2l-stage-photo" src={driver.headshotUrl} alt="" />
        )}
      </div>
      {picker}
    </div>
  );
}

export default function HeadToHeadLanding({
  driverA,
  driverB,
  pickerA,
  pickerB,
  loading,
  error,
  cards,
  onPreset,
}: {
  driverA: LandingDriver | null;
  driverB: LandingDriver | null;
  pickerA: ReactNode;
  pickerB: ReactNode;
  loading: boolean;
  error: string | null;
  cards: LandingCard[];
  onPreset: (a: string, b: string) => void;
}) {
  const sameDriver = !!driverA && !!driverB && driverA.driverId === driverB.driverId;
  const picked = (driverA ? 1 : 0) + (driverB ? 1 : 0);

  return (
    <div className="h2l">
      <header className="h2l-hero">
        <h1 className="h2l-title">Compare any two drivers</h1>
        <p className="h2l-sub">
          Pick two drivers from any era. You get their career stats, driving profile and every race they shared on track.
        </p>
      </header>


      <section
        className="h2l-board"
        aria-label="Choose drivers"
        style={{
          ["--a" as string]: driverA?.teamColor ?? "#e8382b",
          ["--b" as string]: driverB?.teamColor ?? "#6f7480",
        }}
      >
        <Slot side="a" driver={driverA} picker={pickerA} />
        <div className="h2l-vs" aria-hidden><b>VS</b></div>
        <Slot side="b" driver={driverB} picker={pickerB} />
      </section>

      <div className="h2l-status" role="status">
        {loading ? (
          <LoadingBar compact label="Loading comparison…" />
        ) : error ? (
          <span className="h2l-error">{error}</span>
        ) : sameDriver ? (
          <span className="h2l-error">Choose two different drivers to compare.</span>
        ) : picked === 1 ? (
          <span>Now pick the second driver. The comparison opens on its own.</span>
        ) : picked === 0 ? (
          <span>Search by name or car number. No ideas? Try a classic.</span>
        ) : null}
      </div>

      <div className="h2l-presets">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => onPreset(p.a, p.b)}>{p.label}</button>
        ))}
      </div>

      <section className="h2l-learn" aria-label="What you get">
        <h2>What's in a comparison</h2>
        <div className="h2l-cards">
          {cards.map((card) => (
            <div className="h2l-card" key={card.title}>
              <span className="h2l-card-icon">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="h2l-disclaimer">
        Stats come from publicly available F1 data and are for information only. Accuracy may vary. Head-to-head
        metrics reflect teammate seasons only. Not affiliated with F1, the FIA, or any driver or team.
      </p>
    </div>
  );
}