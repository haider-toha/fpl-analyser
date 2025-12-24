"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useGameweekData() {
  return useQuery({
    queryKey: ["gameweek"],
    queryFn: () => api.getCurrentGameweek(),
    refetchInterval: 60000, // Refetch every minute
  });
}

