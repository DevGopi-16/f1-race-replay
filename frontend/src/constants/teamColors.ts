export const TEAM_COLORS: Record<string, string> = {
  Mercedes: "#27F4D2",
  "Red Bull Racing": "#3671C6",
  Ferrari: "#E8002D",
  McLaren: "#FF8000",
  "Aston Martin": "#229971",
  Alpine: "#FF87BC",
  Williams: "#64C4FF",
  "Racing Bulls": "#6692FF",
  "Kick Sauber": "#52E252",
  Haas: "#E6002B",
  Audi: "#F50537",
  Cadillac: "#C0C0C0",
};

function normalizeTeamName(name: string) {
  return name
    .replace(/\s*F1 Team$/i, "")
    .replace(/^RB$/i, "Racing Bulls")
    .trim();
}

export function getTeamColor(team: { name?: string; color?: string }) {
  if (team.name) {
    const normalized = normalizeTeamName(team.name);

    if (TEAM_COLORS[normalized]) {
      return TEAM_COLORS[normalized];
    }
  }

  return team.color || "#8b93a3";
}