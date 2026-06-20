"use client";

import { useState } from "react";
import Sidebar from "@/components/Layout/Sidebar";
import TopBar from "@/components/Layout/TopBar";
import { motion } from "framer-motion";
import { Building2, Search, Plane, Users, ArrowUpRight, MapPin, Globe } from "lucide-react";

const AIRPORTS = [
  { icao: "KATL", iata: "ATL", name: "Hartsfield-Jackson Atlanta", city: "Atlanta", country: "US", lat: 33.64, lon: -84.43, flights: 2800, congestion: 78, delay_rate: 22 },
  { icao: "KLAX", iata: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "US", lat: 33.94, lon: -118.41, flights: 2100, congestion: 65, delay_rate: 18 },
  { icao: "KORD", iata: "ORD", name: "Chicago O'Hare International", city: "Chicago", country: "US", lat: 41.97, lon: -87.91, flights: 2400, congestion: 82, delay_rate: 28 },
  { icao: "KJFK", iata: "JFK", name: "John F Kennedy International", city: "New York", country: "US", lat: 40.64, lon: -73.78, flights: 1800, congestion: 71, delay_rate: 25 },
  { icao: "EGLL", iata: "LHR", name: "London Heathrow", city: "London", country: "GB", lat: 51.47, lon: -0.46, flights: 1400, congestion: 88, delay_rate: 20 },
  { icao: "OMDB", iata: "DXB", name: "Dubai International", city: "Dubai", country: "AE", lat: 25.25, lon: 55.36, flights: 1200, congestion: 55, delay_rate: 12 },
  { icao: "RJTT", iata: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "JP", lat: 35.55, lon: 139.78, flights: 1100, congestion: 62, delay_rate: 8 },
  { icao: "LFPG", iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR", lat: 49.01, lon: 2.55, flights: 1300, congestion: 70, delay_rate: 22 },
  { icao: "WSSS", iata: "SIN", name: "Singapore Changi", city: "Singapore", country: "SG", lat: 1.36, lon: 103.99, flights: 1000, congestion: 45, delay_rate: 6 },
  { icao: "VIDP", iata: "DEL", name: "Indira Gandhi International", city: "New Delhi", country: "IN", lat: 28.57, lon: 77.10, flights: 950, congestion: 60, delay_rate: 15 },
  { icao: "KDEN", iata: "DEN", name: "Denver International", city: "Denver", country: "US", lat: 39.86, lon: -104.67, flights: 1700, congestion: 58, delay_rate: 16 },
  { icao: "EDDF", iata: "FRA", name: "Frankfurt am Main", city: "Frankfurt", country: "DE", lat: 50.03, lon: 8.57, flights: 1350, congestion: 72, delay_rate: 19 },
];

function congestionColor(score: number): string {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#3b82f6";
  return "#10b981";
}

export default function AirportsPage() {
  const [search, setSearch] = useState("");
  const filtered = AIRPORTS.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.icao.toLowerCase().includes(search.toLowerCase()) ||
      a.iata.toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen" style={{ marginLeft: 240 }}>
        <TopBar />
        <div className="p-6 space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-2xl font-bold text-[#f1f5f9]">Airports</h1>
            <p className="text-sm text-[#64748b] mt-1">
              Global airport monitoring, congestion tracking, and operational analysis
            </p>
          </motion.div>

          {/* Search */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 max-w-md hover:border-white/10 transition-colors">
            <Search className="w-4 h-4 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search airports by name, ICAO, or IATA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-[#f1f5f9] placeholder-[#64748b] outline-none w-full"
            />
          </div>

          {/* Airport Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((airport, i) => (
              <motion.div
                key={airport.icao}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 cursor-default group hover:glow-blue"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold font-mono-data text-[#f1f5f9]">
                        {airport.iata}
                      </span>
                      <span className="text-xs text-[#64748b] font-mono-data">{airport.icao}</span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-0.5 truncate max-w-[200px]">{airport.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#64748b]" />
                    <span className="text-[10px] text-[#64748b]">{airport.city}, {airport.country}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-[#64748b] uppercase mb-0.5">Flights</p>
                    <p className="text-sm font-bold font-mono-data text-[#3b82f6]">
                      {airport.flights.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#64748b] uppercase mb-0.5">Congestion</p>
                    <p
                      className="text-sm font-bold font-mono-data"
                      style={{ color: congestionColor(airport.congestion) }}
                    >
                      {airport.congestion}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#64748b] uppercase mb-0.5">Delay Rate</p>
                    <p className="text-sm font-bold font-mono-data text-[#f59e0b]">
                      {airport.delay_rate}%
                    </p>
                  </div>
                </div>

                {/* Congestion bar */}
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: congestionColor(airport.congestion) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${airport.congestion}%` }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.8 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
