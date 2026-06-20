"use client";

import { useState } from "react";
import Sidebar from "@/components/Layout/Sidebar";
import TopBar from "@/components/Layout/TopBar";
import KPICards from "@/components/Dashboard/KPICards";
import ActivityFeed from "@/components/Dashboard/ActivityFeed";
import GlobeView from "@/components/Globe/GlobeView";
import WeatherPanel from "@/components/Weather/WeatherPanel";
import DelayPredictor from "@/components/Predictions/DelayPredictor";
import { DelayTrendChart, FlightVolumeChart, EmissionsChart } from "@/components/Charts/Charts";
import { motion } from "framer-motion";
import { useAnalytics } from "@/lib/hooks";

export default function Dashboard() {
  const [sidebarWidth] = useState(240);
  const { data: analyticsData } = useAnalytics();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 min-h-screen"
        style={{ marginLeft: sidebarWidth }}
      >
        <TopBar />

        <div className="p-6 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl font-bold text-[#f1f5f9]">Command Center</h1>
              <p className="text-sm text-[#64748b] mt-1">
                Real-time aviation intelligence overview
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#06d6a0]/10 border border-[#06d6a0]/20">
              <div className="w-2 h-2 rounded-full bg-[#06d6a0] animate-pulse" />
              <span className="text-xs text-[#06d6a0] font-medium">Systems Operational</span>
            </div>
          </motion.div>

          {/* KPI Cards */}
          <KPICards data={analyticsData} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Globe — spans 8 columns */}
            <div className="col-span-12 lg:col-span-8">
              <div className="h-[450px]">
                <GlobeView />
              </div>
            </div>

            {/* Activity Feed — spans 4 columns */}
            <div className="col-span-12 lg:col-span-4">
              <ActivityFeed />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-6 lg:col-span-4">
              <DelayTrendChart />
            </div>
            <div className="col-span-12 md:col-span-6 lg:col-span-4">
              <FlightVolumeChart />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <EmissionsChart />
            </div>
          </div>

          {/* Weather + Predictions Row */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7">
              <WeatherPanel />
            </div>
            <div className="col-span-12 lg:col-span-5">
              <DelayPredictor />
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-4 border-t border-white/5">
            <p className="text-[11px] text-[#64748b]">
              AeroMind v3.0 · AI-Powered Predictive Aviation Operations Platform · Phase 3
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
