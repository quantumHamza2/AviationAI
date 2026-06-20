"""
AeroMind Airports Router — Airport data endpoints.
"""
import csv
import os
import logging
from typing import Optional, List
from fastapi import APIRouter, Query
from app.services.cache_service import cache_service
from app.models.schemas import Airport

logger = logging.getLogger("aeromind.airports")
router = APIRouter(prefix="/api/v1/airports", tags=["airports"])

# In-memory airport data (loaded once)
_airports_cache: List[dict] = []


def _load_airports_csv():
    """Load airports from the CSV file into memory."""
    global _airports_cache
    csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "airports.csv")
    csv_path = os.path.normpath(csv_path)

    if not os.path.exists(csv_path):
        logger.warning("airports.csv not found at %s", csv_path)
        return

    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            _airports_cache = []
            for row in reader:
                # Filter to medium and large airports for performance
                if row.get("type") not in ("large_airport", "medium_airport"):
                    continue
                try:
                    _airports_cache.append({
                        "id": int(row.get("id", 0)),
                        "ident": row.get("ident", ""),
                        "type": row.get("type", ""),
                        "name": row.get("name", ""),
                        "latitude_deg": float(row.get("latitude_deg", 0)),
                        "longitude_deg": float(row.get("longitude_deg", 0)),
                        "elevation_ft": float(row["elevation_ft"]) if row.get("elevation_ft") else None,
                        "continent": row.get("continent", ""),
                        "iso_country": row.get("iso_country", ""),
                        "iso_region": row.get("iso_region", ""),
                        "municipality": row.get("municipality", ""),
                        "iata_code": row.get("iata_code", ""),
                        "scheduled_service": row.get("scheduled_service", ""),
                    })
                except (ValueError, TypeError):
                    continue

        logger.info("Loaded %d airports from CSV", len(_airports_cache))
    except Exception as e:
        logger.error("Failed to load airports CSV: %s", e)


# Load on module import
_load_airports_csv()


@router.get("", response_model=List[Airport])
async def list_airports(
    search: Optional[str] = Query(None, description="Search by name, ICAO, or IATA code"),
    type: Optional[str] = Query(None, description="Filter by airport type"),
    country: Optional[str] = Query(None, description="Filter by ISO country code"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
):
    """List airports with optional search and filtering."""
    results = _airports_cache

    if search:
        s = search.upper()
        results = [
            a for a in results
            if s in a["ident"].upper()
            or s in (a.get("iata_code") or "").upper()
            or s in a["name"].upper()
            or s in (a.get("municipality") or "").upper()
        ]

    if type:
        results = [a for a in results if a["type"] == type]

    if country:
        results = [a for a in results if a["iso_country"] == country.upper()]

    total = len(results)
    results = results[offset:offset + limit]

    return results


@router.get("/busiest")
async def get_busiest_airports(limit: int = Query(20, le=50)):
    """Get busiest airports (by type = large_airport)."""
    large = [a for a in _airports_cache if a["type"] == "large_airport"]
    return large[:limit]


@router.get("/{icao}")
async def get_airport(icao: str):
    """Get details for a specific airport."""
    icao_upper = icao.upper()
    for a in _airports_cache:
        if a["ident"] == icao_upper:
            return a
    return {"error": f"Airport {icao_upper} not found"}
