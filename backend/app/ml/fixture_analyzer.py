"""
Fixture Difficulty and Schedule Analysis.

Provides mathematically rigorous fixture difficulty ratings (FDR) that go
beyond the basic FPL ratings by incorporating:
1. Team strength models (attack/defense separately)
2. Home/away differentials
3. Multi-gameweek fixture swings
4. Double/blank gameweek handling
"""
import numpy as np
from typing import Optional
from dataclasses import dataclass
from collections import defaultdict


@dataclass
class FixtureDifficultyRating:
    """Detailed fixture difficulty breakdown."""
    fdr_attack: float  # Difficulty for attackers
    fdr_defence: float  # Difficulty for defenders
    fdr_overall: float
    clean_sheet_prob: float
    expected_goals_for: float
    expected_goals_against: float
    is_home: bool
    opponent_name: str
    opponent_strength: float


@dataclass
class MultiGameweekRating:
    """Aggregated fixture ratings over multiple gameweeks."""
    total_fdr: float
    avg_fdr_attack: float
    avg_fdr_defence: float
    fixture_swing: float  # Positive = easier fixtures coming
    num_fixtures: int
    double_gameweeks: int
    blank_gameweeks: int
    fixtures: list[FixtureDifficultyRating]


class FixtureAnalyzer:
    """
    Analyze fixture difficulty using team strength models.
    
    Uses xGFDR (Expected Goals Fixture Difficulty Rating) which accounts
    for opponent quality in attacking and defensive terms separately.
    """
    
    # League average baseline
    LEAGUE_AVG_XG = 1.35  # Per team per game
    
    def __init__(self):
        self.team_strengths: dict[int, dict] = {}
        self.fixtures: list[dict] = []
    
    def load_team_data(self, teams: list[dict]):
        """Load team strength data from FPL API."""
        for team in teams:
            tid = team.get("id")
            self.team_strengths[tid] = {
                "name": team.get("name", ""),
                "short_name": team.get("short_name", ""),
                "strength": team.get("strength", 3),
                "attack_home": team.get("strength_attack_home", 1100) / 1100,
                "attack_away": team.get("strength_attack_away", 1100) / 1100,
                "defence_home": team.get("strength_defence_home", 1100) / 1100,
                "defence_away": team.get("strength_defence_away", 1100) / 1100,
            }
    
    def load_fixtures(self, fixtures: list[dict]):
        """Load fixture list from FPL API."""
        self.fixtures = fixtures
    
    def calculate_fdr(
        self,
        team_id: int,
        opponent_id: int,
        is_home: bool,
    ) -> FixtureDifficultyRating:
        """
        Calculate detailed FDR for a specific fixture.
        
        FDR Attack: How hard it is to score (based on opponent defence)
        FDR Defence: How hard it is to keep a clean sheet (opponent attack)
        """
        team = self.team_strengths.get(team_id, {})
        opponent = self.team_strengths.get(opponent_id, {})
        
        if not team or not opponent:
            return FixtureDifficultyRating(
                fdr_attack=3.0, fdr_defence=3.0, fdr_overall=3.0,
                clean_sheet_prob=0.25, expected_goals_for=1.3,
                expected_goals_against=1.3, is_home=is_home,
                opponent_name="Unknown", opponent_strength=3.0
            )
        
        # Calculate expected goals
        if is_home:
            team_attack = team.get("attack_home", 1.0)
            team_defence = team.get("defence_home", 1.0)
            opp_attack = opponent.get("attack_away", 1.0)
            opp_defence = opponent.get("defence_away", 1.0)
        else:
            team_attack = team.get("attack_away", 1.0)
            team_defence = team.get("defence_away", 1.0)
            opp_attack = opponent.get("attack_home", 1.0)
            opp_defence = opponent.get("defence_home", 1.0)
        
        # xG calculation using Poisson means
        xg_for = self.LEAGUE_AVG_XG * team_attack * (2 - opp_defence)
        xg_against = self.LEAGUE_AVG_XG * opp_attack * (2 - team_defence)
        
        # Clean sheet probability (Poisson P(X=0))
        cs_prob = np.exp(-xg_against)
        
        # Convert to FDR scale (1-5, lower is easier)
        # FDR Attack: Higher when opponent has good defence
        fdr_attack = 1 + 4 * (opp_defence - 0.7) / 0.6  # Scale 0.7-1.3 to 1-5
        fdr_attack = np.clip(fdr_attack, 1, 5)
        
        # FDR Defence: Higher when opponent has good attack
        fdr_defence = 1 + 4 * (opp_attack - 0.7) / 0.6
        fdr_defence = np.clip(fdr_defence, 1, 5)
        
        # Overall FDR (average, slightly weighted to attack)
        fdr_overall = 0.55 * fdr_attack + 0.45 * fdr_defence
        
        return FixtureDifficultyRating(
            fdr_attack=round(fdr_attack, 2),
            fdr_defence=round(fdr_defence, 2),
            fdr_overall=round(fdr_overall, 2),
            clean_sheet_prob=round(cs_prob, 3),
            expected_goals_for=round(xg_for, 2),
            expected_goals_against=round(xg_against, 2),
            is_home=is_home,
            opponent_name=opponent.get("name", "Unknown"),
            opponent_strength=opponent.get("strength", 3),
        )
    
    def analyze_multi_gameweek(
        self,
        team_id: int,
        start_gw: int,
        end_gw: int,
    ) -> MultiGameweekRating:
        """
        Analyze fixtures over multiple gameweeks.
        
        Identifies fixture swings (runs of easy/hard fixtures) and
        accounts for double/blank gameweeks.
        """
        team_fixtures = []
        gw_counts = defaultdict(int)
        
        for fixture in self.fixtures:
            gw = fixture.get("event")
            if gw is None or gw < start_gw or gw > end_gw:
                continue
            
            home_team = fixture.get("team_h")
            away_team = fixture.get("team_a")
            
            if home_team == team_id:
                fdr = self.calculate_fdr(team_id, away_team, is_home=True)
                fdr_dict = self._fdr_to_dict(fdr)
                fdr_dict["gameweek"] = gw
                team_fixtures.append(fdr_dict)
                gw_counts[gw] += 1
            elif away_team == team_id:
                fdr = self.calculate_fdr(team_id, home_team, is_home=False)
                fdr_dict = self._fdr_to_dict(fdr)
                fdr_dict["gameweek"] = gw
                team_fixtures.append(fdr_dict)
                gw_counts[gw] += 1
        
        if not team_fixtures:
            return MultiGameweekRating(
                total_fdr=15.0, avg_fdr_attack=3.0, avg_fdr_defence=3.0,
                fixture_swing=0, num_fixtures=0, double_gameweeks=0,
                blank_gameweeks=end_gw - start_gw + 1, fixtures=[]
            )
        
        # Calculate aggregates
        fdr_attacks = [f["fdr_attack"] for f in team_fixtures]
        fdr_defences = [f["fdr_defence"] for f in team_fixtures]
        fdr_overalls = [f["fdr_overall"] for f in team_fixtures]
        
        # Double and blank GWs
        num_gws = end_gw - start_gw + 1
        doubles = sum(1 for c in gw_counts.values() if c > 1)
        blanks = num_gws - len(gw_counts)
        
        # Fixture swing (compare first half to second half)
        n = len(fdr_overalls)
        if n >= 4:
            first_half = np.mean(fdr_overalls[:n//2])
            second_half = np.mean(fdr_overalls[n//2:])
            swing = first_half - second_half  # Positive = easier upcoming
        else:
            swing = 0
        
        # Build fixture rating objects
        fixture_ratings = []
        for f in team_fixtures:
            fixture_ratings.append(FixtureDifficultyRating(
                fdr_attack=f["fdr_attack"],
                fdr_defence=f["fdr_defence"],
                fdr_overall=f["fdr_overall"],
                clean_sheet_prob=f["clean_sheet_prob"],
                expected_goals_for=f["expected_goals_for"],
                expected_goals_against=f["expected_goals_against"],
                is_home=f["is_home"],
                opponent_name=f["opponent_name"],
                opponent_strength=f["opponent_strength"],
            ))
        
        return MultiGameweekRating(
            total_fdr=round(sum(fdr_overalls), 2),
            avg_fdr_attack=round(np.mean(fdr_attacks), 2),
            avg_fdr_defence=round(np.mean(fdr_defences), 2),
            fixture_swing=round(swing, 2),
            num_fixtures=len(team_fixtures),
            double_gameweeks=doubles,
            blank_gameweeks=blanks,
            fixtures=fixture_ratings,
        )
    
    def rank_teams_by_fixtures(
        self,
        start_gw: int,
        end_gw: int,
        position_type: str = "overall",
    ) -> list[dict]:
        """
        Rank all teams by fixture difficulty.
        
        Args:
            position_type: "attack" for attackers, "defence" for defenders, 
                          "overall" for combined
        """
        rankings = []
        
        for team_id, team_data in self.team_strengths.items():
            rating = self.analyze_multi_gameweek(team_id, start_gw, end_gw)
            
            if position_type == "attack":
                fdr = rating.avg_fdr_attack
            elif position_type == "defence":
                fdr = rating.avg_fdr_defence
            else:
                fdr = rating.total_fdr / max(1, rating.num_fixtures)
            
            rankings.append({
                "team_id": team_id,
                "team_name": team_data.get("name", ""),
                "short_name": team_data.get("short_name", ""),
                "fdr": round(fdr, 2),
                "num_fixtures": rating.num_fixtures,
                "double_gws": rating.double_gameweeks,
                "blank_gws": rating.blank_gameweeks,
                "fixture_swing": rating.fixture_swing,
            })
        
        # Sort by FDR (lower is better)
        rankings.sort(key=lambda x: x["fdr"])
        
        # Add rank
        for i, r in enumerate(rankings, 1):
            r["rank"] = i
        
        return rankings
    
    def get_fixture_ticker(
        self,
        team_id: int,
        num_gameweeks: int = 6,
        current_gw: int = 1,
    ) -> list[dict]:
        """
        Get fixture ticker for a team (next N gameweeks).
        
        Returns list of fixtures with FDR color coding.
        """
        rating = self.analyze_multi_gameweek(team_id, current_gw, current_gw + num_gameweeks - 1)
        
        ticker = []
        for fdr in rating.fixtures:
            # Color coding based on FDR
            if fdr.fdr_overall <= 2:
                color = "green"
                difficulty = "easy"
            elif fdr.fdr_overall <= 2.5:
                color = "light_green"
                difficulty = "fairly_easy"
            elif fdr.fdr_overall <= 3.5:
                color = "gray"
                difficulty = "medium"
            elif fdr.fdr_overall <= 4:
                color = "orange"
                difficulty = "tough"
            else:
                color = "red"
                difficulty = "very_tough"
            
            ticker.append({
                "opponent": fdr.opponent_name,
                "is_home": fdr.is_home,
                "fdr": fdr.fdr_overall,
                "fdr_attack": fdr.fdr_attack,
                "fdr_defence": fdr.fdr_defence,
                "color": color,
                "difficulty": difficulty,
                "cs_prob": fdr.clean_sheet_prob,
            })
        
        return ticker
    
    def _fdr_to_dict(self, fdr: FixtureDifficultyRating) -> dict:
        """Convert FDR dataclass to dict."""
        return {
            "fdr_attack": fdr.fdr_attack,
            "fdr_defence": fdr.fdr_defence,
            "fdr_overall": fdr.fdr_overall,
            "clean_sheet_prob": fdr.clean_sheet_prob,
            "expected_goals_for": fdr.expected_goals_for,
            "expected_goals_against": fdr.expected_goals_against,
            "is_home": fdr.is_home,
            "opponent_name": fdr.opponent_name,
            "opponent_strength": fdr.opponent_strength,
        }


class RotationRiskAnalyzer:
    """
    Analyze player rotation risk based on schedule congestion.
    """
    
    def calculate_rotation_risk(
        self,
        player: dict,
        team_fixtures: list[dict],
        days_between: list[int],
    ) -> dict:
        """
        Calculate rotation risk for a player.
        
        Factors:
        - Minutes load over recent games
        - Fixture congestion (games with <4 days rest)
        - Player age
        - Position (GKs rarely rotated, mids/fwds more often)
        - Squad depth (estimated from price differential)
        """
        position = player.get("position", 3)
        minutes = player.get("minutes", 0)
        price = player.get("price", 5.0)
        
        # Base rotation probability by position
        base_rotation = {1: 0.02, 2: 0.08, 3: 0.12, 4: 0.15}.get(position, 0.1)
        
        # Congestion factor
        congested_fixtures = sum(1 for d in days_between if d < 4)
        congestion_factor = 1 + (congested_fixtures * 0.1)
        
        # Minutes load factor
        games_equivalent = minutes / 90
        if games_equivalent > 30:  # Heavy minutes load
            minutes_factor = 1.3
        elif games_equivalent > 20:
            minutes_factor = 1.1
        else:
            minutes_factor = 1.0
        
        # Price factor (expensive players less likely to be rotated)
        price_factor = 1 - (price - 4) * 0.03  # Cheaper players rotated more
        price_factor = max(0.7, min(1.3, price_factor))
        
        rotation_risk = base_rotation * congestion_factor * minutes_factor * price_factor
        rotation_risk = min(0.5, rotation_risk)  # Cap at 50%
        
        return {
            "rotation_risk": round(rotation_risk, 3),
            "risk_level": "high" if rotation_risk > 0.2 else ("medium" if rotation_risk > 0.1 else "low"),
            "congested_fixtures": congested_fixtures,
            "factors": {
                "base": base_rotation,
                "congestion": congestion_factor,
                "minutes_load": minutes_factor,
                "price": price_factor,
            }
        }

