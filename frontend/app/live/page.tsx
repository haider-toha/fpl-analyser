"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useGameweekData } from "@/lib/hooks/useGameweekData";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Icon components
const Icons = {
  live: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  ),
  clock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  user: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  trophy: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  ball: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 11-5.3 14L12 14l5.3 4A8 8 0 0012 4z" />
    </svg>
  ),
  assist: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
    </svg>
  ),
  shield: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  star: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  chart: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  refresh: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  arrowUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  arrowDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  calendar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  medal3: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
};

interface LiveElement {
  id: number;
  web_name: string;
  name: string;
  team_name: string;
  team_id: number;
  position: number;
  position_name: string;
  stats: {
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    bonus: number;
    bps: number;
    total_points: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    own_goals: number;
    penalties_missed: number;
    penalties_saved: number;
  };
}

interface LiveData {
  elements: LiveElement[];
}

interface Fixture {
  id: number;
  team_h: number;
  team_a: number;
  team_h_name: string;
  team_a_name: string;
  team_h_score: number | null;
  team_a_score: number | null;
  started: boolean;
  finished: boolean;
  finished_provisional: boolean;
  kickoff_time: string;
  minutes: number;
  pulse_id: number;
}

interface ManagerData {
  total_points: number;
  points_on_bench: number;
  active_chip: string | null;
  picks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
}

type ViewTab = "fixtures" | "topScorers" | "bps" | "stats";

const positionStyles: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  2: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  3: { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" },
  4: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
};

const positionLabels = ["", "GK", "DEF", "MID", "FWD"];

// Stat card component
function StatCard({
  label,
  value,
  subValue,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
      )}
    </div>
  );
}

export default function LivePage() {
  const [managerId, setManagerId] = useState("");
  const [searchManagerId, setSearchManagerId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("fixtures");

  const { data: gameweekData, isLoading: gwLoading } = useGameweekData();
  const currentGw = gameweekData?.current?.id;

  const { data: fixturesData, isLoading: fixturesLoading, refetch: refetchFixtures } = useQuery<{ fixtures: Fixture[] }>({
    queryKey: ["fixtures", currentGw],
    queryFn: () => api.getGameweekFixtures<{ fixtures: Fixture[] }>(currentGw!),
    enabled: !!currentGw,
    refetchInterval: 60000,
  });

  const { data: liveData, isLoading: liveLoading, refetch: refetchLive } = useQuery<LiveData>({
    queryKey: ["live", currentGw],
    queryFn: () => api.getLiveScores<LiveData>(currentGw!),
    enabled: !!currentGw,
    refetchInterval: 30000,
  });

  const { data: playersData } = usePlayers({ limit: 700 });
  const players = playersData?.players || [];
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const { data: managerData, isLoading: managerLoading, error: managerError } = useQuery<ManagerData>({
    queryKey: ["manager-live", searchManagerId, currentGw],
    queryFn: () => api.getManagerLiveScore<ManagerData>(searchManagerId!, currentGw),
    enabled: !!searchManagerId && !!currentGw,
    refetchInterval: 30000,
  });

  const handleSearchManager = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(managerId);
    if (!isNaN(id) && id > 0) {
      setSearchManagerId(id);
    }
  };

  const handleRefresh = () => {
    refetchFixtures();
    refetchLive();
  };

  // Calculate stats
  const liveElements = liveData?.elements || [];
  const topScorers = useMemo(() => 
    liveElements
      .filter((e) => e.stats.total_points > 0)
    .sort((a, b) => b.stats.total_points - a.stats.total_points)
      .slice(0, 25),
    [liveElements]
  );

  const bpsLeaders = useMemo(() =>
    liveElements
      .filter((e) => e.stats.bps > 0)
      .sort((a, b) => b.stats.bps - a.stats.bps)
      .slice(0, 25),
    [liveElements]
  );

  const fixtures = fixturesData?.fixtures || [];
  const liveFixtures = fixtures.filter(f => f.started && !f.finished_provisional);
  const upcomingFixtures = fixtures.filter(f => !f.started);
  const finishedFixtures = fixtures.filter(f => f.finished_provisional);

  // Calculate gameweek stats
  const totalGoals = liveElements.reduce((acc, e) => acc + (e.stats.goals_scored || 0), 0);
  const totalAssists = liveElements.reduce((acc, e) => acc + (e.stats.assists || 0), 0);
  const totalCleanSheets = liveElements.reduce((acc, e) => acc + (e.stats.clean_sheets || 0), 0);
  const totalCards = liveElements.reduce((acc, e) => acc + (e.stats.yellow_cards || 0) + (e.stats.red_cards || 0), 0);

  const isLoading = gwLoading || fixturesLoading || liveLoading;

  const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: "fixtures", label: "Fixtures", icon: <Icons.calendar className="w-4 h-4" /> },
    { id: "topScorers", label: "Top Scorers", icon: <Icons.trophy className="w-4 h-4" /> },
    { id: "bps", label: "BPS Leaders", icon: <Icons.star className="w-4 h-4" /> },
    { id: "stats", label: "GW Stats", icon: <Icons.chart className="w-4 h-4" /> },
  ];

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-primary to-primary/50" />
            <h1 className="text-3xl font-bold tracking-tight">Live</h1>
            {gameweekData?.current && !gameweekData.current.finished && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <p className="text-muted-foreground ml-4">
          Real-time scores and gameweek updates
        </p>
      </div>

        {/* Gameweek selector and refresh */}
        <div className="flex items-center gap-3">
      {gameweekData?.current && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card border border-border">
              <Icons.calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Gameweek {gameweekData.current.id}</p>
                <p className="text-xs text-muted-foreground">
                  {gameweekData.current.finished ? "Finished" : 
                   liveFixtures.length > 0 ? `${liveFixtures.length} live` : 
                   `${upcomingFixtures.length} upcoming`}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleRefresh}
            className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
            title="Refresh data"
          >
            <Icons.refresh className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Goals"
          value={totalGoals}
          color="text-emerald-400"
          icon={<Icons.ball className="w-4 h-4" />}
        />
        <StatCard
          label="Total Assists"
          value={totalAssists}
          color="text-sky-400"
          icon={<Icons.assist className="w-4 h-4" />}
        />
        <StatCard
          label="Clean Sheets"
          value={totalCleanSheets}
          color="text-amber-400"
          icon={<Icons.shield className="w-4 h-4" />}
        />
        <StatCard
          label="Cards"
          value={totalCards}
          color="text-rose-400"
          icon={<Icons.arrowDown className="w-4 h-4" />}
        />
      </div>

      {/* Manager Lookup */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icons.user className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Check Your Live Score</h2>
            <p className="text-sm text-muted-foreground">Enter your FPL Manager ID</p>
          </div>
        </div>

        <form onSubmit={handleSearchManager} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Enter Manager ID..."
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          />
          </div>
          <button
            type="submit"
            className="h-12 px-6 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Icons.search className="w-4 h-4" />
            Check
          </button>
        </form>

        {managerLoading && (
          <div className="h-24 bg-muted/50 animate-pulse rounded-xl" />
        )}
        
        {managerError && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/50 bg-destructive/5 text-destructive">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">{(managerError as Error).message}</p>
          </div>
        )}
        
        {managerData && (
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-5xl font-bold tabular-nums text-primary">
              {managerData.total_points}
                </p>
                <p className="text-sm text-muted-foreground mt-1">GW {currentGw} Live Points</p>
              </div>
              {managerData.active_chip && (
                <span className="px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-sm font-semibold border border-amber-500/30">
                  {managerData.active_chip.replace("_", " ").toUpperCase()}
                </span>
              )}
            </div>
            
            {managerData.points_on_bench > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icons.arrowDown className="w-4 h-4" />
                <span>{managerData.points_on_bench} points on bench</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
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

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground text-sm">Loading live data...</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <div className="animate-fade-in">
          {activeTab === "fixtures" && (
            <FixturesView
              fixtures={fixtures}
              liveFixtures={liveFixtures}
              upcomingFixtures={upcomingFixtures}
              finishedFixtures={finishedFixtures}
            />
          )}
          {activeTab === "topScorers" && (
            <TopScorersView topScorers={topScorers} />
          )}
          {activeTab === "bps" && (
            <BPSView bpsLeaders={bpsLeaders} />
          )}
          {activeTab === "stats" && (
            <StatsView liveElements={liveElements} />
          )}
        </div>
      )}
    </div>
  );
}

function FixturesView({
  fixtures,
  liveFixtures,
  upcomingFixtures,
  finishedFixtures,
}: {
  fixtures: Fixture[];
  liveFixtures: Fixture[];
  upcomingFixtures: Fixture[];
  finishedFixtures: Fixture[];
}) {
  const renderFixture = (fixture: Fixture) => {
    const isLive = fixture.started && !fixture.finished_provisional;
    const isFinished = fixture.finished_provisional;
    
    return (
              <div
                key={fixture.id}
        className={cn(
          "flex items-center p-4 rounded-xl border transition-all duration-200",
          isLive 
            ? "bg-rose-500/5 border-rose-500/30" 
            : "bg-card border-border hover:border-primary/30"
        )}
      >
        {/* Home Team */}
        <div className="flex-1 text-right">
          <p className="font-semibold truncate">
            {fixture.team_h_name}
          </p>
        </div>
                
        {/* Score */}
        <div className="w-32 mx-4 text-center">
                  {fixture.started ? (
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl font-bold tabular-nums">
                {fixture.team_h_score ?? 0}
              </span>
              <span className="text-muted-foreground">-</span>
              <span className="text-2xl font-bold tabular-nums">
                {fixture.team_a_score ?? 0}
                    </span>
            </div>
                  ) : (
            <div className="flex flex-col items-center">
              <span className="text-lg font-semibold tabular-nums">
                      {new Date(fixture.kickoff_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
              <span className="text-xs text-muted-foreground">
                {new Date(fixture.kickoff_time).toLocaleDateString([], {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
                  )}
                </div>
                
        {/* Away Team */}
        <div className="flex-1">
          <p className="font-semibold truncate">
            {fixture.team_a_name}
          </p>
        </div>

        {/* Status */}
        <div className="w-20 text-right">
          {isFinished ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-medium">
              <Icons.check className="w-3 h-3" />
              FT
            </span>
          ) : isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-medium">
              <Icons.clock className="w-3 h-3" />
              Soon
                </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Live Fixtures */}
      {liveFixtures.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
            <h3 className="font-semibold text-rose-400">Live Now</h3>
          </div>
          <div className="space-y-2">
            {liveFixtures.map(renderFixture)}
                </div>
              </div>
      )}

      {/* Upcoming Fixtures */}
      {upcomingFixtures.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Icons.clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-muted-foreground">Upcoming</h3>
          </div>
          <div className="space-y-2">
            {upcomingFixtures.map(renderFixture)}
          </div>
        </div>
      )}

      {/* Finished Fixtures */}
      {finishedFixtures.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Icons.check className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-muted-foreground">Finished</h3>
          </div>
          <div className="space-y-2">
            {finishedFixtures.map(renderFixture)}
          </div>
        </div>
      )}

      {fixtures.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <Icons.calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No fixtures available for this gameweek</p>
        </div>
      )}
    </div>
  );
}

function TopScorersView({
  topScorers,
}: {
  topScorers: LiveElement[];
}) {
  // Prepare chart data
  const chartData = topScorers.slice(0, 10).map(e => ({
    name: e.web_name || `Player ${e.id}`,
    points: e.stats.total_points,
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Top 10 Points</h3>
        <ResponsiveContainer width="100%" height={300}>
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
            />
            <Bar dataKey="points" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-semibold">All Top Scorers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">#</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Player</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Min</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">G</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">A</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">CS</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Bonus</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Pts</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-border">
              {topScorers.map((element, idx) => {
                const posStyle = element.position ? positionStyles[element.position] : null;
                  return (
                  <tr key={element.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {posStyle && (
                          <span className={cn(
                            "inline-flex px-2 py-0.5 rounded text-xs font-medium border",
                            posStyle.bg,
                            posStyle.text,
                            posStyle.border
                          )}>
                            {positionLabels[element.position]}
                          </span>
                        )}
                        <div>
                        <span className="font-medium">
                          {element.web_name}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          {element.team_name}
                        </span>
                        </div>
                      </div>
                      </td>
                    <td className="py-3 px-4 text-center tabular-nums text-muted-foreground">
                        {element.stats.minutes}
                      </td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      {element.stats.goals_scored > 0 ? (
                        <span className="text-emerald-400 font-medium">{element.stats.goals_scored}</span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                      </td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      {element.stats.assists > 0 ? (
                        <span className="text-sky-400 font-medium">{element.stats.assists}</span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                      </td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      {element.stats.clean_sheets > 0 ? (
                        <span className="text-amber-400 font-medium">{element.stats.clean_sheets}</span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                      </td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      {element.stats.bonus > 0 ? (
                        <span className="text-purple-400 font-medium">{element.stats.bonus}</span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                      </td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums text-primary">
                        {element.stats.total_points}
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

function BPSView({
  bpsLeaders,
}: {
  bpsLeaders: LiveElement[];
}) {
  // Prepare chart data
  const chartData = bpsLeaders.slice(0, 10).map(e => ({
    name: e.web_name || `Player ${e.id}`,
    bps: e.stats.bps,
  }));

  // Potential bonus points (top 3 per fixture would get 3, 2, 1)
  const bonusPrediction = bpsLeaders.slice(0, 3).map((e, idx) => ({
    ...e,
    predictedBonus: 3 - idx,
  }));

  return (
    <div className="space-y-6">
      {/* Bonus Predictions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icons.star className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold">Projected Bonus Points</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bonusPrediction.map((element, idx) => {
            const medalIcons = [
              <Icons.trophy key="1" className="w-6 h-6 text-amber-400" />,
              <Icons.star key="2" className="w-6 h-6 text-slate-400" />,
              <Icons.medal3 key="3" className="w-6 h-6 text-orange-400" />,
            ];
            return (
              <div
                key={element.id}
                className={cn(
                  "p-4 rounded-xl border",
                  idx === 0 ? "bg-amber-500/5 border-amber-500/30" :
                  idx === 1 ? "bg-slate-500/5 border-slate-400/30" :
                  "bg-orange-500/5 border-orange-500/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    idx === 0 ? "bg-amber-500/10" :
                    idx === 1 ? "bg-slate-500/10" : "bg-orange-500/10"
                  )}>
                    {medalIcons[idx]}
                  </div>
                  <span className={cn(
                    "text-2xl font-bold tabular-nums",
                    idx === 0 ? "text-amber-400" :
                    idx === 1 ? "text-slate-400" : "text-orange-400"
                  )}>
                    +{element.predictedBonus}
                  </span>
                </div>
                <p className="font-semibold">{element.web_name}</p>
                <p className="text-sm text-muted-foreground">{element.stats.bps} BPS</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* BPS Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">BPS Leaderboard</h3>
        <ResponsiveContainer width="100%" height={300}>
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
            />
            <Bar dataKey="bps" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-semibold">All BPS Leaders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">#</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Player</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Min</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">G</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">A</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">BPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bpsLeaders.map((element, idx) => {
                return (
                  <tr key={element.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium">
                        {element.web_name}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        {element.team_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums text-muted-foreground">
                      {element.stats.minutes}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      {element.stats.goals_scored > 0 ? (
                        <span className="text-emerald-400">{element.stats.goals_scored}</span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      {element.stats.assists > 0 ? (
                        <span className="text-sky-400">{element.stats.assists}</span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums text-amber-400">
                      {element.stats.bps}
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

function StatsView({
  liveElements,
}: {
  liveElements: LiveElement[];
}) {
  // Calculate position distribution
  const positionStats = [1, 2, 3, 4].map(pos => {
    const posPlayers = liveElements.filter(e => e.position === pos);
    const totalPoints = posPlayers.reduce((acc, e) => acc + e.stats.total_points, 0);
    const avgPoints = posPlayers.length > 0 ? totalPoints / posPlayers.length : 0;
    return {
      position: positionLabels[pos],
      avgPoints: avgPoints,
      totalPoints: totalPoints,
      count: posPlayers.length,
      fill: pos === 1 ? "#f59e0b" : pos === 2 ? "#10b981" : pos === 3 ? "#0ea5e9" : "#f43f5e",
    };
  });

  // Goal scorers
  const goalScorers = liveElements
    .filter(e => e.stats.goals_scored > 0)
    .sort((a, b) => b.stats.goals_scored - a.stats.goals_scored)
    .slice(0, 10);

  // Assist providers
  const assistProviders = liveElements
    .filter(e => e.stats.assists > 0)
    .sort((a, b) => b.stats.assists - a.stats.assists)
    .slice(0, 10);

  // Points distribution for pie chart
  const pointsDistribution = positionStats.map(ps => ({
    name: ps.position,
    value: ps.totalPoints,
    fill: ps.fill,
  }));

  return (
    <div className="space-y-6">
      {/* Position Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Avg Points by Position</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={positionStats} margin={{ top: 20 }}>
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
                formatter={(value: number) => [value.toFixed(1), "Avg Pts"]}
              />
              <Bar dataKey="avgPoints" radius={[4, 4, 0, 0]}>
                {positionStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Points Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pointsDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pointsDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
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
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Goal Scorers & Assist Providers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goal Scorers */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icons.ball className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold">Goal Scorers</h3>
          </div>
          <div className="space-y-2">
            {goalScorers.map((element, idx) => {
              return (
                <div
                  key={element.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground tabular-nums w-6">{idx + 1}</span>
                    <div>
                      <p className="font-medium">{element.web_name}</p>
                      <p className="text-xs text-muted-foreground">{element.team_name}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-emerald-400 tabular-nums">
                    {element.stats.goals_scored}
                  </span>
                </div>
              );
            })}
            {goalScorers.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No goals scored yet</p>
            )}
          </div>
        </div>

        {/* Assist Providers */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icons.assist className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-semibold">Assist Providers</h3>
          </div>
          <div className="space-y-2">
            {assistProviders.map((element, idx) => {
              return (
                <div
                  key={element.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground tabular-nums w-6">{idx + 1}</span>
                    <div>
                      <p className="font-medium">{element.web_name}</p>
                      <p className="text-xs text-muted-foreground">{element.team_name}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-sky-400 tabular-nums">
                    {element.stats.assists}
                  </span>
                </div>
              );
            })}
            {assistProviders.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No assists yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Position Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {positionStats.map((ps) => (
          <div
            key={ps.position}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="px-2 py-1 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: `${ps.fill}20`, color: ps.fill }}
              >
                {ps.position}
              </span>
              <span className="text-xs text-muted-foreground">{ps.count} players</span>
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: ps.fill }}>
              {ps.avgPoints.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">avg points</p>
          </div>
        ))}
      </div>
    </div>
  );
}
