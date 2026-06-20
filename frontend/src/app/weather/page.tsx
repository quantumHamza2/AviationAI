"use client";

import Sidebar from "@/components/Layout/Sidebar";
import TopBar from "@/components/Layout/TopBar";
import WeatherPanel from "@/components/Weather/WeatherPanel";
import { motion } from "framer-motion";
import { CloudLightning, Thermometer, Wind, Eye, Droplets, AlertTriangle } from "lucide-react";

const METAR_EXAMPLES = [
  { icao: "KJFK", raw: "KJFK 261856Z 31012G18KT 10SM FEW250 18/06 A3012 RMK AO2", category: "VFR" },
  { icao: "EGLL", raw: "EGLL 261850Z 24008KT 9999 FEW040 14/08 Q1018", category: "VFR" },
  { icao: "WSSS", raw: "WSSS 261830Z 18006KT 3000 TSRA SCT010CB BKN020 30/26 Q1008", category: "IFR" },
  { icao: "KORD", raw: "KORD 261851Z 28022G35KT 6SM -RA BKN030 OVC060 20/14 A2978", category: "MVFR" },
];

const CATEGORY_COLORS: Record<string, string> = {
  VFR: "#10b981",
  MVFR: "#3b82f6",
  IFR: "#f59e0b",
  LIFR: "#ef4444",
};

export default function WeatherPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen" style={{ marginLeft: 240 }}>
        <TopBar />
        <div className="p-6 space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-2xl font-bold text-[#f1f5f9]">Weather Intelligence</h1>
            <p className="text-sm text-[#64748b] mt-1">
              Aviation weather monitoring, METAR analysis, and risk assessment
            </p>
          </motion.div>

          <WeatherPanel />

          {/* METAR Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-5"
          >
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Live METAR Reports</h3>
            <div className="space-y-3">
              {METAR_EXAMPLES.map((m) => (
                <div
                  key={m.icao}
                  className="p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold font-mono-data text-[#f1f5f9]">{m.icao}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: CATEGORY_COLORS[m.category],
                        background: `${CATEGORY_COLORS[m.category]}15`,
                      }}
                    >
                      {m.category}
                    </span>
                  </div>
                  <p className="text-xs font-mono-data text-[#94a3b8] break-all">{m.raw}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Risk Matrix */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-5"
          >
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Weather Risk Matrix</h3>
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: "Turbulence", icon: Wind, risk: 0.35, color: "#3b82f6" },
                { label: "Visibility", icon: Eye, risk: 0.20, color: "#06d6a0" },
                { label: "Wind Shear", icon: AlertTriangle, risk: 0.55, color: "#f59e0b" },
                { label: "Precipitation", icon: Droplets, risk: 0.40, color: "#8b5cf6" },
                { label: "Icing", icon: Thermometer, risk: 0.15, color: "#6366f1" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle
                          cx="50" cy="50" r="40" fill="none"
                          stroke={item.color} strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${item.risk * 251.3} 251.3`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Icon className="w-4 h-4 mb-0.5" style={{ color: item.color }} />
                        <span className="text-sm font-bold font-mono-data" style={{ color: item.color }}>
                          {Math.round(item.risk * 100)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#94a3b8]">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
