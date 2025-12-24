"""
Player Value Analysis Module.

Implements sophisticated value metrics for FPL player evaluation:
1. Value Over Replacement (VOR) - Points above a baseline replacement
2. Points Per Million (PPM) efficiency
3. Ceiling/Floor analysis for risk assessment
4. Ownership-adjusted expected value
5. Transfer efficiency metrics
"""
import numpy as np
from typing import Optional
from dataclasses import dataclass
from scipy import stats


@dataclass
class PlayerValueMetrics:
    """Comprehensive player value analysis."""
    value_over_replacement: float
    points_per_million: float
    efficiency_rank: int
    ceiling_points: float  # 90th percentile
    floor_points: float    # 10th percentile
    upside_ratio: float    # Ceiling / Expected
    consistency_score: float
    ownership_adjusted_ev: float
    captaincy_ev: float
    effective_ownership: float
    is_template: bool
    is_differential: bool
    value_tier: str  # "premium", "mid-price", "budget", "enabler"


@dataclass
class TransferMetrics:
    """Transfer value analysis."""
    current_value: float
    purchase_price: float
    value_change: float
    projected_value_change: float
    transfer_efficiency: float  # Points gained per £ spent
    sell_recommendation: str  # "hold", "sell", "strong_sell"


class PlayerValueAnalyzer:
    """
    Analyze player value using advanced metrics.
    
    Implements VOR (Value Over Replacement) methodology similar to
    fantasy baseball sabermetrics.
    """
    
    # Replacement level baseline (approximate 13th-15th best at position)
    REPLACEMENT_LEVEL = {
        1: {"expected_points": 3.5, "price": 4.5},  # GK
        2: {"expected_points": 4.0, "price": 4.5},  # DEF
        3: {"expected_points": 4.5, "price": 5.5},  # MID
        4: {"expected_points": 4.0, "price": 5.5},  # FWD
    }
    
    # Price tiers
    PRICE_TIERS = {
        "enabler": (0, 4.5),
        "budget": (4.5, 6.0),
        "mid-price": (6.0, 9.0),
        "premium": (9.0, 20.0),
    }
    
    def __init__(self):
        self.players_cache: dict = {}
    
    def analyze_player_value(
        self,
        player: dict,
        all_players: list[dict],
        history: Optional[list[dict]] = None,
    ) -> PlayerValueMetrics:
        """
        Calculate comprehensive value metrics for a player.
        
        Args:
            player: Player data dict
            all_players: All players for comparative analysis
            history: Player's gameweek history for ceiling/floor
        """
        position = player.get("position", 3)
        price = player.get("price", 5.0)
        expected_points = player.get("expected_points", 0)
        ownership = player.get("selected_by_percent", 0)
        
        # 1. Value Over Replacement
        replacement = self.REPLACEMENT_LEVEL.get(position, self.REPLACEMENT_LEVEL[3])
        vor = expected_points - replacement["expected_points"]
        
        # 2. Points Per Million
        ppm = expected_points / max(price, 3.5)
        
        # 3. Efficiency Rank (among same position)
        same_pos = [p for p in all_players if p.get("position") == position]
        same_pos_ppm = [p.get("expected_points", 0) / max(p.get("price", 4), 3.5) for p in same_pos]
        efficiency_rank = sum(1 for x in same_pos_ppm if x > ppm) + 1
        
        # 4. Ceiling/Floor Analysis
        if history and len(history) >= 5:
            points_hist = [h.get("total_points", 0) for h in history]
            ceiling = np.percentile(points_hist, 90)
            floor = np.percentile(points_hist, 10)
            consistency = 1 - (np.std(points_hist) / max(np.mean(points_hist), 1))
        else:
            # Estimate from expected points
            ceiling = expected_points * 2.5
            floor = max(0, expected_points * 0.3)
            consistency = 0.5
        
        # 5. Upside Ratio
        upside_ratio = ceiling / max(expected_points, 1)
        
        # 6. Ownership-Adjusted EV
        # Differential value: higher for low ownership with high ceiling
        ownership_factor = 1 + (30 - ownership) / 100  # Bonus for differentials
        ownership_adjusted_ev = expected_points * min(ownership_factor, 1.5)
        
        # 7. Captaincy EV (extra points from captaining)
        # Best captain is highest EV option - this player's contribution
        top_captain_ev = max(p.get("expected_points", 0) for p in all_players)
        captaincy_ev = expected_points - top_captain_ev * 0.5  # Relative value
        
        # 8. Effective Ownership (for mini-leagues, assumes ~20% above overall)
        effective_ownership = ownership * 1.2
        
        # 9. Template/Differential classification
        is_template = ownership > 25
        is_differential = ownership < 10
        
        # 10. Value Tier
        value_tier = "mid-price"
        for tier, (low, high) in self.PRICE_TIERS.items():
            if low <= price < high:
                value_tier = tier
                break
        
        return PlayerValueMetrics(
            value_over_replacement=round(vor, 2),
            points_per_million=round(ppm, 3),
            efficiency_rank=efficiency_rank,
            ceiling_points=round(ceiling, 1),
            floor_points=round(floor, 1),
            upside_ratio=round(upside_ratio, 2),
            consistency_score=round(max(0, min(1, consistency)), 2),
            ownership_adjusted_ev=round(ownership_adjusted_ev, 2),
            captaincy_ev=round(captaincy_ev, 2),
            effective_ownership=round(effective_ownership, 1),
            is_template=is_template,
            is_differential=is_differential,
            value_tier=value_tier,
        )
    
    def calculate_vor_rankings(
        self,
        players: list[dict],
        num_gameweeks: int = 1,
    ) -> list[dict]:
        """
        Rank all players by Value Over Replacement.
        
        VOR accounts for position scarcity by comparing to replacement level.
        """
        vor_list = []
        
        for player in players:
            position = player.get("position", 3)
            replacement = self.REPLACEMENT_LEVEL.get(position, self.REPLACEMENT_LEVEL[3])
            
            exp_pts = player.get("expected_points", 0) * num_gameweeks
            vor = exp_pts - (replacement["expected_points"] * num_gameweeks)
            
            # Cost-adjusted VOR
            price = player.get("price", 5.0)
            replacement_price = replacement["price"]
            extra_cost = price - replacement_price
            vor_per_cost = vor / max(extra_cost, 0.5) if extra_cost > 0 else vor
            
            vor_list.append({
                "id": player.get("id"),
                "name": player.get("web_name", player.get("name", "")),
                "position": position,
                "price": price,
                "expected_points": round(exp_pts, 2),
                "vor": round(vor, 2),
                "vor_per_cost": round(vor_per_cost, 2),
                "ownership": player.get("selected_by_percent", 0),
            })
        
        # Sort by VOR
        vor_list.sort(key=lambda x: x["vor"], reverse=True)
        
        for i, p in enumerate(vor_list, 1):
            p["vor_rank"] = i
        
        return vor_list
    
    def find_value_picks(
        self,
        players: list[dict],
        budget_remaining: float = 100.0,
        existing_team_ids: set[int] = None,
        position_filter: Optional[int] = None,
    ) -> list[dict]:
        """
        Find best value picks based on VOR efficiency.
        
        Filters by budget and excludes existing team players.
        """
        existing_team_ids = existing_team_ids or set()
        
        candidates = [
            p for p in players
            if p.get("price", 100) <= budget_remaining
            and p.get("id") not in existing_team_ids
            and (position_filter is None or p.get("position") == position_filter)
            and p.get("status", "a") == "a"  # Available players only
        ]
        
        # Calculate VOR for each candidate
        value_picks = []
        for player in candidates:
            metrics = self.analyze_player_value(player, players)
            
            value_picks.append({
                **player,
                "vor": metrics.value_over_replacement,
                "ppm": metrics.points_per_million,
                "efficiency_rank": metrics.efficiency_rank,
                "ceiling": metrics.ceiling_points,
                "floor": metrics.floor_points,
                "is_differential": metrics.is_differential,
                "value_tier": metrics.value_tier,
            })
        
        # Sort by VOR efficiency (VOR per price above minimum)
        for p in value_picks:
            min_price = self.REPLACEMENT_LEVEL.get(p.get("position", 3), {}).get("price", 4.0)
            extra_cost = p.get("price", 5) - min_price
            p["efficiency_score"] = p["vor"] / max(extra_cost, 0.5)
        
        value_picks.sort(key=lambda x: x["efficiency_score"], reverse=True)
        
        return value_picks[:20]  # Top 20 picks


class DifferentialAnalyzer:
    """
    Analyze differential player picks for competitive advantage.
    """
    
    def calculate_effective_ownership(
        self,
        player: dict,
        league_size: int = 20,
        league_avg_rank: int = 500000,
    ) -> dict:
        """
        Calculate effective ownership based on league context.
        
        Effective ownership is typically higher in competitive leagues.
        """
        base_ownership = player.get("selected_by_percent", 0)
        
        # Adjust for league competitiveness
        # Top 100k leagues typically have 1.3x-1.5x template ownership
        if league_avg_rank < 100000:
            ownership_multiplier = 1.4
        elif league_avg_rank < 500000:
            ownership_multiplier = 1.2
        else:
            ownership_multiplier = 1.0
        
        effective_ownership = base_ownership * ownership_multiplier
        
        # Adjust for league size (smaller leagues have more variance)
        size_factor = 1 - (league_size / 100) * 0.2  # Max 20% reduction
        
        return {
            "base_ownership": base_ownership,
            "effective_ownership": round(effective_ownership * size_factor, 1),
            "is_template": base_ownership > 25,
            "is_differential": base_ownership < 10,
            "is_extreme_differential": base_ownership < 3,
        }
    
    def calculate_differential_ev(
        self,
        player: dict,
        expected_points: float,
        effective_ownership: float,
    ) -> dict:
        """
        Calculate expected value of a differential pick.
        
        Differential EV = Expected Points * (1 - Effective Ownership/100)
        This is the expected points gain vs. the field.
        """
        ownership_factor = 1 - (effective_ownership / 100)
        differential_ev = expected_points * ownership_factor
        
        # Captain differential EV (double the differential impact)
        captain_diff_ev = expected_points * 2 * ownership_factor
        
        return {
            "expected_points": expected_points,
            "effective_ownership": effective_ownership,
            "differential_ev": round(differential_ev, 2),
            "captain_differential_ev": round(captain_diff_ev, 2),
            "rank_impact": "high" if differential_ev > 5 else ("medium" if differential_ev > 2 else "low"),
        }
    
    def find_captain_differentials(
        self,
        players: list[dict],
        min_expected: float = 5.0,
        max_ownership: float = 15.0,
    ) -> list[dict]:
        """
        Find optimal captain differential picks.
        
        High upside players with low ownership for rank gains.
        """
        candidates = []
        
        for player in players:
            exp_pts = player.get("expected_points", 0)
            ownership = player.get("selected_by_percent", 0)
            
            if exp_pts < min_expected or ownership > max_ownership:
                continue
            
            if player.get("status", "a") != "a":
                continue
            
            diff_ev = self.calculate_differential_ev(player, exp_pts, ownership)
            
            candidates.append({
                "id": player.get("id"),
                "name": player.get("web_name", player.get("name", "")),
                "position": player.get("position"),
                "price": player.get("price"),
                "expected_points": exp_pts,
                "ownership": ownership,
                **diff_ev,
            })
        
        # Sort by captain differential EV
        candidates.sort(key=lambda x: x["captain_differential_ev"], reverse=True)
        
        return candidates[:10]


class TransferValueAnalyzer:
    """
    Analyze transfer market efficiency and timing.
    """
    
    def calculate_transfer_efficiency(
        self,
        player_out: dict,
        player_in: dict,
        num_gameweeks: int = 5,
    ) -> dict:
        """
        Calculate efficiency of a transfer.
        
        Efficiency = (Points Gained) / (Net Cost Change)
        """
        pts_out = player_out.get("expected_points", 0) * num_gameweeks
        pts_in = player_in.get("expected_points", 0) * num_gameweeks
        pts_gained = pts_in - pts_out
        
        price_out = player_out.get("price", 5.0)
        price_in = player_in.get("price", 5.0)
        cost_change = price_in - price_out
        
        if cost_change > 0:
            efficiency = pts_gained / cost_change
        elif cost_change < 0:
            efficiency = pts_gained * abs(cost_change)  # Bonus for freeing funds
        else:
            efficiency = pts_gained * 10  # Neutral cost, pure gain
        
        return {
            "player_out": player_out.get("web_name", player_out.get("name", "")),
            "player_in": player_in.get("web_name", player_in.get("name", "")),
            "points_gained": round(pts_gained, 2),
            "cost_change": round(cost_change, 1),
            "efficiency": round(efficiency, 2),
            "horizon_gameweeks": num_gameweeks,
            "recommendation": (
                "strong_buy" if efficiency > 5 else
                "buy" if efficiency > 2 else
                "hold" if efficiency > 0 else
                "avoid"
            ),
        }
    
    def predict_price_change(
        self,
        player: dict,
        transfers_in_gw: int,
        transfers_out_gw: int,
        total_managers: int = 10_000_000,
    ) -> dict:
        """
        Predict upcoming price changes based on transfer activity.
        
        Uses the net transfer percentage to estimate price movement.
        """
        net_transfers = transfers_in_gw - transfers_out_gw
        ownership = player.get("selected_by_percent", 0)
        current_owners = int(total_managers * ownership / 100)
        
        # Net transfer percentage
        if current_owners > 0:
            net_pct = (net_transfers / current_owners) * 100
        else:
            net_pct = 0
        
        # Thresholds are approximate - FPL uses a more complex algorithm
        if net_pct > 3:
            prediction = "rise_imminent"
            confidence = min(0.9, net_pct / 5)
        elif net_pct > 1.5:
            prediction = "rise_likely"
            confidence = 0.6
        elif net_pct < -3:
            prediction = "fall_imminent"
            confidence = min(0.9, abs(net_pct) / 5)
        elif net_pct < -1.5:
            prediction = "fall_likely"
            confidence = 0.6
        else:
            prediction = "stable"
            confidence = 0.7
        
        return {
            "current_price": player.get("price"),
            "net_transfers": net_transfers,
            "net_transfer_pct": round(net_pct, 2),
            "prediction": prediction,
            "confidence": round(confidence, 2),
            "expected_change": (
                0.1 if "rise" in prediction else
                -0.1 if "fall" in prediction else
                0
            ),
        }

