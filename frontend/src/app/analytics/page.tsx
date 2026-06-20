"use client";

import { useState } from "react";
import Sidebar from "@/components/Layout/Sidebar";
import TopBar from "@/components/Layout/TopBar";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, CartesianGrid, LineChart, Line, Legend,
} from "recharts";

// --- Data ---
const AIRLINES = [
  { code: "DL", name: "Delta", onTime: 82, avgDelay: 14, cancelRate: 1.8, satisfaction: 4.2, color: "#3b82f6" },
  { code: "UA", name: "United", onTime: 78, avgDelay: 18, cancelRate: 2.3, satisfaction: 3.8, color: "#8b5cf6" },
  { code: "AA", name: "American", onTime: 76, avgDelay: 20, cancelRate: 2.7, satisfaction: 3.6, color: "#ef4444" },
  { code: "BA", name: "British Airways", onTime: 80, avgDelay: 16, cancelRate: 1.5, satisfaction: 4.0, color: "#06d6a0" },
  { code: "EK", name: "Emirates", onTime: 85, avgDelay: 11, cancelRate: 0.9, satisfaction: 4.5, color: "#f59e0b" },
  { code: "LH", name: "Lufthansa", onTime: 79, avgDelay: 17, cancelRate: 2.0, satisfaction: 3.9, color: "#06b6d4" },
];

const ROUTES = [
  { route: "JFK → LHR", flights: 28, avgDelay: 12, onTime: 85, revenue: "$4.2M", load: 89 },
  { route: "LAX → HND", flights: 14, avgDelay: 8, onTime: 91, revenue: "$3.1M", load: 92 },
  { route: "ORD → CDG", flights: 21, avgDelay: 22, onTime: 72, revenue: "$2.8M", load: 84 },
  { route: "ATL → LHR", flights: 18, avgDelay: 15, onTime: 80, revenue: "$3.5M", load: 87 },
  { route: "DXB → SIN", flights: 24, avgDelay: 6, onTime: 94, revenue: "$2.4M", load: 95 },
  { route: "JFK → CDG", flights: 16, avgDelay: 18, onTime: 76, revenue: "$2.1M", load: 82 },
  { route: "SFO → HND", flights: 10, avgDelay: 10, onTime: 88, revenue: "$1.9M", load: 90 },
  { route: "LHR → DXB", flights: 22, avgDelay: 9, onTime: 90, revenue: "$2.7M", load: 91 },
];

const TRENDS = Array.from({ length: 30 }, (_, i) => ({
  day: `May ${i + 1}`,
  delays: Math.floor(Math.random() * 300 + 500),
  onTime: Math.floor(Math.random() * 200 + 3800),
  cancellations: Math.floor(Math.random() * 30 + 10),
  avgDelay: Math.floor(Math.random() * 10 + 12),
}));

const radarData = AIRLINES.slice(0, 4).map((a) => ({
  metric: a.code,
  onTime: a.onTime,
  satisfaction: a.satisfaction * 20,
  reliability: 100 - a.cancelRate * 10,
  punctuality: 100 - a.avgDelay * 2,
}));

const radarMetrics = [
  { key: "onTime", name: "On-Time %" },
  { key: "satisfaction", name: "Satisfaction" },
  { key: "reliability", name: "Reliability" },
  { key: "punctuality", name: "Punctuality" },
];

export default function AnalyticsPage() {
  const [selectedAirlines, setSelectedAirlines] = useState(["DL", "UA"]);

  const toggle = (code: string) => {
    setSelectedAirlines((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : prev.length < 3 ? [...prev, code] : prev
    );
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen" style={{ marginLeft: 240 }}>
        <TopBar />
        <div className="p-6 space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-2xl font-bold text-[#f1f5f9]">Advanced Analytics</h1>
            <p className="text-sm text-[#64748b] mt-1">Airline comparison, route analysis, and historical trends</p>
          </motion.div>

          {/* Airline Comparison */}
          <div className="grid grid-cols-12 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="col-span-12 lg:col-span-8 glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#f1f5f9]">Airline Performance Comparison</h3>
                <div className="flex gap-1.5">
                  {AIRLINES.map((a) => (
                    <button key={a.code} onClick={() => toggle(a.code)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono-data transition-all ${selectedAirlines.includes(a.code) ? "border text-[#f1f5f9]" : "text-[#64748b] bg-white/3 hover:bg-white/5"}`}
                      style={selectedAirlines.includes(a.code) ? { borderColor: `${a.color}50`, background: `${a.color}15`, color: a.color } : {}}>
                      {a.code}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={AIRLINES.filter((a) => selectedAirlines.includes(a.code))} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="code" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }} />
                  <Bar dataKey="onTime" name="On-Time %" fill="#06d6a0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgDelay" name="Avg Delay (min)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelRate" name="Cancel Rate %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Radar Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="col-span-12 lg:col-span-4 glass-card p-5">
              <h3 className="text-sm font-semibold text-[#f1f5f9] mb-2">Performance Radar</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarMetrics.map((m) => ({
                  metric: m.name,
                  ...Object.fromEntries(radarData.map((d) => [d.metric, d[m.key as keyof typeof d]])),
                }))}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                  <PolarRadiusAxis tick={{ fill: "#64748b", fontSize: 8 }} domain={[0, 100]} />
                  {radarData.map((d, i) => (
                    <Radar key={d.metric} name={d.metric} dataKey={d.metric}
                      stroke={AIRLINES[i].color} fill={AIRLINES[i].color} fillOpacity={0.1} strokeWidth={2} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Route Analysis */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-5">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Route Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Route", "Daily Flights", "Avg Delay", "On-Time %", "Revenue", "Load Factor"].map((h) => (
                      <th key={h} className="pb-3 text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROUTES.map((r, i) => (
                    <motion.tr key={r.route} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }}
                      className="border-b border-white/3 hover:bg-white/3 transition-colors">
                      <td className="py-3 text-xs font-mono-data text-[#f1f5f9]">{r.route}</td>
                      <td className="py-3 text-xs font-mono-data text-[#3b82f6]">{r.flights}</td>
                      <td className="py-3 text-xs font-mono-data" style={{ color: r.avgDelay > 15 ? "#ef4444" : r.avgDelay > 10 ? "#f59e0b" : "#10b981" }}>
                        {r.avgDelay}m {r.avgDelay > 15 ? <ArrowUpRight className="inline w-3 h-3" /> : <ArrowDownRight className="inline w-3 h-3" />}
                      </td>
                      <td className="py-3 text-xs font-mono-data text-[#06d6a0]">{r.onTime}%</td>
                      <td className="py-3 text-xs text-[#94a3b8]">{r.revenue}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/5 max-w-[80px]">
                            <div className="h-full rounded-full bg-[#8b5cf6]" style={{ width: `${r.load}%` }} />
                          </div>
                          <span className="text-[10px] font-mono-data text-[#94a3b8]">{r.load}%</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Historical Trends */}
          <div className="grid grid-cols-12 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="col-span-12 lg:col-span-7 glass-card p-5">
              <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">30-Day Flight Trends</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={TRENDS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }} />
                  <Area type="monotone" dataKey="onTime" name="On-Time" stroke="#06d6a0" fill="#06d6a015" strokeWidth={2} />
                  <Area type="monotone" dataKey="delays" name="Delays" stroke="#f59e0b" fill="#f59e0b10" strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="col-span-12 lg:col-span-5 glass-card p-5">
              <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Average Delay Trend</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={TRENDS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} unit="m" />
                  <Tooltip contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }} />
                  <Line type="monotone" dataKey="avgDelay" name="Avg Delay (min)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="text-center py-4 border-t border-white/5">
            <p className="text-[11px] text-[#64748b]">AeroMind v3.0 · Advanced Analytics · Phase 3</p>
          </div>
        </div>
      </main>
    </div>
  );
}
