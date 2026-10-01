import Fuse from "fuse.js";



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


    code: d.familyName.slice(0, 3).toUpperCase(),
    number: d.number,
    fullName: `${d.givenName} ${d.familyName}`,


    team: d.carName ?? "",
    teamColor: d.teamColor,
    headshotUrl: d.image,
  };
}



let driversPromise: Promise<DriverRecord[]> | null = null;
let fusePromise: Promise<Fuse<DriverRecord>> | null = null;

function loadDrivers(): Promise<DriverRecord[]> {
  if (!driversPromise) {
    driversPromise = fetch(`${API_BASE_URL}/api/drivers/all`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load driver roster");
        return res.json();
      })
      .catch((err) => {


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
          threshold: 0.4,
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
import { API_BASE_URL } from "../../api/config";
