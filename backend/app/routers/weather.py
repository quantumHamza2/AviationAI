"""
AeroMind Weather Router — Weather intelligence endpoints.
"""
import logging
from fastapi import APIRouter, Query
from typing import List
from app.services.weather_service import weather_service
from app.services.cache_service import cache_service
from app.models.schemas import WeatherReport, WeatherRisk

logger = logging.getLogger("aeromind.weather")
router = APIRouter(prefix="/api/v1/weather", tags=["weather"])


@router.get("/metar/{icao}", response_model=List[WeatherReport])
async def get_metar(icao: str, hours: float = Query(2.0, le=72)):
    """Get METAR observations for an airport."""
    cached = await cache_service.get("weather_metar", icao.upper())
    if cached:
        return [WeatherReport(**r) for r in cached]

    reports = await weather_service.get_metar(icao.upper(), hours=hours)
    if reports:
        await cache_service.set("weather_metar", [r.model_dump() for r in reports], icao.upper())
    return reports


@router.get("/taf/{icao}")
async def get_taf(icao: str):
    """Get TAF forecast for an airport."""
    return await weather_service.get_taf(icao.upper())


@router.get("/risks/{icao}", response_model=WeatherRisk)
async def get_weather_risks(icao: str):
    """Get computed weather risk scores for an airport."""
    cached = await cache_service.get("weather_risk", icao.upper())
    if cached:
        return WeatherRisk(**cached)

    reports = await weather_service.get_metar(icao.upper(), hours=1.0)
    if reports:
        risk = weather_service.compute_weather_risk(reports[0])
        await cache_service.set("weather_risk", risk.model_dump(), icao.upper())
        return risk

    return WeatherRisk(station_id=icao.upper())


@router.get("/global")
async def get_global_weather():
    """Get global weather overlay data for map visualization."""
    cached = await cache_service.get("weather_overlay")
    if cached:
        return cached

    data = await weather_service.get_global_weather_overlay()
    await cache_service.set("weather_overlay", data)
    return data


@router.get("/bulk")
async def get_bulk_metar(stations: str = Query(..., description="Comma-separated ICAO codes")):
    """Fetch METAR for multiple stations at once."""
    reports = await weather_service.get_metar(stations, hours=1.0)
    risks = {r.station_id: weather_service.compute_weather_risk(r).model_dump() for r in reports}
    return {"reports": [r.model_dump() for r in reports], "risks": risks}
