"""Player data API endpoints."""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.data.fpl_client import FPLClient
from app.models.player import Player, PlayerList, PlayerDetail

router = APIRouter()
fpl_client = FPLClient()


@router.get("/", response_model=PlayerList)
async def get_players(
    position: Optional[int] = Query(None, description="Filter by position (1=GK, 2=DEF, 3=MID, 4=FWD)"),
    team: Optional[int] = Query(None, description="Filter by team ID"),
    min_price: Optional[float] = Query(None, description="Minimum price in millions"),
    max_price: Optional[float] = Query(None, description="Maximum price in millions"),
    sort_by: str = Query("expected_points", description="Sort field"),
    limit: int = Query(100, le=500, description="Number of results"),
):
    """Get all players with optional filters."""
    players = await fpl_client.get_players()
    
    # Apply filters
    if position:
        players = [p for p in players if p.position == position]
    if team:
        players = [p for p in players if p.team_id == team]
    if min_price:
        players = [p for p in players if p.price >= min_price]
    if max_price:
        players = [p for p in players if p.price <= max_price]
    
    # Sort
    sort_fields = {
        "expected_points": lambda p: p.expected_points,
        "price": lambda p: p.price,
        "form": lambda p: p.form,
        "total_points": lambda p: p.total_points,
        "selected_by": lambda p: p.selected_by_percent,
    }
    if sort_by in sort_fields:
        players.sort(key=sort_fields[sort_by], reverse=True)
    
    return PlayerList(players=players[:limit], total=len(players))


@router.get("/{player_id}", response_model=PlayerDetail)
async def get_player(player_id: int):
    """Get detailed player information."""
    player = await fpl_client.get_player_detail(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.get("/{player_id}/history")
async def get_player_history(player_id: int):
    """Get player's historical gameweek data."""
    history = await fpl_client.get_player_history(player_id)
    if not history:
        raise HTTPException(status_code=404, detail="Player not found")
    return history


@router.get("/search/{query}")
async def search_players(query: str, limit: int = Query(10, le=50)):
    """Search players by name."""
    players = await fpl_client.get_players()
    query_lower = query.lower()
    matches = [
        p for p in players 
        if query_lower in p.name.lower() or query_lower in p.web_name.lower()
    ]
    return {"results": matches[:limit]}

