"""
AeroMind Simulation Router — Digital twin airport simulation endpoints.
"""
import logging
import random
import math
from typing import List
from fastapi import APIRouter
from app.services.simulation_service import simulation_service

logger = logging.getLogger("aeromind.simulation")
router = APIRouter(prefix="/api/v1/simulation", tags=["simulation"])


@router.get("/{icao}/state")
async def get_simulation_state(icao: str, speed: float = 1.0):
    """Get current airport simulation state."""
    return simulation_service.get_state(icao.upper(), speed)


@router.get("/{icao}/gates")
async def get_gate_status(icao: str):
    """Get gate occupancy for an airport."""
    return simulation_service.get_gates(icao.upper())


@router.get("/{icao}/runway")
async def get_runway_status(icao: str):
    """Get runway queue and activity."""
    return simulation_service.get_runway_status(icao.upper())
