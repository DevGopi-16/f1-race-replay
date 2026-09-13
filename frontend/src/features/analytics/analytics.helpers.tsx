import { useState } from "react";

const DRIVER_IMAGES: Record<string, string> = {
  ALB: "/images/drivers/albon.png",
  ANT: "/images/drivers/antonelli.png",
  ALO: "/images/drivers/alonso.png",
  BEA: "/images/drivers/bearman.png",
  BOT: "/images/drivers/bottas.png",
  COL: "/images/drivers/colapinto.png",
  GAS: "/images/drivers/gasly.png",
  HAD: "/images/drivers/hadjar.png",
  HAM: "/images/drivers/hamilton.png",
  LAW: "/images/drivers/lawson.png",
  LEC: "/images/drivers/leclerc.png",
  NOR: "/images/drivers/norris.png",
  OCO: "/images/drivers/ocon.png",
  PER: "/images/drivers/perez.png",
  PIA: "/images/drivers/piastri.png",
  RUS: "/images/drivers/russell.png",
  SAI: "/images/drivers/sainz.png",
  STR: "/images/drivers/stroll.png",
  TSU: "/images/drivers/tsunoda.png",
  VER: "/images/drivers/verstappen.png",
  BOR: "/images/drivers/bortoleto.png",
  HUL: "/images/drivers/hulkenberg.png",
  LIN: "/images/drivers/lindblad.png",
};

function getDriverImage(code: string) {
  const normalized = code.toUpperCase();

  return (
    DRIVER_IMAGES[normalized] ??
    `/images/drivers/${normalized.toLowerCase()}.png`
  );
}

const TEAM_LOGOS: Record<string, string> = {
  alpine: "/images/teams/alpine.png",
  astonmartin: "/images/teams/aston-martin.png",
  aston: "/images/teams/aston-martin.png",
  ferrari: "/images/teams/ferrari.png",
  haas: "/images/teams/haas.png",
  kicksauber: "/images/teams/audi.png",
  sauber: "/images/teams/audi.png",
  audi: "/images/teams/audi.png",
  mclaren: "/images/teams/mclaren.png",
  mercedes: "/images/teams/mercedes.png",
  redbull: "/images/teams/red-bull.png",
  redbullracing: "/images/teams/red-bull.png",
  redbullf1team: "/images/teams/red-bull.png",
  racingbulls: "/images/teams/rb.png",
  rb: "/images/teams/rb.png",
  rbf1team: "/images/teams/rb.png",
  williams: "/images/teams/williams.png",
  cadillac: "/images/teams/cadillac.png",
};

function normalizeTeamName(team: string) {
  return team
    .toLowerCase()
    .trim()
    .replace(/formula 1/g, "")
    .replace(/f1/g, "")
    .replace(/racing/g, "")
    .replace(/team/g, "")
    .replace(/motorsport/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getTeamLogo(team: string | null) {
  if (!team) return null;

  const normalized = normalizeTeamName(team);

  return TEAM_LOGOS[normalized] ?? null;
}

export function getTeamColor(team: string | null) {
  if (!team) return "rgba(255, 255, 255, 0.45)";

  const normalized = team.toLowerCase().trim();

  if (normalized.includes("ferrari")) return "#E80020";
  if (normalized.includes("mercedes")) return "#00A19C";
  if (normalized.includes("mclaren")) return "#FF8000";
  if (normalized.includes("red bull") || normalized.includes("redbull"))
    return "#3671C6";
  if (normalized.includes("aston martin")) return "#229971";
  if (normalized.includes("alpine")) return "#FF87BC";
  if (normalized.includes("williams")) return "#64C4FF";
  if (
    normalized.includes("racing bulls") ||
    normalized === "rb" ||
    normalized.includes(" rb")
  )
    return "#6692FF";
  if (
    normalized.includes("sauber") ||
    normalized.includes("kick sauber") ||
    normalized.includes("audi")
  )
    return "#52E252";
  if (normalized.includes("haas")) return "#B6BABD";
  if (normalized.includes("cadillac")) return "#D0D0D0";

  return "rgba(255, 255, 255, 0.45)";
}

export function getCountryFlag(country: string | null) {
  if (!country) return "";

  const normalized = country.trim().toLowerCase();

  const flags: Record<string, string> = {
    uk: "🇬🇧",
    "united kingdom": "🇬🇧",
    england: "🇬🇧",
    monaco: "🇲🇨",
    italy: "🇮🇹",
    netherlands: "🇳🇱",
    australia: "🇦🇺",
    spain: "🇪🇸",
    germany: "🇩🇪",
    france: "🇫🇷",
    canada: "🇨🇦",
    japan: "🇯🇵",
    thailand: "🇹🇭",
    mexico: "🇲🇽",
    brazil: "🇧🇷",
    finland: "🇫🇮",
    denmark: "🇩🇰",
    china: "🇨🇳",
    newzealand: "🇳🇿",
    "new zealand": "🇳🇿",
    unitedstates: "🇺🇸",
    "united states": "🇺🇸",
    usa: "🇺🇸",
    switzerland: "🇨🇭",
    belgium: "🇧🇪",
    argentina: "🇦🇷",
    "south africa": "🇿🇦",
  };

  return flags[normalized] ?? "";
}

export function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export function formatAverageFinish(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(1);
}

export function getPerformanceScore(performance: { overall: number }) {
  return typeof performance.overall === "number" &&
    Number.isFinite(performance.overall)
    ? performance.overall
    : null;
}

export function DriverImage({
  code,
  name,
  size = "normal",
}: {
  code: string;
  name: string;
  size?: "small" | "normal" | "large";
}) {
  const [failed, setFailed] = useState(false);
  const image = getDriverImage(code);

  if (failed) {
    return (
      <div
        className={`analytics-driver-avatar analytics-driver-avatar-${size} analytics-driver-avatar-fallback`}
        aria-label={name}
      >
        {code.slice(0, 3)}
      </div>
    );
  }

  return (
    <div className={`analytics-driver-avatar analytics-driver-avatar-${size}`}>
      <img
        src={image}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function TeamLogo({
  team,
  size = "normal",
}: {
  team: string | null;
  size?: "small" | "normal";
}) {
  const [failed, setFailed] = useState(false);
  const logo = getTeamLogo(team);

  if (!team || !logo || failed) {
    return (
      <div
        className={`analytics-team-logo analytics-team-logo-${size} analytics-team-logo-fallback`}
        aria-label={team ?? "Unknown team"}
      >
        {team
          ? team
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 3)
              .toUpperCase()
          : "—"}
      </div>
    );
  }

  return (
    <div className={`analytics-team-logo analytics-team-logo-${size}`}>
      <img
        src={logo}
        alt={`${team} logo`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}