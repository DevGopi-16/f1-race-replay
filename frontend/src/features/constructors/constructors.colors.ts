const PLACEHOLDER_COLORS = new Set([
  "#888888",
  "#888",
  "gray",
  "grey",
]);

export function getTeamColor(team: { name?: string; color?: string }) {
  const raw = team.color?.trim();

  const isMissing = !raw || PLACEHOLDER_COLORS.has(raw.toLowerCase());

  if (!isMissing) {
    return raw;
  }

  const name = team.name ?? "unknown";
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;

  return `hsl(${hue}, 70%, 55%)`;
}