"""
AeroMind Weather Service — Aviation Weather Center + OpenWeatherMap client.
Fetches METAR/TAF, computes weather risk scores, provides global overlays.
"""
import httpx
import logging
import random
from typing import Optional, List, Dict, Any
from app.config import settings
from app.models.schemas import WeatherReport, WeatherRisk, WeatherSeverity

logger = logging.getLogger("aeromind.weather")


class WeatherService:
    FLIGHT_CATEGORIES = {
        "VFR": {"color": "#10b981", "label": "Visual Flight Rules"},
        "MVFR": {"color": "#3b82f6", "label": "Marginal VFR"},
        "IFR": {"color": "#f59e0b", "label": "Instrument Flight Rules"},
        "LIFR": {"color": "#ef4444", "label": "Low IFR"},
    }

    async def get_metar(self, station_ids: str, hours: float = 2.0) -> List[WeatherReport]:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                response = await client.get(
                    f"{settings.awc_base_url}/metar",
                    params={"ids": station_ids, "format": "json", "hours": hours},
                )
                response.raise_for_status()
                data = response.json()
                return [r for obs in (data or []) if (r := self._parse_metar(obs))]
            except Exception as e:
                logger.error("METAR fetch failed for %s: %s", station_ids, e)
                return []

    async def get_taf(self, station_ids: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                response = await client.get(
                    f"{settings.awc_base_url}/taf",
                    params={"ids": station_ids, "format": "json"},
                )
                response.raise_for_status()
                return response.json() or []
            except Exception as e:
                logger.error("TAF fetch failed for %s: %s", station_ids, e)
                return []

    def _parse_metar(self, obs: Dict) -> Optional[WeatherReport]:
        try:
            clouds = []
            if "clouds" in obs and isinstance(obs["clouds"], list):
                clouds = [{"cover": c.get("cover", ""), "base_ft": c.get("base")} for c in obs["clouds"]]
            return WeatherReport(
                station_id=obs.get("icaoId", obs.get("stationId", "")),
                observation_time=obs.get("reportTime", obs.get("obsTime", "")),
                raw_text=obs.get("rawOb", obs.get("rawText", "")),
                temperature_c=obs.get("temp"), dewpoint_c=obs.get("dewp", obs.get("dewpoint")),
                wind_direction_deg=obs.get("wdir", obs.get("windDirection")),
                wind_speed_kt=obs.get("wspd", obs.get("windSpeed")),
                wind_gust_kt=obs.get("wgst", obs.get("windGust")),
                visibility_statute_mi=obs.get("visib", obs.get("visibility")),
                altimeter_inhg=obs.get("altim", obs.get("altimeter")),
                flight_category=obs.get("fltcat", obs.get("flightCategory")),
                weather_string=obs.get("wxString"), cloud_layers=clouds,
            )
        except Exception as e:
            logger.debug("METAR parse error: %s", e)
            return None

    def compute_weather_risk(self, report: WeatherReport) -> WeatherRisk:
        vis = report.visibility_statute_mi or 10
        visibility_risk = 0.9 if vis < 1 else 0.6 if vis < 3 else 0.3 if vis < 5 else 0.1

        ws = report.wind_speed_kt or 0
        wg = report.wind_gust_kt or 0
        turbulence = 0.9 if ws >= 30 or wg >= 45 else 0.6 if ws >= 20 else 0.4 if ws >= 15 else 0.2 if ws >= 10 else 0.05

        gust_spread = max(0, wg - ws)
        wind_shear = 0.8 if gust_spread >= 20 else 0.6 if gust_spread >= 15 else 0.4 if gust_spread >= 10 else 0.2 if gust_spread >= 5 else 0.05

        wx = (report.weather_string or "").upper()
        precip = 0.8 if any(x in wx for x in ["TS", "+RA", "+SN", "FZ"]) else 0.5 if any(x in wx for x in ["RA", "SN"]) else 0.25 if any(x in wx for x in ["-RA", "BR", "HZ"]) else 0.05

        temp = report.temperature_c
        icing = 0.05
        if temp is not None and -15 <= temp <= 0:
            icing = 0.8 if report.dewpoint_c and abs(temp - report.dewpoint_c) <= 2 else 0.5

        overall = turbulence * 0.25 + visibility_risk * 0.25 + wind_shear * 0.20 + precip * 0.20 + icing * 0.10
        if overall >= 0.7:
            severity, advisory = WeatherSeverity.SEVERE, "SEVERE weather. Major disruptions expected."
        elif overall >= 0.5:
            severity, advisory = WeatherSeverity.HIGH, "Significant weather risks. Exercise caution."
        elif overall >= 0.3:
            severity, advisory = WeatherSeverity.MODERATE, "Moderate weather impact. Monitor closely."
        else:
            severity, advisory = WeatherSeverity.LOW, "Favorable conditions for operations."

        return WeatherRisk(
            station_id=report.station_id, turbulence_risk=round(turbulence, 2),
            visibility_risk=round(visibility_risk, 2), wind_shear_risk=round(wind_shear, 2),
            precipitation_risk=round(precip, 2), icing_risk=round(icing, 2),
            overall_risk=round(overall, 2), severity=severity, advisory=advisory,
        )

    async def get_global_weather_overlay(self) -> List[Dict]:
        major = [
            {"lat": 40.64, "lon": -73.78, "name": "JFK"}, {"lat": 51.47, "lon": -0.46, "name": "LHR"},
            {"lat": 25.25, "lon": 55.36, "name": "DXB"}, {"lat": 35.55, "lon": 139.78, "name": "NRT"},
            {"lat": 1.36, "lon": 103.99, "name": "SIN"}, {"lat": 33.94, "lon": -118.41, "name": "LAX"},
            {"lat": 49.01, "lon": 2.55, "name": "CDG"}, {"lat": 22.31, "lon": 113.91, "name": "HKG"},
            {"lat": -33.95, "lon": 151.18, "name": "SYD"}, {"lat": 28.57, "lon": 77.10, "name": "DEL"},
        ]
        if not settings.openweather_api_key:
            return [
                {**a, "temp_c": round(20 + random.uniform(-10, 15), 1), "wind_speed": round(5 + random.uniform(0, 20), 1),
                 "humidity": random.randint(30, 90), "description": random.choice(["clear", "clouds", "rain", "haze"]),
                 "risk_score": round(random.uniform(0.05, 0.7), 2)} for a in major
            ]

        points = []
        async with httpx.AsyncClient(timeout=10) as client:
            for ap in major:
                try:
                    r = await client.get(f"{settings.openweather_base_url}/weather",
                        params={"lat": ap["lat"], "lon": ap["lon"], "appid": settings.openweather_api_key, "units": "metric"})
                    if r.status_code == 200:
                        d = r.json()
                        points.append({**ap, "temp_c": d["main"]["temp"], "wind_speed": d["wind"]["speed"],
                            "humidity": d["main"]["humidity"], "description": d["weather"][0]["description"]})
                except Exception:
                    continue
        return points


weather_service = WeatherService()
