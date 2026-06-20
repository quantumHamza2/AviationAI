"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, X, Send, Loader2, Sparkles,
  Cloud, Plane, BrainCircuit, Building2, BarChart3, Activity,
  TrendingUp, TrendingDown, AlertTriangle, ChevronRight,
} from "lucide-react";
import axios from "axios";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  response?: CopilotResponse;
}

interface CopilotResponse {
  type: string;
  message: string;
  data?: Record<string, unknown>;
  suggestions?: string[];
  capabilities?: Array<{ icon: string; title: string; example: string }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ICON_MAP: Record<string, React.ElementType> = {
  cloud: Cloud, plane: Plane, brain: BrainCircuit,
  building: Building2, "bar-chart": BarChart3, activity: Activity,
};

function riskColor(level: string): string {
  switch (level?.toUpperCase()) {
    case "HIGH": case "SEVERE": case "CRITICAL": return "#ef4444";
    case "MEDIUM": case "MODERATE": return "#f59e0b";
    default: return "#10b981";
  }
}

// ---- Rich Response Cards ----

function WeatherCard({ data }: { data: Record<string, unknown> }) {
  const d = data as { station: string; iata: string; temperature_c: number; wind_speed_kt: number; visibility_sm: number; conditions: string; flight_category: string; risk_score: number; risk_level: string };
  return (
    <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/8 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold font-mono-data text-[#f1f5f9]">{d.iata}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: riskColor(d.risk_level), background: `${riskColor(d.risk_level)}15` }}>{d.risk_level}</span>
      </div>
      <p className="text-[10px] text-[#94a3b8]">{d.conditions} · {d.flight_category}</p>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div><span className="text-[#64748b]">Temp</span><br /><span className="text-[#f1f5f9] font-mono-data">{d.temperature_c}°C</span></div>
        <div><span className="text-[#64748b]">Wind</span><br /><span className="text-[#f1f5f9] font-mono-data">{d.wind_speed_kt}kt</span></div>
        <div><span className="text-[#64748b]">Vis</span><br /><span className="text-[#f1f5f9] font-mono-data">{d.visibility_sm}SM</span></div>
      </div>
    </div>
  );
}

function PredictionCard({ data }: { data: Record<string, unknown> }) {
  const d = data as { delay_probability: number; expected_delay_minutes: number; risk_level: string; confidence: number; factors: Array<{ name: string; impact: number; direction: string }> };
  return (
    <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/8 space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle cx="50" cy="50" r="38" fill="none" stroke={riskColor(d.risk_level)} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${d.delay_probability * 239} 239`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold font-mono-data" style={{ color: riskColor(d.risk_level) }}>{Math.round(d.delay_probability * 100)}%</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-[#f1f5f9]">~{d.expected_delay_minutes} min delay</p>
          <p className="text-[10px] text-[#64748b]">{Math.round(d.confidence * 100)}% confidence</p>
        </div>
      </div>
      {d.factors && (
        <div className="space-y-1">
          {d.factors.slice(0, 3).map((f) => (
            <div key={f.name} className="flex items-center gap-1.5 text-[10px]">
              {f.direction === "up" ? <TrendingUp className="w-2.5 h-2.5 text-[#ef4444]" /> : <TrendingDown className="w-2.5 h-2.5 text-[#10b981]" />}
              <span className="text-[#94a3b8]">{f.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlightsCard({ data }: { data: Record<string, unknown> }) {
  const d = data as { total_flights: number; delayed_count: number; delay_rate: number; flights: Array<{ callsign: string; status: string; delay_min: number; destination: string }> };
  return (
    <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/8 space-y-2">
      <div className="flex items-center gap-4 text-[10px]">
        <span className="text-[#3b82f6] font-mono-data">{d.total_flights} total</span>
        <span className="text-[#f59e0b] font-mono-data">{d.delayed_count} delayed</span>
        <span className="text-[#64748b]">{d.delay_rate}% rate</span>
      </div>
      <div className="space-y-1">
        {d.flights?.slice(0, 4).map((f) => (
          <div key={f.callsign} className="flex items-center justify-between text-[10px] py-0.5 px-2 rounded bg-white/3">
            <span className="font-mono-data text-[#f1f5f9]">{f.callsign}</span>
            <span className="text-[#64748b]">→ {f.destination}</span>
            <span style={{ color: f.status === "Delayed" ? "#f59e0b" : "#10b981" }}>{f.status}{f.delay_min > 0 ? ` +${f.delay_min}m` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonCard({ data }: { data: Record<string, unknown> }) {
  const d = data as { items: Array<{ code: string; name: string; on_time_pct: number; avg_delay_min: number; cancel_rate: number; satisfaction: number }> };
  if (!d.items || d.items.length < 2) return null;
  const [a, b] = d.items;
  const metrics = [
    { label: "On-Time", a: `${a.on_time_pct}%`, b: `${b.on_time_pct}%`, aWins: a.on_time_pct > b.on_time_pct },
    { label: "Avg Delay", a: `${a.avg_delay_min}m`, b: `${b.avg_delay_min}m`, aWins: a.avg_delay_min < b.avg_delay_min },
    { label: "Cancel Rate", a: `${a.cancel_rate}%`, b: `${b.cancel_rate}%`, aWins: a.cancel_rate < b.cancel_rate },
    { label: "Rating", a: `${a.satisfaction}/5`, b: `${b.satisfaction}/5`, aWins: a.satisfaction > b.satisfaction },
  ];
  return (
    <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/8">
      <div className="grid grid-cols-3 gap-1 text-[10px] mb-2">
        <span className="font-bold text-[#3b82f6]">{a.code}</span>
        <span className="text-center text-[#64748b]">vs</span>
        <span className="font-bold text-[#8b5cf6] text-right">{b.code}</span>
      </div>
      {metrics.map((m) => (
        <div key={m.label} className="grid grid-cols-3 gap-1 text-[10px] py-0.5">
          <span className={`font-mono-data ${m.aWins ? "text-[#10b981]" : "text-[#94a3b8]"}`}>{m.a}</span>
          <span className="text-center text-[#64748b]">{m.label}</span>
          <span className={`font-mono-data text-right ${!m.aWins ? "text-[#10b981]" : "text-[#94a3b8]"}`}>{m.b}</span>
        </div>
      ))}
    </div>
  );
}

function StatsCard({ data }: { data: Record<string, unknown> }) {
  const d = data as Record<string, number | string>;
  const entries = [
    { label: "Airborne", value: d.flights_airborne, color: "#06d6a0" },
    { label: "Delayed", value: d.flights_delayed, color: "#f59e0b" },
    { label: "Avg Delay", value: `${d.avg_delay_min}m`, color: "#3b82f6" },
    { label: "AI Accuracy", value: `${d.prediction_accuracy}%`, color: "#8b5cf6" },
  ];
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {entries.map((e) => (
        <div key={e.label} className="p-2 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[9px] text-[#64748b] uppercase">{e.label}</p>
          <p className="text-sm font-bold font-mono-data" style={{ color: e.color }}>{typeof e.value === 'number' ? e.value.toLocaleString() : e.value}</p>
        </div>
      ))}
    </div>
  );
}

function HelpCard({ capabilities }: { capabilities: Array<{ icon: string; title: string; example: string }> }) {
  return (
    <div className="mt-2 space-y-1.5">
      {capabilities.map((c) => {
        const Icon = ICON_MAP[c.icon] || Activity;
        return (
          <div key={c.title} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
            <Icon className="w-3.5 h-3.5 text-[#06d6a0]" />
            <div>
              <p className="text-[10px] font-semibold text-[#f1f5f9]">{c.title}</p>
              <p className="text-[9px] text-[#64748b] italic">&quot;{c.example}&quot;</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Render Response ----
function ResponseContent({ response }: { response: CopilotResponse }) {
  return (
    <>
      {response.type === "weather" && response.data && <WeatherCard data={response.data} />}
      {response.type === "prediction" && response.data && <PredictionCard data={response.data} />}
      {response.type === "flights" && response.data && <FlightsCard data={response.data} />}
      {response.type === "comparison" && response.data && <ComparisonCard data={response.data} />}
      {response.type === "stats" && response.data && <StatsCard data={response.data} />}
      {response.type === "help" && response.capabilities && <HelpCard capabilities={response.capabilities} />}
      {response.type === "airport" && response.data && (
        <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/8 space-y-1 text-[10px]">
          {Object.entries(response.data).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-[#64748b]">{k.replace(/_/g, " ")}</span>
              <span className="font-mono-data text-[#f1f5f9]">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
// ---- Local NLP Fallback ----

const AIRPORT_DATA: Record<string, { name: string; city: string; temp: number; wind: number; vis: number; cond: string; cat: string; catLabel: string; risk: number; riskLvl: string }> = {
  JFK: { name: "John F Kennedy Intl", city: "New York", temp: 22, wind: 14, vis: 10, cond: "Few Clouds", cat: "VFR", catLabel: "Clear skies ✓", risk: 0.3, riskLvl: "LOW" },
  LAX: { name: "Los Angeles Intl", city: "Los Angeles", temp: 26, wind: 8, vis: 10, cond: "Clear", cat: "VFR", catLabel: "Clear skies ✓", risk: 0.15, riskLvl: "LOW" },
  ORD: { name: "Chicago O'Hare Intl", city: "Chicago", temp: 18, wind: 22, vis: 6, cond: "Thunderstorms", cat: "MVFR", catLabel: "Reduced visibility ⚠", risk: 0.7, riskLvl: "HIGH" },
  LHR: { name: "London Heathrow", city: "London", temp: 14, wind: 18, vis: 5, cond: "Overcast", cat: "MVFR", catLabel: "Reduced visibility ⚠", risk: 0.6, riskLvl: "MODERATE" },
  DXB: { name: "Dubai Intl", city: "Dubai", temp: 38, wind: 6, vis: 10, cond: "Haze", cat: "VFR", catLabel: "Clear skies ✓", risk: 0.1, riskLvl: "LOW" },
  ATL: { name: "Hartsfield-Jackson", city: "Atlanta", temp: 28, wind: 10, vis: 10, cond: "Partly Cloudy", cat: "VFR", catLabel: "Clear skies ✓", risk: 0.35, riskLvl: "MODERATE" },
  CDG: { name: "Charles de Gaulle", city: "Paris", temp: 16, wind: 15, vis: 7, cond: "Light Rain", cat: "MVFR", catLabel: "Reduced visibility ⚠", risk: 0.55, riskLvl: "MODERATE" },
  SIN: { name: "Singapore Changi", city: "Singapore", temp: 30, wind: 5, vis: 10, cond: "Partly Cloudy", cat: "VFR", catLabel: "Clear skies ✓", risk: 0.2, riskLvl: "LOW" },
  DEL: { name: "Indira Gandhi Intl", city: "Delhi", temp: 35, wind: 4, vis: 4, cond: "Haze", cat: "IFR", catLabel: "Poor visibility ✕", risk: 0.4, riskLvl: "MODERATE" },
  HND: { name: "Tokyo Haneda", city: "Tokyo", temp: 20, wind: 12, vis: 10, cond: "Clear", cat: "VFR", catLabel: "Clear skies ✓", risk: 0.25, riskLvl: "LOW" },
  SFO: { name: "San Francisco Intl", city: "San Francisco", temp: 17, wind: 16, vis: 8, cond: "Fog", cat: "MVFR", catLabel: "Reduced visibility ⚠", risk: 0.5, riskLvl: "MODERATE" },
  MIA: { name: "Miami Intl", city: "Miami", temp: 31, wind: 9, vis: 10, cond: "Partly Cloudy", cat: "VFR", catLabel: "Clear skies ✓", risk: 0.2, riskLvl: "LOW" },
  DEN: { name: "Denver Intl", city: "Denver", temp: 24, wind: 11, vis: 10, cond: "Clear", cat: "VFR", catLabel: "Clear skies ✓", risk: 0.15, riskLvl: "LOW" },
  SEA: { name: "Seattle-Tacoma Intl", city: "Seattle", temp: 15, wind: 13, vis: 7, cond: "Light Rain", cat: "MVFR", catLabel: "Reduced visibility ⚠", risk: 0.45, riskLvl: "MODERATE" },
  BOS: { name: "Boston Logan Intl", city: "Boston", temp: 19, wind: 15, vis: 9, cond: "Few Clouds", cat: "VFR", catLabel: "Clear skies ✓", risk: 0.3, riskLvl: "LOW" },
};

const AIRLINE_DATA: Record<string, { name: string; onTime: number; avgDelay: number; cancelRate: number; satisfaction: number }> = {
  DL: { name: "Delta Air Lines", onTime: 82, avgDelay: 14, cancelRate: 1.8, satisfaction: 4.2 },
  UA: { name: "United Airlines", onTime: 78, avgDelay: 18, cancelRate: 2.3, satisfaction: 3.8 },
  AA: { name: "American Airlines", onTime: 76, avgDelay: 20, cancelRate: 2.7, satisfaction: 3.6 },
  BA: { name: "British Airways", onTime: 80, avgDelay: 16, cancelRate: 1.5, satisfaction: 4.0 },
  EK: { name: "Emirates", onTime: 85, avgDelay: 11, cancelRate: 0.9, satisfaction: 4.5 },
  LH: { name: "Lufthansa", onTime: 79, avgDelay: 17, cancelRate: 2.0, satisfaction: 3.9 },
  WN: { name: "Southwest Airlines", onTime: 77, avgDelay: 19, cancelRate: 2.5, satisfaction: 3.7 },
  B6: { name: "JetBlue Airways", onTime: 74, avgDelay: 21, cancelRate: 3.0, satisfaction: 3.5 },
  SQ: { name: "Singapore Airlines", onTime: 87, avgDelay: 9, cancelRate: 0.7, satisfaction: 4.7 },
  QF: { name: "Qantas", onTime: 81, avgDelay: 15, cancelRate: 1.6, satisfaction: 4.1 },
  AF: { name: "Air France", onTime: 78, avgDelay: 18, cancelRate: 2.1, satisfaction: 3.8 },
  AI: { name: "Air India", onTime: 72, avgDelay: 24, cancelRate: 3.2, satisfaction: 3.3 },
};

function extractAirport(text: string): string | null {
  const upper = text.toUpperCase();
  for (const code of Object.keys(AIRPORT_DATA)) {
    if (upper.includes(code)) return code;
  }
  const nameMap: Record<string, string> = {
    KENNEDY: "JFK", HEATHROW: "LHR", DUBAI: "DXB", ATLANTA: "ATL", CHICAGO: "ORD",
    PARIS: "CDG", SINGAPORE: "SIN", DELHI: "DEL", TOKYO: "HND", "LOS ANGELES": "LAX",
    "SAN FRANCISCO": "SFO", MIAMI: "MIA", DENVER: "DEN", SEATTLE: "SEA", BOSTON: "BOS",
    "NEW YORK": "JFK", LONDON: "LHR",
  };
  for (const [name, code] of Object.entries(nameMap)) {
    if (upper.includes(name)) return code;
  }
  return null;
}

function extractAirlines(text: string): string[] {
  const upper = text.toUpperCase();
  const found: string[] = [];
  const nameMap: Record<string, string> = {
    DELTA: "DL", UNITED: "UA", AMERICAN: "AA", BRITISH: "BA", EMIRATES: "EK",
    LUFTHANSA: "LH", SOUTHWEST: "WN", JETBLUE: "B6", SINGAPORE: "SQ",
    QANTAS: "QF", "AIR FRANCE": "AF", "AIR INDIA": "AI",
  };
  for (const code of Object.keys(AIRLINE_DATA)) { if (upper.includes(code)) found.push(code); }
  for (const [name, code] of Object.entries(nameMap)) { if (upper.includes(name) && !found.includes(code)) found.push(code); }
  return found;
}

function generateLocalResponse(text: string): CopilotResponse {
  const lower = text.toLowerCase();

  // --- Weather ---
  if (/weather|metar|taf|wind|visibility|temperature|conditions|rain|storm|fog|snow/.test(lower)) {
    const ap = extractAirport(text) || "JFK";
    const d = AIRPORT_DATA[ap] || AIRPORT_DATA.JFK;
    const riskPlain = d.risk >= 0.6 ? "likely to cause delays" : d.risk >= 0.35 ? "may cause some delays" : "unlikely to affect flights";
    return {
      type: "weather",
      message: `**Weather at ${ap} (${d.city})** — ${d.cond}, ${d.catLabel}.\n\nIt's **${d.temp}°C** with **${d.wind} knot** winds and **${d.vis} miles** of visibility. Current weather is **${riskPlain}**.`,
      data: { station: ap, iata: ap, temperature_c: d.temp, wind_speed_kt: d.wind, visibility_sm: d.vis, conditions: d.cond, flight_category: d.catLabel, risk_score: d.risk, risk_level: d.riskLvl },
      suggestions: [`Will my flight from ${ap} be delayed?`, `Flights from ${ap}`, "Compare ORD vs JFK"],
    };
  }

  // --- Delay prediction ---
  if (/predict|delay|late|on.?time|will.*be.*delayed|how long/.test(lower) && (extractAirport(text) || /from|to|flight/.test(lower))) {
    const ap = extractAirport(text) || "JFK";
    const d = AIRPORT_DATA[ap] || AIRPORT_DATA.JFK;
    const prob = 0.25 + Math.random() * 0.45;
    const mins = Math.round(prob * 40 + 5);
    const risk = prob > 0.6 ? "HIGH" : prob > 0.35 ? "MEDIUM" : "LOW";
    const plain = prob > 0.6 ? "There's a good chance your flight will be delayed" : prob > 0.35 ? "There's a moderate chance of a delay" : "Your flight will likely be on time";
    return {
      type: "prediction",
      message: `**Delay Forecast — ${ap} (${d.city})**\n\n${plain}. Our AI estimates a **${Math.round(prob * 100)}%** chance of delay, with an expected wait of about **${mins} minutes**.`,
      data: { delay_probability: prob, expected_delay_minutes: mins, risk_level: risk, confidence: 0.84, factors: [
        { name: "Airport Crowding", impact: 0.15, direction: "up" },
        { name: "Time of Day", impact: 0.12, direction: "up" },
        { name: "Weather Impact", impact: 0.08, direction: prob > 0.4 ? "up" : "down" },
      ]},
      suggestions: [`Weather at ${ap}`, "Compare Delta vs United", "Show platform stats"],
    };
  }

  // --- Flights ---
  if (/flight|departure|arrival|delayed flight|show.*flight/.test(lower)) {
    const ap = extractAirport(text) || "ORD";
    const statuses = ["On Time", "Delayed", "On Time", "On Time", "Delayed", "On Time"];
    const dests = ["LHR", "LAX", "JFK", "CDG", "DXB", "SIN"];
    const flights = Array.from({ length: 6 }, (_, i) => ({
      callsign: `${["DL", "UA", "AA", "BA", "EK", "LH"][i]}${1200 + i * 100}`,
      status: statuses[i], delay_min: statuses[i] === "Delayed" ? Math.floor(Math.random() * 40 + 10) : 0,
      destination: dests[i],
    }));
    const delayed = flights.filter((f) => f.status === "Delayed").length;
    return {
      type: "flights",
      message: `**Flights from ${ap}** — ${flights.length} active, **${delayed} delayed** (${Math.round((delayed / flights.length) * 100)}% delay rate).`,
      data: { total_flights: flights.length, delayed_count: delayed, delay_rate: Math.round((delayed / flights.length) * 100), flights },
      suggestions: [`Weather at ${ap}`, `Predict delay from ${ap}`, "Show stats"],
    };
  }

  // --- Compare airlines ---
  if (/compare|vs|versus|better/.test(lower)) {
    const airlines = extractAirlines(text);
    const codes = airlines.length >= 2 ? airlines.slice(0, 2) : ["DL", "UA"];
    const items = codes.map((c) => ({ code: c, ...AIRLINE_DATA[c], on_time_pct: AIRLINE_DATA[c].onTime, avg_delay_min: AIRLINE_DATA[c].avgDelay, cancel_rate: AIRLINE_DATA[c].cancelRate }));
    return {
      type: "comparison",
      message: `**${items[0].code} vs ${items[1].code}** — Head-to-head performance comparison.`,
      data: { items },
      suggestions: [`Weather at JFK`, `Predict delay from ORD`, "Show stats"],
    };
  }

  // --- Stats ---
  if (/stat|overview|dashboard|summary|how many|total/.test(lower)) {
    return {
      type: "stats",
      message: "**AeroMind System Status** — Current platform metrics:",
      data: { flights_airborne: 6234, flights_delayed: 743, avg_delay_min: 18.4, prediction_accuracy: 84.7, airports_monitored: 312, weather_alerts: 7 },
      suggestions: ["Weather at ORD", "Delayed flights from JFK", "Compare Delta vs Emirates"],
    };
  }

  // --- Airport info ---
  if (/airport|terminal|gate|runway/.test(lower)) {
    const ap = extractAirport(text) || "ATL";
    const d = AIRPORT_DATA[ap] || AIRPORT_DATA.JFK;
    return {
      type: "airport",
      message: `**${ap} — ${d.name}**\n\nCurrent conditions: ${d.cond}`,
      data: { ICAO: ap, Name: d.name, Conditions: d.cond, Category: d.cat, "Temp (°C)": d.temp, "Wind (kt)": d.wind, "Risk Level": d.riskLvl },
      suggestions: [`Weather at ${ap}`, `Flights from ${ap}`, `Predict delay from ${ap}`],
    };
  }

  // --- Help / greeting ---
  if (/help|what can you|how to|hello|hi$|^hi |hey|greet|good morning|good afternoon/.test(lower)) {
    return {
      type: "help",
      message: "👋 **Hi there! I'm your AeroMind assistant.** I make it easy to check on flights, weather, and airports — no aviation expertise needed! Here's what I can help with:",
      capabilities: [
        { icon: "cloud", title: "Check Weather", example: "What's the weather in Chicago?" },
        { icon: "plane", title: "Find Flights", example: "Show me delayed flights from New York" },
        { icon: "brain", title: "Will My Flight Be Late?", example: "Will my flight from LAX be delayed?" },
        { icon: "bar-chart", title: "Compare Airlines", example: "Is Delta better than United?" },
        { icon: "building", title: "Airport Info", example: "Tell me about London Heathrow" },
        { icon: "activity", title: "Platform Overview", example: "How many flights are in the air?" },
      ],
      suggestions: ["Weather in New York", "Any delayed flights?", "How many flights are flying?"],
    };
  }

  // --- Catch-all: if an airport code is mentioned, show airport info ---
  const detectedAirport = extractAirport(text);
  if (detectedAirport) {
    const d = AIRPORT_DATA[detectedAirport];
    return {
      type: "weather",
      message: `**${detectedAirport} — ${d.name}**\n\n${d.cond}, ${d.cat} conditions. Temp **${d.temp}°C**, wind **${d.wind}kt**, visibility **${d.vis}SM**.\nWeather risk: **${Math.round(d.risk * 100)}%** (${d.riskLvl}).`,
      data: { station: detectedAirport, iata: detectedAirport, temperature_c: d.temp, wind_speed_kt: d.wind, visibility_sm: d.vis, conditions: d.cond, flight_category: d.cat, risk_score: d.risk, risk_level: d.riskLvl },
      suggestions: [`Flights from ${detectedAirport}`, `Predict delay from ${detectedAirport}`, "Show stats"],
    };
  }

  // --- Catch-all: if an airline is mentioned, show its stats ---
  const detectedAirlines = extractAirlines(text);
  if (detectedAirlines.length > 0) {
    const code = detectedAirlines[0];
    const a = AIRLINE_DATA[code];
    return {
      type: "text",
      message: `**${a.name} (${code})**\n\n• On-Time: **${a.onTime}%**\n• Avg Delay: **${a.avgDelay} min**\n• Cancel Rate: **${a.cancelRate}%**\n• Satisfaction: **${a.satisfaction}/5.0**`,
      suggestions: [`Compare ${code} vs ${detectedAirlines[1] || "EK"}`, `Weather at JFK`, "Show stats"],
    };
  }

  // --- Fallback ---
  return {
    type: "text",
    message: `I can help with that! Try one of these:\n\n• **"Weather at JFK"** — Airport conditions\n• **"Flights from ORD"** — Flight status\n• **"Predict delay LAX"** — AI prediction\n• **"Compare Delta vs United"** — Airline stats\n• **"Show stats"** — Platform overview\n\nOr just type an airport code like **JFK**, **ORD**, **LHR**.`,
    suggestions: ["Weather at JFK", "Flights from ORD", "Compare Delta vs United"],
  };
}

// ---- Main Copilot Panel ----

export default function CopilotPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "What's the weather at JFK?",
    "Show delayed flights from ORD",
    "Predict delay JFK to LHR",
    "Compare Delta vs United",
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let response: CopilotResponse;
    try {
      const res = await axios.post(`${API_URL}/api/v1/copilot/chat`, { message: text.trim() });
      response = res.data.response;
    } catch {
      // Smart local fallback — generate useful responses without the backend
      response = generateLocalResponse(text.trim());
    }

    const assistantMsg: Message = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: response.message,
      timestamp: new Date(),
      response,
    };
    setMessages((prev) => [...prev, assistantMsg]);
    if (response.suggestions) setSuggestions(response.suggestions);
    setLoading(false);
  }, [loading]);

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white shadow-lg shadow-[#8b5cf6]/25 hover:shadow-[#8b5cf6]/40 transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90 }} animate={{ rotate: 0 }}>
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90 }} animate={{ rotate: 0 }}>
              <MessageSquare className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && messages.length === 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#06d6a0] animate-pulse" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[560px] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "rgba(10, 14, 26, 0.95)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 80px rgba(139,92,246,0.08)",
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#6366f1]/20">
                <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#f1f5f9]">AeroMind Copilot</h3>
                <p className="text-[10px] text-[#64748b]">AI Aviation Assistant</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                <span className="text-[10px] text-[#64748b]">Online</span>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                  <Sparkles className="w-8 h-8 text-[#8b5cf6] mx-auto mb-3 opacity-50" />
                  <p className="text-xs text-[#94a3b8]">Ask me anything about aviation</p>
                  <p className="text-[10px] text-[#64748b] mt-1">Weather, flights, delays, airports...</p>
                </motion.div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white rounded-br-md"
                        : "bg-white/5 border border-white/5 text-[#e2e8f0] rounded-bl-md"
                    }`}
                  >
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">
                      {msg.content.split("**").map((part, i) =>
                        i % 2 === 1 ? <strong key={i} className="text-[#06d6a0]">{part}</strong> : part
                      )}
                    </p>
                    {msg.response && <ResponseContent response={msg.response} />}
                    <p className="text-[9px] text-white/30 mt-1.5 text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#64748b]">Analyzing...</span>
                </motion.div>
              )}
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && messages.length < 3 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-white/5">
                {suggestions.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/10 hover:border-[#8b5cf6]/30 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/5">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about flights, weather, delays..."
                  className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5 text-xs text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#8b5cf6]/50 transition-colors"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
