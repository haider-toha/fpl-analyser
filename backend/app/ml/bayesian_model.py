"""
Bayesian Expected Points Model with Dixon-Coles Framework.

This module implements a mathematically rigorous approach to FPL point prediction:
1. Dixon-Coles model for goal/clean sheet probabilities
2. Poisson regression for goal involvement
3. Bayesian updating for form estimation
4. Time-decay weighted historical performance
"""
import numpy as np
from scipy import stats
from scipy.optimize import minimize
from typing import Optional, Tuple
from dataclasses import dataclass
from functools import lru_cache


@dataclass
class PointsBreakdown:
    """Detailed expected points breakdown by component."""
    minutes: float
    goals: float
    assists: float
    clean_sheet: float
    goals_conceded: float
    bonus: float
    saves: float  # For goalkeepers
    penalty_saves: float
    yellow_cards: float
    red_cards: float
    own_goals: float
    total: float
    confidence_lower: float
    confidence_upper: float


@dataclass
class TeamStrength:
    """Team attacking and defensive strength parameters."""
    attack_home: float
    attack_away: float
    defence_home: float
    defence_away: float


class DixonColesModel:
    """
    Dixon-Coles model for match outcome prediction.
    
    The model estimates team attack/defence strengths and uses a bivariate
    Poisson distribution with a correction factor (rho) for low-scoring games.
    
    Reference: Dixon, M. & Coles, S. (1997). Modelling Association Football 
    Scores and Inefficiencies in the Football Betting Market.
    """
    
    def __init__(self, time_decay: float = 0.0025):
        """
        Initialize Dixon-Coles model.
        
        Args:
            time_decay: Exponential decay factor for historical matches.
                       Higher values weight recent matches more heavily.
        """
        self.time_decay = time_decay
        self.team_strengths: dict[int, TeamStrength] = {}
        self.league_avg_goals = 2.75  # PL average ~2.7-2.8 goals per game
        self.rho = 0.0  # Low-score correction
        
    def _time_weight(self, days_ago: int) -> float:
        """Calculate time-decay weight for a match."""
        return np.exp(-self.time_decay * days_ago)
    
    def _tau(self, home_goals: int, away_goals: int, 
             home_exp: float, away_exp: float, rho: float) -> float:
        """
        Dixon-Coles correction factor tau for low-scoring outcomes.
        
        Adjusts probabilities for 0-0, 1-0, 0-1, and 1-1 scorelines
        which are more/less common than bivariate Poisson predicts.
        """
        if home_goals == 0 and away_goals == 0:
            return 1 - home_exp * away_exp * rho
        elif home_goals == 0 and away_goals == 1:
            return 1 + home_exp * rho
        elif home_goals == 1 and away_goals == 0:
            return 1 + away_exp * rho
        elif home_goals == 1 and away_goals == 1:
            return 1 - rho
        return 1.0
    
    def fit(self, matches: list[dict], teams: dict[int, dict]) -> dict:
        """
        Fit model to historical match data.
        
        Args:
            matches: List of match dicts with home_team, away_team, 
                    home_score, away_score, kickoff_time
            teams: Dict of team_id -> team data with strength ratings
        
        Returns:
            Dict with fitted parameters and metrics
        """
        if not matches:
            # Use prior from FPL strength ratings
            self._init_from_fpl_strengths(teams)
            return {"status": "initialized_from_priors"}
        
        # Initialize parameters
        n_teams = len(teams)
        team_ids = list(teams.keys())
        team_idx = {tid: i for i, tid in enumerate(team_ids)}
        
        # Initial values from FPL data
        attack = np.ones(n_teams)
        defence = np.ones(n_teams)
        home_advantage = 0.25  # ~25% advantage
        
        for tid, team in teams.items():
            idx = team_idx[tid]
            # Normalize FPL strengths to ~1.0 mean
            attack[idx] = (team.get("strength_attack_home", 1000) + 
                          team.get("strength_attack_away", 1000)) / 2000
            defence[idx] = (team.get("strength_defence_home", 1000) + 
                           team.get("strength_defence_away", 1000)) / 2000
        
        # Log-likelihood optimization (simplified for speed)
        def neg_log_likelihood(params):
            att = params[:n_teams]
            defs = params[n_teams:2*n_teams]
            home_adv = params[-2]
            rho = params[-1]
            
            ll = 0
            for match in matches:
                h_idx = team_idx.get(match["home_team"])
                a_idx = team_idx.get(match["away_team"])
                
                if h_idx is None or a_idx is None:
                    continue
                
                # Expected goals
                home_exp = np.exp(att[h_idx] - defs[a_idx] + home_adv)
                away_exp = np.exp(att[a_idx] - defs[h_idx])
                
                home_goals = match.get("home_score", 0) or 0
                away_goals = match.get("away_score", 0) or 0
                
                # Poisson log-likelihood with tau correction
                tau = self._tau(home_goals, away_goals, home_exp, away_exp, rho)
                
                ll += (home_goals * np.log(home_exp + 1e-10) - home_exp +
                       away_goals * np.log(away_exp + 1e-10) - away_exp +
                       np.log(tau + 1e-10))
            
            return -ll
        
        # Optimize
        x0 = np.concatenate([np.log(attack), np.log(defence), [home_advantage, 0.0]])
        bounds = ([(-2, 2)] * (2 * n_teams) + [(-0.5, 0.5), (-0.3, 0.3)])
        
        try:
            result = minimize(neg_log_likelihood, x0, method='L-BFGS-B', bounds=bounds)
            
            # Extract fitted parameters
            fitted_attack = np.exp(result.x[:n_teams])
            fitted_defence = np.exp(result.x[n_teams:2*n_teams])
            self.rho = result.x[-1]
            
            # Store team strengths
            for tid, team in teams.items():
                idx = team_idx[tid]
                self.team_strengths[tid] = TeamStrength(
                    attack_home=fitted_attack[idx] * 1.1,  # Home boost
                    attack_away=fitted_attack[idx] * 0.9,
                    defence_home=fitted_defence[idx] * 0.9,  # Better at home
                    defence_away=fitted_defence[idx] * 1.1,
                )
            
            return {
                "status": "fitted",
                "n_matches": len(matches),
                "rho": self.rho,
            }
        except Exception as e:
            self._init_from_fpl_strengths(teams)
            return {"status": "fallback_to_priors", "error": str(e)}
    
    def _init_from_fpl_strengths(self, teams: dict[int, dict]):
        """Initialize team strengths from FPL API data."""
        for tid, team in teams.items():
            # Normalize to mean ~1.0
            att_h = team.get("strength_attack_home", 1100) / 1100
            att_a = team.get("strength_attack_away", 1100) / 1100
            def_h = team.get("strength_defence_home", 1100) / 1100
            def_a = team.get("strength_defence_away", 1100) / 1100
            
            self.team_strengths[tid] = TeamStrength(
                attack_home=att_h,
                attack_away=att_a,
                defence_home=def_h,
                defence_away=def_a,
            )
    
    def predict_match(self, home_team_id: int, away_team_id: int) -> dict:
        """
        Predict expected goals for a match.
        
        Returns:
            Dict with home_xg, away_xg, scoreline probabilities, outcomes
        """
        home = self.team_strengths.get(home_team_id)
        away = self.team_strengths.get(away_team_id)
        
        if not home or not away:
            return {"home_xg": 1.4, "away_xg": 1.1, "clean_sheet_home": 0.3, 
                    "clean_sheet_away": 0.25}
        
        # Expected goals
        home_xg = home.attack_home * (2 - away.defence_away) * self.league_avg_goals / 2
        away_xg = away.attack_away * (2 - home.defence_home) * self.league_avg_goals / 2
        
        # Clamp to reasonable range
        home_xg = np.clip(home_xg, 0.3, 4.0)
        away_xg = np.clip(away_xg, 0.2, 3.5)
        
        # Clean sheet probabilities (P(goals = 0))
        home_cs = stats.poisson.pmf(0, away_xg)
        away_cs = stats.poisson.pmf(0, home_xg)
        
        # Win/draw/lose probabilities
        max_goals = 8
        home_win = 0
        draw = 0
        away_win = 0
        
        for h in range(max_goals):
            for a in range(max_goals):
                p = stats.poisson.pmf(h, home_xg) * stats.poisson.pmf(a, away_xg)
                # Apply tau correction
                p *= self._tau(h, a, home_xg, away_xg, self.rho)
                
                if h > a:
                    home_win += p
                elif h == a:
                    draw += p
                else:
                    away_win += p
        
        # Normalize
        total = home_win + draw + away_win
        if total > 0:
            home_win /= total
            draw /= total
            away_win /= total
        
        return {
            "home_xg": round(home_xg, 2),
            "away_xg": round(away_xg, 2),
            "clean_sheet_home": round(home_cs, 3),
            "clean_sheet_away": round(away_cs, 3),
            "home_win_prob": round(home_win, 3),
            "draw_prob": round(draw, 3),
            "away_win_prob": round(away_win, 3),
        }


class BayesianExpectedPoints:
    """
    Bayesian expected points calculator with full component breakdown.
    
    Uses conjugate priors for updating beliefs about player performance:
    - Beta-Binomial for probabilities (minutes, CS involvement)
    - Gamma-Poisson for rate parameters (goals, assists, bonus)
    """
    
    # FPL Points System
    POINTS = {
        1: {  # GK
            "minutes_60": 2, "minutes_any": 1, "goal": 6, "assist": 3,
            "clean_sheet": 4, "goals_conceded_2": -1, "penalty_save": 5,
            "save_3": 1, "yellow": -1, "red": -3, "own_goal": -2, "bonus_max": 3
        },
        2: {  # DEF
            "minutes_60": 2, "minutes_any": 1, "goal": 6, "assist": 3,
            "clean_sheet": 4, "goals_conceded_2": -1, "penalty_save": 0,
            "save_3": 0, "yellow": -1, "red": -3, "own_goal": -2, "bonus_max": 3
        },
        3: {  # MID
            "minutes_60": 2, "minutes_any": 1, "goal": 5, "assist": 3,
            "clean_sheet": 1, "goals_conceded_2": 0, "penalty_save": 0,
            "save_3": 0, "yellow": -1, "red": -3, "own_goal": -2, "bonus_max": 3
        },
        4: {  # FWD
            "minutes_60": 2, "minutes_any": 1, "goal": 4, "assist": 3,
            "clean_sheet": 0, "goals_conceded_2": 0, "penalty_save": 0,
            "save_3": 0, "yellow": -1, "red": -3, "own_goal": -2, "bonus_max": 3
        },
    }
    
    def __init__(self, dixon_coles: Optional[DixonColesModel] = None):
        self.match_model = dixon_coles or DixonColesModel()
    
    def calculate_expected_points(
        self,
        player: dict,
        fixture: dict,
        team_data: dict,
        opponent_data: dict,
        history: Optional[list[dict]] = None,
        time_decay: float = 0.15,
    ) -> PointsBreakdown:
        """
        Calculate comprehensive expected points with all components.
        
        Args:
            player: Player data dict
            fixture: Fixture dict with is_home, difficulty
            team_data: Player's team strength data
            opponent_data: Opponent team strength data
            history: Player's recent gameweek history
            time_decay: Decay factor for historical weighting
        
        Returns:
            PointsBreakdown with all component expected points
        """
        position = player.get("position", 3)
        pts_table = self.POINTS.get(position, self.POINTS[3])
        
        # 1. Minutes probability
        exp_minutes, p_60_plus = self._calculate_minutes_probability(player, history)
        
        # 2. Get match predictions
        is_home = fixture.get("is_home", True)
        team_id = player.get("team_id", 0)
        opponent_id = fixture.get("opponent_id", 0)
        
        if is_home:
            match_pred = self.match_model.predict_match(team_id, opponent_id)
            team_xg = match_pred["home_xg"]
            opp_xg = match_pred["away_xg"]
            cs_prob = match_pred["clean_sheet_home"]
        else:
            match_pred = self.match_model.predict_match(opponent_id, team_id)
            team_xg = match_pred["away_xg"]
            opp_xg = match_pred["home_xg"]
            cs_prob = match_pred["clean_sheet_away"]
        
        # 3. Goals expectation
        exp_goals = self._calculate_goal_expectation(player, team_xg, history)
        
        # 4. Assists expectation
        exp_assists = self._calculate_assist_expectation(player, team_xg, history)
        
        # 5. Clean sheet expectation (for DEF/GK)
        exp_cs = 0.0
        if position in [1, 2]:
            exp_cs = cs_prob * p_60_plus
        elif position == 3:
            exp_cs = cs_prob * p_60_plus * 0.3  # Mids get fewer CS points
        
        # 6. Goals conceded penalty (for DEF/GK)
        exp_goals_conceded_penalty = 0.0
        if position in [1, 2]:
            # Expected goals conceded affects points
            exp_gc = opp_xg * p_60_plus
            # Points lost per 2 goals conceded
            exp_goals_conceded_penalty = (exp_gc / 2) * pts_table["goals_conceded_2"]
        
        # 7. Bonus points (using ICT and history)
        exp_bonus = self._calculate_bonus_expectation(player, history, exp_goals, exp_assists)
        
        # 8. Saves (for GK)
        exp_saves_pts = 0.0
        if position == 1:
            exp_saves = opp_xg * 2.8  # Average saves per xG faced
            exp_saves_pts = (exp_saves / 3) * pts_table["save_3"]
        
        # 9. Negative points (cards, own goals)
        exp_yellow = self._get_card_probability(player, history, "yellow")
        exp_red = self._get_card_probability(player, history, "red")
        exp_own_goal = 0.01  # Very rare
        
        # Calculate component points
        minutes_pts = (p_60_plus * pts_table["minutes_60"] + 
                      (exp_minutes / 90 - p_60_plus) * pts_table["minutes_any"])
        goals_pts = exp_goals * pts_table["goal"]
        assists_pts = exp_assists * pts_table["assist"]
        cs_pts = exp_cs * pts_table["clean_sheet"]
        gc_pts = exp_goals_conceded_penalty
        bonus_pts = exp_bonus
        saves_pts = exp_saves_pts
        penalty_save_pts = 0.0  # Rare, hard to model
        yellow_pts = exp_yellow * pts_table["yellow"]
        red_pts = exp_red * pts_table["red"]
        og_pts = exp_own_goal * pts_table["own_goal"]
        
        # Total expected points
        total = (minutes_pts + goals_pts + assists_pts + cs_pts + gc_pts + 
                bonus_pts + saves_pts + penalty_save_pts + yellow_pts + 
                red_pts + og_pts)
        
        # Confidence interval (based on variance)
        variance = self._calculate_variance(
            position, exp_goals, exp_assists, cs_prob, exp_bonus
        )
        std = np.sqrt(variance)
        ci_lower = max(0, total - 1.645 * std)  # 90% CI
        ci_upper = total + 1.645 * std
        
        return PointsBreakdown(
            minutes=round(minutes_pts, 2),
            goals=round(goals_pts, 2),
            assists=round(assists_pts, 2),
            clean_sheet=round(cs_pts, 2),
            goals_conceded=round(gc_pts, 2),
            bonus=round(bonus_pts, 2),
            saves=round(saves_pts, 2),
            penalty_saves=round(penalty_save_pts, 2),
            yellow_cards=round(yellow_pts, 2),
            red_cards=round(red_pts, 2),
            own_goals=round(og_pts, 2),
            total=round(total, 2),
            confidence_lower=round(ci_lower, 2),
            confidence_upper=round(ci_upper, 2),
        )
    
    def _calculate_minutes_probability(
        self, player: dict, history: Optional[list[dict]]
    ) -> Tuple[float, float]:
        """
        Calculate expected minutes and probability of playing 60+.
        
        Uses Beta-Binomial model with priors from recent form.
        """
        # Priors from FPL data
        chance = player.get("chance_of_playing", 100) or 100
        status = player.get("status", "a")
        
        if status == "u":  # Unavailable
            return 0.0, 0.0
        if status == "i":  # Injured
            return chance / 100 * 30, 0.1
        if status == "s":  # Suspended
            return 0.0, 0.0
        
        # Prior: Beta(alpha, beta) for 60+ minutes
        alpha_prior = 3.0
        beta_prior = 1.0
        
        if history:
            # Update with recent data
            recent = history[-5:] if len(history) >= 5 else history
            played_60 = sum(1 for h in recent if h.get("minutes", 0) >= 60)
            played_any = sum(1 for h in recent if h.get("minutes", 0) > 0)
            
            alpha = alpha_prior + played_60
            beta = beta_prior + (len(recent) - played_60)
            
            p_60_plus = alpha / (alpha + beta)
            exp_minutes = p_60_plus * 85 + (1 - p_60_plus) * 30 * (played_any / max(1, len(recent)))
        else:
            # Use form and general availability
            minutes_per_game = player.get("minutes", 0) / max(1, player.get("games", 1))
            p_60_plus = min(0.95, minutes_per_game / 90)
            exp_minutes = minutes_per_game
        
        # Adjust for chance of playing
        p_60_plus *= (chance / 100)
        exp_minutes *= (chance / 100)
        
        return exp_minutes, p_60_plus
    
    def _calculate_goal_expectation(
        self, player: dict, team_xg: float, history: Optional[list[dict]]
    ) -> float:
        """
        Calculate expected goals using Gamma-Poisson model.
        """
        # Player's share of team xG
        player_xg = float(player.get("xg", 0) or 0)
        player_xgi = float(player.get("xgi", 0) or 0)
        position = player.get("position", 3)
        
        # Prior based on position
        position_priors = {1: 0.01, 2: 0.04, 3: 0.08, 4: 0.15}
        prior_rate = position_priors.get(position, 0.08)
        
        # Games played for normalization
        minutes = player.get("minutes", 0)
        games_equiv = max(1, minutes / 90)
        
        # Posterior rate
        if games_equiv > 3:
            # Use player's actual xG rate
            xg_per_game = player_xg / games_equiv
            # Weight prior vs observed
            weight = min(1.0, games_equiv / 10)
            rate = weight * xg_per_game + (1 - weight) * prior_rate
        else:
            rate = prior_rate
        
        # Adjust for fixture
        # team_xg is the expected goals for the team this match
        # Adjust player's share based on historical involvement
        if player_xgi > 0 and games_equiv > 0:
            involvement_rate = player_xgi / games_equiv / max(0.5, team_xg)
            rate = rate * involvement_rate / prior_rate
        
        return min(rate * 1.2, 1.5)  # Cap at reasonable max
    
    def _calculate_assist_expectation(
        self, player: dict, team_xg: float, history: Optional[list[dict]]
    ) -> float:
        """Calculate expected assists using xA data."""
        player_xa = float(player.get("xa", 0) or 0)
        position = player.get("position", 3)
        
        position_priors = {1: 0.01, 2: 0.05, 3: 0.1, 4: 0.06}
        prior_rate = position_priors.get(position, 0.06)
        
        minutes = player.get("minutes", 0)
        games_equiv = max(1, minutes / 90)
        
        if games_equiv > 3:
            xa_per_game = player_xa / games_equiv
            weight = min(1.0, games_equiv / 10)
            rate = weight * xa_per_game + (1 - weight) * prior_rate
        else:
            rate = prior_rate
        
        return min(rate * 1.1, 1.0)
    
    def _calculate_bonus_expectation(
        self, player: dict, history: Optional[list[dict]],
        exp_goals: float, exp_assists: float
    ) -> float:
        """
        Calculate expected bonus points.
        
        Uses ICT index and historical bonus patterns.
        """
        ict = float(player.get("ict_index", 0) or 0)
        
        if history:
            recent = history[-10:] if len(history) >= 10 else history
            avg_bonus = sum(h.get("bonus", 0) for h in recent) / max(1, len(recent))
            avg_bps = sum(h.get("bps", 0) for h in recent) / max(1, len(recent))
            
            # BPS > 30 typically gets bonus
            if avg_bps > 25:
                return min(avg_bonus * 1.1, 3.0)
            return avg_bonus
        
        # Estimate from goal/assist involvement
        base_bonus = exp_goals * 1.2 + exp_assists * 0.8
        
        # ICT correlation
        if ict > 100:
            base_bonus += 0.3
        
        return min(base_bonus, 2.5)
    
    def _get_card_probability(
        self, player: dict, history: Optional[list[dict]], card_type: str
    ) -> float:
        """Get probability of receiving a card."""
        if history:
            recent = history[-20:] if len(history) >= 20 else history
            cards = sum(1 for h in recent if h.get(f"{card_type}_cards", 0) > 0)
            return cards / max(1, len(recent))
        
        # Position-based priors
        position = player.get("position", 3)
        if card_type == "yellow":
            return {1: 0.02, 2: 0.08, 3: 0.06, 4: 0.05}.get(position, 0.06)
        return 0.002  # Red cards very rare
    
    def _calculate_variance(
        self, position: int, exp_goals: float, exp_assists: float,
        cs_prob: float, exp_bonus: float
    ) -> float:
        """Calculate variance of expected points for confidence intervals."""
        # Poisson variance = mean for goals/assists
        pts = self.POINTS.get(position, self.POINTS[3])
        
        goal_var = exp_goals * (pts["goal"] ** 2)
        assist_var = exp_assists * (pts["assist"] ** 2)
        cs_var = cs_prob * (1 - cs_prob) * (pts["clean_sheet"] ** 2)
        bonus_var = exp_bonus * 1.5  # Bonus is quite variable
        
        # Minutes variance (usually low for starters)
        minutes_var = 2.0
        
        return goal_var + assist_var + cs_var + bonus_var + minutes_var


class FormAnalyzer:
    """
    Analyze player form with sophisticated time-weighting and trend detection.
    """
    
    def __init__(self, decay_rate: float = 0.15):
        """
        Args:
            decay_rate: Exponential decay rate for historical weighting.
                       0.15 means ~50% weight on last ~5 games.
        """
        self.decay_rate = decay_rate
    
    def calculate_weighted_form(
        self, history: list[dict], metric: str = "total_points"
    ) -> dict:
        """
        Calculate time-weighted form with exponential decay.
        
        Returns:
            Dict with weighted_form, raw_form, trend, consistency
        """
        if not history:
            return {"weighted_form": 0, "raw_form": 0, "trend": 0, "consistency": 0}
        
        # Sort by gameweek descending (most recent first)
        sorted_hist = sorted(history, key=lambda x: x.get("gameweek", 0), reverse=True)
        
        values = []
        weights = []
        
        for i, gw in enumerate(sorted_hist):
            value = gw.get(metric, 0)
            weight = np.exp(-self.decay_rate * i)
            values.append(value)
            weights.append(weight)
        
        values = np.array(values)
        weights = np.array(weights)
        
        # Weighted mean
        weighted_form = np.sum(values * weights) / np.sum(weights)
        raw_form = np.mean(values)
        
        # Trend (regression slope)
        if len(values) >= 3:
            x = np.arange(len(values))
            slope, _ = np.polyfit(x, values, 1)
            trend = -slope  # Negative because x=0 is most recent
        else:
            trend = 0
        
        # Consistency (coefficient of variation)
        if np.mean(values) > 0:
            consistency = 1 - (np.std(values) / np.mean(values))
            consistency = max(0, min(1, consistency))
        else:
            consistency = 0
        
        return {
            "weighted_form": round(weighted_form, 2),
            "raw_form": round(raw_form, 2),
            "trend": round(trend, 3),
            "trend_direction": "up" if trend > 0.1 else ("down" if trend < -0.1 else "stable"),
            "consistency": round(consistency, 2),
            "games_analyzed": len(values),
        }
    
    def detect_streaks(self, history: list[dict]) -> dict:
        """
        Detect hot and cold streaks.
        
        Uses statistical process control concepts - streaks are runs
        outside control limits (mean ± 1.5 std).
        """
        if len(history) < 5:
            return {"current_streak": "neutral", "streak_length": 0}
        
        sorted_hist = sorted(history, key=lambda x: x.get("gameweek", 0), reverse=True)
        points = [h.get("total_points", 0) for h in sorted_hist]
        
        mean_pts = np.mean(points)
        std_pts = np.std(points)
        
        if std_pts == 0:
            return {"current_streak": "neutral", "streak_length": 0}
        
        # Control limits
        upper_limit = mean_pts + 1.5 * std_pts
        lower_limit = mean_pts - 1.5 * std_pts
        
        # Check current streak
        streak_type = "neutral"
        streak_length = 0
        
        for pts in points:
            if pts > upper_limit:
                if streak_type == "hot":
                    streak_length += 1
                elif streak_type == "neutral":
                    streak_type = "hot"
                    streak_length = 1
                else:
                    break
            elif pts < lower_limit:
                if streak_type == "cold":
                    streak_length += 1
                elif streak_type == "neutral":
                    streak_type = "cold"
                    streak_length = 1
                else:
                    break
            else:
                if streak_length > 0:
                    break
                streak_length = 0
        
        return {
            "current_streak": streak_type,
            "streak_length": streak_length,
            "mean_points": round(mean_pts, 2),
            "std_points": round(std_pts, 2),
            "upper_threshold": round(upper_limit, 2),
            "lower_threshold": round(lower_limit, 2),
        }
    
    def regression_to_mean_projection(
        self, player: dict, history: list[dict]
    ) -> dict:
        """
        Project regression to mean for outlier performers.
        
        Players performing significantly above/below xStats are likely
        to regress.
        """
        if not history or len(history) < 5:
            return {"regression_factor": 1.0, "projected_adjustment": 0}
        
        # Compare actual to expected
        total_goals = sum(h.get("goals_scored", 0) for h in history)
        total_assists = sum(h.get("assists", 0) for h in history)
        
        xg = float(player.get("xg", 0) or 0)
        xa = float(player.get("xa", 0) or 0)
        
        # Calculate over/under-performance
        goal_diff = total_goals - xg if xg > 0 else 0
        assist_diff = total_assists - xa if xa > 0 else 0
        
        # Regression factor (how much we expect regression)
        # Typically ~50% of outperformance regresses
        regression_pct = 0.5
        
        position = player.get("position", 3)
        pts_per_goal = {1: 6, 2: 6, 3: 5, 4: 4}.get(position, 5)
        pts_per_assist = 3
        
        projected_adjustment = -(
            goal_diff * regression_pct * pts_per_goal +
            assist_diff * regression_pct * pts_per_assist
        ) / len(history)
        
        return {
            "goals_vs_xg": round(goal_diff, 2),
            "assists_vs_xa": round(assist_diff, 2),
            "is_overperforming": goal_diff > 0.5 or assist_diff > 0.5,
            "is_underperforming": goal_diff < -0.5 or assist_diff < -0.5,
            "projected_adjustment_per_gw": round(projected_adjustment, 2),
            "regression_factor": round(1 + projected_adjustment / max(1, player.get("form", 1)), 2),
        }

