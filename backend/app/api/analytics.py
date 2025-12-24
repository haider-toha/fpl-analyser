"""
Advanced Analytics API Endpoints.

Provides access to sophisticated ML-based analysis:
- Bayesian expected points with component breakdown
- Fixture difficulty analysis (xGFDR)
- Player value metrics (VOR, efficiency)
- Form analysis with streak detection
- Chip strategy recommendations
- Transfer market analysis
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from dataclasses import asdict

from app.data.fpl_client import FPLClient
from app.ml.bayesian_model import (
    DixonColesModel, 
    BayesianExpectedPoints, 
    FormAnalyzer,
)
from app.ml.fixture_analyzer import FixtureAnalyzer, RotationRiskAnalyzer
from app.ml.player_value import (
    PlayerValueAnalyzer, 
    DifferentialAnalyzer, 
    TransferValueAnalyzer,
)
from app.ml.chip_strategy import ChipStrategyOptimizer
from app.ml.transfer_planner import (
    TransferPlanner,
    PositionalPlanner,
    DifferentialFinder,
)

router = APIRouter()


# Request/Response Models
class PlayerAnalysisRequest(BaseModel):
    """Request for detailed player analysis."""
    player_id: int
    gameweek: Optional[int] = None


class MultiPlayerRequest(BaseModel):
    """Request with multiple player IDs."""
    player_ids: list[int]
    gameweek_horizon: int = Field(default=5, ge=1, le=10)


class FixtureAnalysisRequest(BaseModel):
    """Request for fixture analysis."""
    team_id: Optional[int] = None
    start_gameweek: int = Field(ge=1, le=38)
    end_gameweek: int = Field(ge=1, le=38)
    position_type: str = Field(default="overall")  # attack, defence, overall


class ChipStrategyRequest(BaseModel):
    """Request for chip strategy analysis."""
    squad_ids: list[int] = Field(default=[], description="Current squad player IDs")
    current_gameweek: int = Field(ge=1, le=38)
    chips_available: dict[str, bool] = Field(
        default={"wildcard": True, "bench_boost": True, "triple_captain": True, "free_hit": True}
    )


class TransferAnalysisRequest(BaseModel):
    """Request for transfer analysis."""
    player_out_id: int
    player_in_id: int
    horizon_gameweeks: int = Field(default=5, ge=1, le=10)


class ValuePicksRequest(BaseModel):
    """Request for value picks."""
    budget: float = Field(default=100.0)
    existing_team_ids: list[int] = Field(default=[])
    position: Optional[int] = Field(default=None, description="1=GK, 2=DEF, 3=MID, 4=FWD")


class TransferPlanRequest(BaseModel):
    """Request for multi-gameweek transfer planning."""
    squad_ids: list[int] = Field(default=[], description="Current squad player IDs (15 players)")
    budget_remaining: float = Field(default=0.0, description="Bank balance in millions")
    free_transfers: int = Field(default=1, ge=0, le=2)
    horizon: int = Field(default=6, ge=1, le=10, description="Gameweeks to plan ahead")


class PlayerProjectionRequest(BaseModel):
    """Request for player projections."""
    player_ids: list[int] = Field(..., description="Player IDs to project")
    horizon: int = Field(default=6, ge=1, le=10)


class RotationPairRequest(BaseModel):
    """Request for finding rotation pairs."""
    position: int = Field(..., ge=1, le=4, description="1=GK, 2=DEF, 3=MID, 4=FWD")
    budget_max: float = Field(default=10.0, description="Max price per player")
    horizon: int = Field(default=6, ge=1, le=10)


# ============== Player Analysis Endpoints ==============

@router.get("/player/{player_id}/expected-points")
async def get_player_expected_points(
    player_id: int,
    gameweek: Optional[int] = None,
):
    """
    Get detailed expected points breakdown for a player.
    
    Uses Bayesian model with Dixon-Coles match predictions.
    """
    fpl_client = FPLClient()
    
    # Get player data
    players = await fpl_client.get_players()
    player = next((p for p in players if p.id == player_id), None)
    
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get player history for priors
    history_data = await fpl_client.get_player_history(player_id)
    history = history_data.get("history", []) if history_data else []
    
    # Get team and fixture data
    teams = await fpl_client.get_teams()
    team_dict = {t.id: t.model_dump() for t in teams}
    
    fixtures = await fpl_client.get_fixtures(gameweek)
    
    # Find player's next fixture
    player_fixture = None
    for f in fixtures:
        if f.get("team_h") == player.team_id:
            player_fixture = {"is_home": True, "opponent_id": f.get("team_a")}
            break
        elif f.get("team_a") == player.team_id:
            player_fixture = {"is_home": False, "opponent_id": f.get("team_h")}
            break
    
    if not player_fixture:
        player_fixture = {"is_home": True, "opponent_id": 0, "difficulty": 3}
    
    # Initialize models
    dixon_coles = DixonColesModel()
    dixon_coles._init_from_fpl_strengths(team_dict)
    
    bayesian_model = BayesianExpectedPoints(dixon_coles)
    
    # Calculate expected points
    team_data = team_dict.get(player.team_id, {})
    opponent_data = team_dict.get(player_fixture.get("opponent_id"), {})
    
    breakdown = bayesian_model.calculate_expected_points(
        player=player.model_dump(),
        fixture=player_fixture,
        team_data=team_data,
        opponent_data=opponent_data,
        history=[h if isinstance(h, dict) else h.model_dump() for h in history[-10:]],
    )
    
    return {
        "player_id": player_id,
        "player_name": player.name,
        "web_name": player.web_name,
        "position": player.position,
        "price": player.price,
        "expected_points": {
            "total": breakdown.total,
            "confidence_interval": [breakdown.confidence_lower, breakdown.confidence_upper],
            "breakdown": {
                "minutes": breakdown.minutes,
                "goals": breakdown.goals,
                "assists": breakdown.assists,
                "clean_sheet": breakdown.clean_sheet,
                "goals_conceded": breakdown.goals_conceded,
                "bonus": breakdown.bonus,
                "saves": breakdown.saves,
                "cards": breakdown.yellow_cards + breakdown.red_cards,
            },
        },
        "fixture": {
            "is_home": player_fixture.get("is_home"),
            "opponent": opponent_data.get("name", "Unknown"),
        },
    }


@router.get("/player/{player_id}/form-analysis")
async def get_player_form_analysis(player_id: int):
    """
    Get detailed form analysis with trend detection and streak analysis.
    """
    fpl_client = FPLClient()
    
    # Get player data
    players = await fpl_client.get_players()
    player = next((p for p in players if p.id == player_id), None)
    
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get history
    history_data = await fpl_client.get_player_history(player_id)
    history = history_data.get("history", []) if history_data else []
    
    if not history:
        return {
            "player_id": player_id,
            "player_name": player.name,
            "form_analysis": {"message": "Insufficient history data"},
        }
    
    form_analyzer = FormAnalyzer()
    
    # Calculate form metrics
    weighted_form = form_analyzer.calculate_weighted_form(history)
    streaks = form_analyzer.detect_streaks(history)
    regression = form_analyzer.regression_to_mean_projection(player.model_dump(), history)
    
    # ICT trend analysis
    ict_form = form_analyzer.calculate_weighted_form(history, "ict_index")
    
    return {
        "player_id": player_id,
        "player_name": player.name,
        "web_name": player.web_name,
        "fpl_form": player.form,
        "form_analysis": {
            "points": weighted_form,
            "ict_index": ict_form,
        },
        "streaks": streaks,
        "regression_projection": regression,
        "recommendation": _get_form_recommendation(weighted_form, streaks, regression),
    }


@router.get("/player/{player_id}/value-analysis")
async def get_player_value_analysis(player_id: int):
    """
    Get comprehensive value metrics for a player (VOR, efficiency, ceiling/floor).
    """
    fpl_client = FPLClient()
    
    players = await fpl_client.get_players()
    player = next((p for p in players if p.id == player_id), None)
    
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get history for ceiling/floor
    history_data = await fpl_client.get_player_history(player_id)
    history = history_data.get("history", []) if history_data else []
    
    # Analyze value
    value_analyzer = PlayerValueAnalyzer()
    all_players_dict = [p.model_dump() for p in players]
    
    metrics = value_analyzer.analyze_player_value(
        player.model_dump(),
        all_players_dict,
        history,
    )
    
    # Differential analysis
    diff_analyzer = DifferentialAnalyzer()
    eo = diff_analyzer.calculate_effective_ownership(player.model_dump())
    diff_ev = diff_analyzer.calculate_differential_ev(
        player.model_dump(),
        player.expected_points,
        eo["effective_ownership"],
    )
    
    return {
        "player_id": player_id,
        "player_name": player.name,
        "web_name": player.web_name,
        "price": player.price,
        "value_metrics": {
            "value_over_replacement": metrics.value_over_replacement,
            "points_per_million": metrics.points_per_million,
            "efficiency_rank": metrics.efficiency_rank,
            "value_tier": metrics.value_tier,
        },
        "risk_profile": {
            "ceiling_points": metrics.ceiling_points,
            "floor_points": metrics.floor_points,
            "upside_ratio": metrics.upside_ratio,
            "consistency_score": metrics.consistency_score,
        },
        "ownership_analysis": {
            **eo,
            **diff_ev,
        },
        "captaincy": {
            "captaincy_ev": metrics.captaincy_ev,
            "is_good_captain": metrics.captaincy_ev > 0,
        },
    }


# ============== Fixture Analysis Endpoints ==============

@router.get("/fixtures/analysis")
async def get_fixture_analysis(
    start_gw: int = Query(1, ge=1, le=38),
    end_gw: int = Query(6, ge=1, le=38),
    position_type: str = Query("overall"),
):
    """
    Get fixture difficulty rankings for all teams.
    """
    fpl_client = FPLClient()
    
    teams = await fpl_client.get_teams()
    fixtures = await fpl_client.get_fixtures()
    
    analyzer = FixtureAnalyzer()
    analyzer.load_team_data([t.model_dump() for t in teams])
    analyzer.load_fixtures(fixtures)
    
    rankings = analyzer.rank_teams_by_fixtures(start_gw, end_gw, position_type)
    
    return {
        "start_gameweek": start_gw,
        "end_gameweek": end_gw,
        "position_type": position_type,
        "rankings": rankings,
    }


@router.get("/fixtures/team/{team_id}")
async def get_team_fixture_analysis(
    team_id: int,
    num_gameweeks: int = Query(6, ge=1, le=15),
):
    """
    Get detailed fixture analysis for a specific team.
    """
    fpl_client = FPLClient()
    bootstrap = await fpl_client.get_bootstrap_static()
    
    current_event = next(
        (e for e in bootstrap.get("events", []) if e.get("is_current")),
        {"id": 1}
    )
    current_gw = current_event.get("id", 1)
    
    teams = await fpl_client.get_teams()
    fixtures = await fpl_client.get_fixtures()
    
    team = next((t for t in teams if t.id == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    analyzer = FixtureAnalyzer()
    analyzer.load_team_data([t.model_dump() for t in teams])
    analyzer.load_fixtures(fixtures)
    
    # Multi-gameweek analysis
    rating = analyzer.analyze_multi_gameweek(team_id, current_gw, current_gw + num_gameweeks - 1)
    
    # Fixture ticker
    ticker = analyzer.get_fixture_ticker(team_id, num_gameweeks, current_gw)
    
    return {
        "team_id": team_id,
        "team_name": team.name,
        "current_gameweek": current_gw,
        "analysis": {
            "total_fdr": rating.total_fdr,
            "avg_fdr_attack": rating.avg_fdr_attack,
            "avg_fdr_defence": rating.avg_fdr_defence,
            "fixture_swing": rating.fixture_swing,
            "num_fixtures": rating.num_fixtures,
            "double_gameweeks": rating.double_gameweeks,
            "blank_gameweeks": rating.blank_gameweeks,
        },
        "fixture_ticker": ticker,
    }


# ============== Value Picks & Differentials ==============

@router.post("/value-picks")
async def get_value_picks(request: ValuePicksRequest):
    """
    Find best value picks based on VOR efficiency.
    """
    fpl_client = FPLClient()
    players = await fpl_client.get_players()
    
    value_analyzer = PlayerValueAnalyzer()
    all_players_dict = [p.model_dump() for p in players]
    
    picks = value_analyzer.find_value_picks(
        all_players_dict,
        budget_remaining=request.budget,
        existing_team_ids=set(request.existing_team_ids),
        position_filter=request.position,
    )
    
    return {
        "budget": request.budget,
        "position_filter": request.position,
        "value_picks": picks,
    }


@router.get("/differentials")
async def get_captain_differentials(
    min_expected: float = Query(5.0, ge=0),
    max_ownership: float = Query(15.0, ge=0, le=100),
):
    """
    Find best captain differential picks.
    """
    fpl_client = FPLClient()
    players = await fpl_client.get_players()
    
    diff_analyzer = DifferentialAnalyzer()
    all_players_dict = [p.model_dump() for p in players]
    
    differentials = diff_analyzer.find_captain_differentials(
        all_players_dict,
        min_expected=min_expected,
        max_ownership=max_ownership,
    )
    
    return {
        "min_expected_points": min_expected,
        "max_ownership": max_ownership,
        "captain_differentials": differentials,
    }


@router.get("/vor-rankings")
async def get_vor_rankings(
    num_gameweeks: int = Query(1, ge=1, le=10),
    position: Optional[int] = Query(None, ge=1, le=4),
):
    """
    Get all players ranked by Value Over Replacement.
    """
    fpl_client = FPLClient()
    players = await fpl_client.get_players()
    
    if position:
        players = [p for p in players if p.position == position]
    
    value_analyzer = PlayerValueAnalyzer()
    rankings = value_analyzer.calculate_vor_rankings(
        [p.model_dump() for p in players],
        num_gameweeks,
    )
    
    return {
        "num_gameweeks": num_gameweeks,
        "position_filter": position,
        "rankings": rankings[:50],  # Top 50
    }


# ============== Transfer Analysis ==============

@router.post("/transfer-analysis")
async def analyze_transfer(request: TransferAnalysisRequest):
    """
    Analyze the value of a potential transfer.
    """
    fpl_client = FPLClient()
    players = await fpl_client.get_players()
    
    player_out = next((p for p in players if p.id == request.player_out_id), None)
    player_in = next((p for p in players if p.id == request.player_in_id), None)
    
    if not player_out:
        raise HTTPException(status_code=404, detail=f"Player {request.player_out_id} not found")
    if not player_in:
        raise HTTPException(status_code=404, detail=f"Player {request.player_in_id} not found")
    
    transfer_analyzer = TransferValueAnalyzer()
    
    analysis = transfer_analyzer.calculate_transfer_efficiency(
        player_out.model_dump(),
        player_in.model_dump(),
        request.horizon_gameweeks,
    )
    
    return {
        "transfer": analysis,
        "player_out": {
            "id": player_out.id,
            "name": player_out.web_name,
            "price": player_out.price,
            "expected_points": player_out.expected_points,
        },
        "player_in": {
            "id": player_in.id,
            "name": player_in.web_name,
            "price": player_in.price,
            "expected_points": player_in.expected_points,
        },
    }


# ============== Chip Strategy ==============

@router.post("/chip-strategy")
async def get_chip_strategy(request: ChipStrategyRequest):
    """
    Get optimal chip strategy for remaining season.
    """
    fpl_client = FPLClient()
    
    players = await fpl_client.get_players()
    player_dict = {p.id: p for p in players}
    
    # Get squad
    squad = [player_dict[pid] for pid in request.squad_ids if pid in player_dict]
    
    teams = await fpl_client.get_teams()
    fixtures = await fpl_client.get_fixtures()
    
    optimizer = ChipStrategyOptimizer()
    optimizer.load_data(fixtures, [t.model_dump() for t in teams], request.current_gameweek)
    
    strategy = optimizer.get_optimal_chip_strategy(
        request.current_gameweek,
        [s.model_dump() for s in squad],
        [p.model_dump() for p in players],
        request.chips_available,
    )
    
    return {
        "current_gameweek": request.current_gameweek,
        "chips_available": request.chips_available,
        "recommendations": {
            "wildcard": {
                "recommended_gameweek": strategy.wildcard.recommended_gameweek,
                "expected_value": strategy.wildcard.expected_value,
                "confidence": strategy.wildcard.confidence,
                "reasoning": strategy.wildcard.reasoning,
            },
            "bench_boost": {
                "recommended_gameweek": strategy.bench_boost.recommended_gameweek,
                "expected_value": strategy.bench_boost.expected_value,
                "confidence": strategy.bench_boost.confidence,
                "reasoning": strategy.bench_boost.reasoning,
                "alternatives": strategy.bench_boost.alternative_gameweeks,
            },
            "triple_captain": {
                "recommended_gameweek": strategy.triple_captain.recommended_gameweek,
                "expected_value": strategy.triple_captain.expected_value,
                "confidence": strategy.triple_captain.confidence,
                "reasoning": strategy.triple_captain.reasoning,
                "alternatives": strategy.triple_captain.alternative_gameweeks,
            },
            "free_hit": {
                "recommended_gameweek": strategy.free_hit.recommended_gameweek,
                "expected_value": strategy.free_hit.expected_value,
                "confidence": strategy.free_hit.confidence,
                "reasoning": strategy.free_hit.reasoning,
                "alternatives": strategy.free_hit.alternative_gameweeks,
            },
        },
        "optimal_order": strategy.optimal_order,
        "total_expected_value": strategy.total_expected_value,
        "season_projections": {
            "with_optimal_chips": strategy.season_projection_with_chips,
            "without_chips": strategy.season_projection_without_chips,
            "chip_value_added": strategy.total_expected_value,
        },
    }


# ============== Match Predictions ==============

@router.get("/match-predictions")
async def get_match_predictions(gameweek: Optional[int] = None):
    """
    Get Dixon-Coles match predictions for upcoming fixtures.
    """
    fpl_client = FPLClient()
    
    teams = await fpl_client.get_teams()
    team_dict = {t.id: t.model_dump() for t in teams}
    
    fixtures = await fpl_client.get_fixtures(gameweek)
    
    # Initialize Dixon-Coles model
    dixon_coles = DixonColesModel()
    dixon_coles._init_from_fpl_strengths(team_dict)
    
    predictions = []
    for fixture in fixtures:
        if fixture.get("finished"):
            continue
        
        home_id = fixture.get("team_h")
        away_id = fixture.get("team_a")
        
        prediction = dixon_coles.predict_match(home_id, away_id)
        
        predictions.append({
            "fixture_id": fixture.get("id"),
            "gameweek": fixture.get("event"),
            "home_team": team_dict.get(home_id, {}).get("name", "Unknown"),
            "away_team": team_dict.get(away_id, {}).get("name", "Unknown"),
            "kickoff_time": fixture.get("kickoff_time"),
            **prediction,
        })
    
    return {
        "gameweek": gameweek,
        "predictions": predictions,
    }


# ============== Transfer Planning Endpoints ==============

@router.post("/transfer-plan")
async def generate_transfer_plan(request: TransferPlanRequest):
    """
    Generate a comprehensive multi-gameweek transfer plan.
    
    Analyzes fixtures, form, and expected points to recommend:
    - Which players to sell and when
    - Which players to buy as replacements
    - Priority of transfers based on fixture swings
    - Team and position-based fixture rankings
    """
    fpl_client = FPLClient()
    
    # Get all data
    players = await fpl_client.get_players()
    teams = await fpl_client.get_teams()
    fixtures = await fpl_client.get_fixtures()
    bootstrap = await fpl_client.get_bootstrap_static()
    
    # Get current gameweek
    current_event = next(
        (e for e in bootstrap.get("events", []) if e.get("is_current")),
        {"id": 1}
    )
    current_gw = current_event.get("id", 1)
    
    # Build player lookup
    player_dict = {p.id: p.model_dump() for p in players}
    
    # Get current squad
    squad = [player_dict[pid] for pid in request.squad_ids if pid in player_dict]
    
    # Initialize planner
    planner = TransferPlanner()
    planner.load_data(
        players=[p.model_dump() for p in players],
        teams=[t.model_dump() for t in teams],
        fixtures=fixtures,
        current_gameweek=current_gw,
    )
    
    # Generate plan
    plan = planner.generate_transfer_plan(
        current_squad=squad,
        all_players=[p.model_dump() for p in players],
        horizon=request.horizon,
        budget_remaining=request.budget_remaining,
        free_transfers=request.free_transfers,
    )
    
    # Format response
    return {
        "current_gameweek": plan.current_gameweek,
        "horizon": plan.horizon,
        "recommended_transfers": [
            {
                "player_out": t.player_out,
                "player_in": t.player_in,
                "expected_gain": t.expected_gain,
                "urgency": t.urgency,
                "reasoning": t.reasoning,
                "fixture_context": t.fixture_context,
            }
            for t in plan.recommended_transfers
        ],
        "players_to_sell": [
            {
                "id": p.player_id,
                "name": p.player_name,
                "team": p.team_name,
                "position": p.position,
                "fdr_avg": p.fixture_difficulty_avg,
                "fixture_swing": p.fixture_swing,
                "expected_pts": p.total_expected_points,
                "reasoning": p.reasoning,
            }
            for p in plan.players_to_sell
        ],
        "players_to_buy": [
            {
                "id": p.player_id,
                "name": p.player_name,
                "team": p.team_name,
                "position": p.position,
                "price": p.price,
                "fdr_avg": p.fixture_difficulty_avg,
                "fixture_swing": p.fixture_swing,
                "expected_pts": p.total_expected_points,
                "reasoning": p.reasoning,
            }
            for p in plan.players_to_buy
        ],
        "players_to_watch": [
            {
                "id": p.player_id,
                "name": p.player_name,
                "team": p.team_name,
                "position": p.position,
                "price": p.price,
                "fdr_avg": p.fixture_difficulty_avg,
                "fixture_swing": p.fixture_swing,
                "expected_pts": p.total_expected_points,
                "reasoning": p.reasoning,
            }
            for p in plan.players_to_watch
        ],
        "team_fixture_rankings": plan.team_fixture_rankings,
        "position_picks": {
            "goalkeepers": [
                {"id": p.player_id, "name": p.player_name, "team": p.team_name, 
                 "price": p.price, "expected_pts": p.total_expected_points,
                 "fdr_avg": p.fixture_difficulty_avg}
                for p in plan.top_goalkeepers[:5]
            ],
            "defenders": [
                {"id": p.player_id, "name": p.player_name, "team": p.team_name,
                 "price": p.price, "expected_pts": p.total_expected_points,
                 "fdr_avg": p.fixture_difficulty_avg}
                for p in plan.top_defenders[:5]
            ],
            "midfielders": [
                {"id": p.player_id, "name": p.player_name, "team": p.team_name,
                 "price": p.price, "expected_pts": p.total_expected_points,
                 "fdr_avg": p.fixture_difficulty_avg}
                for p in plan.top_midfielders[:5]
            ],
            "forwards": [
                {"id": p.player_id, "name": p.player_name, "team": p.team_name,
                 "price": p.price, "expected_pts": p.total_expected_points,
                 "fdr_avg": p.fixture_difficulty_avg}
                for p in plan.top_forwards[:5]
            ],
        },
    }


@router.post("/player-projections")
async def get_player_projections(request: PlayerProjectionRequest):
    """
    Get multi-gameweek expected points projections for specific players.
    
    Returns gameweek-by-gameweek projections with fixture context.
    """
    fpl_client = FPLClient()
    
    players = await fpl_client.get_players()
    teams = await fpl_client.get_teams()
    fixtures = await fpl_client.get_fixtures()
    bootstrap = await fpl_client.get_bootstrap_static()
    
    current_event = next(
        (e for e in bootstrap.get("events", []) if e.get("is_current")),
        {"id": 1}
    )
    current_gw = current_event.get("id", 1)
    
    player_dict = {p.id: p.model_dump() for p in players}
    
    planner = TransferPlanner()
    planner.load_data(
        players=[p.model_dump() for p in players],
        teams=[t.model_dump() for t in teams],
        fixtures=fixtures,
        current_gameweek=current_gw,
    )
    
    projections = []
    for pid in request.player_ids:
        if pid not in player_dict:
            continue
        
        player = player_dict[pid]
        
        # Get player history for better projections
        history_data = await fpl_client.get_player_history(pid)
        history = history_data.get("history", []) if history_data else None
        
        proj = planner.project_player(
            player,
            current_gw,
            min(38, current_gw + request.horizon - 1),
            history=history,
        )
        
        projections.append({
            "player_id": proj.player_id,
            "player_name": proj.player_name,
            "team": proj.team_name,
            "position": proj.position,
            "price": proj.price,
            "current_form": proj.current_form,
            "total_expected_points": proj.total_expected_points,
            "avg_expected_points": proj.avg_expected_points,
            "fixture_difficulty_avg": proj.fixture_difficulty_avg,
            "fixture_swing": proj.fixture_swing,
            "action": proj.action,
            "reasoning": proj.reasoning,
            "gameweek_projections": proj.gameweek_projections,
        })
    
    return {
        "current_gameweek": current_gw,
        "horizon": request.horizon,
        "projections": projections,
    }


@router.get("/fixture-swings")
async def get_all_fixture_swings(horizon: int = 10):
    """
    Get fixture swing analysis for all teams.
    
    Identifies when fixtures turn easier or harder for each team.
    """
    fpl_client = FPLClient()
    
    teams = await fpl_client.get_teams()
    fixtures = await fpl_client.get_fixtures()
    bootstrap = await fpl_client.get_bootstrap_static()
    
    current_event = next(
        (e for e in bootstrap.get("events", []) if e.get("is_current")),
        {"id": 1}
    )
    current_gw = current_event.get("id", 1)
    
    planner = TransferPlanner()
    planner.load_data(
        players=[],  # Not needed for fixture analysis
        teams=[t.model_dump() for t in teams],
        fixtures=fixtures,
        current_gameweek=current_gw,
    )
    
    swing_analysis = []
    for team in teams:
        analysis = planner.get_fixture_swing_analysis(team.id, horizon)
        swing_analysis.append(analysis)
    
    # Sort by fixture swing (positive = improving)
    swing_analysis.sort(key=lambda x: x["fixture_swing"], reverse=True)
    
    return {
        "current_gameweek": current_gw,
        "horizon": horizon,
        "teams": swing_analysis,
        "summary": {
            "best_improving": [t["team_name"] for t in swing_analysis[:5]],
            "worst_declining": [t["team_name"] for t in swing_analysis[-5:]],
        },
    }


@router.post("/rotation-pairs")
async def find_rotation_pairs(request: RotationPairRequest):
    """
    Find players who rotate well based on complementary fixtures.
    
    Returns pairs of players where when one has tough fixtures,
    the other has easy ones.
    """
    fpl_client = FPLClient()
    
    players = await fpl_client.get_players()
    teams = await fpl_client.get_teams()
    fixtures = await fpl_client.get_fixtures()
    bootstrap = await fpl_client.get_bootstrap_static()
    
    current_event = next(
        (e for e in bootstrap.get("events", []) if e.get("is_current")),
        {"id": 1}
    )
    current_gw = current_event.get("id", 1)
    
    planner = TransferPlanner()
    planner.load_data(
        players=[p.model_dump() for p in players],
        teams=[t.model_dump() for t in teams],
        fixtures=fixtures,
        current_gameweek=current_gw,
    )
    
    positional_planner = PositionalPlanner(planner)
    pairs = positional_planner.find_rotation_pairs(
        position=request.position,
        horizon=request.horizon,
        budget_max=request.budget_max,
    )
    
    position_names = {1: "Goalkeeper", 2: "Defender", 3: "Midfielder", 4: "Forward"}
    
    return {
        "position": position_names.get(request.position, "Unknown"),
        "budget_max": request.budget_max,
        "horizon": request.horizon,
        "rotation_pairs": pairs,
    }


@router.get("/differentials/by-fixtures")
async def find_fixture_based_differentials(
    max_ownership: float = 10.0,
    min_form: float = 3.0,
    horizon: int = 6,
):
    """
    Find differentials with great upcoming fixtures.
    
    Low-owned players with good form and easy fixture runs.
    """
    fpl_client = FPLClient()
    
    players = await fpl_client.get_players()
    teams = await fpl_client.get_teams()
    fixtures = await fpl_client.get_fixtures()
    bootstrap = await fpl_client.get_bootstrap_static()
    
    current_event = next(
        (e for e in bootstrap.get("events", []) if e.get("is_current")),
        {"id": 1}
    )
    current_gw = current_event.get("id", 1)
    
    planner = TransferPlanner()
    planner.load_data(
        players=[p.model_dump() for p in players],
        teams=[t.model_dump() for t in teams],
        fixtures=fixtures,
        current_gameweek=current_gw,
    )
    
    diff_finder = DifferentialFinder(planner)
    differentials = diff_finder.find_differentials(
        max_ownership=max_ownership,
        min_form=min_form,
        horizon=horizon,
    )
    
    return {
        "current_gameweek": current_gw,
        "criteria": {
            "max_ownership": max_ownership,
            "min_form": min_form,
            "horizon": horizon,
        },
        "differentials": [
            {
                "id": p.player_id,
                "name": p.player_name,
                "team": p.team_name,
                "position": p.position,
                "price": p.price,
                "form": p.current_form,
                "fdr_avg": p.fixture_difficulty_avg,
                "expected_pts": p.total_expected_points,
                "reasoning": p.reasoning,
            }
            for p in differentials
        ],
    }


@router.get("/team/{team_id}/fixture-swing")
async def get_team_fixture_swing(team_id: int, horizon: int = 10):
    """
    Get detailed fixture swing analysis for a specific team.
    """
    fpl_client = FPLClient()
    
    teams = await fpl_client.get_teams()
    fixtures = await fpl_client.get_fixtures()
    bootstrap = await fpl_client.get_bootstrap_static()
    
    current_event = next(
        (e for e in bootstrap.get("events", []) if e.get("is_current")),
        {"id": 1}
    )
    current_gw = current_event.get("id", 1)
    
    team = next((t for t in teams if t.id == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    planner = TransferPlanner()
    planner.load_data(
        players=[],
        teams=[t.model_dump() for t in teams],
        fixtures=fixtures,
        current_gameweek=current_gw,
    )
    
    analysis = planner.get_fixture_swing_analysis(team_id, horizon)
    
    return analysis


# ============== Helper Functions ==============

def _get_form_recommendation(form: dict, streaks: dict, regression: dict) -> dict:
    """Generate form-based recommendation."""
    score = 0
    reasons = []
    
    # Form trend
    if form.get("trend_direction") == "up":
        score += 2
        reasons.append("Trending upward in recent games")
    elif form.get("trend_direction") == "down":
        score -= 2
        reasons.append("Form declining")
    
    # Streaks
    if streaks.get("current_streak") == "hot":
        score += streaks.get("streak_length", 0)
        reasons.append(f"Currently on {streaks['streak_length']}-game hot streak")
    elif streaks.get("current_streak") == "cold":
        score -= streaks.get("streak_length", 0)
        reasons.append(f"Currently on {streaks['streak_length']}-game cold streak")
    
    # Regression warning
    if regression.get("is_overperforming"):
        score -= 1
        reasons.append("Outperforming underlying stats - regression possible")
    elif regression.get("is_underperforming"):
        score += 1
        reasons.append("Underperforming stats - improvement likely")
    
    if score >= 3:
        verdict = "strong_buy"
    elif score >= 1:
        verdict = "buy"
    elif score <= -3:
        verdict = "avoid"
    elif score <= -1:
        verdict = "sell"
    else:
        verdict = "hold"
    
    return {
        "verdict": verdict,
        "score": score,
        "reasons": reasons,
    }

