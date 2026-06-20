"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plane,
  AlertTriangle,
  Clock,
  CloudLightning,
  Target,
  Radio,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Sparkline from "@/components/Charts/Sparkline";

interface KPIData {
  total_flights_tracked: number;
  flights_airborne: number;
  flights_delayed: number;
  avg_delay_minutes: number;
  weather_alerts: number;
  airports_monitored: number;
  prediction_accuracy: number;
  carbon_emissions_tons: number;
}

function AnimatedCounter({
  value,
  duration = 2,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = 0;
    const end = value;
    const steps = 60;
    const increment = (end - start) / steps;
    let current = start;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        current = end;
        clearInterval(timer);
      }
      setDisplay(current);
    }, (duration * 1000) / steps);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span className="counter-value">
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}
      {suffix}
    </span>
  );
}

/** Generate a realistic-looking sparkline history for a KPI */
function generateSparkData(base: number, variance: number, points: number = 20): number[] {
  const data: number[] = [];
  let current = base - variance * 0.5;
  for (let i = 0; i < points; i++) {
    current += (Math.random() - 0.48) * variance * 0.3;
    current = Math.max(base - variance, Math.min(base + variance * 0.5, current));
    data.push(current);
  }
  data[data.length - 1] = base; // end at the actual value
  return data;
}

const CARDS = [
  {
    key: "flights_airborne",
    label: "Flights in the Air",
    description: "Currently flying worldwide",
    icon: Plane,
    color: "#06d6a0",
    gradient: "from-[#06d6a0]/20 to-[#06d6a0]/5",
    trend: "up" as const,
    sparkVariance: 400,
  },
  {
    key: "flights_delayed",
    label: "Delayed Flights",
    description: "Running behind schedule",
    icon: AlertTriangle,
    color: "#f59e0b",
    gradient: "from-[#f59e0b]/20 to-[#f59e0b]/5",
    trend: "down" as const,
    sparkVariance: 100,
  },
  {
    key: "avg_delay_minutes",
    label: "Average Wait",
    description: "Typical delay time",
    icon: Clock,
    color: "#3b82f6",
    gradient: "from-[#3b82f6]/20 to-[#3b82f6]/5",
    suffix: " min",
    decimals: 1,
    trend: "down" as const,
    sparkVariance: 5,
  },
  {
    key: "weather_alerts",
    label: "Weather Alerts",
    description: "Active weather warnings",
    icon: CloudLightning,
    color: "#ef4444",
    gradient: "from-[#ef4444]/20 to-[#ef4444]/5",
    trend: "neutral" as const,
    sparkVariance: 3,
  },
  {
    key: "prediction_accuracy",
    label: "AI Accuracy",
    description: "How precise our predictions are",
    icon: Target,
    color: "#8b5cf6",
    gradient: "from-[#8b5cf6]/20 to-[#8b5cf6]/5",
    suffix: "%",
    decimals: 1,
    trend: "up" as const,
    sparkVariance: 3,
  },
  {
    key: "airports_monitored",
    label: "Airports Tracked",
    description: "Airports we're watching",
    icon: Radio,
    color: "#6366f1",
    gradient: "from-[#6366f1]/20 to-[#6366f1]/5",
    trend: "up" as const,
    sparkVariance: 30,
  },
];

export default function KPICards({ data }: { data: KPIData | null }) {
  // Default/demo data when API is not connected
  const kpi: KPIData = data || {
    total_flights_tracked: 9847,
    flights_airborne: 6234,
    flights_delayed: 743,
    avg_delay_minutes: 18.4,
    weather_alerts: 7,
    airports_monitored: 312,
    prediction_accuracy: 84.7,
    carbon_emissions_tons: 247500,
  };

  // Memoize sparkline data so it doesn't regenerate on every render
  const sparkData = useMemo(() => {
    return CARDS.reduce((acc, card) => {
      const value = kpi[card.key as keyof KPIData] as number;
      acc[card.key] = generateSparkData(value, card.sparkVariance);
      return acc;
    }, {} as Record<string, number[]>);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {CARDS.map((card, i) => {
        const Icon = card.icon;
        const value = kpi[card.key as keyof KPIData] as number;
        const TrendIcon = card.trend === "up" ? TrendingUp : card.trend === "down" ? TrendingDown : null;
        const trendColor = card.trend === "up" ? "#10b981" : card.trend === "down" ? "#ef4444" : "#64748b";
        const trendLabel = card.trend === "up" ? "+2.3%" : card.trend === "down" ? "-1.8%" : "→ 0%";

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="glass-card p-4 cursor-default group relative overflow-hidden"
          >
            {/* Header: icon + trend */}
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                <Icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              {TrendIcon && (
                <div className="flex items-center gap-0.5" title="Trend vs last hour">
                  <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
                  <span className="text-[9px] font-mono-data" style={{ color: trendColor }}>{trendLabel}</span>
                </div>
              )}
            </div>

            {/* Value */}
            <div className="text-2xl font-bold mb-0.5" style={{ color: card.color }}>
              <AnimatedCounter
                value={value}
                decimals={card.decimals || 0}
                suffix={card.suffix || ""}
              />
            </div>

            {/* Label + description */}
            <p className="text-xs text-[#94a3b8] font-medium">{card.label}</p>
            <p className="text-[9px] text-[#475569] mt-0.5 group-hover:text-[#64748b] transition-colors">
              {card.description}
            </p>

            {/* Sparkline — bottom right */}
            <div className="absolute bottom-2 right-2 opacity-40 group-hover:opacity-70 transition-opacity">
              <Sparkline data={sparkData[card.key] || []} color={card.color} width={60} height={24} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
