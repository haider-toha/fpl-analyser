"""Mini-league analytics API endpoints."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from app.data.fpl_client import FPLClient
from app.simulation.monte_carlo import MonteCarloSimulator

router = APIRouter()


class LeagueProjectionRequest(BaseModel):
    """Request for league projection."""
    league_id: int
    num_simulations: int = Field(default=5000, ge=100, le=50000)
    remaining_gameweeks: int = Field(default=10, ge=1, le=38)


@router.get("/{league_id}")
async def get_league(league_id: int):
    """Get mini-league standings and details."""
    fpl_client = FPLClient()
    
    league = await fpl_client.get_league(league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    return league


@router.get("/{league_id}/standings")
async def get_league_standings(
    league_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """Get paginated league standings."""
    fpl_client = FPLClient()
    
    standings = await fpl_client.get_league_standings(league_id, page, page_size)
    if not standings:
        raise HTTPException(status_code=404, detail="League not found")
    
    return standings


@router.get("/{league_id}/history")
async def get_league_history(league_id: int):
    """Get historical standings for the league over gameweeks."""
    fpl_client = FPLClient()
    
    history = await fpl_client.get_league_history(league_id)
    if not history:
        raise HTTPException(status_code=404, detail="League not found")
    
    return history


@router.post("/project")
async def project_league_standings(request: LeagueProjectionRequest):
    """Project final league standings using Monte Carlo simulation."""
    fpl_client = FPLClient()
    simulator = MonteCarloSimulator()
    
    league = await fpl_client.get_league(request.league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    # Get current standings
    standings = await fpl_client.get_league_standings(request.league_id, 1, 50)
    
    # Get squad data for top managers
    manager_squads = []
    for entry in standings.get("standings", {}).get("results", [])[:20]:
        squad = await fpl_client.get_manager_squad(entry["entry"])
        manager_squads.append({
            "entry": entry["entry"],
            "name": entry["entry_name"],
            "current_points": entry["total"],
            "squad": squad,
        })
    
    # Run projection
    projection = simulator.project_league(
        manager_squads=manager_squads,
        remaining_gameweeks=request.remaining_gameweeks,
        num_simulations=request.num_simulations,
    )
    
    return projection


@router.get("/{league_id}/head-to-head/{manager1_id}/{manager2_id}")
async def head_to_head_comparison(
    league_id: int,
    manager1_id: int,
    manager2_id: int,
):
    """Compare two managers head-to-head."""
    fpl_client = FPLClient()
    
    # Get both managers' data
    manager1 = await fpl_client.get_manager(manager1_id)
    manager2 = await fpl_client.get_manager(manager2_id)
    
    if not manager1 or not manager2:
        raise HTTPException(status_code=404, detail="Manager not found")
    
    squad1 = await fpl_client.get_manager_squad(manager1_id)
    squad2 = await fpl_client.get_manager_squad(manager2_id)
    
    # Find differentials
    squad1_ids = set(p["element"] for p in squad1.get("picks", []))
    squad2_ids = set(p["element"] for p in squad2.get("picks", []))
    
    differentials1 = squad1_ids - squad2_ids
    differentials2 = squad2_ids - squad1_ids
    common = squad1_ids & squad2_ids
    
    return {
        "manager1": {
            "id": manager1_id,
            "name": manager1.get("name"),
            "team_name": manager1.get("entry", {}).get("name"),
            "total_points": manager1.get("entry", {}).get("summary_overall_points"),
            "differentials": list(differentials1),
        },
        "manager2": {
            "id": manager2_id,
            "name": manager2.get("name"),
            "team_name": manager2.get("entry", {}).get("name"),
            "total_points": manager2.get("entry", {}).get("summary_overall_points"),
            "differentials": list(differentials2),
        },
        "common_players": list(common),
    }

