export type CircuitStyle = "detailed" | "minimal";
export type CircuitTone =
  | "white-outline"
  | "white"
  | "black-outline"
  | "black";

const NAME_MATCHERS: Array<{ test: RegExp; slug: string }> = [
  { test: /azerbaijan|baku/i, slug: "baku-1" },
  { test: /australia|melbourne/i, slug: "melbourne-2" },
  { test: /chinese|shanghai/i, slug: "shanghai-1" },
  { test: /japan|suzuka/i, slug: "suzuka-2" },
  { test: /bahrain/i, slug: "bahrain-1" },
  { test: /saudi|jeddah/i, slug: "jeddah-1" },
  { test: /miami/i, slug: "miami-1" },
  { test: /emilia|imola/i, slug: "imola-3" },
  { test: /monaco/i, slug: "monaco-6" },
  { test: /spain|catalunya|barcelona/i, slug: "catalunya-6" },
  { test: /madrid|madring/i, slug: "madring-1" },
  { test: /canada|montreal/i, slug: "montreal-6" },
  { test: /austria|spielberg|red bull ring/i, slug: "spielberg-3" },
  { test: /britain|silverstone/i, slug: "silverstone-8" },
  { test: /belgium|spa/i, slug: "spa-francorchamps-4" },
  { test: /hungary|hungaroring|budapest/i, slug: "hungaroring-3" },
  { test: /netherlands|zandvoort|dutch/i, slug: "zandvoort-5" },
  { test: /italian|monza/i, slug: "monza-7" },
  { test: /singapore|marina bay/i, slug: "marina-bay-4" },
  { test: /united states|austin|cota/i, slug: "austin-1" },
  { test: /mexico|hermanos rodr/i, slug: "mexico-city-3" },
  { test: /brazil|s[aã]o paulo|interlagos|jos[eé] carlos pace/i, slug: "interlagos-2" },
  { test: /las vegas/i, slug: "las-vegas-1" },
  { test: /qatar|lusail/i, slug: "lusail-1" },
  { test: /abu dhabi|yas marina/i, slug: "yas-marina-2" },
];

const COUNTRY_FALLBACK: Record<string, string> = {
  Australia: "melbourne-2",
  China: "shanghai-1",
  Japan: "suzuka-2",
  Bahrain: "bahrain-1",
  "Saudi Arabia": "jeddah-1",
  Monaco: "monaco-6",
  Spain: "catalunya-6",
  Canada: "montreal-6",
  Austria: "spielberg-3",
  "United Kingdom": "silverstone-8",
  Belgium: "spa-francorchamps-4",
  Hungary: "hungaroring-3",
  Netherlands: "zandvoort-5",
  Italy: "monza-7",
  Singapore: "marina-bay-4",
  Azerbaijan: "baku-1",
  Mexico: "mexico-city-3",
  Brazil: "interlagos-2",
  Qatar: "lusail-1",
  "United Arab Emirates": "yas-marina-2",
};

export function getCircuitSlug(eventName: string, country?: string): string | null {
  for (const matcher of NAME_MATCHERS) {
    if (matcher.test.test(eventName)) return matcher.slug;
  }
  if (country && COUNTRY_FALLBACK[country]) return COUNTRY_FALLBACK[country];
  return null;
}


export interface CircuitMeta {
  displayName: string;
  lengthKm: number;
  turns: number;
}

const CIRCUIT_META: Record<string, CircuitMeta> = {
  "baku-1": { displayName: "Baku", lengthKm: 6.003, turns: 20 },
  "melbourne-2": { displayName: "Melbourne", lengthKm: 5.278, turns: 14 },
  "shanghai-1": { displayName: "Shanghai", lengthKm: 5.451, turns: 16 },
  "suzuka-2": { displayName: "Suzuka", lengthKm: 5.807, turns: 18 },
  "bahrain-1": { displayName: "Sakhir", lengthKm: 5.412, turns: 15 },
  "jeddah-1": { displayName: "Jeddah", lengthKm: 6.174, turns: 27 },
  "miami-1": { displayName: "Miami", lengthKm: 5.412, turns: 19 },
  "monaco-6": { displayName: "Monaco", lengthKm: 3.337, turns: 19 },
  "catalunya-6": { displayName: "Barcelona", lengthKm: 4.657, turns: 14 },
  "madring-1": { displayName: "Madrid", lengthKm: 5.474, turns: 22 },
  "montreal-6": { displayName: "Montreal", lengthKm: 4.361, turns: 14 },
  "spielberg-3": { displayName: "Spielberg", lengthKm: 4.318, turns: 10 },
  "silverstone-8": { displayName: "Silverstone", lengthKm: 5.891, turns: 18 },
  "spa-francorchamps-4": { displayName: "Spa-Francorchamps", lengthKm: 7.004, turns: 19 },
  "hungaroring-3": { displayName: "Budapest", lengthKm: 4.381, turns: 14 },
  "zandvoort-5": { displayName: "Zandvoort", lengthKm: 4.259, turns: 14 },
  "monza-7": { displayName: "Monza", lengthKm: 5.793, turns: 11 },
  "marina-bay-4": { displayName: "Singapore", lengthKm: 4.940, turns: 19 },
  "austin-1": { displayName: "Austin", lengthKm: 5.513, turns: 20 },
  "mexico-city-3": { displayName: "Mexico City", lengthKm: 4.304, turns: 17 },
  "interlagos-2": { displayName: "São Paulo", lengthKm: 4.309, turns: 15 },
  "las-vegas-1": { displayName: "Las Vegas", lengthKm: 6.201, turns: 17 },
  "lusail-1": { displayName: "Lusail", lengthKm: 5.419, turns: 16 },
  "yas-marina-2": { displayName: "Abu Dhabi", lengthKm: 5.281, turns: 16 },
};

export function getCircuitMeta(
  eventName: string,
  country?: string,
): CircuitMeta | null {
  const slug = getCircuitSlug(eventName, country);
  if (!slug) return null;
  return CIRCUIT_META[slug] ?? null;
}

export function getCircuitSvgUrl(
  eventName: string,
  country?: string,
  style: CircuitStyle = "detailed",
  tone: CircuitTone = "white-outline",
): string | null {
  const slug = getCircuitSlug(eventName, country);
  if (!slug) return null;
  return `/images/circuits/${style}/${tone}/${slug}.svg`;
}