"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  VORRanking,
  MatchPrediction,
  ChipStrategy,
} from "@/lib/types";
import { positionStyles, positionLabels, getFDRStyle, getRankImpactStyle } from "@/lib/ui-utils";
import { StatCard } from "@/components/ui/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

// Premium SVG Icons
const Icons = {
  wildcard: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  benchBoost: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  tripleCaptain: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  ),
  freeHit: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  medal1: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
};

interface Differential {
  id: number;
  name: string;
  position: number;
  price: number;
  expected_points: number;
  ownership: number;
  differential_ev: number;
  captain_differential_ev: number;
  rank_impact: string;
}

interface FixtureRanking {
  team_id: number;
  team_name: string;
  rank: number;
  fdr: number;
  num_fixtures: number;
  double_gws: number;
  blank_gws: number;
  fixture_swing: number;
}

type Tab = "vor" | "fixtures" | "differentials" | "predictions" | "chips";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("vor");
  const [vorRankings, setVorRankings] = useState<VORRanking[]>([]);
  const [fixtureRankings, setFixtureRankings] = useState<FixtureRanking[]>([]);
  const [differentials, setDifferentials] = useState<Differential[]>([]);
  const [matchPredictions, setMatchPredictions] = useState<MatchPrediction[]>([]);
  const [positionFilter, setPositionFilter] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, positionFilter]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case "vor":
          const vorData = await api.getVORRankings(1, positionFilter);
          setVorRankings(vorData.rankings || []);
          break;
        case "fixtures":
          const fixtureData = await api.getFixtureAnalysis({
            start_gw: 1,
            end_gw: 6,
            position_type: "overall",
          });
          setFixtureRankings(fixtureData.rankings || []);
          break;
        case "differentials":
          const diffData = await api.getCaptainDifferentials(5.0, 15.0);
          setDifferentials(diffData.captain_differentials || []);
          break;
        case "predictions":
          const predData = await api.getMatchPredictions();
          setMatchPredictions(predData.predictions || []);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { 
      id: "vor", 
      label: "VOR Rankings",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    { 
      id: "fixtures", 
      label: "Fixtures",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: "differentials", 
      label: "Differentials",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    },
    { 
      id: "predictions", 
      label: "Predictions",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      id: "chips", 
      label: "Chip Strategy",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
  ];

  return (
    <div className="container py-8">
      {/* Header with gradient accent */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-primary to-primary/50" />
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        </div>
        <p className="text-muted-foreground ml-4">
          ML-powered insights and advanced statistics for optimal FPL decisions
        </p>
      </div>

      {/* Enhanced Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/50 bg-destructive/5 text-destructive mb-6">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Loading analytics...</p>
          </div>
        ) : (
          <>
            {activeTab === "vor" && (
              <VORPanel
                rankings={vorRankings}
                positionFilter={positionFilter}
                onPositionChange={setPositionFilter}
              />
            )}
            {activeTab === "fixtures" && <FixturesPanel rankings={fixtureRankings} />}
            {activeTab === "differentials" && <DifferentialsPanel differentials={differentials} />}
            {activeTab === "predictions" && <PredictionsPanel predictions={matchPredictions} />}
            {activeTab === "chips" && <ChipsPanel />}
          </>
        )}
      </div>
    </div>
  );
}

function VORPanel({
  rankings,
  positionFilter,
  onPositionChange,
}: {
  rankings: VORRanking[];
  positionFilter: number | undefined;
  onPositionChange: (pos: number | undefined) => void;
}) {
  const positions = [
    { value: undefined, label: "All", color: "text-foreground" },
    { value: 1, label: "GK", color: "text-amber-400" },
    { value: 2, label: "DEF", color: "text-emerald-400" },
    { value: 3, label: "MID", color: "text-sky-400" },
    { value: 4, label: "FWD", color: "text-rose-400" },
  ];

  // Calculate summary stats
  const avgVOR = rankings.length > 0 
    ? rankings.reduce((acc, r) => acc + r.vor, 0) / rankings.length 
    : 0;
  const topVOR = rankings.length > 0 ? Math.max(...rankings.map(r => r.vor)) : 0;
  const avgOwnership = rankings.length > 0
    ? rankings.reduce((acc, r) => acc + r.ownership, 0) / rankings.length
    : 0;

  // Prepare chart data - top 15 for visualization
  const chartData = rankings.slice(0, 15).map((r) => ({
    name: r.name.length > 12 ? r.name.substring(0, 12) + "..." : r.name,
    fullName: r.name,
    vor: r.vor,
    vorPerCost: r.vor_per_cost,
    xPts: r.expected_points,
    position: r.position,
  }));

  // VOR distribution by position
  const vorByPosition = [1, 2, 3, 4].map(pos => {
    const posRankings = rankings.filter(r => r.position === pos);
    return {
      position: positionLabels[pos],
      avgVOR: posRankings.length > 0 
        ? posRankings.reduce((acc, r) => acc + r.vor, 0) / posRankings.length 
        : 0,
      count: posRankings.length,
      fill: pos === 1 ? "#f59e0b" : pos === 2 ? "#10b981" : pos === 3 ? "#0ea5e9" : "#f43f5e",
    };
  });

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1">Value Over Replacement</h2>
          <p className="text-sm text-muted-foreground">
            Players ranked by expected points above replacement level
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border">
          {positions.map((pos) => (
            <button
              key={pos.label}
              onClick={() => onPositionChange(pos.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                positionFilter === pos.value
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={positionFilter === pos.value ? pos.color : ""}>
                {pos.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Top VOR"
          value={topVOR.toFixed(2)}
          color="text-primary"
          subValue="Best value player"
        />
        <StatCard
          label="Avg VOR"
          value={avgVOR.toFixed(2)}
          subValue="Across filtered players"
        />
        <StatCard
          label="Players"
          value={rankings.length}
          subValue="In current view"
        />
        <StatCard
          label="Avg Ownership"
          value={`${avgOwnership.toFixed(1)}%`}
          subValue="Average selection"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VOR Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Top 15 by VOR</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis 
                type="number" 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--muted-foreground))" }}
                formatter={(value: number, name: string) => [
                  value.toFixed(2),
                  name === "vor" ? "VOR" : name
                ]}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              />
              <Bar 
                dataKey="vor" 
                radius={[0, 4, 4, 0]}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* VOR by Position Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Average VOR by Position</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={vorByPosition} margin={{ top: 20 }}>
              <XAxis 
                dataKey="position" 
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--muted-foreground))" }}
                formatter={(value: number) => [value.toFixed(2), "Avg VOR"]}
              />
              <Bar 
                dataKey="avgVOR" 
                radius={[4, 4, 0, 0]}
              >
                {vorByPosition.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter Plot - VOR vs Price */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">VOR vs Price Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis 
              type="number" 
              dataKey="price" 
              name="Price" 
              unit="m"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <YAxis 
              type="number" 
              dataKey="vor" 
              name="VOR"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <ZAxis type="number" dataKey="ownership" range={[50, 400]} name="Ownership" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(value: number, name: string) => [
                name === "Price" ? `£${value.toFixed(1)}m` : value.toFixed(2),
                name
              ]}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.name || ""}
            />
            <Scatter 
              data={rankings.slice(0, 50).map(r => ({
                name: r.name,
                price: r.price,
                vor: r.vor,
                ownership: r.ownership,
                position: r.position,
              }))} 
              fill="hsl(var(--primary))"
              fillOpacity={0.7}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Bubble size represents ownership percentage
        </p>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-semibold">Complete Rankings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">#</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Player</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Pos</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Price</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">xPts</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">VOR</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">VOR/£</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Own%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rankings.map((player, idx) => {
                const posStyle = positionStyles[player.position];
                return (
                  <tr key={player.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium">{player.name}</td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        "inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border",
                        posStyle?.bg,
                        posStyle?.text,
                        posStyle?.border
                      )}>
                        {positionLabels[player.position]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">£{player.price.toFixed(1)}m</td>
                    <td className="py-3 px-4 text-right tabular-nums text-primary font-medium">
                      {player.expected_points.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">
                      <span className={cn(
                        player.vor > 2 ? "text-emerald-400" : player.vor > 0 ? "" : "text-rose-400"
                      )}>
                        {player.vor > 0 ? "+" : ""}{player.vor.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{player.vor_per_cost.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
                      {player.ownership.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FixturesPanel({ rankings }: { rankings: FixtureRanking[] }) {

  // Summary stats
  const teamsWithDGW = rankings.filter(r => r.double_gws > 0).length;
  const teamsWithBGW = rankings.filter(r => r.blank_gws > 0).length;
  const bestFDR = rankings.length > 0 ? Math.min(...rankings.map(r => r.fdr)) : 0;

  // Chart data
  const chartData = rankings.slice(0, 20).map(r => ({
    team: r.team_name.length > 12 ? r.team_name.substring(0, 10) + "..." : r.team_name,
    fullName: r.team_name,
    fdr: r.fdr,
    fixtures: r.num_fixtures,
    swing: r.fixture_swing,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-1">Fixture Difficulty Rankings</h2>
        <p className="text-sm text-muted-foreground">
          Teams ranked by upcoming fixture difficulty (GW 1-6)
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Best FDR"
          value={bestFDR.toFixed(2)}
          color="text-emerald-400"
          subValue="Easiest fixtures"
        />
        <StatCard
          label="DGW Teams"
          value={teamsWithDGW}
          color="text-primary"
          subValue="Double gameweeks"
        />
        <StatCard
          label="BGW Teams"
          value={teamsWithBGW}
          color="text-rose-400"
          subValue="Blank gameweeks"
        />
        <StatCard
          label="Teams Analyzed"
          value={rankings.length}
          subValue="Full league coverage"
        />
      </div>

      {/* Visual FDR Heatmap */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">FDR Heatmap</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {rankings.map((team) => {
            const fdrColor = getFDRStyle(team.fdr);
            return (
              <div
                key={team.team_id}
                className="relative bg-muted/30 border border-border rounded-xl p-4 overflow-hidden group hover:border-primary/30 transition-colors"
              >
                {/* FDR indicator bar */}
                <div 
                  className={cn("absolute top-0 left-0 h-1 rounded-t-xl", fdrColor.bg)}
                  style={{ width: `${Math.min(100, (5 - team.fdr) / 3 * 100)}%` }}
                />
                
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{team.team_name}</span>
                  <span className={cn("text-lg font-bold tabular-nums", fdrColor.text)}>
                    {team.fdr.toFixed(1)}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{team.num_fixtures} fixtures</span>
                  {team.double_gws > 0 && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                      +{team.double_gws} DGW
                    </span>
                  )}
                  {team.blank_gws > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded">
                      -{team.blank_gws} BGW
                    </span>
                  )}
                </div>

                {/* Swing indicator */}
                {team.fixture_swing !== 0 && (
                  <div className={cn(
                    "absolute bottom-2 right-2 text-xs font-medium",
                    team.fixture_swing > 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {team.fixture_swing > 0 ? "↑" : "↓"}{Math.abs(team.fixture_swing).toFixed(1)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FDR Bar Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">FDR Comparison</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis 
              type="number"
              domain={[0, 5]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="team" 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                value.toFixed(2),
                name === "fdr" ? "FDR" : name
              ]}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
            />
            <Bar 
              dataKey="fdr" 
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={
                    entry.fdr <= 2 ? "#10b981" :
                    entry.fdr <= 2.5 ? "#84cc16" :
                    entry.fdr <= 3 ? "#f59e0b" :
                    entry.fdr <= 3.5 ? "#f97316" : "#f43f5e"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-muted-foreground">Very Easy (≤2)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded bg-lime-500" />
            <span className="text-muted-foreground">Easy (2-2.5)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-muted-foreground">Medium (2.5-3)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span className="text-muted-foreground">Hard (3-3.5)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded bg-rose-500" />
            <span className="text-muted-foreground">Very Hard (&gt;3.5)</span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-semibold">Complete Rankings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">#</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Team</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">FDR</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Fixtures</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">DGWs</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">BGWs</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Swing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rankings.map((team) => {
                const fdrColor = getFDRStyle(team.fdr);
                return (
                  <tr key={team.team_id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">{team.rank}</td>
                    <td className="py-3 px-4 font-medium">{team.team_name}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn("font-bold tabular-nums", fdrColor.text)}>
                        {team.fdr.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{team.num_fixtures}</td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {team.double_gws > 0 ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg font-medium">
                          {team.double_gws}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {team.blank_gws > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-lg font-medium">
                          {team.blank_gws}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <span className={cn(
                        "font-medium",
                        team.fixture_swing > 0 ? "text-emerald-400" :
                        team.fixture_swing < 0 ? "text-rose-400" : "text-muted-foreground"
                      )}>
                        {team.fixture_swing > 0 ? "↑" : team.fixture_swing < 0 ? "↓" : ""}
                        {Math.abs(team.fixture_swing).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DifferentialsPanel({ differentials }: { differentials: Differential[] }) {
  // Summary stats
  const avgDiffEV = differentials.length > 0
    ? differentials.reduce((acc, d) => acc + d.differential_ev, 0) / differentials.length
    : 0;
  const highImpactCount = differentials.filter(d => d.rank_impact === "high").length;
  const avgOwnership = differentials.length > 0
    ? differentials.reduce((acc, d) => acc + d.ownership, 0) / differentials.length
    : 0;

  // Chart data for scatter
  const scatterData = differentials.map(d => ({
    name: d.name,
    xPts: d.expected_points,
    ownership: d.ownership,
    diffEV: d.differential_ev,
    captainEV: d.captain_differential_ev,
    position: d.position,
    impact: d.rank_impact,
  }));

  // Radar data for top 5
  const radarData = differentials.slice(0, 5).map(d => ({
    name: d.name.split(" ").pop() || d.name, // Last name
    xPts: (d.expected_points / 10) * 100, // Normalize to 100
    diffEV: Math.min(100, d.differential_ev * 10),
    captainEV: Math.min(100, d.captain_differential_ev * 10),
    antiOwn: 100 - d.ownership,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-1">Captain Differentials</h2>
        <p className="text-sm text-muted-foreground">
          High-ceiling, low-ownership picks for rank gains
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Avg Diff EV"
          value={avgDiffEV.toFixed(2)}
          color="text-primary"
          subValue="Expected differential value"
        />
        <StatCard
          label="High Impact"
          value={highImpactCount}
          color="text-emerald-400"
          subValue="High rank impact picks"
        />
        <StatCard
          label="Avg Ownership"
          value={`${avgOwnership.toFixed(1)}%`}
          subValue="Low ownership = more diff"
        />
        <StatCard
          label="Total Options"
          value={differentials.length}
          subValue="Differential candidates"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expected Points vs Ownership Scatter */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">xPts vs Ownership</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <XAxis 
                type="number" 
                dataKey="ownership" 
                name="Ownership" 
                unit="%"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <YAxis 
                type="number" 
                dataKey="xPts" 
                name="xPts"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <ZAxis type="number" dataKey="diffEV" range={[50, 300]} name="Diff EV" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--muted-foreground))" }}
                formatter={(value: number, name: string) => [
                  name === "Ownership" ? `${value.toFixed(1)}%` : value.toFixed(2),
                  name
                ]}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.name || ""}
              />
              <Scatter 
                data={scatterData}
                fill="hsl(var(--primary))"
                fillOpacity={0.7}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Look for high xPts with low ownership (top-left quadrant)
          </p>
        </div>

        {/* Differential EV Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Captain Differential EV</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart 
              data={differentials.slice(0, 10).map(d => ({
                name: d.name.length > 15 ? d.name.substring(0, 12) + "..." : d.name,
                fullName: d.name,
                captainEV: d.captain_differential_ev,
                diffEV: d.differential_ev,
              }))}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
            >
              <XAxis 
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--muted-foreground))" }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              />
              <Bar dataKey="captainEV" name="Captain EV" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Differential Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Top Differentials</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {differentials.map((player) => {
            const posStyle = positionStyles[player.position];
            const impactStyle = getRankImpactStyle(player.rank_impact);
            
            // Calculate "differential score" for visual gauge
            const diffScore = Math.min(100, (player.captain_differential_ev / 5) * 100);
            
            return (
              <div
                key={player.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {player.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "inline-flex px-2 py-0.5 rounded-md text-xs font-medium border",
                        posStyle?.bg,
                        posStyle?.text,
                        posStyle?.border
                      )}>
                        {positionLabels[player.position]}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        £{player.price.toFixed(1)}m
                      </span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold border",
                    impactStyle.bg,
                    impactStyle.text,
                    impactStyle.border
                  )}>
                    {player.rank_impact.toUpperCase()}
                  </span>
                </div>

                {/* Differential Gauge */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Differential Score</span>
                    <span className="tabular-nums">{diffScore.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-500"
                      style={{ width: `${diffScore}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <span className="text-xs text-muted-foreground">xPts</span>
                    <p className="text-lg font-bold tabular-nums text-primary">
                      {player.expected_points.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <span className="text-xs text-muted-foreground">Ownership</span>
                    <p className="text-lg font-bold tabular-nums">
                      {player.ownership.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <span className="text-xs text-muted-foreground">Diff EV</span>
                    <p className="text-lg font-bold tabular-nums text-emerald-400">
                      +{player.differential_ev.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <span className="text-xs text-muted-foreground">(C) Diff EV</span>
                    <p className="text-lg font-bold tabular-nums text-amber-400">
                      +{player.captain_differential_ev.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PredictionsPanel({ predictions }: { predictions: MatchPrediction[] }) {
  // Summary stats
  const avgHomeWin = predictions.length > 0
    ? predictions.reduce((acc, p) => acc + p.home_win_prob, 0) / predictions.length * 100
    : 0;
  const avgDraw = predictions.length > 0
    ? predictions.reduce((acc, p) => acc + p.draw_prob, 0) / predictions.length * 100
    : 0;
  const avgAwayWin = predictions.length > 0
    ? predictions.reduce((acc, p) => acc + p.away_win_prob, 0) / predictions.length * 100
    : 0;
  
  // High confidence matches (>60% one way)
  const highConfidence = predictions.filter(
    p => p.home_win_prob > 0.6 || p.away_win_prob > 0.6
  ).length;

  // xG distribution data
  const xgData = predictions.map(p => ({
    match: `${p.home_team.substring(0, 3)} v ${p.away_team.substring(0, 3)}`,
    homeXG: p.home_xg,
    awayXG: p.away_xg,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-1">Match Predictions</h2>
        <p className="text-sm text-muted-foreground">
          Dixon-Coles model predictions for upcoming fixtures
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Avg Home Win"
          value={`${avgHomeWin.toFixed(0)}%`}
          color="text-emerald-400"
          subValue="Home advantage"
        />
        <StatCard
          label="Avg Draw"
          value={`${avgDraw.toFixed(0)}%`}
          subValue="Draw probability"
        />
        <StatCard
          label="Avg Away Win"
          value={`${avgAwayWin.toFixed(0)}%`}
          color="text-rose-400"
          subValue="Away wins"
        />
        <StatCard
          label="High Confidence"
          value={highConfidence}
          color="text-primary"
          subValue=">60% probability"
        />
      </div>

      {/* xG Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Expected Goals Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={xgData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <XAxis 
              dataKey="match" 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Bar dataKey="homeXG" name="Home xG" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="awayXG" name="Away xG" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Match Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {predictions.map((match) => {
          const homeWin = match.home_win_prob * 100;
          const draw = match.draw_prob * 100;
          const awayWin = match.away_win_prob * 100;
          
          // Determine favorite
          let favorite: "home" | "draw" | "away" = "draw";
          if (homeWin > draw && homeWin > awayWin) favorite = "home";
          else if (awayWin > draw && awayWin > homeWin) favorite = "away";
          
          return (
            <div 
              key={match.fixture_id} 
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-200"
            >
              {/* Match Header */}
              <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">GW{match.gameweek}</span>
                {match.kickoff_time && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(match.kickoff_time).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
              </div>

              {/* Teams & xG */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-6">
                  {/* Home Team */}
                  <div className="flex-1 text-center">
                    <p className={cn(
                      "font-bold text-lg mb-1",
                      favorite === "home" && "text-emerald-400"
                    )}>
                      {match.home_team}
                    </p>
                    <div className="inline-flex flex-col items-center px-4 py-2 bg-muted/50 rounded-lg">
                      <span className="text-3xl font-bold tabular-nums text-primary">
                        {match.home_xg}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase">xG</span>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="px-4">
                    <span className="text-2xl font-light text-muted-foreground">vs</span>
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 text-center">
                    <p className={cn(
                      "font-bold text-lg mb-1",
                      favorite === "away" && "text-rose-400"
                    )}>
                      {match.away_team}
                    </p>
                    <div className="inline-flex flex-col items-center px-4 py-2 bg-muted/50 rounded-lg">
                      <span className="text-3xl font-bold tabular-nums">
                        {match.away_xg}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase">xG</span>
                    </div>
                  </div>
                </div>

                {/* Probability Bar */}
                <div className="space-y-2">
                  <div className="flex gap-0.5 h-3 rounded-lg overflow-hidden">
                    <div
                      className="bg-emerald-500 transition-all duration-500"
                      style={{ width: `${homeWin}%` }}
                    />
                    <div
                      className="bg-muted-foreground/30 transition-all duration-500"
                      style={{ width: `${draw}%` }}
                    />
                    <div
                      className="bg-rose-500 transition-all duration-500"
                      style={{ width: `${awayWin}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs tabular-nums">
                    <span className={cn(
                      "font-medium",
                      favorite === "home" ? "text-emerald-400" : "text-muted-foreground"
                    )}>
                      {homeWin.toFixed(0)}% H
                    </span>
                    <span className={cn(
                      "font-medium",
                      favorite === "draw" ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {draw.toFixed(0)}% D
                    </span>
                    <span className={cn(
                      "font-medium",
                      favorite === "away" ? "text-rose-400" : "text-muted-foreground"
                    )}>
                      {awayWin.toFixed(0)}% A
                    </span>
                  </div>
                </div>

                {/* Clean Sheet Probabilities */}
                <div className="mt-4 pt-4 border-t border-border flex justify-between">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Clean Sheet</p>
                    <p className="text-sm font-bold tabular-nums text-emerald-400">
                      {(match.clean_sheet_home * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">BTTS</p>
                    <p className="text-sm font-bold tabular-nums">
                      {((1 - match.clean_sheet_home) * (1 - match.clean_sheet_away) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Clean Sheet</p>
                    <p className="text-sm font-bold tabular-nums text-rose-400">
                      {(match.clean_sheet_away * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChipsPanel() {
  const [chipStrategy, setChipStrategy] = useState<ChipStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentGW] = useState(1);

  useEffect(() => {
    const loadChipStrategy = async () => {
      setLoading(true);
      try {
        const result = await api.getChipStrategy({
          squad_ids: [],
          current_gameweek: currentGW,
        });
        setChipStrategy(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadChipStrategy();
  }, [currentGW]);

  const chipInfo: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
    wildcard: { 
      label: "Wildcard", 
      icon: <Icons.wildcard className="w-6 h-6" />, 
      color: "text-purple-400",
      bgColor: "bg-purple-500"
    },
    bench_boost: { 
      label: "Bench Boost", 
      icon: <Icons.benchBoost className="w-6 h-6" />, 
      color: "text-emerald-400",
      bgColor: "bg-emerald-500"
    },
    triple_captain: { 
      label: "Triple Captain", 
      icon: <Icons.tripleCaptain className="w-6 h-6" />, 
      color: "text-amber-400",
      bgColor: "bg-amber-500"
    },
    free_hit: { 
      label: "Free Hit", 
      icon: <Icons.freeHit className="w-6 h-6" />, 
      color: "text-sky-400",
      bgColor: "bg-sky-500"
    },
  };

  // Helper to normalize chip names from API to our keys
  const normalizeChipKey = (chip: string): string => {
    return chip.toLowerCase().replace(/ /g, "_");
  };

  const getChipInfo = (chip: string) => {
    const key = normalizeChipKey(chip);
    return chipInfo[key] || { 
      label: chip, 
      icon: <Icons.medal1 className="w-6 h-6" />, 
      color: "text-foreground",
      bgColor: "bg-muted"
    };
  };

  if (loading || !chipStrategy) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">Calculating optimal strategy...</p>
      </div>
    );
  }

  // Prepare data for value chart
  const chipValueData = Object.entries(chipStrategy.recommendations).map(([key, rec]) => ({
    chip: chipInfo[key]?.label || key,
    value: rec.expected_value,
    confidence: rec.confidence * 100,
    gw: rec.recommended_gameweek,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-1">Chip Strategy Optimizer</h2>
        <p className="text-sm text-muted-foreground">
          Optimal chip deployment for maximum season points
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Chip Value Added</p>
          </div>
          <p className="text-3xl font-bold tabular-nums text-primary">
            +{chipStrategy.total_expected_value.toFixed(0)} pts
          </p>
          <p className="text-sm text-muted-foreground mt-1">Total expected gain from optimal timing</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">With Optimal Chips</p>
          </div>
          <p className="text-3xl font-bold tabular-nums text-emerald-400">
            {chipStrategy.season_projections.with_optimal_chips.toFixed(0)} pts
          </p>
          <p className="text-sm text-muted-foreground mt-1">Projected season total</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Without Chips</p>
          </div>
          <p className="text-3xl font-bold tabular-nums text-muted-foreground">
            {chipStrategy.season_projections.without_chips.toFixed(0)} pts
          </p>
          <p className="text-sm text-muted-foreground mt-1">Baseline projection</p>
        </div>
      </div>

      {/* Optimal Order Timeline */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Recommended Chip Order</h3>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {chipStrategy.optimal_order.map((chip, idx) => {
            const info = getChipInfo(chip);
            return (
              <div key={chip} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-16 h-16 rounded-xl border flex items-center justify-center mb-2",
                    `${info.bgColor}/10 border-${info.bgColor.replace('bg-', '')}/30`,
                    info.color
                  )}>
                    {info.icon}
                  </div>
                  <span className={cn("text-sm font-semibold", info.color)}>{info.label}</span>
                  <span className="text-xs text-muted-foreground">
                    GW{chipStrategy.recommendations[normalizeChipKey(chip) as keyof typeof chipStrategy.recommendations]?.recommended_gameweek}
                  </span>
                </div>
                {idx < chipStrategy.optimal_order.length - 1 && (
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chip Value Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Expected Value by Chip</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chipValueData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <XAxis 
              dataKey="chip" 
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                name === "value" ? `+${value.toFixed(1)} pts` : `${value.toFixed(0)}%`,
                name === "value" ? "Expected Value" : "Confidence"
              ]}
            />
            <Bar 
              dataKey="value" 
              name="value"
              radius={[4, 4, 0, 0]}
            >
              {chipValueData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={
                    entry.chip === "Wildcard" ? "#a855f7" :
                    entry.chip === "Bench Boost" ? "#10b981" :
                    entry.chip === "Triple Captain" ? "#f59e0b" : "#0ea5e9"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chip Recommendation Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(chipStrategy.recommendations).map(([chipKey, rec]) => {
          const info = getChipInfo(chipKey);
          const confidencePercent = rec.confidence * 100;
          
          return (
            <div 
              key={chipKey} 
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", info.color)}>
                    {info.icon}
                  </div>
                  <div>
                    <h4 className={cn("font-semibold text-lg", info.color)}>{info.label}</h4>
                    <p className="text-xs text-muted-foreground">
                      Recommended: GW{rec.recommended_gameweek}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums text-primary">
                    +{rec.expected_value.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">pts expected</p>
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                {/* Confidence Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Confidence</span>
                    <span className="tabular-nums font-medium">{confidencePercent.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        confidencePercent >= 70 ? "bg-emerald-500" :
                        confidencePercent >= 50 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      style={{ width: `${confidencePercent}%` }}
                    />
                  </div>
                </div>

                {/* Reasoning */}
                {rec.reasoning.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Reasoning
                    </p>
                    <ul className="space-y-1.5">
                      {rec.reasoning.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alternatives */}
                {rec.alternatives && rec.alternatives.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Alternatives: GW{rec.alternatives.join(", GW")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
