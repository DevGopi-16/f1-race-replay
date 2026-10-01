import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../api/client";
import { getDriversPanel } from "../../api/drivers";

import type { NextSession } from "./home.types";

const DRIVER_PAGE_SEASON = new Date().getFullYear();

export interface HomeDriver {
  driverId: string;
  code: string;
  number: number;
  givenName: string;
  familyName: string;
  team: string;
  teamColor: string;
  image: string;
  teamLogo: string;
  position: number | null;
  points: number;
}

export function useNextSession() {
  return useQuery({
    queryKey: ["next-session", new Date().getFullYear()],
    queryFn: () =>
      apiGet<NextSession>(
        `/api/next-session?year=${new Date().getFullYear()}`,
      ),
    staleTime: 60_000,
    retry: 2,
  });
}

export function useHomeDrivers() {
  return useQuery({
    queryKey: ["home-driver-standings", DRIVER_PAGE_SEASON],
    queryFn: async () => {
      const [roster, standings] = await Promise.all([
        apiGet<HomeDriver[]>("/api/drivers/all"),
        getDriversPanel(DRIVER_PAGE_SEASON),
      ]);
      const standingsById = new Map(
        standings.map((driver) => [
          typeof driver.driverId === "string" ? driver.driverId : "",
          driver,
        ]),
      );

      return roster
        .map((driver) => {
          const standing = standingsById.get(driver.driverId);
          return {
            ...driver,
            code:
              typeof standing?.code === "string"
                ? standing.code
                : driver.familyName.slice(0, 3).toUpperCase(),
            team:
              typeof standing?.team === "string"
                ? standing.team
                : "",
            teamColor:
              typeof standing?.color === "string"
                ? standing.color
                : driver.teamColor,
            teamLogo:
              typeof standing?.teamLogo === "string" && standing.teamLogo
                ? standing.teamLogo
                : driver.teamLogo,
            position: numericValue(standing?.position),
            points: numericValue(standing?.points) ?? 0,
          };
        })
        .sort((a, b) => {
          const pointsOrder = b.points - a.points;
          if (pointsOrder !== 0) return pointsOrder;
          return (a.position ?? Infinity) - (b.position ?? Infinity);
        });
    },
    staleTime: 60 * 60_000,
    retry: 1,
  });
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
