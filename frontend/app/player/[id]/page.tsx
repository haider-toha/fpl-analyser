"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PlayerDetail } from "@/lib/types";
import { positionStyles, getFormColor, getDifficultyColor } from "@/lib/ui-utils";
import { StatCard } from "@/components/ui/StatCard";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = Number(params.id);

  const { data: player, isLoading, error } = useQuery<PlayerDetail>({
    queryKey: ["player", playerId],
    queryFn: () => api.getPlayer<PlayerDetail>(playerId),
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="container py-8">
        <div className="text-center py-16">
          <svg
            className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Player not found</h2>
          <p className="text-muted-foreground mb-4">
            We couldn&apos;t find the player you&apos;re looking for.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Back to Players
          </button>
        </div>
      </div>
    );
  }

  const posStyle = positionStyles[player.position];
  
  // Prepare chart data
  const historyData = (player.history || [])
    .slice(-10)
    .map((h) => ({
      gw: `GW${h.gameweek}`,
      points: h.points,
      minutes: h.minutes,
      bps: h.bps,
    }));

  // Get upcoming fixtures (now properly structured from backend)
  const upcomingFixtures = (player.fixtures || []).slice(0, 5);

  return (
    <div className="container py-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Players
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {/* Position color indicator */}
          <div
            className={cn(
              "w-2 h-16 rounded-full",
              posStyle?.bg || "bg-muted"
            )}
          />
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{player.web_name}</h1>
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-semibold border",
                  posStyle?.bg,
                  posStyle?.text,
                  posStyle?.border
                )}
              >
                {player.position_name}
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="font-medium">{player.team_name}</span>
              <span>•</span>
              <span>£{player.price.toFixed(1)}m</span>
              <span>•</span>
              <span>{player.selected_by_percent}% ownership</span>
            </div>
            {player.news && (
              <div className="flex items-center gap-2 mt-2 text-amber-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">{player.news}</span>
              </div>
            )}
          </div>
        </div>

        {/* Key stats on right */}
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold">{player.total_points}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Points</p>
          </div>
          <div className="text-center">
            <p className={cn("text-4xl font-bold", getFormColor(player.form))}>
              {player.form}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Form</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">
              {player.expected_points.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">xPts</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Goals"
          value={player.goals_scored}
          subValue={`${player.xg.toFixed(2)} xG`}
        />
        <StatCard
          label="Assists"
          value={player.assists}
          subValue={`${player.xa.toFixed(2)} xA`}
        />
        <StatCard
          label="Clean Sheets"
          value={player.clean_sheets}
        />
        <StatCard
          label="Minutes"
          value={player.minutes.toLocaleString()}
          subValue={`${((player.minutes / (38 * 90)) * 100).toFixed(0)}% available`}
        />
        <StatCard
          label="Pts/Game"
          value={player.points_per_game.toFixed(1)}
        />
        <StatCard
          label="xGI"
          value={player.xgi.toFixed(2)}
          subValue="Expected goal involvement"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Points History */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Points History</h3>
          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="gw"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="points"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#pointsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No history data available
            </div>
          )}
        </div>

        {/* BPS History */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Bonus Points System</h3>
          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={historyData}>
                <XAxis
                  dataKey="gw"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="bps"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No BPS data available
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Fixtures */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Upcoming Fixtures</h3>
        {upcomingFixtures.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {upcomingFixtures.map((fixture, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 min-w-[120px] bg-muted/50 border border-border rounded-lg p-4 text-center"
              >
                <p className="text-xs text-muted-foreground mb-2">GW{fixture.gameweek}</p>
                <p className="font-semibold mb-2">
                  {fixture.is_home ? "vs" : "@"} {fixture.team_name}
                </p>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center mx-auto text-white font-bold text-sm",
                    getDifficultyColor(fixture.difficulty)
                  )}
                >
                  {fixture.difficulty}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No upcoming fixtures available</p>
        )}
      </div>

      {/* Recent Gameweeks Table */}
      {player.history && player.history.length > 0 && (
        <div className="bg-card border border-border rounded-xl mt-6 overflow-hidden">
          <div className="p-6 pb-4">
            <h3 className="text-lg font-semibold">Gameweek History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                    GW
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                    Pts
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                    Min
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                    G
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                    A
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                    CS
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                    Bonus
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                    BPS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {player.history.slice(-10).reverse().map((h) => (
                  <tr key={h.gameweek} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">GW{h.gameweek}</td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">
                      {h.points}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                      {h.minutes}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {h.goals_scored > 0 ? (
                        <span className="text-emerald-400">{h.goals_scored}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {h.assists > 0 ? (
                        <span className="text-sky-400">{h.assists}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {h.clean_sheets > 0 ? (
                        <span className="text-amber-400">{h.clean_sheets}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {h.bonus > 0 ? (
                        <span className="text-purple-400">{h.bonus}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                      {h.bps}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

