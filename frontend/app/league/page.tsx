"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Standing {
  id: number;
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  total: number;
  event_total: number;
}

interface LeagueData {
  league: {
    id: number;
    name: string;
    created: string;
  };
  standings: {
    results: Standing[];
    has_next: boolean;
  };
}

export default function LeaguePage() {
  const [leagueId, setLeagueId] = useState("");
  const [searchId, setSearchId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<LeagueData>({
    queryKey: ["league", searchId],
    queryFn: () => api.getLeague(searchId!),
    enabled: !!searchId,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(leagueId);
    if (!isNaN(id) && id > 0) {
      setSearchId(id);
    }
  };

  const standings = data?.standings?.results || [];

  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">League</h1>
        <p className="text-muted-foreground mt-1">
          View mini-league standings and rankings
        </p>
      </div>

      {/* League ID input */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter League ID..."
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="flex-1 h-10 px-4 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          />
          <button
            type="submit"
            className="h-10 px-5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Load League
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Find your league ID in the URL when viewing your league on the FPL website
        </p>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-md border border-destructive/50 bg-destructive/5 text-destructive text-sm mb-6">
          Failed to load league: {(error as Error).message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      )}

      {/* League info */}
      {data && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-medium">{data.league?.name}</h2>
          </div>

          {/* Standings table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="data-table">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-16 text-center">Rank</th>
                  <th className="w-[35%]">Team</th>
                  <th className="w-[25%]">Manager</th>
                  <th className="text-right">GW</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((entry, idx) => {
                  const rankChange = entry.last_rank - entry.rank;
                  return (
                    <tr key={entry.entry}>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={cn(
                            "font-medium tabular-nums",
                            idx === 0 && "text-primary"
                          )}>
                            {entry.rank}
                          </span>
                          {rankChange !== 0 && (
                            <span className={cn(
                              "text-2xs font-medium",
                              rankChange > 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {rankChange > 0 ? `↑${rankChange}` : `↓${Math.abs(rankChange)}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="font-medium">{entry.entry_name}</td>
                      <td className="text-muted-foreground">{entry.player_name}</td>
                      <td className="text-right tabular-nums">{entry.event_total}</td>
                      <td className="text-right font-medium tabular-nums">
                        {entry.total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {standings.length === 0 && !isLoading && (
              <div className="p-12 text-center text-muted-foreground">
                No standings found
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Showing {standings.length} managers
          </p>
        </div>
      )}

      {/* Empty state */}
      {!searchId && !isLoading && (
        <div className="text-center py-16 rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground">
            Enter a League ID to view standings
          </p>
        </div>
      )}
    </div>
  );
}
