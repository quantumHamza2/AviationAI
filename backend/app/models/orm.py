from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, JSON, Index
)
from sqlalchemy.sql import func
from app.models.database import Base


class AirportORM(Base):
    """Airport table — seeded from OurAirports dataset."""
    __tablename__ = "airports"

    id = Column(Integer, primary_key=True, index=True)
    ident = Column(String(10), unique=True, index=True, nullable=False)
    type = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    latitude_deg = Column(Float, nullable=False)
    longitude_deg = Column(Float, nullable=False)
    elevation_ft = Column(Float, nullable=True)
    continent = Column(String(10), nullable=True)
    iso_country = Column(String(10), nullable=True)
    iso_region = Column(String(20), nullable=True)
    municipality = Column(String(255), nullable=True)
    iata_code = Column(String(10), nullable=True, index=True)
    scheduled_service = Column(String(5), nullable=True)

    __table_args__ = (
        Index("ix_airports_location", "latitude_deg", "longitude_deg"),
        Index("ix_airports_type", "type"),
    )


class FlightLogORM(Base):
    """Historical flight log for analytics."""
    __tablename__ = "flight_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    icao24 = Column(String(10), index=True, nullable=False)
    callsign = Column(String(20), nullable=True)
    origin_country = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    altitude = Column(Float, nullable=True)
    velocity = Column(Float, nullable=True)
    heading = Column(Float, nullable=True)
    on_ground = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("ix_flight_logs_icao_time", "icao24", "timestamp"),
    )


class WeatherObservationORM(Base):
    """Cached weather observations for airports."""
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(10), index=True, nullable=False)
    raw_text = Column(Text, nullable=True)
    temperature_c = Column(Float, nullable=True)
    dewpoint_c = Column(Float, nullable=True)
    wind_direction = Column(Integer, nullable=True)
    wind_speed_kt = Column(Integer, nullable=True)
    wind_gust_kt = Column(Integer, nullable=True)
    visibility_mi = Column(Float, nullable=True)
    flight_category = Column(String(10), nullable=True)
    observation_time = Column(DateTime(timezone=True), nullable=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_weather_station_time", "station_id", "fetched_at"),
    )


class PredictionLogORM(Base):
    """Log of all delay predictions for model monitoring."""
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    origin = Column(String(10), nullable=False)
    destination = Column(String(10), nullable=False)
    airline = Column(String(10), nullable=True)
    scheduled_departure = Column(DateTime(timezone=True), nullable=True)
    predicted_delay_prob = Column(Float, nullable=True)
    predicted_delay_min = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    model_version = Column(String(20), nullable=True)
    features_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
