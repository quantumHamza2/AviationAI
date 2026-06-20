"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  analyticsApi,
  flightsApi,
  weatherApi,
  predictionsApi,
  airportsApi,
  type AnalyticsSummary,
  type FlightStateResponse,
  type WeatherRisk,
  type DelayPrediction,
  type Airport,
} from "@/lib/api";

/**
 * Fetch with fallback — tries the API, falls back to default data on failure.
 * This lets the frontend work standalone without the backend running.
 */
async function fetchWithFallback<T>(
  fetcher: () => Promise<{ data: T }>,
  fallback: T
): Promise<T> {
  try {
    const res = await fetcher();
    return res.data;
  } catch {
    return fallback;
  }
}

// ---- Analytics Hook ----
export function useAnalytics() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchWithFallback<AnalyticsSummary>(
      () => analyticsApi.getSummary(),
      {
        total_flights_tracked: 9847,
        flights_airborne: 6234,
        flights_delayed: 743,
        avg_delay_minutes: 18.4,
        weather_alerts: 7,
        airports_monitored: 312,
        prediction_accuracy: 84.7,
        carbon_emissions_tons: 247500,
      }
    );
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await refresh();
    };
    init();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { data, loading, refresh };
}

// ---- Flights Hook ----
export function useFlights(bbox?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}) {
  const [data, setData] = useState<FlightStateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchWithFallback<FlightStateResponse | null>(
      () => flightsApi.getLive(bbox),
      null
    );
    setData(result);
    setLoading(false);
  }, [bbox]);

  useEffect(() => {
    const init = async () => {
      await refresh();
    };
    init();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { data, loading, refresh };
}

// ---- Weather Risk Hook ----
export function useWeatherRisk(icao: string) {
  const [risk, setRisk] = useState<WeatherRisk | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!icao) return;
    const fetch = async () => {
      setLoading(true);
      const r = await fetchWithFallback<WeatherRisk | null>(
        () => weatherApi.getRisks(icao),
        null
      );
      setRisk(r);
      setLoading(false);
    };
    fetch();
  }, [icao]);

  return { risk, loading };
}

// ---- Airports Hook ----
export function useAirports(params?: {
  search?: string;
  type?: string;
  limit?: number;
}) {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await fetchWithFallback<Airport[]>(
        () => airportsApi.list(params),
        []
      );
      setAirports(data);
      setLoading(false);
    };
    fetch();
  }, [params?.search, params?.type, params?.limit]);

  return { airports, loading };
}

// ---- Delay Prediction Hook ----
export function useDelayPrediction() {
  const [result, setResult] = useState<DelayPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(
    async (data: {
      origin: string;
      destination: string;
      airline?: string;
      scheduled_departure: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await predictionsApi.predictDelay(data);
        setResult(res.data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Prediction failed");
        // Use mock result as fallback
        const seed = (data.origin + data.destination).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        const prob = Math.min(0.95, Math.max(0.08, 0.3 + ((seed % 50) - 25) / 100));
        setResult({
          delay_probability: prob,
          expected_delay_minutes: Math.round(prob * 35 + (seed % 20)),
          confidence: 0.84,
          risk_level: prob > 0.7 ? "high" : prob > 0.4 ? "medium" : "low",
          top_factors: [
            { feature: "Time of Day", value: 0, contribution: 0.15, direction: "increases_delay" },
            { feature: "Airport Congestion", value: 0, contribution: 0.12, direction: "increases_delay" },
            { feature: "Weather Conditions", value: 0, contribution: 0.08, direction: "increases_delay" },
          ],
          explanation: `Estimated ${(prob * 100).toFixed(0)}% delay probability (mock — backend offline)`,
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { result, loading, error, predict };
}

// ---- WebSocket Hook for live flight streaming ----
export function useFlightWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<{
    count: number;
    time: number;
    states: Array<{
      i: string;
      c: string;
      la: number;
      lo: number;
      a: number;
      v: number;
      t: number;
      g: boolean;
      co: string;
    }>;
  } | null>(null);

  useEffect(() => {
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/flights/ws";

    function connect() {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        console.log("[AeroMind] WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "flight_update") {
            setLastUpdate(data);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.log("[AeroMind] WebSocket disconnected, reconnecting in 5s...");
        setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { connected, lastUpdate };
}
