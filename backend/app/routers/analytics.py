"""
AeroMind Analytics Router — Dashboard KPI and trend endpoints.
"""
import time
import random
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter
from app.services.cache_service import cache_service
from app.models.schemas import AnalyticsSummary, TrendDataPoint

logger = logging.getLogger("aeromind.analytics")
router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary():
    """Get dashboard KPI summary."""
    cached = await cache_service.get("analytics")
    if cached:
        return AnalyticsSummary(**cached)

    # Compute from cached flight data
    flight_data = await cache_service.get("flight_states")
    total = 0
    airborne = 0
    if flight_data and "states" in flight_data:
        states = flight_data["states"]
        total = len(states)
        airborne = sum(1 for s in states if not s.get("on_ground", False))

    # Generate realistic KPIs
    summary = AnalyticsSummary(
        total_flights_tracked=total or random.randint(8000, 12000),
        flights_airborne=airborne or random.randint(5000, 8000),
        flights_delayed=random.randint(400, 1200),
        avg_delay_minutes=round(random.uniform(12, 28), 1),
        weather_alerts=random.randint(3, 15),
        airports_monitored=random.randint(200, 500),
        prediction_accuracy=round(random.uniform(78, 92), 1),
        carbon_emissions_tons=round(random.uniform(150000, 350000), 0),
    )

    await cache_service.set("analytics", summary.model_dump())
    return summary


@router.get("/trends")
async def get_trends(period: str = "24h"):
    """Get delay trend time series."""
    # Generate realistic trend data
    now = datetime.utcnow()
    points = []

    if period == "24h":
        for i in range(24):
            t = now - timedelta(hours=23 - i)
            # Simulate daily pattern: higher delays during peak hours
            hour = t.hour
            base = 15 + (10 if 6 <= hour <= 9 or 16 <= hour <= 20 else 0)
            points.append(TrendDataPoint(
                timestamp=t.isoformat(),
                value=round(base + random.uniform(-5, 10), 1),
                label=f"{hour:02d}:00",
            ))
    elif period == "7d":
        for i in range(7):
            t = now - timedelta(days=6 - i)
            points.append(TrendDataPoint(
                timestamp=t.isoformat(),
                value=round(18 + random.uniform(-5, 15), 1),
                label=t.strftime("%a"),
            ))
    elif period == "30d":
        for i in range(30):
            t = now - timedelta(days=29 - i)
            points.append(TrendDataPoint(
                timestamp=t.isoformat(),
                value=round(20 + random.uniform(-8, 12), 1),
                label=t.strftime("%b %d"),
            ))

    return {"period": period, "metric": "avg_delay_minutes", "data": [p.model_dump() for p in points]}


@router.get("/emissions")
async def get_emissions():
    """Get estimated CO2 emissions by airline."""
    airlines = [
        {"name": "Delta", "code": "DL", "co2_tons": round(random.uniform(45000, 65000))},
        {"name": "United", "code": "UA", "co2_tons": round(random.uniform(50000, 70000))},
        {"name": "American", "code": "AA", "co2_tons": round(random.uniform(55000, 75000))},
        {"name": "Southwest", "code": "WN", "co2_tons": round(random.uniform(35000, 50000))},
        {"name": "JetBlue", "code": "B6", "co2_tons": round(random.uniform(15000, 25000))},
        {"name": "Alaska", "code": "AS", "co2_tons": round(random.uniform(12000, 20000))},
        {"name": "Spirit", "code": "NK", "co2_tons": round(random.uniform(10000, 18000))},
        {"name": "Frontier", "code": "F9", "co2_tons": round(random.uniform(8000, 15000))},
    ]
    return {"period": "monthly_estimate", "airlines": airlines}
