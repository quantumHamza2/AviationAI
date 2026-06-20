/**
 * AeroMind Constants — Status colors, airport codes, and mappings.
 */

export const STATUS_COLORS = {
  on_time: "#10b981",
  delayed: "#f59e0b",
  cancelled: "#ef4444",
  diverted: "#8b5cf6",
  en_route: "#3b82f6",
  landed: "#06d6a0",
  unknown: "#64748b",
} as const;

export const RISK_COLORS = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
} as const;

export const FLIGHT_CATEGORY_COLORS: Record<string, { color: string; label: string }> = {
  VFR: { color: "#10b981", label: "Visual Flight Rules" },
  MVFR: { color: "#3b82f6", label: "Marginal VFR" },
  IFR: { color: "#f59e0b", label: "Instrument Flight Rules" },
  LIFR: { color: "#ef4444", label: "Low IFR" },
};

export const AIRCRAFT_CATEGORIES: Record<number, string> = {
  0: "No info",
  1: "No ADS-B",
  2: "Light",
  3: "Small",
  4: "Large",
  5: "High Vortex",
  6: "Heavy",
  7: "High Perf",
  8: "Rotorcraft",
  9: "Glider",
  14: "UAV",
};

export const NAV_ITEMS = [
  { id: "dashboard", label: "Command Center", icon: "LayoutDashboard", href: "/" },
  { id: "flights", label: "Flight Tracker", icon: "Radar", href: "/flights" },
  { id: "weather", label: "Weather Intel", icon: "CloudLightning", href: "/weather" },
  { id: "predictions", label: "AI Predictions", icon: "BrainCircuit", href: "/predictions" },
  { id: "airports", label: "Airports", icon: "Building2", href: "/airports" },
] as const;

export const MAJOR_AIRPORTS = [
  { icao: "KJFK", iata: "JFK", name: "New York JFK", lat: 40.64, lon: -73.78 },
  { icao: "KLAX", iata: "LAX", name: "Los Angeles", lat: 33.94, lon: -118.41 },
  { icao: "KORD", iata: "ORD", name: "Chicago O'Hare", lat: 41.97, lon: -87.91 },
  { icao: "EGLL", iata: "LHR", name: "London Heathrow", lat: 51.47, lon: -0.46 },
  { icao: "OMDB", iata: "DXB", name: "Dubai", lat: 25.25, lon: 55.36 },
  { icao: "RJTT", iata: "HND", name: "Tokyo Haneda", lat: 35.55, lon: 139.78 },
  { icao: "LFPG", iata: "CDG", name: "Paris CDG", lat: 49.01, lon: 2.55 },
  { icao: "WSSS", iata: "SIN", name: "Singapore Changi", lat: 1.36, lon: 103.99 },
  { icao: "VIDP", iata: "DEL", name: "New Delhi", lat: 28.57, lon: 77.10 },
  { icao: "KATL", iata: "ATL", name: "Atlanta", lat: 33.64, lon: -84.43 },
];
