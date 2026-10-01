import HeadToHeadPage from "./HeadToHeadPage";
import { searchDrivers } from "./driverSearch";

// Map a backend driver object to the DriverSummary shape the page expects.
function toSummary(d: any) {
  return {
    driverId: d.driverId,
    code: d.code,
    number: d.number ?? 0,
    fullName: d.name,
    team: d.team,
    teamColor: d.color,
    headshotUrl: d.image || undefined,
  };
}

async function fetchHeadToHead(driverAId: string, driverBId: string) {
  const year = new Date().getFullYear();
  const res = await fetch(
    `/api/head-to-head?driverA=${encodeURIComponent(driverAId)}&driverB=${encodeURIComponent(driverBId)}&year=${year}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to load head-to-head (${res.status}): ${await res.text()}`);
  }

  const { driverA: a, driverB: b, headToHeadRecord } = await res.json();

  return {
    driverA: toSummary(a),
    driverB: toSummary(b),
    careerStats: { driverA: a.career_alltime, driverB: b.career_alltime },
    driverDna: {
      driverA: { performance_index: a.performance_index, circuit_dna: a.circuit_dna },
      driverB: { performance_index: b.performance_index, circuit_dna: b.circuit_dna },
    },
    headToHeadRecord: headToHeadRecord ?? null,
    relativePerformance: { driverA: a.teammate_battle, driverB: b.teammate_battle },
    allTimeRankings: null, // backend doesn't compute this yet
    careerTrajectory: { driverA: a.season_journey, driverB: b.season_journey },
  };
}

export default function HeadToHeadPageContainer() {
  return (
    <HeadToHeadPage
      searchDrivers={searchDrivers}
      fetchHeadToHead={fetchHeadToHead}
    />
  );
}