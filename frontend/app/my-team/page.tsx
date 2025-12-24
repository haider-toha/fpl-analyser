"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SquadPlayer {
  id: number;
  web_name: string;
  team_name: string;
  position: number;
  position_name: string;
  price: number;
  total_points: number;
  form: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  multiplier: number;
  squad_position: number;
}

interface ManagerData {
  id: number;
  name: string;
  team_name: string;
  overall_points: number;
  overall_rank: number;
  gameweek_points: number;
  squad: SquadPlayer[];
  bank: number;
  team_value: number;
}

const positionStyles: Record<number, string> = {
  1: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  2: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  3: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  4: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function MyTeamPage() {
  const [managerId, setManagerId] = useState("");
  const [searchId, setSearchId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<ManagerData>({
    queryKey: ["manager", searchId],
    queryFn: () => api.getManager(searchId!),
    enabled: !!searchId,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(managerId);
    if (!isNaN(id) && id > 0) {
      setSearchId(id);
    }
  };

  const startingXI = data?.squad?.filter((p) => p.squad_position <= 11) || [];
  const bench = data?.squad?.filter((p) => p.squad_position > 11) || [];

  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">My Team</h1>
        <p className="text-muted-foreground mt-1">
          View your FPL squad and performance
        </p>
      </div>

      {/* Manager ID input */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter your FPL Manager ID..."
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            className="flex-1 h-10 px-4 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          />
          <button
            type="submit"
            className="h-10 px-5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Load Team
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Find your ID on the FPL website under Points → check the URL
        </p>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-md border border-destructive/50 bg-destructive/5 text-destructive text-sm mb-6">
          Failed to load manager: {(error as Error).message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      )}

      {/* Manager info */}
      {data && (
        <div className="space-y-6 animate-fade-in">
          {/* Stats Header */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4">
              <h2 className="text-lg font-medium">{data.team_name}</h2>
              <p className="text-sm text-muted-foreground">{data.name}</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Overall Points
                </p>
                <p className="text-xl font-medium tabular-nums mt-1">
                  {data.overall_points?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Overall Rank
                </p>
                <p className="text-xl font-medium tabular-nums mt-1">
                  {data.overall_rank?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  GW Points
                </p>
                <p className="text-xl font-medium tabular-nums mt-1 text-primary">
                  {data.gameweek_points}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Team Value
                </p>
                <p className="text-xl font-medium tabular-nums mt-1">
                  £{data.team_value?.toFixed(1)}m
                </p>
              </div>
            </div>
          </div>

          {/* Starting XI */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Starting XI
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="data-table">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-[40%]">Player</th>
                    <th className="w-[20%]">Position</th>
                    <th className="text-right w-[20%]">Points</th>
                    <th className="text-right w-[20%]">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {startingXI.map((player) => (
                    <tr key={player.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{player.web_name}</span>
                          {player.is_captain && (
                            <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-2xs font-medium">
                              C
                            </span>
                          )}
                          {player.is_vice_captain && (
                            <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-2xs font-medium">
                              V
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {player.team_name}
                        </span>
                      </td>
                      <td>
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded text-xs font-medium",
                            positionStyles[player.position]
                          )}
                        >
                          {player.position_name}
                        </span>
                      </td>
                      <td className="text-right font-medium tabular-nums">
                        {player.total_points}
                      </td>
                      <td className="text-right tabular-nums text-primary">
                        {player.form}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bench */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Bench
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="data-table">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-[40%]">Player</th>
                    <th className="w-[20%]">Position</th>
                    <th className="text-right w-[20%]">Points</th>
                    <th className="text-right w-[20%]">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {bench.map((player) => (
                    <tr key={player.id} className="text-muted-foreground">
                      <td>
                        <span className="font-medium text-foreground">
                          {player.web_name}
                        </span>
                        <span className="text-xs block">{player.team_name}</span>
                      </td>
                      <td>
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded text-xs font-medium opacity-60",
                            positionStyles[player.position]
                          )}
                        >
                          {player.position_name}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">
                        {player.total_points}
                      </td>
                      <td className="text-right tabular-nums">
                        {player.form}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank */}
          <p className="text-sm text-muted-foreground">
            Bank: £<span className="tabular-nums">{data.bank?.toFixed(1)}m</span>
          </p>
        </div>
      )}

      {/* Empty state */}
      {!searchId && !isLoading && (
        <div className="text-center py-16 rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground">
            Enter your FPL Manager ID to view your team
          </p>
        </div>
      )}
    </div>
  );
}
