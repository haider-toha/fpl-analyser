"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.api import players, optimizer, simulation, leagues, live, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    print("FPL Moneyball API starting up...")
    yield
    # Shutdown
    print("FPL Moneyball API shutting down...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title="FPL Moneyball API",
        description="Fantasy Premier League optimization and analytics API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(players.router, prefix="/api/players", tags=["Players"])
    app.include_router(optimizer.router, prefix="/api/optimizer", tags=["Optimizer"])
    app.include_router(simulation.router, prefix="/api/simulation", tags=["Simulation"])
    app.include_router(leagues.router, prefix="/api/leagues", tags=["Leagues"])
    app.include_router(live.router, prefix="/api/live", tags=["Live"])
    app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
    
    @app.get("/", tags=["Health"])
    async def root():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "service": "FPL Moneyball API",
            "version": "1.0.0"
        }
    
    @app.get("/api/health", tags=["Health"])
    async def health_check():
        """Detailed health check."""
        return {
            "status": "healthy",
            "components": {
                "api": "ok",
                "optimizer": "ok",
                "simulation": "ok"
            }
        }
    
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )

