"use client";

import { useState } from "react";
import Sidebar from "@/components/Layout/Sidebar";
import TopBar from "@/components/Layout/TopBar";
import GlobeView from "@/components/Globe/GlobeView";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, ArrowUp, ArrowDown, MapPin, Gauge, Navigation, X } from "lucide-react";

interface SelectedAircraft {
  id: string;
  callsign: string;
  lat: number;
  lon: number;
  alt: number;
  speed: number;
  heading: number;
  country: string;
  onGround: boolean;
}

export default function FlightsPage() {
  const [selected, setSelected] = useState<SelectedAircraft | null>(null);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen" style={{ marginLeft: 240 }}>
        <TopBar />
        <div className="p-6 space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-2xl font-bold text-[#f1f5f9]">Flight Tracker</h1>
            <p className="text-sm text-[#64748b] mt-1">
              Real-time global aircraft tracking with live positions
            </p>
          </motion.div>

          <div className="relative">
            <div className="h-[calc(100vh-200px)] rounded-2xl overflow-hidden">
              <GlobeView onSelectAircraft={(ac) => setSelected(ac as SelectedAircraft)} />
            </div>

            {/* Selected Aircraft Panel */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  transition={{ type: "spring", damping: 25 }}
                  className="absolute top-4 right-4 w-80 glass-card p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Plane className="w-5 h-5 text-[#06d6a0]" />
                      <span className="text-lg font-bold font-mono-data text-[#f1f5f9]">
                        {selected.callsign}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4 text-[#64748b]" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white/3 border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ArrowUp className="w-3 h-3 text-[#3b82f6]" />
                          <span className="text-[10px] text-[#64748b] uppercase">Altitude</span>
                        </div>
                        <p className="text-sm font-bold font-mono-data text-[#f1f5f9]">
                          FL{Math.round(selected.alt / 100)}
                        </p>
                        <p className="text-[10px] text-[#64748b]">
                          {selected.alt.toLocaleString()} ft
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/3 border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Gauge className="w-3 h-3 text-[#06d6a0]" />
                          <span className="text-[10px] text-[#64748b] uppercase">Speed</span>
                        </div>
                        <p className="text-sm font-bold font-mono-data text-[#f1f5f9]">
                          {selected.speed} kt
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/3 border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Navigation className="w-3 h-3 text-[#f59e0b]" />
                          <span className="text-[10px] text-[#64748b] uppercase">Heading</span>
                        </div>
                        <p className="text-sm font-bold font-mono-data text-[#f1f5f9]">
                          {selected.heading}°
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/3 border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3 h-3 text-[#8b5cf6]" />
                          <span className="text-[10px] text-[#64748b] uppercase">Position</span>
                        </div>
                        <p className="text-[10px] font-mono-data text-[#f1f5f9]">
                          {selected.lat.toFixed(2)}, {selected.lon.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/3 border border-white/5">
                      <span className="text-[10px] text-[#64748b] uppercase">Country</span>
                      <p className="text-sm text-[#f1f5f9]">{selected.country}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: selected.onGround ? "#64748b" : "#10b981" }}
                      />
                      <span className="text-xs text-[#94a3b8]">
                        {selected.onGround ? "On Ground" : "In Flight"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
