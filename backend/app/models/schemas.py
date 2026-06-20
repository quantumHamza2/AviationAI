"""
AeroMind Pydantic Schemas — Request/Response models for the API.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============================================================
# Enums
# ============================================================

class FlightStatus(str, Enum):
    ON_TIME = "on_time"
    DELAYED = "delayed"
    DIVERTED = "diverted"
    CANCELLED = "cancelled"
    EN_ROUTE = "en_route"
    LANDED = "landed"
    UNKNOWN = "unknown"


class WeatherSeverity(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    SEVERE = "severe"


class AircraftCategory(str, Enum):
    LIGHT = "light"
    SMALL = "small"
    LARGE = "large"
    HEAVY = "heavy"
    HIGH_PERFORMANCE = "high_performance"
    ROTORCRAFT = "rotorcraft"
    OTHER = "other"


# ============================================================
# Flight Schemas
# ============================================================

class FlightState(BaseModel):
    """Real-time aircraft state vector from OpenSky Network."""
    icao24: str = Field(..., description="Unique ICAO 24-bit transponder address (hex)")
    callsign: Optional[str] = Field(None, description="Callsign (8 chars max)")
    origin_country: str = Field("Unknown", description="Country of registration")
    time_position: Optional[int] = Field(None, description="Unix timestamp of last position update")
    last_contact: Optional[int] = Field(None, description="Unix timestamp of last contact")
    longitude: Optional[float] = Field(None, description="WGS-84 longitude in decimal degrees")
    latitude: Optional[float] = Field(None, description="WGS-84 latitude in decimal degrees")
    baro_altitude: Optional[float] = Field(None, description="Barometric altitude in meters")
    on_ground: bool = Field(False, description="Whether aircraft is on ground")
    velocity: Optional[float] = Field(None, description="Ground speed in m/s")
    true_track: Optional[float] = Field(None, description="True track in degrees (0=North)")
    vertical_rate: Optional[float] = Field(None, description="Vertical rate in m/s")
    geo_altitude: Optional[float] = Field(None, description="Geometric altitude in meters")
    squawk: Optional[str] = Field(None, description="Transponder squawk code")
    category: Optional[int] = Field(None, description="Aircraft category (0-20)")

    @property
    def altitude_ft(self) -> Optional[float]:
        """Convert barometric altitude to feet."""
        if self.baro_altitude is not None:
            return round(self.baro_altitude * 3.28084, 0)
        return None

    @property
    def speed_knots(self) -> Optional[float]:
        """Convert velocity from m/s to knots."""
        if self.velocity is not None:
            return round(self.velocity * 1.94384, 1)
        return None


class FlightStateResponse(BaseModel):
    """Response wrapper for flight state vectors."""
    time: int = Field(..., description="Timestamp for these state vectors")
    states: List[FlightState] = Field(default_factory=list)
    total_count: int = Field(0, description="Total number of aircraft")


class FlightTrack(BaseModel):
    """Historical track/trajectory for an aircraft."""
    icao24: str
    callsign: Optional[str] = None
    start_time: int
    end_time: int
    path: List[Dict[str, Any]] = Field(default_factory=list, description="Waypoints with lat, lon, alt, time")


class FlightStats(BaseModel):
    """Global flight statistics snapshot."""
    total_airborne: int = 0
    total_on_ground: int = 0
    by_country: Dict[str, int] = Field(default_factory=dict)
    by_altitude_band: Dict[str, int] = Field(default_factory=dict)
    avg_altitude_ft: float = 0
    avg_speed_knots: float = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# Airport Schemas
# ============================================================

class Airport(BaseModel):
    """Airport information from OurAirports dataset."""
    id: int
    ident: str = Field(..., description="ICAO code (e.g., KJFK)")
    type: str = Field(..., description="Airport type: large_airport, medium_airport, etc.")
    name: str
    latitude_deg: float
    longitude_deg: float
    elevation_ft: Optional[float] = None
    continent: Optional[str] = None
    iso_country: Optional[str] = None
    iso_region: Optional[str] = None
    municipality: Optional[str] = None
    iata_code: Optional[str] = None
    scheduled_service: Optional[str] = None


class AirportDetail(Airport):
    """Extended airport info with live data."""
    current_weather: Optional["WeatherReport"] = None
    congestion_score: Optional[float] = None
    delay_risk: Optional[float] = None
    active_flights: int = 0


# ============================================================
# Weather Schemas
# ============================================================

class WeatherReport(BaseModel):
    """Parsed METAR/TAF weather observation."""
    station_id: str = Field(..., description="ICAO station identifier")
    observation_time: Optional[str] = None
    raw_text: str = Field("", description="Raw METAR/TAF text")
    temperature_c: Optional[float] = None
    dewpoint_c: Optional[float] = None
    wind_direction_deg: Optional[int] = None
    wind_speed_kt: Optional[int] = None
    wind_gust_kt: Optional[int] = None
    visibility_statute_mi: Optional[float] = None
    altimeter_inhg: Optional[float] = None
    flight_category: Optional[str] = Field(None, description="VFR, MVFR, IFR, LIFR")
    weather_string: Optional[str] = None
    cloud_layers: List[Dict[str, Any]] = Field(default_factory=list)


class WeatherRisk(BaseModel):
    """Computed weather risk scores for an airport."""
    station_id: str
    turbulence_risk: float = Field(0, ge=0, le=1)
    visibility_risk: float = Field(0, ge=0, le=1)
    wind_shear_risk: float = Field(0, ge=0, le=1)
    precipitation_risk: float = Field(0, ge=0, le=1)
    icing_risk: float = Field(0, ge=0, le=1)
    overall_risk: float = Field(0, ge=0, le=1)
    severity: WeatherSeverity = WeatherSeverity.LOW
    advisory: str = ""


class WeatherGlobalOverlay(BaseModel):
    """Global weather data for map overlay rendering."""
    timestamp: datetime
    points: List[Dict[str, Any]] = Field(default_factory=list,
        description="Array of {lat, lon, temp, wind_speed, precip, risk_score}")


# ============================================================
# Prediction Schemas
# ============================================================

class DelayPredictionRequest(BaseModel):
    """Input for flight delay prediction."""
    origin: str = Field(..., description="Origin airport ICAO code")
    destination: str = Field(..., description="Destination airport ICAO code")
    airline: Optional[str] = Field(None, description="Airline IATA code")
    scheduled_departure: str = Field(..., description="Scheduled departure time (ISO 8601)")
    aircraft_type: Optional[str] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    month: Optional[int] = Field(None, ge=1, le=12)


class FeatureContribution(BaseModel):
    """Single feature's contribution to a prediction (for SHAP)."""
    feature: str
    value: float
    contribution: float
    direction: str = Field(..., description="'increases_delay' or 'decreases_delay'")


class DelayPredictionResponse(BaseModel):
    """Output from the flight delay prediction engine."""
    delay_probability: float = Field(..., ge=0, le=1, description="Probability of delay")
    expected_delay_minutes: float = Field(0, description="Predicted delay in minutes")
    confidence: float = Field(0, ge=0, le=1)
    risk_level: str = Field("low", description="low, medium, high, critical")
    top_factors: List[FeatureContribution] = Field(default_factory=list)
    model_version: str = "v1.0"
    explanation: str = ""


class CongestionScore(BaseModel):
    """Airport congestion assessment."""
    airport_icao: str
    score: float = Field(0, ge=0, le=100)
    level: str = "normal"  # normal, busy, congested, critical
    predicted_peak: Optional[str] = None
    active_arrivals: int = 0
    active_departures: int = 0
    advisory: str = ""


# ============================================================
# Analytics Schemas
# ============================================================

class AnalyticsSummary(BaseModel):
    """Dashboard KPI summary."""
    total_flights_tracked: int = 0
    flights_airborne: int = 0
    flights_delayed: int = 0
    avg_delay_minutes: float = 0
    weather_alerts: int = 0
    airports_monitored: int = 0
    prediction_accuracy: float = 0
    carbon_emissions_tons: float = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class EmissionsData(BaseModel):
    """Carbon emissions estimate for a route or airline."""
    entity: str = Field(..., description="Airline or route identifier")
    co2_kg: float = 0
    fuel_burn_kg: float = 0
    efficiency_score: float = Field(0, ge=0, le=100)
    distance_km: float = 0


class TrendDataPoint(BaseModel):
    """Single data point in a time series."""
    timestamp: str
    value: float
    label: Optional[str] = None


# Forward reference update
AirportDetail.model_rebuild()
