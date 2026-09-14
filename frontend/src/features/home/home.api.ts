import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../api/client";

import type { NextSession } from "./home.types";

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
