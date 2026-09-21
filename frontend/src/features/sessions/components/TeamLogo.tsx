import { useEffect, useMemo, useState } from "react";

// Team-name keyword -> logo file name (without extension).
// Only teams whose name has stayed the same are mapped, so a 1970 "Lotus"
// row never gets a modern logo of a different team.
const TEAM_SLUGS: [RegExp, string][] = [
  [/red bull/i, "red-bull"],
  [/racing bulls/i, "racing-bulls"],
  [/ferrari/i, "ferrari"],
  [/mercedes/i, "mercedes"],
  [/mclaren/i, "mclaren"],
  [/aston martin/i, "aston-martin"],
  [/alpine/i, "alpine"],
  [/williams/i, "williams"],
  [/haas/i, "haas"],
  [/sauber/i, "sauber"],
  [/audi/i, "audi"],
  [/cadillac/i, "cadillac"],
];

const EXTENSIONS = ["png", "svg", "webp"];
const BASE = "/images/teams";

function slugFor(team: string): string | null {
  for (const [pattern, slug] of TEAM_SLUGS) {
    if (pattern.test(team)) return slug;
  }
  return null;
}

/** ferrari -> [ferrari.png, ferrari.svg, ...]; red-bull -> red-bull / red_bull / redbull */
function candidatesFor(slug: string): string[] {
  const names = Array.from(
    new Set([slug, slug.replace(/-/g, "_"), slug.replace(/-/g, "")]),
  );
  return names.flatMap((n) => EXTENSIONS.map((ext) => `${BASE}/${n}.${ext}`));
}

interface TeamLogoProps {
  /** Team name as returned by the API, e.g. "Ferrari", "Haas F1 Team" */
  name: string;
  size?: number;
}

export default function TeamLogo({ name, size = 22 }: TeamLogoProps) {
  const candidates = useMemo(() => {
    const slug = slugFor(name);
    return slug ? candidatesFor(slug) : [];
  }, [name]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [name]);

  const src = candidates[index];
  if (!src) return null; // no logo for this team: the team name is still shown

  return (
    <img
      className="tl-logo"
      style={{ width: size, height: size }}
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}