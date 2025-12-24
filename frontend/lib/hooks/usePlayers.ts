"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UsePlayersParams {
  position?: number;
  team?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  limit?: number;
}

export function usePlayers(params: UsePlayersParams = {}) {
  return useQuery({
    queryKey: ["players", params],
    queryFn: () =>
      api.getPlayers({
        position: params.position,
        team: params.team,
        min_price: params.minPrice,
        max_price: params.maxPrice,
        sort_by: params.sortBy,
        limit: params.limit,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
