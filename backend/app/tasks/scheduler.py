"""
AeroMind Background Scheduler — Periodic data fetching tasks.
"""
import logging
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.opensky_service import opensky_service
from app.services.weather_service import weather_service
from app.services.cache_service import cache_service

logger = logging.getLogger("aeromind.scheduler")

scheduler = AsyncIOScheduler()

# Top airports to monitor weather for
MONITORED_AIRPORTS = [
    "KATL", "KLAX", "KORD", "KDFW", "KDEN", "KJFK", "KSFO", "KLAS", "KSEA", "KMCO",
    "KEWR", "KBOS", "KMSP", "KPHL", "KLGA", "KDTW", "KSLC", "KCLT",
    "EGLL", "LFPG", "EDDF", "EHAM", "OMDB", "RJTT", "WSSS", "VHHH", "YSSY", "VIDP",
    "KBWI", "KTPA", "KPDX", "KBNA",
]


async def fetch_flight_states():
    """Fetch global flight state vectors from OpenSky and cache them."""
    try:
        data = await opensky_service.get_all_states()
        if data.states:
            await cache_service.set("flight_states", data.model_dump())
            stats = opensky_service.compute_stats(data.states)
            await cache_service.set("flight_stats", stats.model_dump())
            logger.info("Cached %d flight states", data.total_count)
        else:
            logger.debug("No flight states received from OpenSky")
    except Exception as e:
        logger.error("Flight state fetch failed: %s", e)


async def fetch_weather_data():
    """Fetch METAR for monitored airports and cache weather data."""
    try:
        # Batch fetch in groups of 10
        for i in range(0, len(MONITORED_AIRPORTS), 10):
            batch = MONITORED_AIRPORTS[i:i + 10]
            stations = ",".join(batch)
            reports = await weather_service.get_metar(stations, hours=1.0)
            for report in reports:
                await cache_service.set("weather_metar",
                    [report.model_dump()], report.station_id)
                risk = weather_service.compute_weather_risk(report)
                await cache_service.set("weather_risk",
                    risk.model_dump(), report.station_id)
            await asyncio.sleep(1)  # Rate limit courtesy

        # Update global overlay
        overlay = await weather_service.get_global_weather_overlay()
        await cache_service.set("weather_overlay", overlay)
        logger.info("Updated weather data for %d airports", len(MONITORED_AIRPORTS))
    except Exception as e:
        logger.error("Weather data fetch failed: %s", e)


def start_scheduler():
    """Configure and start the background scheduler."""
    # Fetch flights every 15 seconds (conservative to stay within API limits)
    scheduler.add_job(fetch_flight_states, "interval", seconds=15,
                      id="fetch_flights", max_instances=1, replace_existing=True)

    # Fetch weather every 5 minutes
    scheduler.add_job(fetch_weather_data, "interval", minutes=5,
                      id="fetch_weather", max_instances=1, replace_existing=True)

    scheduler.start()
    logger.info("Background scheduler started")


def stop_scheduler():
    """Shutdown the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")
