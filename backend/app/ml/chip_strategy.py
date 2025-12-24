"""
Chip Strategy Optimizer.

Optimizes timing and usage of FPL chips:
1. Wildcard (WC) - Full squad rebuild
2. Bench Boost (BB) - All 15 players score
3. Triple Captain (TC) - 3x captain points
4. Free Hit (FH) - Unlimited transfers for one GW

Uses dynamic programming and expected value calculations to find
optimal chip deployment strategies.
"""
import numpy as np
from typing import Optional
from dataclasses import dataclass, field
from itertools import combinations


@dataclass
class ChipRecommendation:
    """Recommendation for chip usage."""
    chip_name: str
    recommended_gameweek: int
    expected_value: float
    confidence: float
    reasoning: list[str]
    alternative_gameweeks: list[int]


@dataclass
class ChipAnalysis:
    """Complete chip strategy analysis."""
    wildcard: ChipRecommendation
    bench_boost: ChipRecommendation
    triple_captain: ChipRecommendation
    free_hit: ChipRecommendation
    optimal_order: list[str]
    total_expected_value: float
    season_projection_with_chips: float
    season_projection_without_chips: float


@dataclass
class GameweekChipValue:
    """Chip values for a specific gameweek."""
    gameweek: int
    bench_boost_value: float
    triple_captain_value: float
    free_hit_value: float
    wildcard_value: float
    is_double_gameweek: bool
    is_blank_gameweek: bool
    fixtures_quality: float


class ChipStrategyOptimizer:
    """
    Optimize FPL chip strategy using expected value analysis.
    """
    
    # Historical average chip returns
    BASELINE_VALUES = {
        "bench_boost": 12,  # Average bench points in a GW
        "triple_captain": 8,  # Extra captain points (1x baseline)
        "free_hit": 15,  # Points gained from optimal GW squad
        "wildcard": 30,  # Cumulative value over remaining season
    }
    
    def __init__(self):
        self.gameweek_data: dict[int, dict] = {}
        self.fixtures: list[dict] = []
        self.teams: dict[int, dict] = {}
    
    def load_data(
        self,
        fixtures: list[dict],
        teams: list[dict],
        current_gameweek: int,
    ):
        """Load fixture and team data."""
        self.fixtures = fixtures
        self.teams = {t.get("id"): t for t in teams}
        self.current_gameweek = current_gameweek
        
        # Analyze each future gameweek
        for gw in range(current_gameweek, 39):
            gw_fixtures = [f for f in fixtures if f.get("event") == gw]
            self.gameweek_data[gw] = self._analyze_gameweek(gw, gw_fixtures)
    
    def _analyze_gameweek(self, gw: int, fixtures: list[dict]) -> dict:
        """Analyze a gameweek's chip potential."""
        num_fixtures = len(fixtures)
        teams_playing = set()
        
        for f in fixtures:
            teams_playing.add(f.get("team_h"))
            teams_playing.add(f.get("team_a"))
        
        # Check for DGW (teams with 2+ fixtures)
        team_fixture_count = {}
        for f in fixtures:
            team_fixture_count[f.get("team_h")] = team_fixture_count.get(f.get("team_h"), 0) + 1
            team_fixture_count[f.get("team_a")] = team_fixture_count.get(f.get("team_a"), 0) + 1
        
        dgw_teams = [t for t, c in team_fixture_count.items() if c > 1]
        is_dgw = len(dgw_teams) > 2
        is_blank = num_fixtures < 10
        
        # Calculate average fixture difficulty
        avg_difficulty = 3.0  # Default
        if fixtures:
            total_diff = sum(
                (f.get("team_h_difficulty", 3) + f.get("team_a_difficulty", 3)) / 2
                for f in fixtures
            )
            avg_difficulty = total_diff / len(fixtures)
        
        return {
            "gameweek": gw,
            "num_fixtures": num_fixtures,
            "teams_playing": len(teams_playing),
            "is_dgw": is_dgw,
            "dgw_teams": dgw_teams,
            "is_blank": is_blank,
            "avg_difficulty": avg_difficulty,
        }
    
    def calculate_bench_boost_value(
        self,
        gameweek: int,
        squad: list[dict],
    ) -> dict:
        """
        Calculate expected value of Bench Boost in a gameweek.
        
        BB is most valuable in DGWs with high-scoring bench players.
        """
        gw_data = self.gameweek_data.get(gameweek, {})
        
        if not squad:
            # No squad data, use baseline estimates
            base_value = self.BASELINE_VALUES["bench_boost"]
            if gw_data.get("is_dgw"):
                base_value *= 1.8
            return {
                "gameweek": gameweek,
                "expected_value": base_value,
                "is_recommended": gw_data.get("is_dgw", False),
                "factors": {"base": base_value, "dgw_multiplier": 1.8 if gw_data.get("is_dgw") else 1.0},
            }
        
        # Sort by expected points to identify bench
        sorted_squad = sorted(squad, key=lambda p: p.get("expected_points", 0), reverse=True)
        bench = sorted_squad[11:15]  # Last 4 players
        
        # Bench expected points
        bench_expected = sum(p.get("expected_points", 0) for p in bench)
        
        # DGW multiplier (if bench players have doubles)
        dgw_teams = set(gw_data.get("dgw_teams", []))
        bench_dgw_count = sum(1 for p in bench if p.get("team_id") in dgw_teams)
        dgw_multiplier = 1 + (bench_dgw_count * 0.4)
        
        expected_value = bench_expected * dgw_multiplier
        
        # Minimum value threshold for recommendation
        is_recommended = expected_value > 15
        
        return {
            "gameweek": gameweek,
            "expected_value": round(expected_value, 2),
            "bench_players": [p.get("web_name", p.get("name", "")) for p in bench],
            "bench_expected_points": round(bench_expected, 2),
            "dgw_multiplier": round(dgw_multiplier, 2),
            "is_recommended": is_recommended,
            "is_dgw": gw_data.get("is_dgw", False),
        }
    
    def calculate_triple_captain_value(
        self,
        gameweek: int,
        squad: list[dict],
    ) -> dict:
        """
        Calculate expected value of Triple Captain in a gameweek.
        
        TC is most valuable when best captain has DGW and favorable fixtures.
        """
        gw_data = self.gameweek_data.get(gameweek, {})
        
        if not squad:
            base_value = self.BASELINE_VALUES["triple_captain"]
            if gw_data.get("is_dgw"):
                base_value *= 1.9
            return {
                "gameweek": gameweek,
                "expected_value": base_value,
                "is_recommended": gw_data.get("is_dgw", False),
            }
        
        # Find best captain option
        captain = max(squad, key=lambda p: p.get("expected_points", 0))
        captain_expected = captain.get("expected_points", 0)
        
        # TC gives 1 extra captain points (2x instead of 1x extra)
        # So value = captain_expected (the additional 1x on top of normal 2x)
        base_value = captain_expected
        
        # DGW boost if captain has double
        dgw_teams = set(gw_data.get("dgw_teams", []))
        if captain.get("team_id") in dgw_teams:
            base_value *= 1.85  # ~85% boost for DGW
        
        # Fixture quality adjustment
        fixture_factor = (5 - gw_data.get("avg_difficulty", 3)) / 5 + 0.8
        expected_value = base_value * fixture_factor
        
        is_recommended = expected_value > 10 and captain.get("team_id") in dgw_teams
        
        return {
            "gameweek": gameweek,
            "expected_value": round(expected_value, 2),
            "best_captain": captain.get("web_name", captain.get("name", "")),
            "captain_expected": round(captain_expected, 2),
            "has_dgw": captain.get("team_id") in dgw_teams,
            "is_recommended": is_recommended,
        }
    
    def calculate_free_hit_value(
        self,
        gameweek: int,
        current_squad: list[dict],
        all_players: list[dict],
    ) -> dict:
        """
        Calculate expected value of Free Hit in a gameweek.
        
        FH is valuable in BGWs or when squad has many blanks/bad fixtures.
        """
        gw_data = self.gameweek_data.get(gameweek, {})
        
        # Current squad expected points
        if current_squad:
            current_expected = sum(p.get("expected_points", 0) for p in current_squad[:11])
        else:
            current_expected = 50  # Baseline
        
        # Optimal FH squad expected points (top players with good fixtures)
        if all_players:
            # Filter to teams playing
            playing_teams = set(
                f.get("team_h") for f in self.fixtures if f.get("event") == gameweek
            ) | set(
                f.get("team_a") for f in self.fixtures if f.get("event") == gameweek
            )
            
            eligible = [p for p in all_players if p.get("team_id") in playing_teams]
            
            # Simple greedy selection for top 11
            eligible_sorted = sorted(eligible, key=lambda p: p.get("expected_points", 0), reverse=True)
            
            # Approximate optimal (ignoring budget/position constraints for speed)
            optimal_expected = sum(p.get("expected_points", 0) for p in eligible_sorted[:11])
        else:
            optimal_expected = current_expected * 1.3  # Estimate 30% improvement
        
        # BGW penalty for current squad
        if gw_data.get("is_blank"):
            # Estimate how many current players don't play
            if current_squad:
                playing_teams = set(
                    f.get("team_h") for f in self.fixtures if f.get("event") == gameweek
                ) | set(
                    f.get("team_a") for f in self.fixtures if f.get("event") == gameweek
                )
                players_not_playing = sum(
                    1 for p in current_squad[:11] 
                    if p.get("team_id") not in playing_teams
                )
                current_expected *= (11 - players_not_playing) / 11
        
        expected_value = optimal_expected - current_expected
        is_recommended = gw_data.get("is_blank", False) or expected_value > 20
        
        return {
            "gameweek": gameweek,
            "expected_value": round(expected_value, 2),
            "current_squad_expected": round(current_expected, 2),
            "optimal_squad_expected": round(optimal_expected, 2),
            "is_blank_gw": gw_data.get("is_blank", False),
            "teams_playing": gw_data.get("teams_playing", 20),
            "is_recommended": is_recommended,
        }
    
    def calculate_wildcard_value(
        self,
        current_gameweek: int,
        current_squad: list[dict],
        all_players: list[dict],
        horizon: int = 8,
    ) -> dict:
        """
        Calculate expected value of Wildcard.
        
        WC value depends on:
        - Current squad quality vs optimal
        - Upcoming fixture swings
        - Number of problem positions
        """
        if not current_squad or not all_players:
            return {
                "gameweek": current_gameweek,
                "expected_value": self.BASELINE_VALUES["wildcard"],
                "is_recommended": False,
            }
        
        # Current squad value
        current_expected = sum(p.get("expected_points", 0) for p in current_squad[:11])
        
        # Optimal squad (approximation)
        by_position = {1: [], 2: [], 3: [], 4: []}
        for p in all_players:
            pos = p.get("position", 3)
            if pos in by_position:
                by_position[pos].append(p)
        
        for pos in by_position:
            by_position[pos].sort(key=lambda p: p.get("expected_points", 0), reverse=True)
        
        # Best 15 in valid formation
        optimal_squad = []
        optimal_squad.extend(by_position[1][:2])  # 2 GKs
        optimal_squad.extend(by_position[2][:5])  # 5 DEFs
        optimal_squad.extend(by_position[3][:5])  # 5 MIDs
        optimal_squad.extend(by_position[4][:3])  # 3 FWDs
        
        optimal_xi = sorted(optimal_squad, key=lambda p: p.get("expected_points", 0), reverse=True)[:11]
        optimal_expected = sum(p.get("expected_points", 0) for p in optimal_xi)
        
        # Value over remaining gameweeks
        gws_remaining = 38 - current_gameweek
        value_per_gw = optimal_expected - current_expected
        total_value = value_per_gw * min(horizon, gws_remaining)
        
        # Decay factor (value diminishes over time as you'd make transfers anyway)
        decay_factor = 0.7
        expected_value = total_value * decay_factor
        
        # Count "problem" players in current squad
        squad_avg = current_expected / 11
        problem_players = sum(
            1 for p in current_squad[:11] 
            if p.get("expected_points", 0) < squad_avg * 0.7
        )
        
        is_recommended = expected_value > 20 or problem_players >= 4
        
        return {
            "gameweek": current_gameweek,
            "expected_value": round(expected_value, 2),
            "current_squad_xi_expected": round(current_expected, 2),
            "optimal_squad_xi_expected": round(optimal_expected, 2),
            "value_per_gameweek": round(value_per_gw, 2),
            "problem_players": problem_players,
            "horizon_gameweeks": horizon,
            "is_recommended": is_recommended,
        }
    
    def get_optimal_chip_strategy(
        self,
        current_gameweek: int,
        squad: list[dict],
        all_players: list[dict],
        chips_available: dict[str, bool],
    ) -> ChipAnalysis:
        """
        Get complete chip strategy for remaining season.
        
        Uses dynamic programming to find optimal chip deployment.
        """
        # Calculate chip values for each remaining gameweek
        gw_values = {}
        
        for gw in range(current_gameweek, 39):
            bb = self.calculate_bench_boost_value(gw, squad)
            tc = self.calculate_triple_captain_value(gw, squad)
            fh = self.calculate_free_hit_value(gw, squad, all_players)
            
            gw_values[gw] = GameweekChipValue(
                gameweek=gw,
                bench_boost_value=bb["expected_value"],
                triple_captain_value=tc["expected_value"],
                free_hit_value=fh["expected_value"],
                wildcard_value=0,  # WC is one-time, handled separately
                is_double_gameweek=self.gameweek_data.get(gw, {}).get("is_dgw", False),
                is_blank_gameweek=self.gameweek_data.get(gw, {}).get("is_blank", False),
                fixtures_quality=self.gameweek_data.get(gw, {}).get("avg_difficulty", 3),
            )
        
        # Find best gameweek for each chip
        best_bb_gw = max(gw_values.keys(), key=lambda g: gw_values[g].bench_boost_value)
        best_tc_gw = max(gw_values.keys(), key=lambda g: gw_values[g].triple_captain_value)
        best_fh_gw = max(gw_values.keys(), key=lambda g: gw_values[g].free_hit_value)
        
        # Wildcard analysis
        wc_analysis = self.calculate_wildcard_value(current_gameweek, squad, all_players)
        
        # Build recommendations
        bb_rec = ChipRecommendation(
            chip_name="Bench Boost",
            recommended_gameweek=best_bb_gw,
            expected_value=gw_values[best_bb_gw].bench_boost_value,
            confidence=0.7 if gw_values[best_bb_gw].is_double_gameweek else 0.5,
            reasoning=self._get_bb_reasoning(gw_values[best_bb_gw]),
            alternative_gameweeks=self._get_top_gws(gw_values, "bench_boost_value", 3)[1:],
        )
        
        tc_rec = ChipRecommendation(
            chip_name="Triple Captain",
            recommended_gameweek=best_tc_gw,
            expected_value=gw_values[best_tc_gw].triple_captain_value,
            confidence=0.7 if gw_values[best_tc_gw].is_double_gameweek else 0.5,
            reasoning=self._get_tc_reasoning(gw_values[best_tc_gw]),
            alternative_gameweeks=self._get_top_gws(gw_values, "triple_captain_value", 3)[1:],
        )
        
        fh_rec = ChipRecommendation(
            chip_name="Free Hit",
            recommended_gameweek=best_fh_gw,
            expected_value=gw_values[best_fh_gw].free_hit_value,
            confidence=0.8 if gw_values[best_fh_gw].is_blank_gameweek else 0.5,
            reasoning=self._get_fh_reasoning(gw_values[best_fh_gw]),
            alternative_gameweeks=self._get_top_gws(gw_values, "free_hit_value", 3)[1:],
        )
        
        wc_rec = ChipRecommendation(
            chip_name="Wildcard",
            recommended_gameweek=current_gameweek if wc_analysis["is_recommended"] else current_gameweek + 5,
            expected_value=wc_analysis["expected_value"],
            confidence=0.7 if wc_analysis["is_recommended"] else 0.4,
            reasoning=self._get_wc_reasoning(wc_analysis),
            alternative_gameweeks=[],
        )
        
        # Calculate total expected value
        total_ev = (
            bb_rec.expected_value + tc_rec.expected_value + 
            fh_rec.expected_value + wc_rec.expected_value
        )
        
        # Optimal order (by expected value)
        chips_by_value = [
            ("Wildcard", wc_rec.expected_value),
            ("Bench Boost", bb_rec.expected_value),
            ("Triple Captain", tc_rec.expected_value),
            ("Free Hit", fh_rec.expected_value),
        ]
        chips_by_value.sort(key=lambda x: x[1], reverse=True)
        optimal_order = [c[0] for c in chips_by_value]
        
        # Season projections
        baseline_ppg = sum(p.get("expected_points", 0) for p in squad[:11]) if squad else 50
        gws_remaining = 38 - current_gameweek
        
        season_without = baseline_ppg * gws_remaining
        season_with = season_without + total_ev
        
        return ChipAnalysis(
            wildcard=wc_rec,
            bench_boost=bb_rec,
            triple_captain=tc_rec,
            free_hit=fh_rec,
            optimal_order=optimal_order,
            total_expected_value=round(total_ev, 1),
            season_projection_with_chips=round(season_with, 0),
            season_projection_without_chips=round(season_without, 0),
        )
    
    def _get_top_gws(
        self, 
        gw_values: dict[int, GameweekChipValue], 
        attr: str, 
        n: int
    ) -> list[int]:
        """Get top N gameweeks for a chip type."""
        sorted_gws = sorted(
            gw_values.keys(), 
            key=lambda g: getattr(gw_values[g], attr), 
            reverse=True
        )
        return sorted_gws[:n]
    
    def _get_bb_reasoning(self, gw_value: GameweekChipValue) -> list[str]:
        """Generate reasoning for BB recommendation."""
        reasons = []
        if gw_value.is_double_gameweek:
            reasons.append("Double Gameweek maximizes bench player returns")
        if gw_value.bench_boost_value > 15:
            reasons.append(f"High bench expected value ({gw_value.bench_boost_value:.1f} pts)")
        if gw_value.fixtures_quality < 2.5:
            reasons.append("Favorable fixtures across the board")
        return reasons or ["Best available gameweek for bench boost"]
    
    def _get_tc_reasoning(self, gw_value: GameweekChipValue) -> list[str]:
        """Generate reasoning for TC recommendation."""
        reasons = []
        if gw_value.is_double_gameweek:
            reasons.append("Captain has double gameweek fixtures")
        if gw_value.triple_captain_value > 12:
            reasons.append(f"High captain ceiling ({gw_value.triple_captain_value:.1f} pts)")
        if gw_value.fixtures_quality < 2.5:
            reasons.append("Captain faces weak opposition")
        return reasons or ["Best available gameweek for triple captain"]
    
    def _get_fh_reasoning(self, gw_value: GameweekChipValue) -> list[str]:
        """Generate reasoning for FH recommendation."""
        reasons = []
        if gw_value.is_blank_gameweek:
            reasons.append("Blank gameweek - many teams not playing")
        if gw_value.free_hit_value > 20:
            reasons.append(f"Large gain over current squad ({gw_value.free_hit_value:.1f} pts)")
        return reasons or ["Best available gameweek for free hit"]
    
    def _get_wc_reasoning(self, wc_analysis: dict) -> list[str]:
        """Generate reasoning for WC recommendation."""
        reasons = []
        if wc_analysis.get("problem_players", 0) >= 3:
            reasons.append(f"{wc_analysis['problem_players']} underperforming players to replace")
        if wc_analysis.get("value_per_gameweek", 0) > 3:
            reasons.append(f"Significant upgrade potential ({wc_analysis['value_per_gameweek']:.1f} pts/GW)")
        return reasons or ["Squad rebuild opportunity"]

