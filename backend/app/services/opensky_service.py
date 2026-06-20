"""
AeroMind OpenSky Service — Client for OpenSky Network REST API.

Handles OAuth2 authentication, state vector fetching, rate limit tracking,
and data transformation. Falls back to anonymous access if no credentials.
"""
import httpx
import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from app.config import settings
from app.models.schemas import FlightState, FlightStateResponse, FlightStats

logger = logging.getLogger("aeromind.opensky")


class OpenSkyTokenManager:
    """Manages OAuth2 bearer tokens for OpenSky API with auto-refresh."""

    def __init__(self):
        self.token: Optional[str] = None
        self.expires_at: Optional[datetime] = None
        self.refresh_margin = 60  # seconds before expiry to refresh

    async def get_token(self, client: httpx.AsyncClient) -> Optional[str]:
        """Get a valid access token, refreshing if needed."""
        if not settings.opensky_client_id or not settings.opensky_client_secret:
            return None  # Anonymous access

        if self.token and self.expires_at and datetime.now() < self.expires_at:
            return self.token

        return await self._refresh(client)

    async def _refresh(self, client: httpx.AsyncClient) -> Optional[str]:
        """Fetch a new access token from OpenSky auth server."""
        try:
            response = await client.post(
                settings.opensky_auth_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.opensky_client_id,
                    "client_secret": settings.opensky_client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            self.token = data["access_token"]
            expires_in = data.get("expires_in", 1800)
            self.expires_at = datetime.now() + timedelta(
                seconds=expires_in - self.refresh_margin
            )
            logger.info("OpenSky token refreshed, expires in %ds", expires_in)
            return self.token
        except Exception as e:
            logger.warning("Failed to refresh OpenSky token: %s. Using anonymous.", e)
            self.token = None
            return None


class OpenSkyService:
    """Client for the OpenSky Network REST API."""

    # Category mapping from OpenSky integer codes
    CATEGORY_MAP = {
        0: "No info", 1: "No ADS-B info", 2: "Light", 3: "Small",
        4: "Large", 5: "High Vortex Large", 6: "Heavy",
        7: "High Performance", 8: "Rotorcraft", 9: "Glider",
        10: "Lighter-than-air", 11: "Parachutist", 12: "Ultralight",
        13: "Reserved", 14: "UAV", 15: "Space vehicle",
        16: "Emergency vehicle", 17: "Service vehicle",
    }

    def __init__(self):
        self.token_manager = OpenSkyTokenManager()
        self._rate_limit_remaining: Optional[int] = None
        self._last_fetch_time: float = 0

    async def _get_headers(self, client: httpx.AsyncClient) -> Dict[str, str]:
        """Build request headers with optional Bearer token."""
        token = await self.token_manager.get_token(client)
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}

    def _track_rate_limit(self, response: httpx.Response):
        """Track API credit usage from response headers."""
        remaining = response.headers.get("X-Rate-Limit-Remaining")
        if remaining:
            self._rate_limit_remaining = int(remaining)
            logger.debug("OpenSky credits remaining: %d", self._rate_limit_remaining)

    def _parse_state_vector(self, sv: list) -> Optional[FlightState]:
        """Parse a raw OpenSky state vector array into a FlightState."""
        try:
            if len(sv) < 17:
                return None
            return FlightState(
                icao24=sv[0] or "",
                callsign=(sv[1] or "").strip() or None,
                origin_country=sv[2] or "Unknown",
                time_position=sv[3],
                last_contact=sv[4],
                longitude=sv[5],
                latitude=sv[6],
                baro_altitude=sv[7],
                on_ground=sv[8] or False,
                velocity=sv[9],
                true_track=sv[10],
                vertical_rate=sv[11],
                geo_altitude=sv[13],
                squawk=sv[14],
                category=sv[17] if len(sv) > 17 else None,
            )
        except (IndexError, ValueError, TypeError) as e:
            logger.debug("Failed to parse state vector: %s", e)
            return None

    async def get_all_states(
        self,
        bbox: Optional[Dict[str, float]] = None,
        icao24: Optional[List[str]] = None,
    ) -> FlightStateResponse:
        """
        Fetch all state vectors from OpenSky.

        Args:
            bbox: Optional bounding box {lamin, lomin, lamax, lomax}
            icao24: Optional list of ICAO24 addresses to filter
        """
        params: Dict[str, Any] = {"extended": 1}

        if bbox:
            params.update(bbox)

        if icao24:
            # OpenSky expects multiple icao24 params
            pass  # handled below

        async with httpx.AsyncClient(timeout=30) as client:
            headers = await self._get_headers(client)
            url = f"{settings.opensky_base_url}/states/all"

            try:
                if icao24:
                    # Build query string manually for multiple icao24
                    icao_params = "&".join(f"icao24={i}" for i in icao24)
                    url = f"{url}?{icao_params}&extended=1"
                    if bbox:
                        bbox_params = "&".join(f"{k}={v}" for k, v in bbox.items())
                        url = f"{url}&{bbox_params}"
                    response = await client.get(url, headers=headers)
                else:
                    response = await client.get(url, headers=headers, params=params)

                self._track_rate_limit(response)

                if response.status_code == 429:
                    retry_after = response.headers.get(
                        "X-Rate-Limit-Retry-After-Seconds", "unknown"
                    )
                    logger.warning("OpenSky rate limited. Retry after %ss", retry_after)
                    return FlightStateResponse(time=int(time.time()), states=[], total_count=0)

                response.raise_for_status()
                data = response.json()

                if not data or "states" not in data or data["states"] is None:
                    return FlightStateResponse(
                        time=data.get("time", int(time.time())),
                        states=[],
                        total_count=0,
                    )

                states = []
                for sv in data["states"]:
                    flight = self._parse_state_vector(sv)
                    if flight and flight.latitude is not None and flight.longitude is not None:
                        states.append(flight)

                self._last_fetch_time = time.time()

                return FlightStateResponse(
                    time=data.get("time", int(time.time())),
                    states=states,
                    total_count=len(states),
                )

            except httpx.HTTPStatusError as e:
                logger.error("OpenSky HTTP error: %s", e.response.status_code)
                return FlightStateResponse(time=int(time.time()), states=[], total_count=0)
            except Exception as e:
                logger.error("OpenSky request failed: %s", e)
                return FlightStateResponse(time=int(time.time()), states=[], total_count=0)

    async def get_aircraft_track(self, icao24: str) -> Optional[Dict]:
        """Get waypoint track for a specific aircraft."""
        async with httpx.AsyncClient(timeout=15) as client:
            headers = await self._get_headers(client)
            url = f"{settings.opensky_base_url}/tracks/all"
            params = {"icao24": icao24, "time": 0}

            try:
                response = await client.get(url, headers=headers, params=params)
                self._track_rate_limit(response)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error("Failed to get track for %s: %s", icao24, e)
                return None

    async def get_arrivals(self, airport: str, begin: int, end: int) -> List[Dict]:
        """Get arrivals at an airport within a time range."""
        async with httpx.AsyncClient(timeout=15) as client:
            headers = await self._get_headers(client)
            url = f"{settings.opensky_base_url}/flights/arrival"
            params = {"airport": airport, "begin": begin, "end": end}

            try:
                response = await client.get(url, headers=headers, params=params)
                self._track_rate_limit(response)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error("Failed to get arrivals for %s: %s", airport, e)
                return []

    async def get_departures(self, airport: str, begin: int, end: int) -> List[Dict]:
        """Get departures from an airport within a time range."""
        async with httpx.AsyncClient(timeout=15) as client:
            headers = await self._get_headers(client)
            url = f"{settings.opensky_base_url}/flights/departure"
            params = {"airport": airport, "begin": begin, "end": end}

            try:
                response = await client.get(url, headers=headers, params=params)
                self._track_rate_limit(response)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error("Failed to get departures for %s: %s", airport, e)
                return []

    def compute_stats(self, states: List[FlightState]) -> FlightStats:
        """Compute aggregate statistics from state vectors."""
        airborne = [s for s in states if not s.on_ground]
        on_ground = [s for s in states if s.on_ground]

        # Count by country
        country_counts: Dict[str, int] = {}
        for s in states:
            country_counts[s.origin_country] = country_counts.get(s.origin_country, 0) + 1

        # Count by altitude band
        altitude_bands = {"0-10k": 0, "10k-20k": 0, "20k-30k": 0, "30k-40k": 0, "40k+": 0}
        altitudes = []
        speeds = []
        for s in airborne:
            alt_ft = s.altitude_ft
            if alt_ft is not None:
                altitudes.append(alt_ft)
                if alt_ft < 10000:
                    altitude_bands["0-10k"] += 1
                elif alt_ft < 20000:
                    altitude_bands["10k-20k"] += 1
                elif alt_ft < 30000:
                    altitude_bands["20k-30k"] += 1
                elif alt_ft < 40000:
                    altitude_bands["30k-40k"] += 1
                else:
                    altitude_bands["40k+"] += 1

            spd = s.speed_knots
            if spd is not None:
                speeds.append(spd)

        return FlightStats(
            total_airborne=len(airborne),
            total_on_ground=len(on_ground),
            by_country=dict(sorted(country_counts.items(), key=lambda x: -x[1])[:20]),
            by_altitude_band=altitude_bands,
            avg_altitude_ft=round(sum(altitudes) / len(altitudes), 0) if altitudes else 0,
            avg_speed_knots=round(sum(speeds) / len(speeds), 1) if speeds else 0,
        )

    @property
    def rate_limit_remaining(self) -> Optional[int]:
        return self._rate_limit_remaining


# Singleton instance
opensky_service = OpenSkyService()
