"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudLightning, AlertTriangle, Clock, ArrowUp, ArrowDown } from "lucide-react";

interface FeedItem {
  id: string;
  type: "delay" | "weather" | "departure" | "arrival" | "alert";
  message: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
}

const ICONS = {
  delay: Clock,
  weather: CloudLightning,
  departure: ArrowUp,
  arrival: ArrowDown,
  alert: AlertTriangle,
};

const COLORS: Record<string, string> = {
  info: "#3b82f6",
  warning: "#f59e0b",
  critical: "#ef4444",
};

// Friendly human-readable messages
function generateMockFeed(): FeedItem[] {
  const airlines = ["Delta", "United", "American", "Southwest", "JetBlue", "British Airways", "Emirates", "Singapore Airlines"];
  const airports = [
    { code: "JFK", city: "New York" }, { code: "LAX", city: "Los Angeles" },
    { code: "ORD", city: "Chicago" }, { code: "LHR", city: "London" },
    { code: "DXB", city: "Dubai" }, { code: "SIN", city: "Singapore" },
    { code: "CDG", city: "Paris" }, { code: "ATL", city: "Atlanta" },
    { code: "DEN", city: "Denver" }, { code: "SFO", city: "San Francisco" },
  ];
  const events: FeedItem[] = [];
  const now = Date.now();

  for (let i = 0; i < 20; i++) {
    const type = (["delay", "weather", "departure", "arrival", "alert"] as const)[
      Math.floor(Math.random() * 5)
    ];
    const al = airlines[Math.floor(Math.random() * airlines.length)];
    const ap = airports[Math.floor(Math.random() * airports.length)];
    const ap2 = airports[Math.floor(Math.random() * airports.length)];
    const mins = Math.floor(Math.random() * 120) + 15;
    const time = new Date(now - i * 45000).toISOString();

    const messages: Record<string, string> = {
      delay: `${al} flight delayed ~${mins} min at ${ap.city} (${ap.code})`,
      weather: `${["Thunderstorms", "Low visibility", "Strong winds", "Rough air expected", "Icy conditions"][Math.floor(Math.random() * 5)]} near ${ap.city}`,
      departure: `${al} flight departed ${ap.city} → ${ap2.city}`,
      arrival: `${al} flight landed at ${ap.city}`,
      alert: `${ap.city} airport is getting busy — expect longer waits`,
    };

    events.push({
      id: `evt-${i}`,
      type,
      message: messages[type],
      timestamp: time,
      severity: type === "alert" ? "critical" : type === "weather" ? "warning" : "info",
    });
  }
  return events;
}

function timeAgo(timestamp: string): string {
  const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

type FilterKey = "all" | "critical" | "warning" | "info";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "All",
  critical: "🔴 Urgent",
  warning: "🟡 Alerts",
  info: "🔵 Info",
};

export default function ActivityFeed() {
  const [events, setEvents] = useState<FeedItem[]>(() => generateMockFeed());
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents((prev) => {
        const newEvent = generateMockFeed()[0];
        newEvent.id = `evt-${Date.now()}`;
        newEvent.timestamp = new Date().toISOString();
        return [newEvent, ...prev.slice(0, 19)];
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.severity === filter)),
    [events, filter]
  );

  const counts = useMemo(() => ({
    critical: events.filter((e) => e.severity === "critical").length,
    warning: events.filter((e) => e.severity === "warning").length,
    info: events.filter((e) => e.severity === "info").length,
  }), [events]);

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#f1f5f9]">Live Activity</h3>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[10px] text-[#64748b] uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-3">
        {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => {
          const count = key === "all" ? events.length : counts[key as keyof typeof counts];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                filter === key
                  ? "bg-white/10 text-[#f1f5f9]"
                  : "text-[#64748b] hover:text-[#94a3b8] hover:bg-white/5"
              }`}
            >
              {FILTER_LABELS[key]}
              <span className="text-[9px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Event List */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1 flex-1">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-[#64748b]">No events in this category</p>
            </div>
          ) : (
            filtered.map((event) => {
              const Icon = ICONS[event.type];
              const color = COLORS[event.severity];

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/3 transition-colors"
                >
                  <div
                    className="mt-0.5 p-1.5 rounded-md flex-shrink-0"
                    style={{ background: `${color}15` }}
                  >
                    <Icon className="w-3 h-3" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#e2e8f0] leading-snug">{event.message}</p>
                    <p className="text-[10px] text-[#64748b] mt-0.5">
                      {timeAgo(event.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
