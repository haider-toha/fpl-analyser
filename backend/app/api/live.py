"""Live gameweek tracking API endpoints."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from app.data.fpl_client import FPLClient

router = APIRouter()


class LiveSquadRequest(BaseModel):
    """Request for live squad tracking."""
    squad: list[int] = Field(..., description="Squad player IDs")
    starting_xi: list[int] = Field(..., description="Starting 11 player IDs")
    captain_id: int
    vice_captain_id: int


@router.get("/gameweek")
async def get_current_gameweek():
    """Get current gameweek information."""
    fpl_client = FPLClient()
    
    bootstrap = await fpl_client.get_bootstrap_static()
    
    events = bootstrap.get("events", [])
    current_gw = next((e for e in events if e.get("is_current")), None)
    next_gw = next((e for e in events if e.get("is_next")), None)
    
    return {
        "current": current_gw,
        "next": next_gw,
        "deadline": next_gw.get("deadline_time") if next_gw else None,
    }


@router.get("/gameweek/{gameweek}/scores")
async def get_live_scores(gameweek: int):
    """Get live scores for a gameweek with player names."""
    fpl_client = FPLClient()
    
    live_data = await fpl_client.get_live_gameweek(gameweek)
    if not live_data:
        raise HTTPException(status_code=404, detail="Gameweek data not found")
    
    # Get player data to add names
    all_players = await fpl_client.get_players()
    player_map = {p.id: p for p in all_players}
    
    # Enrich elements with player info
    enriched_elements = []
    for element in live_data.get("elements", []):
        player_id = element.get("id")
        player = player_map.get(player_id)
        enriched = dict(element)
        if player:
            enriched["web_name"] = player.web_name
            enriched["name"] = player.name
            enriched["team_name"] = player.team_name
            enriched["team_id"] = player.team_id
            enriched["position"] = player.position
            enriched["position_name"] = player.position_name
        else:
            enriched["web_name"] = f"Player {player_id}"
            enriched["name"] = f"Unknown Player {player_id}"
            enriched["team_name"] = ""
            enriched["team_id"] = 0
            enriched["position"] = 0
            enriched["position_name"] = ""
        enriched_elements.append(enriched)
    
    return {"elements": enriched_elements}


@router.get("/gameweek/{gameweek}/fixtures")
async def get_gameweek_fixtures(gameweek: int):
    """Get fixtures for a gameweek with live scores and team names."""
    fpl_client = FPLClient()
    
    fixtures = await fpl_client.get_fixtures(gameweek)
    if not fixtures:
        raise HTTPException(status_code=404, detail="No fixtures found")
    
    # Get team data to resolve team names
    bootstrap = await fpl_client.get_bootstrap_static()
    teams_data = bootstrap.get("teams", [])
    team_map = {t["id"]: t["short_name"] for t in teams_data}
    
    # Add team names to fixtures
    enriched_fixtures = []
    for f in fixtures:
        fixture = dict(f)
        fixture["team_h_name"] = team_map.get(f.get("team_h"), f"Team {f.get('team_h')}")
        fixture["team_a_name"] = team_map.get(f.get("team_a"), f"Team {f.get('team_a')}")
        enriched_fixtures.append(fixture)
    
    return {"fixtures": enriched_fixtures}


@router.post("/gameweek/{gameweek}/squad-score")
async def calculate_live_squad_score(gameweek: int, request: LiveSquadRequest):
    """Calculate live score for a squad in the current gameweek."""
    fpl_client = FPLClient()
    
    # Get live data
    live_data = await fpl_client.get_live_gameweek(gameweek)
    if not live_data:
        raise HTTPException(status_code=404, detail="Live data not found")
    
    elements = live_data.get("elements", [])
    live_points = {e["id"]: e["stats"] for e in elements}
    
    # Calculate squad score
    total_points = 0
    player_scores = []
    
    for player_id in request.starting_xi:
        stats = live_points.get(player_id, {})
        points = stats.get("total_points", 0)
        
        # Captain gets double
        if player_id == request.captain_id:
            points *= 2
        
        player_scores.append({
            "id": player_id,
            "points": points,
            "is_captain": player_id == request.captain_id,
            "is_vice_captain": player_id == request.vice_captain_id,
            "stats": stats,
        })
        total_points += points
    
    # Add bench (for display, not counted)
    bench_ids = [pid for pid in request.squad if pid not in request.starting_xi]
    bench_scores = []
    for player_id in bench_ids:
        stats = live_points.get(player_id, {})
        bench_scores.append({
            "id": player_id,
            "points": stats.get("total_points", 0),
            "stats": stats,
        })
    
    return {
        "total_points": total_points,
        "starting_xi": player_scores,
        "bench": bench_scores,
        "gameweek": gameweek,
    }


@router.get("/bonus-predictions/{gameweek}")
async def get_bonus_predictions(gameweek: int):
    """Get live bonus point predictions."""
    fpl_client = FPLClient()
    
    live_data = await fpl_client.get_live_gameweek(gameweek)
    fixtures = await fpl_client.get_fixtures(gameweek)
    
    if not live_data or not fixtures:
        raise HTTPException(status_code=404, detail="Data not found")
    
    elements = {e["id"]: e for e in live_data.get("elements", [])}
    
    bonus_predictions = []
    for fixture in fixtures:
        if fixture.get("started") and not fixture.get("finished_provisional"):
            # Get players from this fixture with BPS
            fixture_players = []
            for element_id, data in elements.items():
                if data["stats"].get("bps", 0) > 0:
                    # Check if player is in this fixture
                    fixture_players.append({
                        "id": element_id,
                        "bps": data["stats"]["bps"],
                    })
            
            # Sort by BPS and predict bonus
            fixture_players.sort(key=lambda x: x["bps"], reverse=True)
            
            bonus_predictions.append({
                "fixture_id": fixture["id"],
                "home_team": fixture["team_h"],
                "away_team": fixture["team_a"],
                "finished": fixture.get("finished_provisional", False),
                "top_bps": fixture_players[:5],
            })
    
    return {"predictions": bonus_predictions}


@router.get("/manager/{manager_id}")
async def get_manager_info(manager_id: int):
    """Get manager details and current squad."""
    fpl_client = FPLClient()
    
    # Get manager info
    manager = await fpl_client.get_manager(manager_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
    
    # Get manager's current squad
    squad = await fpl_client.get_manager_squad(manager_id)
    
    # Get player data to enrich squad info
    all_players = await fpl_client.get_players()
    player_dict = {p.id: p for p in all_players}
    
    picks = []
    if squad:
        for pick in squad.get("picks", []):
            player_id = pick["element"]
            player = player_dict.get(player_id)
            if player:
                picks.append({
                    "id": player_id,
                    "web_name": player.web_name,
                    "team_name": player.team_name,
                    "position": player.position,
                    "position_name": player.position_name,
                    "price": player.price,
                    "total_points": player.total_points,
                    "form": player.form,
                    "is_captain": pick.get("is_captain", False),
                    "is_vice_captain": pick.get("is_vice_captain", False),
                    "multiplier": pick.get("multiplier", 1),
                    "squad_position": pick.get("position", 0),
                })
    
    return {
        "id": manager_id,
        "name": manager.get("player_first_name", "") + " " + manager.get("player_last_name", ""),
        "team_name": manager.get("name", ""),
        "overall_points": manager.get("summary_overall_points", 0),
        "overall_rank": manager.get("summary_overall_rank", 0),
        "gameweek_points": manager.get("summary_event_points", 0),
        "squad": picks,
        "bank": squad.get("entry_history", {}).get("bank", 0) / 10 if squad else 0,
        "team_value": squad.get("entry_history", {}).get("value", 0) / 10 if squad else 0,
    }


@router.get("/manager/{manager_id}/live")
async def get_manager_live_score(manager_id: int, gameweek: Optional[int] = None):
    """Get live score for a specific manager."""
    fpl_client = FPLClient()
    
    # Get current gameweek if not specified
    if not gameweek:
        bootstrap = await fpl_client.get_bootstrap_static()
        current_gw = next((e for e in bootstrap.get("events", []) if e.get("is_current")), None)
        if current_gw:
            gameweek = current_gw["id"]
        else:
            raise HTTPException(status_code=400, detail="No current gameweek")
    
    # Get manager's picks for this gameweek
    picks = await fpl_client.get_manager_picks(manager_id, gameweek)
    if not picks:
        raise HTTPException(status_code=404, detail="Manager picks not found")
    
    # Get live data
    live_data = await fpl_client.get_live_gameweek(gameweek)
    elements = {e["id"]: e for e in live_data.get("elements", [])}
    
    # Calculate score
    total_points = 0
    player_scores = []
    
    for pick in picks.get("picks", []):
        player_id = pick["element"]
        multiplier = pick["multiplier"]
        
        stats = elements.get(player_id, {}).get("stats", {})
        points = stats.get("total_points", 0) * multiplier
        
        player_scores.append({
            "id": player_id,
            "position": pick["position"],
            "multiplier": multiplier,
            "points": points,
            "stats": stats,
        })
        
        if pick["position"] <= 11:  # Starting XI
            total_points += points
    
    return {
        "manager_id": manager_id,
        "gameweek": gameweek,
        "total_points": total_points,
        "players": player_scores,
        "entry_history": picks.get("entry_history", {}),
    }

