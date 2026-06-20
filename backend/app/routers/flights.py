"""
AeroMind Flights Router — Real-time flight tracking endpoints.
"""
import time
import json
import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.opensky_service import opensky_service
from app.services.cache_service import cache_service
from app.models.schemas import FlightStateResponse, FlightStats

logger = logging.getLogger("aeromind.flights")
router = APIRouter(prefix="/api/v1/flights", tags=["flights"])

# Connected WebSocket clients
ws_clients: set = set()


@router.get("/live", response_model=FlightStateResponse)
async def get_live_flights(
    lamin: Optional[float] = Query(None, description="Min latitude"),
    lomin: Optional[float] = Query(None, description="Min longitude"),
    lamax: Optional[float] = Query(None, description="Max latitude"),
    lomax: Optional[float] = Query(None, description="Max longitude"),
):
    """Get live flight state vectors. Optionally filter by bounding box."""
    # Try cache first
    cached = await cache_service.get("flight_states")
    if cached:
        response = FlightStateResponse(**cached)
        # Apply bbox filter if provided
        if all(v is not None for v in [lamin, lomin, lamax, lomax]):
            response.states = [
                s for s in response.states
                if s.latitude and s.longitude
                and lamin <= s.latitude <= lamax
                and lomin <= s.longitude <= lomax
            ]
            response.total_count = len(response.states)
        return response

    # Fetch fresh data
    bbox = None
    if all(v is not None for v in [lamin, lomin, lamax, lomax]):
        bbox = {"lamin": lamin, "lomin": lomin, "lamax": lamax, "lomax": lomax}

    data = await opensky_service.get_all_states(bbox=bbox)

    # Cache the result
    await cache_service.set("flight_states", data.model_dump())
    return data


@router.get("/stats", response_model=FlightStats)
async def get_flight_stats():
    """Get aggregate flight statistics."""
    cached_stats = await cache_service.get("flight_stats")
    if cached_stats:
        return FlightStats(**cached_stats)

    # Compute from current state
    cached_states = await cache_service.get("flight_states")
    if cached_states:
        response = FlightStateResponse(**cached_states)
        stats = opensky_service.compute_stats(response.states)
        await cache_service.set("flight_stats", stats.model_dump())
        return stats

    return FlightStats()


@router.get("/{icao24}")
async def get_aircraft(icao24: str):
    """Get details and track for a specific aircraft."""
    # Check if aircraft is in current states
    cached = await cache_service.get("flight_states")
    current_state = None
    if cached:
        response = FlightStateResponse(**cached)
        for s in response.states:
            if s.icao24.lower() == icao24.lower():
                current_state = s
                break

    # Get track
    track = await opensky_service.get_aircraft_track(icao24)

    return {
        "icao24": icao24,
        "current_state": current_state.model_dump() if current_state else None,
        "track": track,
    }


@router.websocket("/ws")
async def flight_websocket(websocket: WebSocket):
    """WebSocket endpoint for streaming live flight positions."""
    await websocket.accept()
    ws_clients.add(websocket)
    logger.info("WebSocket client connected. Total: %d", len(ws_clients))

    try:
        while True:
            # Send latest cached flight data every 10 seconds
            cached = await cache_service.get("flight_states")
            if cached:
                # Send a lightweight version (limit to essential fields)
                states = cached.get("states", [])
                lightweight = [{
                    "i": s.get("icao24", ""),
                    "c": s.get("callsign", ""),
                    "la": s.get("latitude"),
                    "lo": s.get("longitude"),
                    "a": s.get("baro_altitude"),
                    "v": s.get("velocity"),
                    "t": s.get("true_track"),
                    "g": s.get("on_ground", False),
                    "co": s.get("origin_country", ""),
                } for s in states[:2000] if s.get("latitude") and s.get("longitude")]

                await websocket.send_json({
                    "type": "flight_update",
                    "time": cached.get("time", int(time.time())),
                    "count": len(lightweight),
                    "states": lightweight,
                })

            await asyncio.sleep(10)
    except WebSocketDisconnect:
        ws_clients.discard(websocket)
        logger.info("WebSocket client disconnected. Total: %d", len(ws_clients))
    except Exception as e:
        ws_clients.discard(websocket)
        logger.error("WebSocket error: %s", e)
