"""Squad optimization API endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.optimizer.squad_optimizer import SquadOptimizer
from app.data.fpl_client import FPLClient
from app.models.player import Player

router = APIRouter()


class OptimizationRequest(BaseModel):
    """Request model for squad optimization."""
    budget: float = Field(default=100.0, description="Total budget in millions")
    existing_players: list[int] = Field(default=[], description="Player IDs already in squad")
    excluded_players: list[int] = Field(default=[], description="Player IDs to exclude")
    required_players: list[int] = Field(default=[], description="Player IDs that must be included")
    formation: Optional[str] = Field(default=None, description="Preferred formation (e.g., '3-4-3')")
    gameweek_horizon: int = Field(default=1, ge=1, le=10, description="Gameweeks to optimize for")
    differential_mode: bool = Field(default=False, description="Prefer low-ownership players")
    max_ownership: Optional[float] = Field(default=None, description="Max ownership % for differentials")


class TransferRequest(BaseModel):
    """Request model for transfer optimization."""
    current_squad: list[int] = Field(..., description="Current squad player IDs")
    free_transfers: int = Field(default=1, ge=0, le=2)
    budget_remaining: float = Field(default=0.0, description="Bank balance in millions")
    wildcard_active: bool = Field(default=False)
    gameweek_horizon: int = Field(default=5, ge=1, le=10)


class CaptainRequest(BaseModel):
    """Request model for captain selection."""
    squad: list[int] = Field(..., description="Squad player IDs")
    gameweek: Optional[int] = Field(default=None, description="Target gameweek")


@router.post("/squad")
async def optimize_squad(request: OptimizationRequest):
    """Optimize a new squad from scratch."""
    fpl_client = FPLClient()
    optimizer = SquadOptimizer()
    
    # Get all players and their expected points
    players = await fpl_client.get_players()
    
    # Build player lookup
    player_dict = {p.id: p for p in players}
    
    # Validate required/excluded players
    for pid in request.required_players:
        if pid not in player_dict:
            raise HTTPException(status_code=400, detail=f"Required player {pid} not found")
    
    # Run optimization
    result = optimizer.optimize_squad(
        players=players,
        budget=request.budget,
        existing_players=[player_dict[pid] for pid in request.existing_players if pid in player_dict],
        excluded_players=set(request.excluded_players),
        required_players=set(request.required_players),
        formation=request.formation,
        differential_mode=request.differential_mode,
        max_ownership=request.max_ownership,
    )
    
    if not result:
        raise HTTPException(status_code=400, detail="No valid squad found")
    
    return result


@router.post("/transfers")
async def optimize_transfers(request: TransferRequest):
    """Optimize transfers for existing squad."""
    fpl_client = FPLClient()
    optimizer = SquadOptimizer()
    
    players = await fpl_client.get_players()
    player_dict = {p.id: p for p in players}
    
    # Validate current squad
    current_squad = []
    for pid in request.current_squad:
        if pid not in player_dict:
            raise HTTPException(status_code=400, detail=f"Player {pid} not found")
        current_squad.append(player_dict[pid])
    
    if len(current_squad) != 15:
        raise HTTPException(status_code=400, detail="Squad must have exactly 15 players")
    
    result = optimizer.optimize_transfers(
        players=players,
        current_squad=current_squad,
        free_transfers=request.free_transfers,
        budget_remaining=request.budget_remaining,
        wildcard=request.wildcard_active,
        horizon=request.gameweek_horizon,
    )
    
    return result


@router.post("/captain")
async def optimize_captain(request: CaptainRequest):
    """Select optimal captain and vice-captain."""
    fpl_client = FPLClient()
    optimizer = SquadOptimizer()
    
    players = await fpl_client.get_players()
    player_dict = {p.id: p for p in players}
    
    squad = []
    for pid in request.squad:
        if pid not in player_dict:
            raise HTTPException(status_code=400, detail=f"Player {pid} not found")
        squad.append(player_dict[pid])
    
    result = optimizer.select_captain(squad, request.gameweek)
    return result


@router.post("/starting-xi")
async def optimize_starting_xi(squad: list[int]):
    """Select optimal starting 11 from 15-man squad."""
    fpl_client = FPLClient()
    optimizer = SquadOptimizer()
    
    players = await fpl_client.get_players()
    player_dict = {p.id: p for p in players}
    
    squad_players = []
    for pid in squad:
        if pid not in player_dict:
            raise HTTPException(status_code=400, detail=f"Player {pid} not found")
        squad_players.append(player_dict[pid])
    
    if len(squad_players) != 15:
        raise HTTPException(status_code=400, detail="Squad must have exactly 15 players")
    
    result = optimizer.select_starting_xi(squad_players)
    return result

