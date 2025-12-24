"""ILP-based squad optimizer using PuLP."""
from pulp import LpMaximize, LpProblem, LpVariable, lpSum, LpStatus
from typing import Optional
from app.models.player import Player


class SquadOptimizer:
    """Integer Linear Programming optimizer for FPL squad selection."""
    
    # FPL constraints
    SQUAD_SIZE = 15
    STARTING_XI = 11
    MAX_PER_TEAM = 3
    DEFAULT_BUDGET = 100.0  # £100m
    
    # Position constraints for starting XI
    MIN_POSITIONS = {1: 1, 2: 3, 3: 2, 4: 1}  # GK, DEF, MID, FWD
    MAX_POSITIONS = {1: 1, 2: 5, 3: 5, 4: 3}
    
    # Squad composition
    SQUAD_POSITIONS = {1: 2, 2: 5, 3: 5, 4: 3}  # Must have exactly this many
    
    def optimize_squad(
        self,
        players: list[Player],
        budget: float = DEFAULT_BUDGET,
        existing_players: list[Player] = None,
        excluded_players: set[int] = None,
        required_players: set[int] = None,
        formation: Optional[str] = None,
        differential_mode: bool = False,
        max_ownership: Optional[float] = None,
    ) -> Optional[dict]:
        """
        Optimize squad selection using ILP.
        
        Args:
            players: List of all available players
            budget: Total budget in millions
            existing_players: Players already in squad (for transfers)
            excluded_players: Player IDs to exclude
            required_players: Player IDs that must be included
            formation: Preferred formation (e.g., "3-4-3")
            differential_mode: Prefer low-ownership players
            max_ownership: Maximum ownership % for differential mode
        
        Returns:
            Optimized squad with starting XI and bench
        """
        existing_players = existing_players or []
        excluded_players = excluded_players or set()
        required_players = required_players or set()
        
        # Filter out excluded players
        available_players = [p for p in players if p.id not in excluded_players]
        
        # Apply ownership filter for differential mode
        if differential_mode and max_ownership:
            available_players = [
                p for p in available_players 
                if p.selected_by_percent <= max_ownership or p.id in required_players
            ]
        
        # Create problem
        prob = LpProblem("FPL_Squad_Optimization", LpMaximize)
        
        # Decision variables
        # x[i] = 1 if player i is in squad
        x = {p.id: LpVariable(f"squad_{p.id}", cat="Binary") for p in available_players}
        
        # y[i] = 1 if player i is in starting XI
        y = {p.id: LpVariable(f"start_{p.id}", cat="Binary") for p in available_players}
        
        # c[i] = 1 if player i is captain
        c = {p.id: LpVariable(f"captain_{p.id}", cat="Binary") for p in available_players}
        
        # Create player lookup
        player_dict = {p.id: p for p in available_players}
        
        # Objective: Maximize expected points
        # Captain gets double points
        prob += lpSum([
            player_dict[pid].expected_points * y[pid] + 
            player_dict[pid].expected_points * c[pid]  # Extra points for captain
            for pid in x.keys()
        ])
        
        # Constraint: Budget
        prob += lpSum([player_dict[pid].price * x[pid] for pid in x.keys()]) <= budget
        
        # Constraint: Squad size = 15
        prob += lpSum([x[pid] for pid in x.keys()]) == self.SQUAD_SIZE
        
        # Constraint: Starting XI = 11
        prob += lpSum([y[pid] for pid in y.keys()]) == self.STARTING_XI
        
        # Constraint: Can only start if in squad
        for pid in x.keys():
            prob += y[pid] <= x[pid]
        
        # Constraint: Can only captain if starting
        for pid in x.keys():
            prob += c[pid] <= y[pid]
        
        # Constraint: Exactly one captain
        prob += lpSum([c[pid] for pid in c.keys()]) == 1
        
        # Constraint: Max 3 players per team
        teams = set(p.team_id for p in available_players)
        for team_id in teams:
            team_players = [p.id for p in available_players if p.team_id == team_id]
            prob += lpSum([x[pid] for pid in team_players]) <= self.MAX_PER_TEAM
        
        # Constraint: Position requirements for squad
        for position, count in self.SQUAD_POSITIONS.items():
            pos_players = [p.id for p in available_players if p.position == position]
            prob += lpSum([x[pid] for pid in pos_players]) == count
        
        # Constraint: Position requirements for starting XI
        for position, min_count in self.MIN_POSITIONS.items():
            pos_players = [p.id for p in available_players if p.position == position]
            prob += lpSum([y[pid] for pid in pos_players]) >= min_count
        
        for position, max_count in self.MAX_POSITIONS.items():
            pos_players = [p.id for p in available_players if p.position == position]
            prob += lpSum([y[pid] for pid in pos_players]) <= max_count
        
        # Constraint: Required players
        for pid in required_players:
            if pid in x:
                prob += x[pid] == 1
        
        # Parse formation if provided
        if formation:
            parts = formation.split("-")
            if len(parts) == 3:
                try:
                    defs, mids, fwds = int(parts[0]), int(parts[1]), int(parts[2])
                    
                    def_players = [p.id for p in available_players if p.position == 2]
                    mid_players = [p.id for p in available_players if p.position == 3]
                    fwd_players = [p.id for p in available_players if p.position == 4]
                    
                    prob += lpSum([y[pid] for pid in def_players]) == defs
                    prob += lpSum([y[pid] for pid in mid_players]) == mids
                    prob += lpSum([y[pid] for pid in fwd_players]) == fwds
                except ValueError:
                    pass  # Invalid formation, ignore
        
        # Solve
        prob.solve()
        
        if LpStatus[prob.status] != "Optimal":
            return None
        
        # Extract solution
        squad = []
        starting_xi = []
        captain_id = None
        
        for pid in x.keys():
            if x[pid].value() == 1:
                player = player_dict[pid]
                squad.append(player)
                
                if y[pid].value() == 1:
                    starting_xi.append(player)
                
                if c[pid].value() == 1:
                    captain_id = pid
        
        # Sort by position then expected points
        squad.sort(key=lambda p: (p.position, -p.expected_points))
        starting_xi.sort(key=lambda p: (p.position, -p.expected_points))
        
        bench = [p for p in squad if p not in starting_xi]
        
        # Calculate totals
        total_cost = sum(p.price for p in squad)
        total_expected = sum(p.expected_points for p in starting_xi)
        if captain_id:
            captain = player_dict[captain_id]
            total_expected += captain.expected_points  # Double captain points
        
        return {
            "squad": [p.model_dump() for p in squad],
            "starting_xi": [p.model_dump() for p in starting_xi],
            "bench": [p.model_dump() for p in bench],
            "captain_id": captain_id,
            "vice_captain_id": starting_xi[1].id if len(starting_xi) > 1 else None,
            "total_cost": round(total_cost, 1),
            "budget_remaining": round(budget - total_cost, 1),
            "expected_points": round(total_expected, 1),
            "formation": self._get_formation(starting_xi),
        }
    
    def optimize_transfers(
        self,
        players: list[Player],
        current_squad: list[Player],
        free_transfers: int = 1,
        budget_remaining: float = 0.0,
        wildcard: bool = False,
        horizon: int = 5,
    ) -> dict:
        """Optimize transfers for an existing squad."""
        current_ids = set(p.id for p in current_squad)
        current_cost = sum(p.price for p in current_squad)
        budget = current_cost + budget_remaining
        
        if wildcard:
            # With wildcard, optimize from scratch
            result = self.optimize_squad(players, budget)
            if result:
                result["transfers_out"] = [p.model_dump() for p in current_squad if p.id not in set(r["id"] for r in result["squad"])]
                result["transfers_in"] = [p for p in result["squad"] if p["id"] not in current_ids]
                result["hit"] = 0
            return result
        
        # Without wildcard, try 1-transfer optimization, then 2, etc.
        best_result = None
        best_gain = 0
        
        for num_transfers in range(1, min(free_transfers + 3, 5)):  # Try up to 4 transfers
            hit = max(0, (num_transfers - free_transfers) * 4)
            
            # Try all combinations (simplified - full ILP would be better for 3+ transfers)
            result = self._optimize_n_transfers(
                players, current_squad, num_transfers, budget
            )
            
            if result:
                gain = result["expected_gain"] - hit
                if gain > best_gain:
                    best_gain = gain
                    best_result = result
                    best_result["hit"] = hit
        
        return best_result or {"transfers_in": [], "transfers_out": [], "hit": 0, "expected_gain": 0}
    
    def _optimize_n_transfers(
        self,
        players: list[Player],
        current_squad: list[Player],
        n: int,
        budget: float,
    ) -> Optional[dict]:
        """Optimize n transfers."""
        # This is a simplified version - considers each position independently
        current_ids = set(p.id for p in current_squad)
        player_dict = {p.id: p for p in players}
        
        transfers_out = []
        transfers_in = []
        expected_gain = 0
        
        # Find worst performers in current squad
        sorted_current = sorted(current_squad, key=lambda p: p.expected_points)
        
        for i in range(min(n, len(sorted_current))):
            player_out = sorted_current[i]
            
            # Find best replacement at same position within budget
            available_budget = budget - sum(p.price for p in current_squad) + player_out.price
            
            candidates = [
                p for p in players
                if p.position == player_out.position
                and p.id not in current_ids
                and p.price <= available_budget
                and p.team_id not in [q.team_id for q in current_squad if q.id != player_out.id for _ in range(2)]  # Simplified team check
            ]
            
            if candidates:
                best_candidate = max(candidates, key=lambda p: p.expected_points)
                
                if best_candidate.expected_points > player_out.expected_points:
                    transfers_out.append(player_out)
                    transfers_in.append(best_candidate)
                    expected_gain += best_candidate.expected_points - player_out.expected_points
                    current_ids.remove(player_out.id)
                    current_ids.add(best_candidate.id)
        
        if not transfers_in:
            return None
        
        return {
            "transfers_out": [p.model_dump() for p in transfers_out],
            "transfers_in": [p.model_dump() for p in transfers_in],
            "expected_gain": round(expected_gain, 1),
        }
    
    def select_captain(self, squad: list[Player], gameweek: Optional[int] = None) -> dict:
        """Select optimal captain and vice-captain."""
        # Sort by expected points
        sorted_squad = sorted(squad, key=lambda p: p.expected_points, reverse=True)
        
        captain = sorted_squad[0] if sorted_squad else None
        vice_captain = sorted_squad[1] if len(sorted_squad) > 1 else None
        
        return {
            "captain": captain.model_dump() if captain else None,
            "vice_captain": vice_captain.model_dump() if vice_captain else None,
            "captain_expected_points": captain.expected_points * 2 if captain else 0,
        }
    
    def select_starting_xi(self, squad: list[Player]) -> dict:
        """Select optimal starting XI from 15-man squad."""
        # Group by position
        by_position = {1: [], 2: [], 3: [], 4: []}
        for p in squad:
            by_position[p.position].append(p)
        
        # Sort each position by expected points
        for pos in by_position:
            by_position[pos].sort(key=lambda p: p.expected_points, reverse=True)
        
        # Start with minimum requirements
        starting_xi = []
        starting_xi.extend(by_position[1][:1])  # 1 GK
        starting_xi.extend(by_position[2][:3])  # 3 DEF
        starting_xi.extend(by_position[3][:2])  # 2 MID
        starting_xi.extend(by_position[4][:1])  # 1 FWD
        
        # Add 4 more outfield players (best available)
        remaining = []
        remaining.extend(by_position[2][3:])
        remaining.extend(by_position[3][2:])
        remaining.extend(by_position[4][1:])
        
        remaining.sort(key=lambda p: p.expected_points, reverse=True)
        
        # Add best 4 while respecting max constraints
        for p in remaining:
            pos_count = sum(1 for s in starting_xi if s.position == p.position)
            if pos_count < self.MAX_POSITIONS[p.position]:
                starting_xi.append(p)
                if len(starting_xi) == 11:
                    break
        
        bench = [p for p in squad if p not in starting_xi]
        
        return {
            "starting_xi": [p.model_dump() for p in starting_xi],
            "bench": [p.model_dump() for p in bench],
            "formation": self._get_formation(starting_xi),
            "expected_points": sum(p.expected_points for p in starting_xi),
        }
    
    def _get_formation(self, starting_xi: list[Player]) -> str:
        """Get formation string from starting XI."""
        defs = sum(1 for p in starting_xi if p.position == 2)
        mids = sum(1 for p in starting_xi if p.position == 3)
        fwds = sum(1 for p in starting_xi if p.position == 4)
        return f"{defs}-{mids}-{fwds}"

