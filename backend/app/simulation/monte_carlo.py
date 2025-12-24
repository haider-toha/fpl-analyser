"""Monte Carlo simulation engine for FPL predictions."""
import numpy as np
from typing import Optional
from app.models.player import Player


class MonteCarloSimulator:
    """Monte Carlo simulator for FPL point projections."""
    
    def __init__(self, seed: Optional[int] = None):
        """Initialize simulator with optional random seed."""
        if seed:
            np.random.seed(seed)
    
    def simulate_gameweek(
        self,
        squad: list[Player],
        starting_xi: list[Player],
        captain: Player,
        vice_captain: Player,
        num_simulations: int = 10000,
        gameweeks: int = 1,
    ) -> dict:
        """
        Simulate gameweek points using Monte Carlo.
        
        Uses a negative binomial distribution for points, which better models
        the discrete, right-skewed nature of FPL points.
        """
        results = []
        
        for _ in range(num_simulations):
            total_points = 0
            
            for player in starting_xi:
                # Simulate points using negative binomial (or Poisson for simplicity)
                # Mean = expected_points, with some variance
                mean_pts = max(0.1, player.expected_points * gameweeks)
                variance = mean_pts * 1.5  # Higher variance for uncertainty
                
                # Use negative binomial parameters
                if variance > mean_pts:
                    p = mean_pts / variance
                    r = mean_pts * p / (1 - p)
                    pts = np.random.negative_binomial(max(1, r), max(0.01, min(0.99, p)))
                else:
                    pts = np.random.poisson(mean_pts)
                
                # Captain gets double
                if player.id == captain.id:
                    pts *= 2
                
                total_points += pts
            
            results.append(total_points)
        
        results = np.array(results)
        
        # Calculate statistics
        percentiles = np.percentile(results, [5, 25, 50, 75, 95])
        
        return {
            "simulations": num_simulations,
            "gameweeks": gameweeks,
            "statistics": {
                "mean": float(np.mean(results)),
                "median": float(np.median(results)),
                "std": float(np.std(results)),
                "min": int(np.min(results)),
                "max": int(np.max(results)),
            },
            "percentiles": {
                "p5": float(percentiles[0]),
                "p25": float(percentiles[1]),
                "p50": float(percentiles[2]),
                "p75": float(percentiles[3]),
                "p95": float(percentiles[4]),
            },
            "distribution": self._create_histogram(results),
            "risk_metrics": {
                "downside_risk": float(np.mean(results[results < np.mean(results)])),
                "upside_potential": float(np.mean(results[results > np.mean(results)])),
                "prob_above_average": float(np.mean(results > np.mean(results))),
            }
        }
    
    def get_player_distribution(
        self,
        player: Player,
        num_simulations: int = 10000,
    ) -> dict:
        """Get probability distribution for a single player's points."""
        mean_pts = max(0.1, player.expected_points)
        variance = mean_pts * 1.5
        
        if variance > mean_pts:
            p = mean_pts / variance
            r = mean_pts * p / (1 - p)
            results = np.random.negative_binomial(max(1, r), max(0.01, min(0.99, p)), num_simulations)
        else:
            results = np.random.poisson(mean_pts, num_simulations)
        
        # Calculate probability of each point total
        unique, counts = np.unique(results, return_counts=True)
        probabilities = {int(u): float(c / num_simulations) for u, c in zip(unique, counts)}
        
        percentiles = np.percentile(results, [10, 25, 50, 75, 90])
        
        return {
            "player_id": player.id,
            "player_name": player.name,
            "expected_points": player.expected_points,
            "simulations": num_simulations,
            "statistics": {
                "mean": float(np.mean(results)),
                "median": float(np.median(results)),
                "std": float(np.std(results)),
                "min": int(np.min(results)),
                "max": int(np.max(results)),
            },
            "percentiles": {
                "p10": float(percentiles[0]),
                "p25": float(percentiles[1]),
                "p50": float(percentiles[2]),
                "p75": float(percentiles[3]),
                "p90": float(percentiles[4]),
            },
            "probabilities": probabilities,
            "distribution": self._create_histogram(results),
        }
    
    async def analyze_what_if(
        self,
        squad_ids: list[int],
        actual_captain: Player,
        alternative_captain: Player,
        gameweek: int,
        fpl_client,
    ) -> dict:
        """Analyze what-if scenario for captain choice."""
        # Get historical data for the gameweek
        history_actual = await fpl_client.get_player_history(actual_captain.id)
        history_alt = await fpl_client.get_player_history(alternative_captain.id)
        
        actual_pts = 0
        alt_pts = 0
        
        if history_actual:
            for gw in history_actual.get("history", []):
                if gw["round"] == gameweek:
                    actual_pts = gw["total_points"]
                    break
        
        if history_alt:
            for gw in history_alt.get("history", []):
                if gw["round"] == gameweek:
                    alt_pts = gw["total_points"]
                    break
        
        # Captain gets double points
        actual_captain_pts = actual_pts * 2
        alt_captain_pts = alt_pts * 2
        
        # Calculate the difference (what you would have gained/lost)
        difference = alt_captain_pts - actual_captain_pts
        
        return {
            "gameweek": gameweek,
            "actual_captain": {
                "id": actual_captain.id,
                "name": actual_captain.name,
                "points": actual_pts,
                "captain_points": actual_captain_pts,
            },
            "alternative_captain": {
                "id": alternative_captain.id,
                "name": alternative_captain.name,
                "points": alt_pts,
                "captain_points": alt_captain_pts,
            },
            "difference": difference,
            "would_have_gained": max(0, difference),
            "regret": difference if difference > 0 else 0,
        }
    
    def project_season(
        self,
        squad: list[Player],
        current_points: int,
        current_gameweek: int,
        num_simulations: int = 5000,
    ) -> dict:
        """Project final season points using Monte Carlo."""
        remaining_gws = 38 - current_gameweek
        
        if remaining_gws <= 0:
            return {
                "current_points": current_points,
                "projected_final": current_points,
                "remaining_gameweeks": 0,
            }
        
        # Estimate weekly points based on squad quality
        avg_xi_pts = sum(sorted([p.expected_points for p in squad], reverse=True)[:11])
        
        season_results = []
        
        for _ in range(num_simulations):
            season_total = current_points
            
            for gw in range(remaining_gws):
                # Add some variance for transfers, form changes, etc.
                weekly_variance = avg_xi_pts * 0.3
                gw_points = np.random.normal(avg_xi_pts, weekly_variance)
                season_total += max(0, gw_points)
            
            season_results.append(season_total)
        
        results = np.array(season_results)
        percentiles = np.percentile(results, [5, 25, 50, 75, 95])
        
        return {
            "current_points": current_points,
            "current_gameweek": current_gameweek,
            "remaining_gameweeks": remaining_gws,
            "simulations": num_simulations,
            "projected_final": {
                "mean": float(np.mean(results)),
                "median": float(np.median(results)),
                "std": float(np.std(results)),
            },
            "percentiles": {
                "p5_pessimistic": float(percentiles[0]),
                "p25": float(percentiles[1]),
                "p50_expected": float(percentiles[2]),
                "p75": float(percentiles[3]),
                "p95_optimistic": float(percentiles[4]),
            },
            "distribution": self._create_histogram(results, bins=30),
        }
    
    def project_league(
        self,
        manager_squads: list[dict],
        remaining_gameweeks: int,
        num_simulations: int = 5000,
    ) -> dict:
        """Project league standings using Monte Carlo."""
        standings_results = {m["entry"]: [] for m in manager_squads}
        
        for _ in range(num_simulations):
            final_points = {}
            
            for manager in manager_squads:
                current = manager["current_points"]
                squad = manager.get("squad", {}).get("picks", [])
                
                # Estimate weekly points (simplified)
                avg_weekly = 50  # Default estimate
                if squad:
                    avg_weekly = 55  # Slightly better if we have squad data
                
                weekly_variance = 15
                season_points = current
                
                for _ in range(remaining_gameweeks):
                    gw_pts = np.random.normal(avg_weekly, weekly_variance)
                    season_points += max(20, gw_pts)  # Minimum reasonable GW score
                
                final_points[manager["entry"]] = season_points
            
            # Calculate positions
            sorted_managers = sorted(final_points.items(), key=lambda x: x[1], reverse=True)
            for rank, (entry, _) in enumerate(sorted_managers, 1):
                standings_results[entry].append(rank)
        
        # Calculate probabilities
        projections = []
        for manager in manager_squads:
            entry = manager["entry"]
            ranks = np.array(standings_results[entry])
            
            projections.append({
                "entry": entry,
                "name": manager["name"],
                "current_points": manager["current_points"],
                "average_rank": float(np.mean(ranks)),
                "median_rank": float(np.median(ranks)),
                "win_probability": float(np.mean(ranks == 1)),
                "top_3_probability": float(np.mean(ranks <= 3)),
                "rank_distribution": {
                    str(i): float(np.mean(ranks == i))
                    for i in range(1, min(11, len(manager_squads) + 1))
                },
            })
        
        # Sort by average rank
        projections.sort(key=lambda x: x["average_rank"])
        
        return {
            "remaining_gameweeks": remaining_gameweeks,
            "simulations": num_simulations,
            "projections": projections,
        }
    
    def _create_histogram(self, data: np.ndarray, bins: int = 20) -> dict:
        """Create histogram data for visualization."""
        hist, bin_edges = np.histogram(data, bins=bins)
        
        return {
            "counts": hist.tolist(),
            "bin_edges": bin_edges.tolist(),
            "bin_centers": ((bin_edges[:-1] + bin_edges[1:]) / 2).tolist(),
        }

