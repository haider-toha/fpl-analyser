// Player types
export interface Player {
  id: number;
  name: string;
  web_name: string;
  team_id: number;
  team_name: string;
  position: number;
  position_name: string;
  price: number;
  total_points: number;
  points_per_game: number;
  form: number;
  expected_points: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  minutes: number;
  xg: number;
  xa: number;
  xgi: number;
  selected_by_percent: number;
  chance_of_playing: number | null;
  news: string;
  status: string;
  next_fixture_difficulty: number;
}

export interface PlayerHistory {
  gameweek: number;
  points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  bps: number;
  influence: number;
  creativity: number;
  threat: number;
  ict_index: number;
  value: number;
  selected: number;
  transfers_in: number;
  transfers_out: number;
}

export interface PlayerFixture {
  id: number;
  gameweek: number;
  is_home: boolean;
  difficulty: number;
  team_name: string;
}

export interface PlayerDetail extends Player {
  history: PlayerHistory[];
  fixtures: PlayerFixture[];
}

// Analytics types
export interface VORRanking {
  id: number;
  name: string;
  position: number;
  price: number;
  expected_points: number;
  vor: number;
  vor_per_cost: number;
  ownership: number;
  vor_rank: number;
}

export interface MatchPrediction {
  fixture_id: number;
  gameweek: number;
  home_team: string;
  away_team: string;
  kickoff_time: string | null;
  home_xg: number;
  away_xg: number;
  clean_sheet_home: number;
  clean_sheet_away: number;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
}

export interface ChipRecommendation {
  recommended_gameweek: number;
  expected_value: number;
  confidence: number;
  reasoning: string[];
  alternatives?: number[];
}

export interface ChipStrategy {
  recommendations: {
    wildcard: ChipRecommendation;
    bench_boost: ChipRecommendation;
    triple_captain: ChipRecommendation;
    free_hit: ChipRecommendation;
  };
  optimal_order: string[];
  total_expected_value: number;
  season_projections: {
    with_optimal_chips: number;
    without_chips: number;
    chip_value_added: number;
  };
}

// Transfer Planning Types
export interface TransferRecommendation {
  player_out: {
    id: number;
    name: string;
    team: string;
    price: number;
    fdr_avg: number;
    expected_pts: number;
  };
  player_in: {
    id: number;
    name: string;
    team: string;
    price: number;
    fdr_avg: number;
    expected_pts: number;
  };
  expected_gain: number;
  urgency: "immediate" | "soon" | "plan_ahead";
  reasoning: string;
  fixture_context: string;
}

export interface PlayerProjection {
  id: number;
  name: string;
  team: string;
  position: number;
  price: number;
  fdr_avg: number;
  fixture_swing: number;
  expected_pts: number;
  reasoning: string[];
}

export interface TransferPlan {
  current_gameweek: number;
  horizon: number;
  recommended_transfers: TransferRecommendation[];
  players_to_sell: PlayerProjection[];
  players_to_buy: PlayerProjection[];
  players_to_watch: PlayerProjection[];
  team_fixture_rankings: TeamFixtureRanking[];
  position_picks: {
    goalkeepers: PositionPick[];
    defenders: PositionPick[];
    midfielders: PositionPick[];
    forwards: PositionPick[];
  };
}

export interface TeamFixtureRanking {
  team_id: number;
  team_name: string;
  short_name: string;
  rank: number;
  fdr: number;
  num_fixtures: number;
  double_gws: number;
  blank_gws: number;
  fixture_swing: number;
}

export interface PositionPick {
  id: number;
  name: string;
  team: string;
  price: number;
  expected_pts: number;
  fdr_avg: number;
}

export interface FixtureSwingAnalysis {
  team_id: number;
  team_name: string;
  total_fdr: number;
  avg_fdr: number;
  fixture_swing: number;
  double_gameweeks: number;
  blank_gameweeks: number;
  turning_points: Array<{
    gameweek: number;
    type: "fixtures_ease" | "fixtures_harden";
    message: string;
  }>;
  recommendation: string;
}

export interface RotationPair {
  player_1: {
    id: number;
    name: string;
    team: string;
    price: number;
  };
  player_2: {
    id: number;
    name: string;
    team: string;
    price: number;
  };
  rotation_score: number;
  combined_price: number;
  combined_expected_pts: number;
  value_score: number;
}

export interface GameweekProjection {
  gameweek: number;
  expected_points: number;
  is_blank: boolean;
  is_double?: boolean;
  fixtures?: Array<{
    opponent: string;
    is_home: boolean;
    fdr: number;
    expected_points: number;
    clean_sheet_prob: number;
  }>;
}

export interface DetailedPlayerProjection {
  player_id: number;
  player_name: string;
  team: string;
  position: number;
  price: number;
  current_form: number;
  total_expected_points: number;
  avg_expected_points: number;
  fixture_difficulty_avg: number;
  fixture_swing: number;
  action: "buy" | "sell" | "hold" | "watch";
  reasoning: string[];
  gameweek_projections: GameweekProjection[];
}
