"""
AeroMind Simulation Service — Airport digital twin engine.

Generates realistic airport simulation state including gate occupancy,
runway activity, and aircraft movement.
"""
import random
import math
import time
import logging
from typing import Dict, List, Any

logger = logging.getLogger("aeromind.simulation")

# Airport layout templates
AIRPORT_LAYOUTS = {
    "KJFK": {"name": "JFK", "terminals": 6, "gates": 128, "runways": 4, "taxiways": 8},
    "KLAX": {"name": "LAX", "terminals": 9, "gates": 146, "runways": 4, "taxiways": 6},
    "KORD": {"name": "ORD", "terminals": 4, "gates": 191, "runways": 8, "taxiways": 10},
    "KATL": {"name": "ATL", "terminals": 7, "gates": 195, "runways": 5, "taxiways": 8},
    "EGLL": {"name": "LHR", "terminals": 4, "gates": 115, "runways": 2, "taxiways": 5},
    "OMDB": {"name": "DXB", "terminals": 3, "gates": 110, "runways": 2, "taxiways": 4},
    "RJTT": {"name": "HND", "terminals": 3, "gates": 95, "runways": 4, "taxiways": 6},
    "LFPG": {"name": "CDG", "terminals": 3, "gates": 120, "runways": 4, "taxiways": 7},
    "WSSS": {"name": "SIN", "terminals": 4, "gates": 105, "runways": 2, "taxiways": 4},
    "VIDP": {"name": "DEL", "terminals": 3, "gates": 78, "runways": 3, "taxiways": 5},
}

AIRLINES = ["AA", "DL", "UA", "WN", "B6", "BA", "EK", "SQ", "LH", "AF", "QF", "AI"]
DESTINATIONS = ["LAX", "ORD", "LHR", "DXB", "SIN", "HND", "CDG", "SYD", "ATL", "DEN", "SFO", "BOS"]


class SimulationService:
    """Airport digital twin simulation engine."""

    def get_state(self, icao: str, speed: float = 1.0) -> Dict[str, Any]:
        """Get the full simulation state for an airport."""
        layout = AIRPORT_LAYOUTS.get(icao, AIRPORT_LAYOUTS["KJFK"])
        seed = int(time.time() * speed) + sum(ord(c) for c in icao)
        rng = random.Random(seed)

        # Generate gates
        gates = self._generate_gates(layout, rng)
        occupied = sum(1 for g in gates if g["status"] != "empty")

        # Generate runway activity
        runways = self._generate_runways(layout, rng)

        # Generate taxiway aircraft
        taxiway_aircraft = self._generate_taxiway_aircraft(layout, rng)

        # Generate approaching aircraft
        approaching = self._generate_approaching(layout, rng)

        return {
            "airport": icao,
            "name": layout["name"],
            "timestamp": time.time(),
            "stats": {
                "total_gates": layout["gates"],
                "occupied_gates": occupied,
                "occupancy_pct": round(occupied / layout["gates"] * 100, 1),
                "active_runways": layout["runways"],
                "aircraft_on_taxiway": len(taxiway_aircraft),
                "approaching": len(approaching),
                "departures_hour": rng.randint(20, 45),
                "arrivals_hour": rng.randint(18, 42),
                "avg_taxi_time_min": round(rng.uniform(8, 22), 1),
            },
            "gates": gates[:40],  # Limit for payload size
            "runways": runways,
            "taxiway_aircraft": taxiway_aircraft,
            "approaching": approaching,
        }

    def get_gates(self, icao: str) -> Dict[str, Any]:
        """Get gate occupancy details."""
        layout = AIRPORT_LAYOUTS.get(icao, AIRPORT_LAYOUTS["KJFK"])
        rng = random.Random(int(time.time() / 30) + sum(ord(c) for c in icao))
        gates = self._generate_gates(layout, rng)
        return {"airport": icao, "gates": gates}

    def get_runway_status(self, icao: str) -> Dict[str, Any]:
        """Get runway queue and activity."""
        layout = AIRPORT_LAYOUTS.get(icao, AIRPORT_LAYOUTS["KJFK"])
        rng = random.Random(int(time.time() / 10) + sum(ord(c) for c in icao))
        runways = self._generate_runways(layout, rng)
        return {"airport": icao, "runways": runways}

    def _generate_gates(self, layout: Dict, rng: random.Random) -> List[Dict]:
        """Generate gate statuses."""
        gates = []
        terminals = ["A", "B", "C", "D", "E", "F", "G", "H", "J"][:layout["terminals"]]
        gates_per_terminal = layout["gates"] // layout["terminals"]

        for t in terminals:
            for g in range(1, gates_per_terminal + 1):
                roll = rng.random()
                if roll < 0.55:
                    status = "occupied"
                    airline = rng.choice(AIRLINES)
                    flight = f"{airline}{rng.randint(100, 9999)}"
                    dest = rng.choice(DESTINATIONS)
                    phase = rng.choice(["boarding", "deboarding", "idle", "pushback"])
                elif roll < 0.75:
                    status = "arriving"
                    airline = rng.choice(AIRLINES)
                    flight = f"{airline}{rng.randint(100, 9999)}"
                    dest = None
                    phase = "approaching"
                else:
                    status = "empty"
                    airline = None
                    flight = None
                    dest = None
                    phase = None

                gates.append({
                    "id": f"{t}{g}",
                    "terminal": t,
                    "status": status,
                    "airline": airline,
                    "flight": flight,
                    "destination": dest,
                    "phase": phase,
                })

        return gates

    def _generate_runways(self, layout: Dict, rng: random.Random) -> List[Dict]:
        """Generate runway status."""
        runway_ids = [f"{rng.randint(1, 35):02d}{'L' if i % 2 == 0 else 'R'}" for i in range(layout["runways"])]
        runways = []
        for rid in runway_ids:
            activity = rng.choice(["departure", "arrival", "idle", "departure", "arrival"])
            queue = rng.randint(0, 6) if activity != "idle" else 0
            runways.append({
                "id": rid,
                "activity": activity,
                "queue_length": queue,
                "current_aircraft": f"{rng.choice(AIRLINES)}{rng.randint(100, 9999)}" if activity != "idle" else None,
                "wind_component": f"{rng.randint(0, 15)}kt {'headwind' if rng.random() > 0.3 else 'crosswind'}",
            })
        return runways

    def _generate_taxiway_aircraft(self, layout: Dict, rng: random.Random) -> List[Dict]:
        """Generate aircraft positions on taxiways."""
        count = rng.randint(3, 12)
        aircraft = []
        for i in range(count):
            aircraft.append({
                "flight": f"{rng.choice(AIRLINES)}{rng.randint(100, 9999)}",
                "position_pct": round(rng.uniform(0, 1), 2),  # 0=gate, 1=runway
                "direction": rng.choice(["to_runway", "to_gate"]),
                "speed_kt": rng.randint(5, 25),
                "taxiway": rng.choice(["A", "B", "C", "D", "E"])[:layout["taxiways"]],
            })
        return aircraft

    def _generate_approaching(self, layout: Dict, rng: random.Random) -> List[Dict]:
        """Generate approaching aircraft."""
        count = rng.randint(2, 8)
        aircraft = []
        for i in range(count):
            dist = round(rng.uniform(2, 25), 1)
            aircraft.append({
                "flight": f"{rng.choice(AIRLINES)}{rng.randint(100, 9999)}",
                "distance_nm": dist,
                "altitude_ft": int(dist * 300 + rng.randint(-500, 500)),
                "speed_kt": rng.randint(140, 250),
                "eta_min": round(dist / 3, 1),
                "origin": rng.choice(DESTINATIONS),
            })
        return sorted(aircraft, key=lambda x: x["distance_nm"])


# Singleton
simulation_service = SimulationService()
