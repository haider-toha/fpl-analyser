"""
Transfer Planner - Predictive Algorithm for FPL Transfers.

This module provides multi-gameweek transfer planning by:
1. Projecting expected points over a horizon of gameweeks
2. Identifying fixture swings (favorable/unfavorable runs)
3. Recommending optimal transfer timing
4. Prioritizing which players to bring in/ship out

Uses fixture difficulty, form analysis, and expected points models
to generate actionable transfer recommendations.
"""
import numpy as np
from typing import Optional
from dataclasses import dataclass, field
from collections import defaultdict

from app.ml.fixture_analyzer import FixtureAnalyzer, FixtureDifficultyRating
from app.ml.bayesian_model import BayesianExpectedPoints, DixonColesModel, FormAnalyzer


@dataclass
class PlayerProjection:
    """Multi-gameweek projection for a single player."""
    player_id: int
    player_name: str
    team_id: int
    team_name: str
    position: int
    price: float
    current_form: float
    
    # Per-gameweek projections
    gameweek_projections: list[dict] = field(default_factory=list)
    
    # Aggregated metrics over horizon
    total_expected_points: float = 0.0
    avg_expected_points: float = 0.0
    fixture_difficulty_avg: float = 3.0
    fixture_swing: float = 0.0  # Positive = improving fixtures
    
    # Recommendation
    action: str = "hold"  # "buy", "sell", "hold", "watch"
    priority: int = 0  # 1 = highest priority
    reasoning: list[str] = field(default_factory=list)


@dataclass
class TransferRecommendation:
    """A specific transfer recommendation."""
    player_out: dict
    player_in: dict
    gameweek: int
    expected_gain: float
    reasoning: str
    urgency: str  # "immediate", "soon", "plan_ahead"
    fixture_context: str


@dataclass
class TransferPlan:
    """Complete transfer plan over multiple gameweeks."""
    current_gameweek: int
    horizon: int
    
    # Immediate actions
    recommended_transfers: list[TransferRecommendation] = field(default_factory=list)
    
    # Squad analysis
    players_to_sell: list[PlayerProjection] = field(default_factory=list)
    players_to_buy: list[PlayerProjection] = field(default_factory=list)
    players_to_watch: list[PlayerProjection] = field(default_factory=list)
    
    # Position-based rankings
    top_goalkeepers: list[PlayerProjection] = field(default_factory=list)
    top_defenders: list[PlayerProjection] = field(default_factory=list)
    top_midfielders: list[PlayerProjection] = field(default_factory=list)
    top_forwards: list[PlayerProjection] = field(default_factory=list)
    
    # Team fixture rankings
    team_fixture_rankings: list[dict] = field(default_factory=list)


class TransferPlanner:
    """
    Multi-gameweek transfer planning engine.
    
    Combines fixture analysis, expected points models, and form analysis
    to generate optimal transfer recommendations.
    """
    
    def __init__(self):
        self.fixture_analyzer = FixtureAnalyzer()
        self.match_model = DixonColesModel()
        self.points_model = BayesianExpectedPoints(self.match_model)
        self.form_analyzer = FormAnalyzer()
        
        # Loaded data
        self.players: list[dict] = []
        self.teams: dict[int, dict] = {}
        self.fixtures: list[dict] = []
        self.current_gameweek: int = 1
    
    def load_data(
        self,
        players: list[dict],
        teams: list[dict],
        fixtures: list[dict],
        current_gameweek: int,
    ):
        """Load all required data for planning."""
        self.players = players
        self.teams = {t.get("id"): t for t in teams}
        self.fixtures = fixtures
        self.current_gameweek = current_gameweek
        
        # Initialize fixture analyzer
        self.fixture_analyzer.load_team_data(teams)
        self.fixture_analyzer.load_fixtures(fixtures)
        
        # Initialize match model with team strengths
        self.match_model._init_from_fpl_strengths(self.teams)
    
    def project_player(
        self,
        player: dict,
        start_gw: int,
        end_gw: int,
        history: Optional[list[dict]] = None,
    ) -> PlayerProjection:
        """
        Project a player's expected points over multiple gameweeks.
        
        Accounts for:
        - Fixture difficulty per gameweek
        - Home/away advantage
        - Current form with decay
        - Position-specific factors
        """
        player_id = player.get("id", 0)
        team_id = player.get("team_id", 0)
        position = player.get("position", 3)
        
        team = self.teams.get(team_id, {})
        team_name = team.get("name", player.get("team_name", ""))
        
        projection = PlayerProjection(
            player_id=player_id,
            player_name=player.get("web_name", player.get("name", "")),
            team_id=team_id,
            team_name=team_name,
            position=position,
            price=player.get("price", 0),
            current_form=float(player.get("form", 0) or 0),
        )
        
        # Get fixtures for this player's team
        team_fixtures = self._get_team_fixtures(team_id, start_gw, end_gw)
        
        total_exp = 0.0
        gw_projections = []
        fdr_values = []
        
        for gw in range(start_gw, end_gw + 1):
            gw_fixtures = [f for f in team_fixtures if f.get("gameweek") == gw]
            
            if not gw_fixtures:
                # Blank gameweek
                gw_projections.append({
                    "gameweek": gw,
                    "expected_points": 0,
                    "is_blank": True,
                    "opponent": None,
                    "is_home": None,
                    "fdr": None,
                })
                continue
            
            # Handle single or double gameweek
            gw_exp = 0.0
            gw_opponents = []
            
            for fixture in gw_fixtures:
                opponent_id = fixture.get("opponent_id")
                is_home = fixture.get("is_home", True)
                
                opponent = self.teams.get(opponent_id, {})
                opponent_name = opponent.get("short_name", opponent.get("name", "???"))
                
                # Calculate FDR for this fixture
                fdr = self.fixture_analyzer.calculate_fdr(team_id, opponent_id, is_home)
                
                # Use position-specific FDR
                if position in [1, 2]:  # GK, DEF
                    fixture_fdr = fdr.fdr_defence
                elif position == 4:  # FWD
                    fixture_fdr = fdr.fdr_attack
                else:  # MID
                    fixture_fdr = fdr.fdr_overall
                
                fdr_values.append(fixture_fdr)
                
                # Calculate expected points for this fixture
                exp_pts = self._calculate_fixture_expected_points(
                    player, fixture, team, opponent, history
                )
                gw_exp += exp_pts
                
                gw_opponents.append({
                    "opponent": opponent_name,
                    "is_home": is_home,
                    "fdr": round(fixture_fdr, 2),
                    "expected_points": round(exp_pts, 2),
                    "clean_sheet_prob": round(fdr.clean_sheet_prob, 3),
                })
            
            total_exp += gw_exp
            
            gw_projections.append({
                "gameweek": gw,
                "expected_points": round(gw_exp, 2),
                "is_blank": False,
                "is_double": len(gw_fixtures) > 1,
                "fixtures": gw_opponents,
            })
        
        projection.gameweek_projections = gw_projections
        projection.total_expected_points = round(total_exp, 2)
        
        num_gws = len([p for p in gw_projections if not p.get("is_blank")])
        projection.avg_expected_points = round(total_exp / max(1, num_gws), 2)
        
        if fdr_values:
            projection.fixture_difficulty_avg = round(np.mean(fdr_values), 2)
            
            # Calculate fixture swing (first half vs second half)
            if len(fdr_values) >= 4:
                first_half = np.mean(fdr_values[:len(fdr_values)//2])
                second_half = np.mean(fdr_values[len(fdr_values)//2:])
                projection.fixture_swing = round(first_half - second_half, 2)
        
        # Determine action recommendation
        projection.action, projection.reasoning = self._determine_action(
            player, projection, history
        )
        
        return projection
    
    def _get_team_fixtures(
        self,
        team_id: int,
        start_gw: int,
        end_gw: int,
    ) -> list[dict]:
        """Get all fixtures for a team in the gameweek range."""
        team_fixtures = []
        
        for fixture in self.fixtures:
            gw = fixture.get("event")
            if gw is None or gw < start_gw or gw > end_gw:
                continue
            
            home_team = fixture.get("team_h")
            away_team = fixture.get("team_a")
            
            if home_team == team_id:
                team_fixtures.append({
                    "gameweek": gw,
                    "opponent_id": away_team,
                    "is_home": True,
                    "fixture_id": fixture.get("id"),
                })
            elif away_team == team_id:
                team_fixtures.append({
                    "gameweek": gw,
                    "opponent_id": home_team,
                    "is_home": False,
                    "fixture_id": fixture.get("id"),
                })
        
        return team_fixtures
    
    def _calculate_fixture_expected_points(
        self,
        player: dict,
        fixture: dict,
        team: dict,
        opponent: dict,
        history: Optional[list[dict]] = None,
    ) -> float:
        """
        Calculate expected points for a player in a specific fixture.
        
        Uses a combination of:
        - Current form (time-weighted)
        - Fixture difficulty
        - Position-specific factors
        - Historical performance against similar opponents
        """
        position = player.get("position", 3)
        form = float(player.get("form", 0) or 0)
        ppg = float(player.get("points_per_game", 0) or 0)
        is_home = fixture.get("is_home", True)
        
        # Base expected from form and ppg
        if form > 0:
            base_exp = form * 0.6 + ppg * 0.4
        else:
            base_exp = ppg if ppg > 0 else 2.0  # Minimum baseline
        
        # Get fixture difficulty
        fdr = self.fixture_analyzer.calculate_fdr(
            player.get("team_id", 0),
            fixture.get("opponent_id", 0),
            is_home,
        )
        
        # Adjust for fixture difficulty (FDR 1-5 scale)
        # Lower FDR = easier fixture = higher multiplier
        if position in [1, 2]:  # GK, DEF - use defence FDR
            fdr_multiplier = 1.3 - (fdr.fdr_defence - 1) * 0.15
        elif position == 4:  # FWD - use attack FDR
            fdr_multiplier = 1.3 - (fdr.fdr_attack - 1) * 0.15
        else:  # MID
            fdr_multiplier = 1.2 - (fdr.fdr_overall - 1) * 0.1
        
        fdr_multiplier = max(0.7, min(1.4, fdr_multiplier))
        
        # Home advantage
        home_multiplier = 1.1 if is_home else 0.95
        
        # Clean sheet bonus for GK/DEF
        cs_bonus = 0
        if position in [1, 2]:
            cs_bonus = fdr.clean_sheet_prob * (4 if position == 1 else 4)
        elif position == 3:
            cs_bonus = fdr.clean_sheet_prob * 1  # Mids get 1pt for CS
        
        expected_pts = (base_exp * fdr_multiplier * home_multiplier) + cs_bonus
        
        # Apply availability factor
        chance = player.get("chance_of_playing", 100) or 100
        expected_pts *= (chance / 100)
        
        return max(0, expected_pts)
    
    def _determine_action(
        self,
        player: dict,
        projection: PlayerProjection,
        history: Optional[list[dict]] = None,
    ) -> tuple[str, list[str]]:
        """
        Determine recommended action for a player.
        
        Returns:
            (action, [reasoning])
        """
        reasoning = []
        
        form = projection.current_form
        avg_exp = projection.avg_expected_points
        fdr_avg = projection.fixture_difficulty_avg
        swing = projection.fixture_swing
        price = projection.price
        
        # Calculate value score (expected points per £1m)
        value_score = avg_exp / max(price, 4.0)
        
        # Check form trend
        form_trend = "stable"
        if history and len(history) >= 3:
            form_analysis = self.form_analyzer.calculate_weighted_form(history)
            form_trend = form_analysis.get("trend_direction", "stable")
        
        # Decision logic
        if fdr_avg <= 2.2 and swing >= 0.3 and form >= 5:
            action = "buy"
            reasoning.append(f"Excellent fixtures (avg FDR {fdr_avg:.1f})")
            reasoning.append(f"Strong form ({form:.1f})")
            if swing > 0:
                reasoning.append(f"Improving fixture run")
        
        elif fdr_avg <= 2.5 and form >= 4 and value_score >= 0.8:
            action = "buy"
            reasoning.append(f"Good fixtures (avg FDR {fdr_avg:.1f})")
            reasoning.append(f"Great value ({avg_exp:.1f} pts at £{price:.1f}m)")
        
        elif fdr_avg >= 4.0 and form < 4:
            action = "sell"
            reasoning.append(f"Tough fixtures ahead (avg FDR {fdr_avg:.1f})")
            reasoning.append(f"Poor form ({form:.1f})")
        
        elif swing <= -0.5 and fdr_avg >= 3.5:
            action = "sell"
            reasoning.append(f"Fixtures getting harder")
            reasoning.append(f"Consider selling before price drop")
        
        elif fdr_avg <= 2.5 and form < 3:
            action = "watch"
            reasoning.append(f"Good fixtures but poor form")
            reasoning.append(f"Monitor for form uptick")
        
        elif swing >= 0.5 and fdr_avg > 3:
            action = "watch"
            reasoning.append(f"Fixtures improving")
            reasoning.append(f"Consider buying in {self._gws_until_easy(projection)} GWs")
        
        else:
            action = "hold"
            reasoning.append(f"Avg fixtures (FDR {fdr_avg:.1f})")
            if form >= 4:
                reasoning.append(f"Decent form - keep for now")
            else:
                reasoning.append(f"No urgent action needed")
        
        # Injury/availability check
        chance = player.get("chance_of_playing")
        if chance is not None and chance < 75:
            if action != "sell":
                action = "watch"
                reasoning.insert(0, f"Injury concern ({chance}% chance of playing)")
        
        news = player.get("news", "")
        if news and ("injured" in news.lower() or "suspended" in news.lower()):
            action = "sell"
            reasoning.insert(0, f"Alert: {news}")
        
        return action, reasoning
    
    def _gws_until_easy(self, projection: PlayerProjection) -> int:
        """Find how many gameweeks until fixtures get easier."""
        for i, gw in enumerate(projection.gameweek_projections):
            fixtures = gw.get("fixtures", [])
            if fixtures:
                avg_fdr = np.mean([f.get("fdr", 3) for f in fixtures])
                if avg_fdr <= 2.5:
                    return i
        return len(projection.gameweek_projections)
    
    def generate_transfer_plan(
        self,
        current_squad: list[dict],
        all_players: list[dict],
        horizon: int = 6,
        budget_remaining: float = 0.0,
        free_transfers: int = 1,
    ) -> TransferPlan:
        """
        Generate a comprehensive transfer plan.
        
        Args:
            current_squad: Current 15-man squad
            all_players: All available players
            horizon: Number of gameweeks to plan for
            budget_remaining: Bank balance in millions
            free_transfers: Available free transfers
        
        Returns:
            TransferPlan with recommendations
        """
        start_gw = self.current_gameweek
        end_gw = min(38, start_gw + horizon - 1)
        
        plan = TransferPlan(
            current_gameweek=start_gw,
            horizon=horizon,
        )
        
        # Project all players
        all_projections: dict[int, PlayerProjection] = {}
        for player in all_players:
            proj = self.project_player(player, start_gw, end_gw)
            all_projections[player.get("id")] = proj
        
        # Get squad projections
        squad_projections = [
            all_projections[p.get("id")]
            for p in current_squad
            if p.get("id") in all_projections
        ]
        
        # Identify players to sell
        sells = [p for p in squad_projections if p.action == "sell"]
        sells.sort(key=lambda x: (x.fixture_difficulty_avg, -x.current_form), reverse=True)
        plan.players_to_sell = sells[:5]
        
        # Identify best players to buy
        not_in_squad = set(p.get("id") for p in current_squad)
        buys = [
            p for pid, p in all_projections.items()
            if p.action == "buy" and pid not in not_in_squad
        ]
        buys.sort(key=lambda x: (-x.avg_expected_points, x.fixture_difficulty_avg))
        plan.players_to_buy = buys[:10]
        
        # Players to watch
        watches = [
            p for pid, p in all_projections.items()
            if p.action == "watch" and pid not in not_in_squad
        ]
        watches.sort(key=lambda x: (x.fixture_swing, -x.fixture_difficulty_avg), reverse=True)
        plan.players_to_watch = watches[:5]
        
        # Position rankings (top 5 per position by expected points)
        for pos, attr in [
            (1, "top_goalkeepers"),
            (2, "top_defenders"),
            (3, "top_midfielders"),
            (4, "top_forwards"),
        ]:
            pos_players = [p for p in all_projections.values() if p.position == pos]
            pos_players.sort(key=lambda x: -x.total_expected_points)
            setattr(plan, attr, pos_players[:10])
        
        # Team fixture rankings
        plan.team_fixture_rankings = self.fixture_analyzer.rank_teams_by_fixtures(
            start_gw, end_gw, "overall"
        )
        
        # Generate specific transfer recommendations
        plan.recommended_transfers = self._generate_transfer_recommendations(
            squad_projections,
            all_projections,
            budget_remaining,
            free_transfers,
            current_squad,
        )
        
        return plan
    
    def _generate_transfer_recommendations(
        self,
        squad_projections: list[PlayerProjection],
        all_projections: dict[int, PlayerProjection],
        budget: float,
        free_transfers: int,
        current_squad: list[dict],
    ) -> list[TransferRecommendation]:
        """Generate specific transfer-in/out recommendations."""
        recommendations = []
        
        # Build price lookup
        prices = {p.get("id"): p.get("price", 0) for p in self.players}
        squad_ids = set(p.get("id") for p in current_squad)
        
        # Find worst player to sell in each position
        sells_by_pos = defaultdict(list)
        for proj in squad_projections:
            if proj.action in ["sell", "watch"]:
                sells_by_pos[proj.position].append(proj)
        
        # Sort by priority (fixture difficulty + inverse form)
        for pos in sells_by_pos:
            sells_by_pos[pos].sort(
                key=lambda x: (x.fixture_difficulty_avg - x.current_form / 2),
                reverse=True
            )
        
        # Find best player to buy in each position
        buys_by_pos = defaultdict(list)
        for pid, proj in all_projections.items():
            if pid not in squad_ids and proj.action == "buy":
                buys_by_pos[proj.position].append(proj)
        
        # Sort by expected points
        for pos in buys_by_pos:
            buys_by_pos[pos].sort(key=lambda x: -x.total_expected_points)
        
        # Match sells with buys
        for pos in [4, 3, 2, 1]:  # Prioritize attacking positions
            if pos not in sells_by_pos or pos not in buys_by_pos:
                continue
            
            for sell_proj in sells_by_pos[pos][:2]:
                sell_price = prices.get(sell_proj.player_id, 0)
                available_budget = budget + sell_price
                
                for buy_proj in buys_by_pos[pos]:
                    buy_price = prices.get(buy_proj.player_id, 0)
                    
                    if buy_price <= available_budget:
                        # Check team limit
                        buy_team = buy_proj.team_id
                        team_count = sum(
                            1 for p in current_squad
                            if p.get("team_id") == buy_team
                            and p.get("id") != sell_proj.player_id
                        )
                        
                        if team_count >= 3:
                            continue
                        
                        expected_gain = buy_proj.total_expected_points - sell_proj.total_expected_points
                        
                        if expected_gain > 2:  # Minimum threshold
                            # Determine urgency
                            if sell_proj.fixture_difficulty_avg >= 4:
                                urgency = "immediate"
                            elif sell_proj.fixture_swing < -0.3:
                                urgency = "soon"
                            else:
                                urgency = "plan_ahead"
                            
                            rec = TransferRecommendation(
                                player_out={
                                    "id": sell_proj.player_id,
                                    "name": sell_proj.player_name,
                                    "team": sell_proj.team_name,
                                    "price": sell_price,
                                    "fdr_avg": sell_proj.fixture_difficulty_avg,
                                    "expected_pts": sell_proj.total_expected_points,
                                },
                                player_in={
                                    "id": buy_proj.player_id,
                                    "name": buy_proj.player_name,
                                    "team": buy_proj.team_name,
                                    "price": buy_price,
                                    "fdr_avg": buy_proj.fixture_difficulty_avg,
                                    "expected_pts": buy_proj.total_expected_points,
                                },
                                gameweek=self.current_gameweek,
                                expected_gain=round(expected_gain, 1),
                                reasoning=f"{buy_proj.player_name} has better fixtures (FDR {buy_proj.fixture_difficulty_avg:.1f} vs {sell_proj.fixture_difficulty_avg:.1f})",
                                urgency=urgency,
                                fixture_context=f"{buy_proj.player_name}: {self._format_next_fixtures(buy_proj, 3)}",
                            )
                            recommendations.append(rec)
                            break
        
        # Sort by expected gain
        recommendations.sort(key=lambda x: -x.expected_gain)
        
        return recommendations[:5]  # Top 5 recommendations
    
    def _format_next_fixtures(self, proj: PlayerProjection, n: int = 3) -> str:
        """Format next N fixtures for display."""
        fixtures = []
        for gw in proj.gameweek_projections[:n]:
            if gw.get("is_blank"):
                fixtures.append("BLANK")
            elif gw.get("fixtures"):
                for f in gw["fixtures"]:
                    venue = "H" if f.get("is_home") else "A"
                    opp = f.get("opponent", "???")
                    fixtures.append(f"{opp}({venue})")
        return ", ".join(fixtures)
    
    def get_fixture_swing_analysis(
        self,
        team_id: int,
        horizon: int = 10,
    ) -> dict:
        """
        Analyze fixture swings for a team.
        
        Identifies when fixtures turn easier/harder.
        """
        start_gw = self.current_gameweek
        end_gw = min(38, start_gw + horizon - 1)
        
        rating = self.fixture_analyzer.analyze_multi_gameweek(team_id, start_gw, end_gw)
        
        # Find turning points
        fixtures = rating.fixtures
        turning_points = []
        
        if len(fixtures) >= 3:
            for i in range(1, len(fixtures) - 1):
                prev_fdr = fixtures[i-1].fdr_overall
                curr_fdr = fixtures[i].fdr_overall
                next_fdr = fixtures[i+1].fdr_overall
                
                # Easy run starting
                if prev_fdr > 3 and curr_fdr <= 2.5 and next_fdr <= 2.5:
                    turning_points.append({
                        "gameweek": start_gw + i,
                        "type": "fixtures_ease",
                        "message": f"Fixtures ease from GW{start_gw + i}",
                    })
                
                # Tough run starting
                elif prev_fdr < 3 and curr_fdr >= 3.5 and next_fdr >= 3.5:
                    turning_points.append({
                        "gameweek": start_gw + i,
                        "type": "fixtures_harden",
                        "message": f"Fixtures get harder from GW{start_gw + i}",
                    })
        
        team = self.teams.get(team_id, {})
        
        return {
            "team_id": team_id,
            "team_name": team.get("name", ""),
            "total_fdr": rating.total_fdr,
            "avg_fdr": round(rating.total_fdr / max(1, rating.num_fixtures), 2),
            "fixture_swing": rating.fixture_swing,
            "double_gameweeks": rating.double_gameweeks,
            "blank_gameweeks": rating.blank_gameweeks,
            "turning_points": turning_points,
            "recommendation": self._get_team_recommendation(rating),
        }
    
    def _get_team_recommendation(self, rating) -> str:
        """Get recommendation based on fixture rating."""
        avg_fdr = rating.total_fdr / max(1, rating.num_fixtures)
        swing = rating.fixture_swing
        
        if avg_fdr <= 2.2:
            return "Stack with players from this team"
        elif avg_fdr <= 2.8 and swing > 0:
            return "Good time to bring in players"
        elif avg_fdr >= 3.8:
            return "Avoid players from this team"
        elif swing < -0.5:
            return "Consider selling players before fixtures turn"
        else:
            return "Neutral - make decisions based on individual player form"


class PositionalPlanner:
    """
    Position-specific transfer planning.
    
    Identifies the best players at each position considering
    fixture swings and rotation pairs.
    """
    
    def __init__(self, transfer_planner: TransferPlanner):
        self.planner = transfer_planner
    
    def find_rotation_pairs(
        self,
        position: int,
        horizon: int = 6,
        budget_max: float = 10.0,
    ) -> list[dict]:
        """
        Find pairs of players who rotate well based on fixtures.
        
        Rotation pairs have complementary fixtures - when one has
        tough games, the other has easy ones.
        """
        start_gw = self.planner.current_gameweek
        end_gw = min(38, start_gw + horizon - 1)
        
        # Get all players at position under budget
        candidates = [
            p for p in self.planner.players
            if p.get("position") == position
            and p.get("price", 0) <= budget_max
        ]
        
        # Project all candidates
        projections = {}
        for player in candidates:
            proj = self.planner.project_player(player, start_gw, end_gw)
            projections[player.get("id")] = proj
        
        # Find complementary pairs
        pairs = []
        candidate_ids = list(projections.keys())
        
        for i, pid1 in enumerate(candidate_ids):
            for pid2 in candidate_ids[i+1:]:
                proj1 = projections[pid1]
                proj2 = projections[pid2]
                
                # Can't be from same team
                if proj1.team_id == proj2.team_id:
                    continue
                
                # Calculate rotation score
                rotation_score = self._calculate_rotation_score(proj1, proj2)
                
                if rotation_score > 0.6:  # Good rotation
                    combined_price = proj1.price + proj2.price
                    combined_exp = proj1.total_expected_points + proj2.total_expected_points
                    
                    pairs.append({
                        "player_1": {
                            "id": proj1.player_id,
                            "name": proj1.player_name,
                            "team": proj1.team_name,
                            "price": proj1.price,
                        },
                        "player_2": {
                            "id": proj2.player_id,
                            "name": proj2.player_name,
                            "team": proj2.team_name,
                            "price": proj2.price,
                        },
                        "rotation_score": round(rotation_score, 2),
                        "combined_price": round(combined_price, 1),
                        "combined_expected_pts": round(combined_exp, 1),
                        "value_score": round(combined_exp / combined_price, 2),
                    })
        
        # Sort by value score
        pairs.sort(key=lambda x: -x["value_score"])
        
        return pairs[:10]
    
    def _calculate_rotation_score(
        self,
        proj1: PlayerProjection,
        proj2: PlayerProjection,
    ) -> float:
        """
        Calculate how well two players rotate.
        
        Score 0-1, higher is better rotation.
        """
        if not proj1.gameweek_projections or not proj2.gameweek_projections:
            return 0
        
        scores = []
        
        for gw1, gw2 in zip(proj1.gameweek_projections, proj2.gameweek_projections):
            # Handle blanks
            if gw1.get("is_blank") and not gw2.get("is_blank"):
                scores.append(1.0)  # Perfect - one plays when other doesn't
                continue
            if gw2.get("is_blank") and not gw1.get("is_blank"):
                scores.append(1.0)
                continue
            if gw1.get("is_blank") and gw2.get("is_blank"):
                scores.append(0.0)  # Both blank is bad
                continue
            
            # Get FDRs
            fixtures1 = gw1.get("fixtures", [])
            fixtures2 = gw2.get("fixtures", [])
            
            if not fixtures1 or not fixtures2:
                continue
            
            fdr1 = np.mean([f.get("fdr", 3) for f in fixtures1])
            fdr2 = np.mean([f.get("fdr", 3) for f in fixtures2])
            
            # Score based on FDR difference
            # Best: one has easy (fdr<=2) and other has hard (fdr>=4)
            if (fdr1 <= 2.5 and fdr2 >= 3.5) or (fdr2 <= 2.5 and fdr1 >= 3.5):
                scores.append(1.0)
            elif (fdr1 <= 3 and fdr2 >= 3.5) or (fdr2 <= 3 and fdr1 >= 3.5):
                scores.append(0.7)
            elif abs(fdr1 - fdr2) >= 1:
                scores.append(0.5)
            else:
                scores.append(0.2)  # Both similar difficulty
        
        return np.mean(scores) if scores else 0


class DifferentialFinder:
    """
    Find differential picks based on ownership and expected points.
    """
    
    def __init__(self, transfer_planner: TransferPlanner):
        self.planner = transfer_planner
    
    def find_differentials(
        self,
        max_ownership: float = 10.0,
        min_form: float = 3.0,
        horizon: int = 6,
    ) -> list[PlayerProjection]:
        """
        Find high-upside differentials.
        
        Differentials are low-owned players with good fixtures
        and decent form.
        """
        start_gw = self.planner.current_gameweek
        end_gw = min(38, start_gw + horizon - 1)
        
        differentials = []
        
        for player in self.planner.players:
            ownership = player.get("selected_by_percent", 0)
            form = float(player.get("form", 0) or 0)
            
            if ownership > max_ownership:
                continue
            if form < min_form:
                continue
            
            proj = self.planner.project_player(player, start_gw, end_gw)
            
            # Good fixture difficulty
            if proj.fixture_difficulty_avg <= 3.0:
                proj.reasoning = [
                    f"Low ownership ({ownership:.1f}%)",
                    f"Good form ({form:.1f})",
                    f"Easy fixtures (FDR {proj.fixture_difficulty_avg:.1f})",
                ]
                if proj.fixture_swing > 0:
                    proj.reasoning.append("Fixtures getting easier")
                
                differentials.append(proj)
        
        # Sort by expected points
        differentials.sort(key=lambda x: -x.total_expected_points)
        
        return differentials[:15]

