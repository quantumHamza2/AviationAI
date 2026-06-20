"""
AeroMind Advanced Analytics Router — Airline comparison and route analysis.
"""
import random
import logging
from fastapi import APIRouter

logger = logging.getLogger("aeromind.advanced_analytics")
router = APIRouter(prefix="/api/v1/analytics", tags=["advanced_analytics"])

AIRLINES_DATA = {
    "AA": "American Airlines", "DL": "Delta Air Lines", "UA": "United Airlines",
    "WN": "Southwest Airlines", "B6": "JetBlue Airways", "AS": "Alaska Airlines",
    "NK": "Spirit Airlines", "F9": "Frontier Airlines", "BA": "British Airways",
    "EK": "Emirates", "SQ": "Singapore Airlines", "LH": "Lufthansa",
}


@router.get("/airlines")
async def get_airline_comparison():
    """Get airline performance comparison data."""
    airlines = []
    for code, name in AIRLINES_DATA.items():
        seed = sum(ord(c) for c in code)
        rng = random.Random(seed)
        airlines.append({
            "code": code,
            "name": name,
            "on_time_pct": round(rng.uniform(72, 92), 1),
            "avg_delay_min": round(rng.uniform(8, 32), 1),
            "cancel_rate_pct": round(rng.uniform(0.5, 5.0), 1),
            "flights_daily": rng.randint(800, 5000),
            "satisfaction_score": round(rng.uniform(3.0, 4.8), 1),
            "baggage_rate_pct": round(rng.uniform(0.2, 2.5), 1),
            "complaint_rate": round(rng.uniform(0.5, 3.0), 1),
        })
    return {"airlines": sorted(airlines, key=lambda x: -x["on_time_pct"])}


@router.get("/routes")
async def get_route_analysis():
    """Get top route performance data."""
    airports = ["JFK", "LAX", "ORD", "LHR", "DXB", "SFO", "ATL", "DEN", "SIN", "CDG"]
    routes = []
    for i, orig in enumerate(airports):
        for j, dest in enumerate(airports):
            if i == j:
                continue
            seed = sum(ord(c) for c in f"{orig}{dest}")
            rng = random.Random(seed)
            if rng.random() > 0.4:  # Not all routes exist
                continue
            routes.append({
                "origin": orig,
                "destination": dest,
                "daily_flights": rng.randint(5, 45),
                "avg_delay_min": round(rng.uniform(5, 40), 1),
                "on_time_pct": round(rng.uniform(65, 95), 1),
                "distance_nm": rng.randint(500, 5000),
                "top_airline": rng.choice(list(AIRLINES_DATA.keys())),
            })
    return {"routes": sorted(routes, key=lambda x: -x["daily_flights"])[:30]}


@router.get("/historical")
async def get_historical_trends():
    """Get historical delay trends (30 days)."""
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    daily = []
    for i in range(30):
        day = now - timedelta(days=29 - i)
        dow = day.weekday()
        base = 18 + (4 if dow < 5 else -2)  # Weekdays slightly higher
        daily.append({
            "date": day.strftime("%Y-%m-%d"),
            "day_of_week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dow],
            "avg_delay_min": round(base + random.uniform(-6, 8), 1),
            "total_flights": random.randint(28000, 42000),
            "delayed_pct": round(random.uniform(15, 30), 1),
            "cancelled_pct": round(random.uniform(1, 4), 1),
        })

    # Day-of-week aggregation
    dow_agg = {}
    for d in daily:
        dow = d["day_of_week"]
        if dow not in dow_agg:
            dow_agg[dow] = {"delays": [], "flights": []}
        dow_agg[dow]["delays"].append(d["avg_delay_min"])
        dow_agg[dow]["flights"].append(d["total_flights"])

    by_day = []
    for dow, data in dow_agg.items():
        by_day.append({
            "day": dow,
            "avg_delay": round(sum(data["delays"]) / len(data["delays"]), 1),
            "avg_flights": round(sum(data["flights"]) / len(data["flights"])),
        })

    return {"daily": daily, "by_day_of_week": by_day}
