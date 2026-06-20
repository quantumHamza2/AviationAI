"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { motion } from "framer-motion";

// ---- Delay Trend Chart ----
function generateTrendData() {
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 3600000);
    const h = hour.getHours();
    const base = 15 + (h >= 6 && h <= 9 ? 10 : h >= 16 && h <= 20 ? 12 : 0);
    data.push({
      time: `${h.toString().padStart(2, "0")}:00`,
      delay: Math.round(base + (Math.random() - 0.3) * 10),
      flights: Math.round(300 + Math.random() * 200 + (h >= 8 && h <= 20 ? 150 : 0)),
    });
  }
  return data;
}

export function DelayTrendChart() {
  const [data, setData] = useState<ReturnType<typeof generateTrendData>>([]);
  useEffect(() => setData(generateTrendData()), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="glass-card p-5"
    >
      <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">
        Delay Trend · 24h
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="delayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} unit=" min" />
          <Tooltip
            contentStyle={{
              background: "rgba(17,24,39,0.95)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, fontSize: 12, color: "#f1f5f9",
            }}
          />
          <Area type="monotone" dataKey="delay" stroke="#f59e0b" fill="url(#delayGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ---- Flight Volume Chart ----
export function FlightVolumeChart() {
  const [data, setData] = useState<ReturnType<typeof generateTrendData>>([]);
  useEffect(() => setData(generateTrendData()), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="glass-card p-5"
    >
      <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">
        Flight Volume · 24h
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(17,24,39,0.95)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, fontSize: 12, color: "#f1f5f9",
            }}
          />
          <Bar dataKey="flights" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ---- Emissions Donut ----
const EMISSION_DATA = [
  { name: "American", value: 68000, color: "#ef4444" },
  { name: "United", value: 62000, color: "#3b82f6" },
  { name: "Delta", value: 55000, color: "#06d6a0" },
  { name: "Southwest", value: 42000, color: "#f59e0b" },
  { name: "JetBlue", value: 20000, color: "#8b5cf6" },
  { name: "Others", value: 35000, color: "#64748b" },
];

export function EmissionsChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="glass-card p-5"
    >
      <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">
        CO₂ Emissions by Airline
      </h3>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={160}>
          <PieChart>
            <Pie
              data={EMISSION_DATA}
              cx="50%" cy="50%"
              innerRadius={40} outerRadius={65}
              dataKey="value" stroke="none"
            >
              {EMISSION_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(17,24,39,0.95)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, fontSize: 12, color: "#f1f5f9",
              }}
              formatter={(value) => `${(Number(value) / 1000).toFixed(0)}k tons`}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {EMISSION_DATA.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
              <span className="text-[#94a3b8]">{d.name}</span>
              <span className="text-[#64748b] font-mono-data ml-auto">
                {(d.value / 1000).toFixed(0)}k
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
