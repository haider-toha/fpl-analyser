"""FPL API client with caching."""
import httpx
from typing import Optional
from functools import lru_cache
import asyncio
from datetime import datetime, timedelta

from app.config import get_settings
from app.models.player import Player, PlayerDetail, PlayerHistory, Team, Fixture


class FPLClient:
    """Client for the Fantasy Premier League API."""
    
    POSITION_MAP = {1: "Goalkeeper", 2: "Defender", 3: "Midfielder", 4: "Forward"}
    
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.fpl_api_base_url
        self._cache: dict = {}
        self._cache_ttl = timedelta(minutes=5)
        self._cache_times: dict[str, datetime] = {}
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached data is still valid."""
        if key not in self._cache_times:
            return False
        return datetime.now() - self._cache_times[key] < self._cache_ttl
    
    async def _get(self, endpoint: str, use_cache: bool = True) -> Optional[dict]:
        """Make a GET request to the FPL API."""
        cache_key = endpoint
        
        if use_cache and cache_key in self._cache and self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        url = f"{self.base_url}/{endpoint}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=30.0, follow_redirects=True)
                response.raise_for_status()
                data = response.json()
                
                # Cache the response
                self._cache[cache_key] = data
                self._cache_times[cache_key] = datetime.now()
                
                return data
            except httpx.HTTPError as e:
                print(f"FPL API error: {e}")
                return None
    
    async def get_bootstrap_static(self) -> dict:
        """Get the main bootstrap data (players, teams, events)."""
        return await self._get("bootstrap-static/") or {}
    
    async def get_players(self) -> list[Player]:
        """Get all players with current stats."""
        data = await self.get_bootstrap_static()
        
        if not data:
            return []
        
        elements = data.get("elements", [])
        teams = {t["id"]: t for t in data.get("teams", [])}
        
        players = []
        for el in elements:
            team = teams.get(el["team"], {})
            
            # Calculate expected points (simple model - will be replaced by ML)
            form = float(el.get("form", 0) or 0)
            ppg = float(el.get("points_per_game", 0) or 0)
            expected_pts = (form * 0.6 + ppg * 0.4) if form > 0 else ppg
            
            player = Player(
                id=el["id"],
                name=f"{el['first_name']} {el['second_name']}",
                web_name=el["web_name"],
                team_id=el["team"],
                team_name=team.get("name", ""),
                position=el["element_type"],
                position_name=self.POSITION_MAP.get(el["element_type"], ""),
                price=el["now_cost"] / 10,  # Convert to millions
                total_points=el.get("total_points", 0),
                points_per_game=float(el.get("points_per_game", 0) or 0),
                form=form,
                expected_points=expected_pts,
                goals_scored=el.get("goals_scored", 0),
                assists=el.get("assists", 0),
                clean_sheets=el.get("clean_sheets", 0),
                minutes=el.get("minutes", 0),
                xg=float(el.get("expected_goals", 0) or 0),
                xa=float(el.get("expected_assists", 0) or 0),
                xgi=float(el.get("expected_goal_involvements", 0) or 0),
                selected_by_percent=float(el.get("selected_by_percent", 0) or 0),
                chance_of_playing=el.get("chance_of_playing_next_round"),
                news=el.get("news", "") or "",
                status=el.get("status", "a"),
            )
            players.append(player)
        
        return players
    
    async def get_player_detail(self, player_id: int) -> Optional[PlayerDetail]:
        """Get detailed player data including history."""
        # Get base player data
        players = await self.get_players()
        player = next((p for p in players if p.id == player_id), None)
        
        if not player:
            return None
        
        # Get player history
        history_data = await self._get(f"element-summary/{player_id}/")
        
        if not history_data:
            return PlayerDetail(**player.model_dump())
        
        history = []
        for h in history_data.get("history", []):
            history.append(PlayerHistory(
                gameweek=h["round"],
                points=h["total_points"],
                minutes=h["minutes"],
                goals_scored=h["goals_scored"],
                assists=h["assists"],
                clean_sheets=h["clean_sheets"],
                bonus=h["bonus"],
                bps=h["bps"],
                influence=float(h.get("influence", 0) or 0),
                creativity=float(h.get("creativity", 0) or 0),
                threat=float(h.get("threat", 0) or 0),
                ict_index=float(h.get("ict_index", 0) or 0),
                value=h["value"],
                selected=h["selected"],
                transfers_in=h["transfers_in"],
                transfers_out=h["transfers_out"],
            ))
        
        # Get team data to resolve team names for fixtures
        bootstrap_data = await self.get_bootstrap_static()
        teams_data = bootstrap_data.get("teams", [])
        team_map = {t["id"]: t["short_name"] for t in teams_data}
        
        # Process fixtures to include opponent team name
        raw_fixtures = history_data.get("fixtures", [])
        fixtures = []
        for f in raw_fixtures:
            is_home = f.get("is_home", True)
            # Opponent is the away team if player is home, otherwise home team
            opponent_id = f.get("team_a") if is_home else f.get("team_h")
            opponent_name = team_map.get(opponent_id, "TBD")
            
            fixtures.append({
                "id": f.get("id"),
                "gameweek": f.get("event"),
                "is_home": is_home,
                "difficulty": f.get("difficulty", 3),
                "team_name": opponent_name,
            })
        
        return PlayerDetail(
            **player.model_dump(),
            history=history,
            fixtures=fixtures,
        )
    
    async def get_player_history(self, player_id: int) -> Optional[dict]:
        """Get player's full history."""
        return await self._get(f"element-summary/{player_id}/")
    
    async def get_teams(self) -> list[Team]:
        """Get all Premier League teams."""
        data = await self.get_bootstrap_static()
        
        if not data:
            return []
        
        teams = []
        for t in data.get("teams", []):
            teams.append(Team(
                id=t["id"],
                name=t["name"],
                short_name=t["short_name"],
                strength=t["strength"],
                strength_overall_home=t["strength_overall_home"],
                strength_overall_away=t["strength_overall_away"],
                strength_attack_home=t["strength_attack_home"],
                strength_attack_away=t["strength_attack_away"],
                strength_defence_home=t["strength_defence_home"],
                strength_defence_away=t["strength_defence_away"],
            ))
        
        return teams
    
    async def get_fixtures(self, gameweek: Optional[int] = None) -> list[dict]:
        """Get fixtures, optionally filtered by gameweek."""
        data = await self._get("fixtures/")
        
        if not data:
            return []
        
        if gameweek:
            data = [f for f in data if f.get("event") == gameweek]
        
        return data
    
    async def get_live_gameweek(self, gameweek: int) -> Optional[dict]:
        """Get live gameweek data."""
        return await self._get(f"event/{gameweek}/live/", use_cache=False)
    
    async def get_league(self, league_id: int) -> Optional[dict]:
        """Get mini-league data."""
        return await self._get(f"leagues-classic/{league_id}/standings/")
    
    async def get_league_standings(self, league_id: int, page: int = 1, page_size: int = 50) -> Optional[dict]:
        """Get paginated league standings."""
        return await self._get(f"leagues-classic/{league_id}/standings/?page_new_entries=1&page_standings={page}")
    
    async def get_league_history(self, league_id: int) -> Optional[dict]:
        """Get league history over gameweeks."""
        # This requires fetching multiple pages of data
        standings = await self.get_league_standings(league_id)
        if not standings:
            return None
        
        # For now, return basic standings - full history would require more API calls
        return standings
    
    async def get_manager(self, manager_id: int) -> Optional[dict]:
        """Get manager details."""
        return await self._get(f"entry/{manager_id}/")
    
    async def get_manager_squad(self, manager_id: int) -> Optional[dict]:
        """Get manager's current squad."""
        # Get current event
        bootstrap = await self.get_bootstrap_static()
        current_event = next((e for e in bootstrap.get("events", []) if e.get("is_current")), None)
        
        if not current_event:
            return None
        
        return await self._get(f"entry/{manager_id}/event/{current_event['id']}/picks/")
    
    async def get_manager_picks(self, manager_id: int, gameweek: int) -> Optional[dict]:
        """Get manager's picks for a specific gameweek."""
        return await self._get(f"entry/{manager_id}/event/{gameweek}/picks/")
    
    async def get_manager_history(self, manager_id: int) -> Optional[dict]:
        """Get manager's season history."""
        return await self._get(f"entry/{manager_id}/history/")

