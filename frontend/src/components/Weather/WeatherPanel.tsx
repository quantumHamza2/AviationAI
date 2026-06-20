"use client";

import { motion } from "framer-motion";
import { Cloud, Wind, Eye, Thermometer, Droplets, AlertTriangle } from "lucide-react";

interface WeatherData {
  name: string;
  temp_c: number;
  wind_speed: number;
  humidity: number;
  description: string;
  risk_score: number;
}

const MOCK_WEATHER: WeatherData[] = [
  { name: "JFK", temp_c: 18, wind_speed: 12, humidity: 65, description: "Scattered clouds", risk_score: 0.25 },
  { name: "LHR", temp_c: 14, wind_speed: 18, humidity: 78, description: "Light rain", risk_score: 0.45 },
  { name: "DXB", temp_c: 38, wind_speed: 5, humidity: 30, description: "Clear sky", risk_score: 0.10 },
  { name: "SIN", temp_c: 30, wind_speed: 6, humidity: 85, description: "Thunderstorm", risk_score: 0.72 },
  { name: "ORD", temp_c: 20, wind_speed: 22, humidity: 58, description: "Windy", risk_score: 0.55 },
  { name: "DEL", temp_c: 35, wind_speed: 4, humidity: 45, description: "Haze", risk_score: 0.35 },
];

function riskColor(score: number): string {
  if (score >= 0.7) return "#ef4444";
  if (score >= 0.5) return "#f59e0b";
  if (score >= 0.3) return "#3b82f6";
  return "#10b981";
}

function riskLabel(score: number): string {
  if (score >= 0.7) return "SEVERE";
  if (score >= 0.5) return "HIGH";
  if (score >= 0.3) return "MODERATE";
  return "LOW";
}

export default function WeatherPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#f1f5f9]">Weather Intelligence</h3>
        <Cloud className="w-4 h-4 text-[#64748b]" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {MOCK_WEATHER.map((w, i) => (
          <motion.div
            key={w.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * i }}
            className="p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all cursor-default"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#f1f5f9] font-mono-data">{w.name}</span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  color: riskColor(w.risk_score),
                  background: `${riskColor(w.risk_score)}15`,
                }}
              >
                {riskLabel(w.risk_score)}
              </span>
            </div>

            <p className="text-[10px] text-[#94a3b8] mb-2 capitalize">{w.description}</p>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-[#f59e0b]" />
                <span className="text-[10px] text-[#94a3b8] font-mono-data">{w.temp_c}°C</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-[#3b82f6]" />
                <span className="text-[10px] text-[#94a3b8] font-mono-data">{w.wind_speed}kt</span>
              </div>
              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-[#06d6a0]" />
                <span className="text-[10px] text-[#94a3b8] font-mono-data">{w.humidity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" style={{ color: riskColor(w.risk_score) }} />
                <span className="text-[10px] text-[#94a3b8] font-mono-data">
                  {Math.round(w.risk_score * 100)}%
                </span>
              </div>
            </div>

            {/* Risk bar */}
            <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: riskColor(w.risk_score) }}
                initial={{ width: 0 }}
                animate={{ width: `${w.risk_score * 100}%` }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
