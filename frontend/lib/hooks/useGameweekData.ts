"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface GameweekInfo {
  id: number;
  name: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  deadline_time: string;
}

export interface GameweekData {
  current: GameweekInfo | null;
  next: GameweekInfo | null;
  events: GameweekInfo[];
}

export function useGameweekData() {
  return useQuery<GameweekData>({
    queryKey: ["gameweek"],
    queryFn: () => api.getCurrentGameweek<GameweekData>(),
    refetchInterval: 60000, // Refetch every minute
  });
}
