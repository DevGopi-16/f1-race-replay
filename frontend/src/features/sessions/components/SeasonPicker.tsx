import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./SeasonPicker.css";

interface Era {
  key: string;
  label: string;
  color: string;
  from: number;
  to: number; // inclusive; use 9999 for "ongoing"
}

// Newest first. Edit the years or colors here if you disagree with a boundary.
const ERAS: Era[] = [
  { key: "active-aero", label: "Active Aero Era", color: "#8b5cf6", from: 2026, to: 9999 },
  { key: "ground-effect", label: "Ground Effect Era", color: "#e10600", from: 2022, to: 2025 },
  { key: "hybrid", label: "Hybrid Era", color: "#3ecfbf", from: 2014, to: 2021 },
  { key: "v8", label: "V8 Era", color: "#f5923e", from: 2006, to: 2013 },
  { key: "v10", label: "V10 Era", color: "#e0362c", from: 1995, to: 2005 },
  { key: "turbo-ban", label: "Turbo Ban Era", color: "#2f8a78", from: 1989, to: 1994 },
  { key: "turbo", label: "Turbo Era", color: "#a3261f", from: 1977, to: 1988 },
  { key: "ge-origins", label: "Ground Effect Origins", color: "#3b5bff", from: 1970, to: 1976 },
  { key: "wings", label: "Wings Revolution", color: "#3b5bff", from: 1968, to: 1969 },
  { key: "classic", label: "Classic Era", color: "#7a7f8a", from: 1950, to: 1967 },
];

function getEra(year: number): Era {
  return ERAS.find((e) => year >= e.from && year <= e.to) ?? ERAS[ERAS.length - 1];
}

interface SeasonPickerProps {
  year: number;
  onChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  recentCount?: number;
  availableYears?: number[]; // optional list of years that are actually available; if provided, only these years will be selectable
}

export function SeasonPicker({
  year,
  onChange,
  minYear = 1950,
  maxYear = new Date().getFullYear(),
  recentCount = 4,
  availableYears,
}: SeasonPickerProps) {
  const [open, setOpen] = useState(false);
  const recent = useMemo(
    () =>
      availableYears
        ? availableYears.slice(0, recentCount)
        : Array.from({ length: recentCount }, (_, i) => maxYear - i),
    [availableYears, maxYear, recentCount],
  );



  // If the selected year is older than the quick pills, show it as an extra pill.
  const stripYears = recent.includes(year) ? recent : [...recent, year];

  const decades = useMemo(() => {
    const result: { decade: number; years: number[]; eras: Era[] }[] = [];
    const firstDecade = Math.floor(minYear / 10) * 10;
    const lastDecade = Math.floor(maxYear / 10) * 10;

    for (let d = lastDecade; d >= firstDecade; d -= 10) {
      const years: number[] = [];
      for (let y = Math.min(d + 9, maxYear); y >= Math.max(d, minYear); y--) {
        years.push(y);
      }
      if (availableYears && !years.some((y) => availableYears.includes(y))) continue;
      const eras: Era[] = [];
      years.forEach((y) => {
        const era = getEra(y);
        if (!eras.includes(era)) eras.push(era);
      });
      result.push({ decade: d, years, eras });
    }
    return result;
  }, [minYear, maxYear, availableYears]);

  const usedEras = useMemo(() => {
    const seen = new Set<string>();
    decades.forEach((d) => d.eras.forEach((e) => seen.add(e.key)));
    return ERAS.filter((e) => seen.has(e.key));
  }, [decades]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function pick(y: number) {
    onChange(y);
    setOpen(false);
  }

  const total = availableYears ? availableYears.length : maxYear - minYear + 1;

  return (
    <>
      <div className="season-strip" role="group" aria-label="Season">
        {stripYears.map((y) => {
          const era = getEra(y);
          const active = y === year;
          return (
            <button
              key={y}
              type="button"
              className={`season-pill${active ? " is-active" : ""}`}
              aria-pressed={active}
              onClick={() => onChange(y)}
            >
              {!active && (
                <span className="season-dot" style={{ background: era.color }} />
              )}
              {y}
            </button>
          );
        })}

        <button
          type="button"
          className="season-pill season-all"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          All
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {open && createPortal (
        <div className="season-overlay" onClick={() => setOpen(false)}>
          <div
            className="season-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="season-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="season-modal-header">
              <div>
                <h2 id="season-modal-title">Select Season</h2>
                <p>{total} seasons of Formula 1 history</p>
              </div>
              <button
                type="button"
                className="season-close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="season-modal-body">
              {decades.map(({ decade, years, eras }) => (
                <section key={decade} className="season-decade">
                  <div className="season-decade-head">
                    <h3>{decade}s</h3>
                    <span className="season-decade-line" />
                    <div className="season-era-badges">
                      {eras.map((era) => (
                        <span
                          key={era.key}
                          className="season-era-badge"
                          style={{ ["--era" as string]: era.color }}
                        >
                          <span className="season-dot" />
                          {era.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="season-grid">
                    {years.map((y) => {
                      const era = getEra(y);
                      const active = y === year;
                      return (
                        <button
                          key={y}
                          type="button"
                          className={`season-cell${active ? " is-active" : ""}`}
                          aria-label={String(y)}
                          disabled={!!availableYears && !availableYears.includes(y)}
                          aria-pressed={active}
                          onClick={() => pick(y)}
                        >
                          {!active && (
                            <span className="season-dot" style={{ background: era.color }} />
                          )}
                          {String(y).slice(-2)}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <footer className="season-legend">
              {usedEras.map((era) => (
                <span key={era.key} className="season-legend-item">
                  <span className="season-dot" style={{ background: era.color }} />
                  {era.label}
                </span>
              ))}
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default SeasonPicker;