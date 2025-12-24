"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  TransferPlan,
  TransferRecommendation,
  FixtureSwingAnalysis,
  RotationPair,
} from "@/lib/types";
import { positionStyles, positionLabels, getFDRStyle } from "@/lib/ui-utils";
import { StatCard } from "@/components/ui/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";
import Link from "next/link";

type Tab = "overview" | "fixtures" | "transfers" | "rotation" | "differentials";

const positionNames: Record<number, string> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

export default function PredictionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [transferPlan, setTransferPlan] = useState<TransferPlan | null>(null);
  const [fixtureSwings, setFixtureSwings] = useState<FixtureSwingAnalysis[]>(
    [],
  );
  const [rotationPairs, setRotationPairs] = useState<RotationPair[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<number>(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(6);

  useEffect(() => {
    loadData();
  }, [activeTab, horizon, selectedPosition]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case "overview":
        case "transfers":
          const planData = await api.getTransferPlan({
            squad_ids: [],
            horizon,
            free_transfers: 1,
          });
          setTransferPlan(planData);
          break;
        case "fixtures":
          const swingData = await api.getFixtureSwings(horizon);
          setFixtureSwings(swingData.teams || []);
          break;
        case "rotation":
          const rotData = await api.getRotationPairs({
            position: selectedPosition,
            horizon,
            budget_max: 10,
          });
          setRotationPairs(rotData.rotation_pairs || []);
          break;
        case "differentials":
          const diffData = await api.getFixtureBasedDifferentials(10, 3, horizon);
          // Store differentials in transfer plan for reuse
          if (diffData.differentials) {
            setTransferPlan((prev) =>
              prev
                ? {
                    ...prev,
                    players_to_buy: diffData.differentials.map((d) => ({
                      id: d.id,
                      name: d.name,
                      team: d.team,
                      position: d.position,
                      price: d.price,
                      fdr_avg: d.fdr_avg,
                      fixture_swing: 0,
                      expected_pts: d.expected_pts,
                      reasoning: d.reasoning,
                    })),
                  }
                : null,
            );
          }
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
      id: "overview",
      label: "Overview",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: "fixtures",
      label: "Fixture Swings",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      id: "transfers",
      label: "Transfer Plan",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
    {
      id: "rotation",
      label: "Rotation Pairs",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    },
    {
      id: "differentials",
      label: "Differentials",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-white to-white/50" />
          <h1 className="text-3xl font-bold tracking-tight">
            Transfer Predictions
          </h1>
        </div>
        <p className="text-muted-foreground ml-4">
          Multi-gameweek predictions and fixture-based transfer recommendations
        </p>
      </div>

      {/* Horizon Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                activeTab === tab.id
                  ? "bg-white text-black shadow-lg shadow-white/25"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-white/30",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1">
          <span className="text-sm text-muted-foreground px-2">Horizon:</span>
          {[4, 6, 8, 10].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                horizon === h
                  ? "bg-white/10 text-white border border-white/30"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {h} GWs
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/50 bg-destructive/5 text-destructive mb-6">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">
              Analyzing fixtures and generating predictions...
            </p>
          </div>
        ) : (
          <>
            {activeTab === "overview" && transferPlan && (
              <OverviewPanel plan={transferPlan} />
            )}
            {activeTab === "fixtures" && (
              <FixtureSwingsPanel swings={fixtureSwings} />
            )}
            {activeTab === "transfers" && transferPlan && (
              <TransferPlanPanel plan={transferPlan} />
            )}
            {activeTab === "rotation" && (
              <RotationPanel
                pairs={rotationPairs}
                selectedPosition={selectedPosition}
                onPositionChange={setSelectedPosition}
              />
            )}
            {activeTab === "differentials" && transferPlan && (
              <DifferentialsPanel players={transferPlan.players_to_buy} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OverviewPanel({ plan }: { plan: TransferPlan }) {
  const topBuys = plan.players_to_buy.slice(0, 5);
  const topSells = plan.players_to_sell.slice(0, 5);

  // Prepare team FDR chart data
  const teamChartData = plan.team_fixture_rankings.slice(0, 10).map((t) => ({
    team: t.short_name || t.team_name.substring(0, 3),
    fdr: t.fdr,
    swing: t.fixture_swing,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Current GW"
          value={plan.current_gameweek}
          color="text-white"
          subValue="Season progress"
        />
        <StatCard
          label="Planning Horizon"
          value={`${plan.horizon} GWs`}
          subValue={`GW${plan.current_gameweek}-${plan.current_gameweek + plan.horizon - 1}`}
        />
        <StatCard
          label="Transfer Suggestions"
          value={plan.recommended_transfers.length}
          color="text-primary"
          subValue="Actionable moves"
        />
        <StatCard
          label="Watch List"
          value={plan.players_to_watch.length}
          subValue="Players to monitor"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Fixture Rankings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">
            Best Fixture Runs (Top 10)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={teamChartData}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
            >
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
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [value.toFixed(2), "FDR"]}
              />
              <Bar dataKey="fdr" radius={[0, 4, 4, 0]}>
                {teamChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill="#f97316"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recommended Transfers */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Top Transfer Moves</h3>
          {plan.recommended_transfers.length > 0 ? (
            <div className="space-y-4">
              {plan.recommended_transfers.slice(0, 4).map((t, idx) => (
                <TransferCard key={idx} transfer={t} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <svg
                className="w-12 h-12 mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">No urgent transfers needed</p>
            </div>
          )}
        </div>
      </div>

      {/* Position Picks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { pos: "goalkeepers", label: "Goalkeepers", color: "text-amber-400" },
          { pos: "defenders", label: "Defenders", color: "text-neutral-300" },
          { pos: "midfielders", label: "Midfielders", color: "text-sky-400" },
          { pos: "forwards", label: "Forwards", color: "text-rose-400" },
        ].map(({ pos, label, color }) => {
          const players =
            plan.position_picks[pos as keyof typeof plan.position_picks] || [];
          return (
            <div
              key={pos}
              className="bg-card border border-border rounded-xl p-4"
            >
              <h4 className={cn("font-semibold mb-3", color)}>Top {label}</h4>
              <div className="space-y-2">
                {players.slice(0, 3).map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4">
                        {idx + 1}.
                      </span>
                      <Link
                        href={`/player/${p.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {p.name}
                      </Link>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {p.expected_pts.toFixed(1)} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Players to Buy / Sell */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Buys */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border bg-white/5">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              Players to Buy
            </h3>
          </div>
          <div className="divide-y divide-border">
            {topBuys.map((p) => (
              <PlayerRecommendationRow key={p.id} player={p} type="buy" />
            ))}
          </div>
        </div>

        {/* Sells */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border bg-rose-500/5">
            <h3 className="font-semibold text-rose-400 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              Players to Sell
            </h3>
          </div>
          <div className="divide-y divide-border">
            {topSells.length > 0 ? (
              topSells.map((p) => (
                <PlayerRecommendationRow key={p.id} player={p} type="sell" />
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No urgent sells identified
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FixtureSwingsPanel({ swings }: { swings: FixtureSwingAnalysis[] }) {
  // Teams improving (positive swing)
  const improving = swings
    .filter((s) => s.fixture_swing > 0.2)
    .sort((a, b) => b.fixture_swing - a.fixture_swing);
  // Teams declining (negative swing)
  const declining = swings
    .filter((s) => s.fixture_swing < -0.2)
    .sort((a, b) => a.fixture_swing - b.fixture_swing);

  const chartData = swings.slice(0, 20).map((s) => ({
    team: s.team_name.substring(0, 3),
    swing: s.fixture_swing,
    fdr: s.avg_fdr,
  }));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Best Improving"
          value={improving[0]?.team_name.substring(0, 3) || "-"}
          color="text-white"
          subValue={improving[0] ? `+${improving[0].fixture_swing.toFixed(2)}` : ""}
        />
        <StatCard
          label="Fixtures Getting Easier"
          value={improving.length}
          color="text-white"
          subValue="Teams to target"
        />
        <StatCard
          label="Fixtures Getting Harder"
          value={declining.length}
          color="text-rose-400"
          subValue="Teams to avoid"
        />
        <StatCard
          label="Worst Declining"
          value={declining[0]?.team_name.substring(0, 3) || "-"}
          color="text-rose-400"
          subValue={declining[0] ? `${declining[0].fixture_swing.toFixed(2)}` : ""}
        />
      </div>

      {/* Swing Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Fixture Swing by Team</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, bottom: 20 }}>
            <XAxis
              dataKey="team"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                value.toFixed(2),
                name === "swing" ? "Fixture Swing" : "Avg FDR",
              ]}
            />
            <Bar dataKey="swing" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.swing > 0 ? "#ffffff" : "#f43f5e"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Positive swing = fixtures getting easier • Negative swing = fixtures
          getting harder
        </p>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {swings.map((team) => {
          const fdrStyle = getFDRStyle(team.avg_fdr);
          return (
            <div
              key={team.team_id}
              className={cn(
                "bg-card border rounded-xl p-4 transition-all hover:border-primary/30",
                  team.fixture_swing > 0.3
                  ? "border-white/30"
                  : team.fixture_swing < -0.3
                    ? "border-rose-500/30"
                    : "border-border",
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{team.team_name}</h4>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    team.fixture_swing > 0
                      ? "text-white"
                      : team.fixture_swing < 0
                        ? "text-rose-400"
                        : "text-muted-foreground",
                  )}
                >
                  {team.fixture_swing > 0 ? "↑" : team.fixture_swing < 0 ? "↓" : ""}
                  {Math.abs(team.fixture_swing).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                <div className="bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground block">Avg FDR</span>
                  <span className={cn("font-bold", fdrStyle.text)}>
                    {team.avg_fdr.toFixed(2)}
                  </span>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground block">DGWs</span>
                  <span
                    className={cn(
                      "font-bold",
                      team.double_gameweeks > 0 && "text-white",
                    )}
                  >
                    {team.double_gameweeks}
                  </span>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground block">BGWs</span>
                  <span
                    className={cn(
                      "font-bold",
                      team.blank_gameweeks > 0 && "text-rose-400",
                    )}
                  >
                    {team.blank_gameweeks}
                  </span>
                </div>
              </div>

              {/* Turning Points */}
              {team.turning_points.length > 0 && (
                <div className="pt-2 border-t border-border">
                  {team.turning_points.slice(0, 2).map((tp, idx) => (
                    <p
                      key={idx}
                      className={cn(
                        "text-xs",
                        tp.type === "fixtures_ease"
                          ? "text-white"
                          : "text-rose-400",
                      )}
                    >
                      {tp.message}
                    </p>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2 italic">
                {team.recommendation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TransferPlanPanel({ plan }: { plan: TransferPlan }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1">Transfer Recommendations</h2>
          <p className="text-sm text-muted-foreground">
            Based on {plan.horizon}-gameweek fixture analysis
          </p>
        </div>
      </div>

      {/* Transfer Cards */}
      {plan.recommended_transfers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {plan.recommended_transfers.map((t, idx) => (
            <div
              key={idx}
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all"
            >
              {/* Urgency Header */}
              <div
                className={cn(
                  "px-4 py-2 text-xs font-medium uppercase tracking-wider",
                  t.urgency === "immediate"
                    ? "bg-rose-500/10 text-rose-400"
                    : t.urgency === "soon"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-muted/50 text-muted-foreground",
                )}
              >
                {t.urgency === "immediate"
                  ? "⚡ Act Now"
                  : t.urgency === "soon"
                    ? "📅 This Week"
                    : "📋 Plan Ahead"}
              </div>

              {/* Transfer Details */}
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  {/* Out */}
                  <div className="flex-1 text-center">
                    <p className="text-xs text-rose-400 uppercase mb-1">Out</p>
                    <p className="font-semibold">{t.player_out.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.player_out.team} • £{t.player_out.price.toFixed(1)}m
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      FDR {t.player_out.fdr_avg.toFixed(1)} •{" "}
                      {t.player_out.expected_pts.toFixed(1)} pts
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <svg
                      className="w-8 h-8 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </div>

                  {/* In */}
                  <div className="flex-1 text-center">
                    <p className="text-xs text-white uppercase mb-1">In</p>
                    <p className="font-semibold">{t.player_in.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.player_in.team} • £{t.player_in.price.toFixed(1)}m
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      FDR {t.player_in.fdr_avg.toFixed(1)} •{" "}
                      {t.player_in.expected_pts.toFixed(1)} pts
                    </p>
                  </div>
                </div>

                {/* Gain & Context */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Expected Gain
                    </span>
                    <span className="font-bold text-white tabular-nums">
                      +{t.expected_gain.toFixed(1)} pts
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.reasoning}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {t.fixture_context}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-white/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Squad Looking Good!</h3>
          <p className="text-muted-foreground">
            No urgent transfers identified. Your squad has favorable fixtures
            ahead.
          </p>
        </div>
      )}

      {/* Players to Watch */}
      {plan.players_to_watch.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border bg-amber-500/5">
            <h3 className="font-semibold text-amber-400 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Players to Watch
            </h3>
          </div>
          <div className="divide-y divide-border">
            {plan.players_to_watch.map((p) => (
              <PlayerRecommendationRow key={p.id} player={p} type="watch" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RotationPanel({
  pairs,
  selectedPosition,
  onPositionChange,
}: {
  pairs: RotationPair[];
  selectedPosition: number;
  onPositionChange: (pos: number) => void;
}) {
  const positions = [
    { value: 1, label: "GK", color: "text-amber-400" },
    { value: 2, label: "DEF", color: "text-neutral-300" },
    { value: 3, label: "MID", color: "text-sky-400" },
    { value: 4, label: "FWD", color: "text-rose-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Position Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1">Rotation Pairs</h2>
          <p className="text-sm text-muted-foreground">
            Players who rotate well based on complementary fixtures
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border">
          {positions.map((pos) => (
            <button
              key={pos.value}
              onClick={() => onPositionChange(pos.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                selectedPosition === pos.value
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={selectedPosition === pos.value ? pos.color : ""}>
                {pos.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Rotation Pairs Grid */}
      {pairs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pairs.map((pair, idx) => (
            <div
              key={idx}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all"
            >
              {/* Players */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 text-center">
                  <Link
                    href={`/player/${pair.player_1.id}`}
                    className="font-semibold hover:text-primary transition-colors"
                  >
                    {pair.player_1.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {pair.player_1.team}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    £{pair.player_1.price.toFixed(1)}m
                  </p>
                </div>

                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>

                <div className="flex-1 text-center">
                  <Link
                    href={`/player/${pair.player_2.id}`}
                    className="font-semibold hover:text-primary transition-colors"
                  >
                    {pair.player_2.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {pair.player_2.team}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    £{pair.player_2.price.toFixed(1)}m
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground block">Rotation</span>
                  <span className="font-bold text-primary">
                    {(pair.rotation_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground block">Combined</span>
                  <span className="font-bold">
                    £{pair.combined_price.toFixed(1)}m
                  </span>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground block">xPts</span>
                  <span className="font-bold text-white">
                    {pair.combined_expected_pts.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Value Score</span>
                  <span className="font-bold tabular-nums">
                    {pair.value_score.toFixed(2)} pts/£
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">
            No rotation pairs found for this position
          </p>
        </div>
      )}
    </div>
  );
}

function DifferentialsPanel({
  players,
}: {
  players: TransferPlan["players_to_buy"];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Fixture-Based Differentials</h2>
        <p className="text-sm text-muted-foreground">
          Low-owned players with great upcoming fixtures
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => {
          const posStyle = positionStyles[p.position];
          const fdrStyle = getFDRStyle(p.fdr_avg);
          return (
            <div
              key={p.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link
                    href={`/player/${p.id}`}
                    className="font-semibold text-lg hover:text-primary transition-colors"
                  >
                    {p.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{p.team}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border",
                    posStyle?.bg,
                    posStyle?.text,
                    posStyle?.border,
                  )}
                >
                  {positionNames[p.position]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                <div className="bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground block">Price</span>
                  <span className="font-bold">£{p.price.toFixed(1)}m</span>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground block">FDR</span>
                  <span className={cn("font-bold", fdrStyle.text)}>
                    {p.fdr_avg.toFixed(2)}
                  </span>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground block">xPts</span>
                  <span className="font-bold text-white">
                    {p.expected_pts.toFixed(1)}
                  </span>
                </div>
              </div>

              {p.reasoning && p.reasoning.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <ul className="space-y-1">
                    {p.reasoning.slice(0, 3).map((r, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-muted-foreground flex items-start gap-1.5"
                      >
                        <span className="text-primary">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper Components
function TransferCard({ transfer }: { transfer: TransferRecommendation }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        transfer.urgency === "immediate"
          ? "border-rose-500/30 bg-rose-500/5"
          : transfer.urgency === "soon"
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border bg-muted/20",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-rose-400 font-medium truncate">
            {transfer.player_out.name}
          </span>
          <svg
            className="w-4 h-4 text-muted-foreground flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
          <span className="text-white font-medium truncate">
            {transfer.player_in.name}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {transfer.reasoning}
        </p>
      </div>
      <span className="text-sm font-bold text-white tabular-nums flex-shrink-0">
        +{transfer.expected_gain.toFixed(1)}
      </span>
    </div>
  );
}

function PlayerRecommendationRow({
  player,
  type,
}: {
  player: TransferPlan["players_to_buy"][0];
  type: "buy" | "sell" | "watch";
}) {
  const posStyle = positionStyles[player.position];
  const fdrStyle = getFDRStyle(player.fdr_avg);

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
      <span
        className={cn(
          "inline-flex px-2 py-0.5 rounded text-xs font-semibold border",
          posStyle?.bg,
          posStyle?.text,
          posStyle?.border,
        )}
      >
        {positionNames[player.position]}
      </span>

      <div className="flex-1 min-w-0">
        <Link
          href={`/player/${player.id}`}
          className="font-medium hover:text-primary transition-colors"
        >
          {player.name}
        </Link>
        <p className="text-xs text-muted-foreground">{player.team}</p>
      </div>

      <div className="text-right text-sm">
        <span className={cn("font-bold tabular-nums", fdrStyle.text)}>
          FDR {player.fdr_avg.toFixed(1)}
        </span>
        <p className="text-xs text-muted-foreground tabular-nums">
          {player.expected_pts.toFixed(1)} pts
        </p>
      </div>

      {type === "buy" && (
        <span className="text-xs px-2 py-1 rounded bg-white/10 text-white font-medium">
          £{player.price.toFixed(1)}m
        </span>
      )}
    </div>
  );
}

