const TEAM_LOGOS: [string, string][] = [
  ["racing bulls", "rb.png"],
  ["visa cash app", "rb.png"],
  ["rb f1", "rb.png"],
  ["red bull", "red-bull.png"],
  ["aston martin", "aston-martin.png"],
  ["mercedes", "mercedes.png"],
  ["ferrari", "ferrari.png"],
  ["mclaren", "mclaren.png"],
  ["alpine", "alpine.png"],
  ["haas", "haas.png"],
  ["audi", "audi.png"],
  ["williams", "williams.png"],
  ["cadillac", "cadillac.png"],
];

export function getTeamLogo(team?: string): string | null {
  if (!team) return null;

  const name = team.trim().toLowerCase();
  const match = TEAM_LOGOS.find(([key]) => name.includes(key));

  return match ? `/images/teams/${match[1]}` : null;
}