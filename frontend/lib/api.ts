import { Player, VORRanking, MatchPrediction, ChipStrategy } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Response types for API endpoints
interface PlayersResponse {
  players: Player[];
  total: number;
}

interface VORRankingsResponse {
  rankings: VORRanking[];
}

interface FixtureAnalysisResponse {
  rankings: Array<{
    team_id: number;
    team_name: string;
    rank: number;
    fdr: number;
    num_fixtures: number;
    double_gws: number;
    blank_gws: number;
    fixture_swing: number;
  }>;
}

interface DifferentialsResponse {
  captain_differentials: Array<{
    id: number;
    name: string;
    position: number;
    price: number;
    expected_points: number;
    ownership: number;
    differential_ev: number;
    captain_differential_ev: number;
    rank_impact: string;
  }>;
}

interface MatchPredictionsResponse {
  predictions: MatchPrediction[];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Players
  async getPlayer<T = unknown>(playerId: number): Promise<T> {
    return this.fetch<T>(`/api/players/${playerId}`);
  }

  async getPlayerHistory<T = unknown>(playerId: number): Promise<T> {
    return this.fetch<T>(`/api/players/${playerId}/history`);
  }

  async getPlayers(params?: {
    position?: number;
    team?: number;
    min_price?: number;
    max_price?: number;
    sort_by?: string;
    limit?: number;
  }): Promise<PlayersResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    return this.fetch<PlayersResponse>(`/api/players/?${searchParams}`);
  }

  // Leagues
  async getLeague(leagueId: number) {
    return this.fetch(`/api/leagues/${leagueId}`);
  }

  // Live
  async getCurrentGameweek<T = unknown>(): Promise<T> {
    return this.fetch<T>("/api/live/gameweek");
  }

  async getLiveScores<T = unknown>(gameweek: number): Promise<T> {
    return this.fetch<T>(`/api/live/gameweek/${gameweek}/scores`);
  }

  async getGameweekFixtures<T = unknown>(gameweek: number): Promise<T> {
    return this.fetch<T>(`/api/live/gameweek/${gameweek}/fixtures`);
  }

  async getManagerLiveScore<T = unknown>(
    managerId: number,
    gameweek?: number,
  ): Promise<T> {
    const params = gameweek ? `?gameweek=${gameweek}` : "";
    return this.fetch<T>(`/api/live/manager/${managerId}/live${params}`);
  }

  async getManager<T = unknown>(managerId: number): Promise<T> {
    return this.fetch<T>(`/api/live/manager/${managerId}`);
  }

  // Analytics
  async getFixtureAnalysis(params: {
    start_gw: number;
    end_gw: number;
    position_type?: string;
  }): Promise<FixtureAnalysisResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    return this.fetch<FixtureAnalysisResponse>(
      `/api/analytics/fixtures/analysis?${searchParams}`,
    );
  }

  async getCaptainDifferentials(
    minExpected = 5.0,
    maxOwnership = 15.0,
  ): Promise<DifferentialsResponse> {
    return this.fetch<DifferentialsResponse>(
      `/api/analytics/differentials?min_expected=${minExpected}&max_ownership=${maxOwnership}`,
    );
  }

  async getVORRankings(
    numGameweeks = 1,
    position?: number,
  ): Promise<VORRankingsResponse> {
    const params = new URLSearchParams({ num_gameweeks: String(numGameweeks) });
    if (position) params.append("position", String(position));
    return this.fetch<VORRankingsResponse>(
      `/api/analytics/vor-rankings?${params}`,
    );
  }

  async getChipStrategy(params: {
    squad_ids: number[];
    current_gameweek: number;
    chips_available?: Record<string, boolean>;
  }): Promise<ChipStrategy> {
    return this.fetch<ChipStrategy>("/api/analytics/chip-strategy", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getMatchPredictions(
    gameweek?: number,
  ): Promise<MatchPredictionsResponse> {
    const params = gameweek ? `?gameweek=${gameweek}` : "";
    return this.fetch<MatchPredictionsResponse>(
      `/api/analytics/match-predictions${params}`,
    );
  }
}

export const api = new ApiClient();
