"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { Player } from "@/lib/types";
import { cn } from "@/lib/utils";
import { positionStyles, getFormStyle, getOwnershipStyle } from "@/lib/ui-utils";

const positions = [
  { id: 0, name: "All" },
  { id: 1, name: "GK" },
  { id: 2, name: "DEF" },
  { id: 3, name: "MID" },
  { id: 4, name: "FWD" },
];

export default function PlayersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState(0);
  const [sortBy, setSortBy] = useState("total_points");

  const { data, isLoading, error } = usePlayers({
    position: position || undefined,
    sortBy,
    limit: 200,
  });

  const players: Player[] = data?.players || [];

  const filteredPlayers = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.web_name.toLowerCase().includes(search.toLowerCase()) ||
      p.team_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Players
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse and analyze Premier League players
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10 pr-4 w-72 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-lg">
          {positions.map((p) => (
            <button
              key={p.id}
              onClick={() => setPosition(p.id)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                position === p.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-10 px-4 pr-10 rounded-lg border border-border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary appearance-none cursor-pointer transition-all"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em'
          }}
        >
          <option value="total_points">Sort by Points</option>
          <option value="form">Sort by Form</option>
          <option value="price">Sort by Price</option>
          <option value="selected_by">Sort by Ownership</option>
        </select>

        {/* Stats summary */}
        {!isLoading && (
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-1 bg-muted rounded-md font-medium">
              {filteredPlayers.length} players
            </span>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm mb-6 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Failed to load players: {(error as Error).message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-1">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-muted/50 animate-pulse rounded-lg"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      )}

      {/* Players table */}
      {!isLoading && !error && (
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Sticky header */}
              <thead className="bg-muted/80 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 px-4 w-12">
                    #
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 px-4 min-w-[280px]">
                    Player
                  </th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 px-4 w-28">
                    Position
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 px-4 w-24">
                    Price
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 px-4 w-24">
                    Points
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 px-4 w-32">
                    Form
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 px-4 w-24">
                    Own%
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPlayers.map((player, idx) => {
                  const formStyle = getFormStyle(player.form);
                  const posStyle = positionStyles[player.position];
                  
                  return (
                    <tr
                      key={player.id}
                      onClick={() => router.push(`/player/${player.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted"
                    >
                      {/* Rank */}
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-muted-foreground tabular-nums">
                          {idx + 1}
                        </span>
                      </td>

                      {/* Player info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {/* Position color indicator */}
                          <div
                            className={cn(
                              "w-1 h-10 rounded-full flex-shrink-0",
                              posStyle?.bg || "bg-muted"
                            )}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground truncate">
                                {player.web_name}
                              </span>
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {player.team_name}
                              </span>
                            </div>
                            {player.news && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <svg
                                  className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="text-xs text-amber-500 truncate max-w-[280px]">
                                  {player.news}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Position badge */}
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold border",
                              posStyle?.bg,
                              posStyle?.text,
                              posStyle?.border
                            )}
                          >
                            {player.position_name}
                          </span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold tabular-nums text-foreground">
                          £{player.price.toFixed(1)}m
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-bold tabular-nums text-foreground text-base">
                          {player.total_points}
                        </span>
                      </td>

                      {/* Form with visual bar */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-3">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", formStyle.bg)}
                              style={{ width: formStyle.width }}
                            />
                          </div>
                          <span
                            className={cn(
                              "font-bold tabular-nums min-w-[2.5rem] text-right",
                              formStyle.text
                            )}
                          >
                            {player.form}
                          </span>
                        </div>
                      </td>

                      {/* Ownership */}
                      <td className="py-4 px-4 text-right">
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            getOwnershipStyle(player.selected_by_percent)
                          )}
                        >
                          {player.selected_by_percent}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredPlayers.length === 0 && (
            <div className="p-16 text-center">
              <svg
                className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-muted-foreground font-medium">No players found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
