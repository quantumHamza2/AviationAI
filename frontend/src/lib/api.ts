/**
 * AeroMind API Client — Axios wrapper for backend communication.
 */
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ---- Flight endpoints ----
export const flightsApi = {
  getLive: (bbox?: {
    lamin: number;
    lomin: number;
    lamax: number;
    lomax: number;
  }) => api.get("/api/v1/flights/live", { params: bbox }),

  getStats: () => api.get("/api/v1/flights/stats"),

  getAircraft: (icao24: string) => api.get(`/api/v1/flights/${icao24}`),
};

// ---- Weather endpoints ----
export const weatherApi = {
  getMetar: (icao: string) => api.get(`/api/v1/weather/metar/${icao}`),
  getTaf: (icao: string) => api.get(`/api/v1/weather/taf/${icao}`),
  getRisks: (icao: string) => api.get(`/api/v1/weather/risks/${icao}`),
  getGlobal: () => api.get("/api/v1/weather/global"),
  getBulk: (stations: string) =>
    api.get("/api/v1/weather/bulk", { params: { stations } }),
};

// ---- Prediction endpoints ----
export const predictionsApi = {
  predictDelay: (data: {
    origin: string;
    destination: string;
    airline?: string;
    scheduled_departure: string;
  }) => api.post("/api/v1/predictions/delay", data),

  getCongestion: (icao: string) =>
    api.get(`/api/v1/predictions/airport/${icao}/congestion`),

  getRiskMap: () => api.get("/api/v1/predictions/risk-map"),
};

// ---- Airport endpoints ----
export const airportsApi = {
  list: (params?: { search?: string; type?: string; limit?: number }) =>
    api.get("/api/v1/airports", { params }),

  get: (icao: string) => api.get(`/api/v1/airports/${icao}`),

  getBusiest: (limit?: number) =>
    api.get("/api/v1/airports/busiest", { params: { limit } }),
};

// ---- Analytics endpoints ----
export const analyticsApi = {
  getSummary: () => api.get("/api/v1/analytics/summary"),
  getTrends: (period?: string) =>
    api.get("/api/v1/analytics/trends", { params: { period } }),
  getEmissions: () => api.get("/api/v1/analytics/emissions"),
};

// ---- Types ----
export interface FlightState {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  latitude: number | null;
  longitude: number | null;
  baro_altitude: number | null;
  on_ground: boolean;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  geo_altitude: number | null;
  squawk: string | null;
  category: number | null;
}

export interface FlightStateResponse {
  time: number;
  states: FlightState[];
  total_count: number;
}

export interface WeatherReport {
  station_id: string;
  raw_text: string;
  temperature_c: number | null;
  dewpoint_c: number | null;
  wind_direction_deg: number | null;
  wind_speed_kt: number | null;
  wind_gust_kt: number | null;
  visibility_statute_mi: number | null;
  flight_category: string | null;
  weather_string: string | null;
  cloud_layers: Array<{ cover: string; base_ft: number | null }>;
}

export interface WeatherRisk {
  station_id: string;
  turbulence_risk: number;
  visibility_risk: number;
  wind_shear_risk: number;
  precipitation_risk: number;
  icing_risk: number;
  overall_risk: number;
  severity: string;
  advisory: string;
}

export interface DelayPrediction {
  delay_probability: number;
  expected_delay_minutes: number;
  confidence: number;
  risk_level: string;
  top_factors: Array<{
    feature: string;
    value: number;
    contribution: number;
    direction: string;
  }>;
  explanation: string;
}

export interface Airport {
  id: number;
  ident: string;
  type: string;
  name: string;
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft: number | null;
  iso_country: string | null;
  municipality: string | null;
  iata_code: string | null;
}

export interface AnalyticsSummary {
  total_flights_tracked: number;
  flights_airborne: number;
  flights_delayed: number;
  avg_delay_minutes: number;
  weather_alerts: number;
  airports_monitored: number;
  prediction_accuracy: number;
  carbon_emissions_tons: number;
}
