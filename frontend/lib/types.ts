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
