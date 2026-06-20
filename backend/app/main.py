"""
AeroMind — FastAPI Application Factory

AI-Powered Predictive Aviation Operations & Airspace Intelligence Platform.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.cache_service import cache_service
from app.tasks.scheduler import start_scheduler, stop_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-25s | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("aeromind")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # ---- Startup ----
    logger.info("=" * 60)
    logger.info("  AeroMind v%s Starting Up", settings.app_version)
    logger.info("=" * 60)

    # Connect to Redis
    await cache_service.connect()

    # Start background data fetching
    start_scheduler()

    logger.info("AeroMind ready at http://%s:%d", settings.backend_host, settings.backend_port)

    yield

    # ---- Shutdown ----
    logger.info("AeroMind shutting down...")
    stop_scheduler()
    await cache_service.disconnect()
    logger.info("AeroMind shutdown complete.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="AeroMind API",
        description="AI-Powered Predictive Aviation Operations & Airspace Intelligence Platform",
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    from app.routers import flights, weather, predictions, airports, analytics, copilot, simulation, advanced_analytics
    app.include_router(flights.router)
    app.include_router(weather.router)
    app.include_router(predictions.router)
    app.include_router(airports.router)
    app.include_router(analytics.router)
    app.include_router(copilot.router)
    app.include_router(simulation.router)
    app.include_router(advanced_analytics.router)

    # Health check
    @app.get("/health", tags=["system"])
    async def health_check():
        return {
            "status": "healthy",
            "service": "AeroMind",
            "version": settings.app_version,
            "cache_connected": cache_service.is_connected,
        }

    @app.get("/", tags=["system"])
    async def root():
        return {
            "name": "AeroMind API",
            "version": settings.app_version,
            "description": "AI-Powered Predictive Aviation Operations Platform",
            "docs": "/docs",
            "endpoints": {
                "flights": "/api/v1/flights/live",
                "weather": "/api/v1/weather/metar/{icao}",
                "predictions": "/api/v1/predictions/delay",
                "airports": "/api/v1/airports",
                "analytics": "/api/v1/analytics/summary",
            },
        }

    return app


# Application instance
app = create_app()
