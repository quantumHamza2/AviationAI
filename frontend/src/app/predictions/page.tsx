"use client";

import Sidebar from "@/components/Layout/Sidebar";
import TopBar from "@/components/Layout/TopBar";
import DelayPredictor from "@/components/Predictions/DelayPredictor";
import { DelayTrendChart } from "@/components/Charts/Charts";
import { motion } from "framer-motion";
import { BrainCircuit, TrendingUp, BarChart3, Target } from "lucide-react";

export default function PredictionsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen" style={{ marginLeft: 240 }}>
        <TopBar />
        <div className="p-6 space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-2xl font-bold text-[#f1f5f9]">AI Predictions</h1>
            <p className="text-sm text-[#64748b] mt-1">
              ML-powered delay prediction with explainable AI insights
            </p>
          </motion.div>

          {/* Model Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Model Accuracy", value: "84.7%", icon: Target, color: "#06d6a0" },
              { label: "Predictions Today", value: "2,847", icon: BrainCircuit, color: "#8b5cf6" },
              { label: "Avg Confidence", value: "82.3%", icon: BarChart3, color: "#3b82f6" },
              { label: "Model Version", value: "v1.0-XGB", icon: TrendingUp, color: "#f59e0b" },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                    <span className="text-[10px] text-[#64748b] uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold font-mono-data" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-6">
              <DelayPredictor />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <DelayTrendChart />

              {/* Feature Importance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card p-5 mt-6"
              >
                <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Global Feature Importance</h3>
                <div className="space-y-3">
                  {[
                    { feature: "Weather Conditions", importance: 0.28, color: "#06d6a0" },
                    { feature: "Time of Day", importance: 0.22, color: "#3b82f6" },
                    { feature: "Airport Congestion", importance: 0.18, color: "#8b5cf6" },
                    { feature: "Airline History", importance: 0.14, color: "#f59e0b" },
                    { feature: "Day of Week", importance: 0.10, color: "#6366f1" },
                    { feature: "Season/Month", importance: 0.08, color: "#ef4444" },
                  ].map((f, i) => (
                    <div key={f.feature} className="flex items-center gap-3">
                      <span className="text-xs text-[#94a3b8] w-36 truncate">{f.feature}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: f.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${f.importance * 100 * 3}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                        />
                      </div>
                      <span className="text-xs font-mono-data text-[#94a3b8] w-10 text-right">
                        {(f.importance * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
