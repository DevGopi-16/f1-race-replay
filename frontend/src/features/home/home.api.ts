import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../api/client";
import type { HomeOverview } from "./home.types";

export function useHomeOverview() {
  return useQuery({
    queryKey: ["home-overview"],

    queryFn: () =>
      apiGet<HomeOverview>("/home-overview"),

    staleTime: 60_000,

    retry: 2,
  });
}
