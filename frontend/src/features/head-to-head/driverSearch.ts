import Fuse from "fuse.js";

// ---- Shape as it comes from /api/drivers/all -----------------------------

interface DriverRecord {
  driverId: string;
  number: number;
  givenName: string;
  familyName: string;
  nationality: string;
  born: string;
  debut: string;
  teamColor: string;
  image: string;
  teamLogo: string;
  flag: string;
  banner: string;
  carName: string;
  description: string;
  social: Record<string, string>;
  id: string;
}

// ---- Shape the H2H page expects (DriverSummary) --------------------------

export interface DriverSummary {
  driverId: string;
  code: string;
  number: number;
  fullName: string;
  team: string;
  teamColor: string;
  headshotUrl?: string;
}

function toSummary(d: DriverRecord): DriverSummary {
  return {
    driverId: d.driverId,
    // No 3-letter code in the data — derive one (first 3 letters of
    // surname, F1-style). Replace with a real `code` field if you add one.
    code: d.familyName.slice(0, 3).toUpperCase(),
    number: d.number,
    fullName: `${d.givenName} ${d.familyName}`,
    // No constructor/team name in this file — wire this up if you have
    // a separate teams.json or a `team` field elsewhere.
    team: d.carName ?? "",
    teamColor: d.teamColor,
    headshotUrl: d.image,
  };
}

// ---- Lazy-loaded, cached roster + Fuse index ------------------------------

let driversPromise: Promise<DriverRecord[]> | null = null;
let fusePromise: Promise<Fuse<DriverRecord>> | null = null;

function loadDrivers(): Promise<DriverRecord[]> {
  if (!driversPromise) {
    driversPromise = fetch("/api/drivers/all")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load driver roster");
        return res.json();
      })
      .catch((err) => {
        // Reset so a later call can retry instead of being stuck on a
        // rejected promise forever.
        driversPromise = null;
        throw err;
      });
  }
  return driversPromise;
}

async function getFuse(): Promise<Fuse<DriverRecord>> {
  if (!fusePromise) {
    fusePromise = loadDrivers().then(
      (drivers) =>
        new Fuse(drivers, {
          keys: [
            { name: "givenName", weight: 0.4 },
            { name: "familyName", weight: 0.5 },
            { name: "number", weight: 0.1 },
          ],
          threshold: 0.4, // 0 = exact match only, 1 = match almost anything.
          ignoreLocation: true,
          minMatchCharLength: 2,
        }),
    );
  }
  return fusePromise;
}

export async function searchDrivers(query: string): Promise<DriverSummary[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const drivers = await loadDrivers();

  // Exact number match (e.g. searching "44" or "1")
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber)) {
    const numberMatch = drivers.filter((d) => d.number === asNumber);
    if (numberMatch.length) return numberMatch.map(toSummary);
  }

  const fuse = await getFuse();
  return fuse
    .search(trimmed)
    .slice(0, 8)
    .map((result) => toSummary(result.item));
}