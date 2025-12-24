"""Monte Carlo simulation API endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.simulation.monte_carlo import MonteCarloSimulator
from app.data.fpl_client import FPLClient

router = APIRouter()


class SimulationRequest(BaseModel):
    """Request model for Monte Carlo simulation."""
    squad: list[int] = Field(..., description="Squad player IDs")
    starting_xi: list[int] = Field(..., description="Starting 11 player IDs")
    captain_id: int = Field(..., description="Captain player ID")
    vice_captain_id: int = Field(..., description="Vice-captain player ID")
    num_simulations: int = Field(default=10000, ge=100, le=100000)
    gameweeks: int = Field(default=1, ge=1, le=38, description="Number of gameweeks to simulate")


class WhatIfRequest(BaseModel):
    """Request model for what-if scenario analysis."""
    squad: list[int] = Field(..., description="Squad player IDs")
    actual_captain_id: int
    alternative_captain_id: int
    gameweek: int = Field(..., ge=1, le=38)


class SeasonProjectionRequest(BaseModel):
    """Request for full season projection."""
    squad: list[int] = Field(..., description="Current squad player IDs")
    current_points: int = Field(default=0)
    current_gameweek: int = Field(default=1, ge=1, le=38)
    num_simulations: int = Field(default=5000, ge=100, le=50000)


@router.post("/gameweek")
async def simulate_gameweek(request: SimulationRequest):
    """Run Monte Carlo simulation for gameweek points."""
    fpl_client = FPLClient()
    simulator = MonteCarloSimulator()
    
    players = await fpl_client.get_players()
    player_dict = {p.id: p for p in players}
    
    # Validate all players exist
    for pid in request.squad:
        if pid not in player_dict:
            raise HTTPException(status_code=400, detail=f"Player {pid} not found")
    
    squad = [player_dict[pid] for pid in request.squad]
    starting_xi = [player_dict[pid] for pid in request.starting_xi]
    captain = player_dict.get(request.captain_id)
    vice_captain = player_dict.get(request.vice_captain_id)
    
    if not captain:
        raise HTTPException(status_code=400, detail="Captain not found")
    if not vice_captain:
        raise HTTPException(status_code=400, detail="Vice-captain not found")
    
    result = simulator.simulate_gameweek(
        squad=squad,
        starting_xi=starting_xi,
        captain=captain,
        vice_captain=vice_captain,
        num_simulations=request.num_simulations,
        gameweeks=request.gameweeks,
    )
    
    return result


@router.post("/what-if")
async def what_if_analysis(request: WhatIfRequest):
    """Analyze what-if scenarios (e.g., different captain choice)."""
    fpl_client = FPLClient()
    simulator = MonteCarloSimulator()
    
    # Get historical data for the gameweek
    players = await fpl_client.get_players()
    player_dict = {p.id: p for p in players}
    
    actual_captain = player_dict.get(request.actual_captain_id)
    alt_captain = player_dict.get(request.alternative_captain_id)
    
    if not actual_captain or not alt_captain:
        raise HTTPException(status_code=400, detail="Captain(s) not found")
    
    result = await simulator.analyze_what_if(
        squad_ids=request.squad,
        actual_captain=actual_captain,
        alternative_captain=alt_captain,
        gameweek=request.gameweek,
        fpl_client=fpl_client,
    )
    
    return result


@router.post("/season-projection")
async def project_season(request: SeasonProjectionRequest):
    """Project final season standings using Monte Carlo."""
    fpl_client = FPLClient()
    simulator = MonteCarloSimulator()
    
    players = await fpl_client.get_players()
    player_dict = {p.id: p for p in players}
    
    squad = [player_dict[pid] for pid in request.squad if pid in player_dict]
    
    result = simulator.project_season(
        squad=squad,
        current_points=request.current_points,
        current_gameweek=request.current_gameweek,
        num_simulations=request.num_simulations,
    )
    
    return result


@router.get("/distributions/{player_id}")
async def get_player_distribution(
    player_id: int,
    num_simulations: int = 10000,
):
    """Get probability distribution for a player's expected points."""
    fpl_client = FPLClient()
    simulator = MonteCarloSimulator()
    
    players = await fpl_client.get_players()
    player_dict = {p.id: p for p in players}
    
    player = player_dict.get(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    distribution = simulator.get_player_distribution(player, num_simulations)
    return distribution

