"""Player data models."""
from pydantic import BaseModel, Field
from typing import Optional


class Player(BaseModel):
    """Core player model."""
    id: int
    name: str
    web_name: str
    team_id: int
    team_name: str = ""
    position: int  # 1=GK, 2=DEF, 3=MID, 4=FWD
    position_name: str = ""
    price: float  # In millions (e.g., 12.5)
    
    # Performance metrics
    total_points: int = 0
    points_per_game: float = 0.0
    form: float = 0.0
    expected_points: float = 0.0
    
    # Stats
    goals_scored: int = 0
    assists: int = 0
    clean_sheets: int = 0
    minutes: int = 0
    
    # Advanced stats
    xg: float = 0.0  # Expected goals
    xa: float = 0.0  # Expected assists
    xgi: float = 0.0  # Expected goal involvement
    
    # Ownership and availability
    selected_by_percent: float = 0.0
    chance_of_playing: Optional[int] = 100
    news: str = ""
    status: str = "a"  # a=available, i=injured, etc.
    
    # Fixture difficulty
    next_fixture_difficulty: int = 3
    
    @property
    def price_formatted(self) -> str:
        """Format price as £X.Xm."""
        return f"£{self.price:.1f}m"
    
    @property
    def position_short(self) -> str:
        """Get short position name."""
        return {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}.get(self.position, "?")
    
    class Config:
        frozen = False


class PlayerList(BaseModel):
    """List of players with pagination info."""
    players: list[Player]
    total: int


class PlayerHistory(BaseModel):
    """Player's gameweek history entry."""
    gameweek: int
    points: int
    minutes: int
    goals_scored: int
    assists: int
    clean_sheets: int
    bonus: int
    bps: int
    influence: float
    creativity: float
    threat: float
    ict_index: float
    value: int  # Price in 0.1m units
    selected: int
    transfers_in: int
    transfers_out: int


class PlayerDetail(Player):
    """Extended player details including history."""
    history: list[PlayerHistory] = []
    fixtures: list[dict] = []
    
    # Predicted points breakdown
    predicted_minutes: float = 0.0
    predicted_goals: float = 0.0
    predicted_assists: float = 0.0
    predicted_clean_sheet_prob: float = 0.0
    predicted_bonus: float = 0.0


class Team(BaseModel):
    """Premier League team."""
    id: int
    name: str
    short_name: str
    strength: int
    strength_overall_home: int
    strength_overall_away: int
    strength_attack_home: int
    strength_attack_away: int
    strength_defence_home: int
    strength_defence_away: int


class Fixture(BaseModel):
    """Match fixture."""
    id: int
    gameweek: int
    home_team: int
    away_team: int
    home_team_difficulty: int
    away_team_difficulty: int
    kickoff_time: Optional[str] = None
    finished: bool = False
    home_score: Optional[int] = None
    away_score: Optional[int] = None

