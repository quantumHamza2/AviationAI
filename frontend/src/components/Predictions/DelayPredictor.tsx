"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Loader2, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

interface PredictionResult {
  delay_probability: number;
  expected_delay_minutes: number;
  confidence: number;
  risk_level: string;
  explanation: string;
  top_factors: Array<{
    feature: string;
    contribution: number;
    direction: string;
  }>;
}

const AIRPORTS = [
  "KJFK", "KLAX", "KORD", "KDFW", "KDEN", "KSFO", "KLAS", "KSEA",
  "EGLL", "LFPG", "EDDF", "OMDB", "RJTT", "WSSS", "VHHH", "VIDP",
];

const AIRLINES = ["AA", "DL", "UA", "WN", "B6", "BA", "EK", "SQ", "LH"];

function getRiskColor(level: string) {
  switch (level) {
    case "critical": return "#dc2626";
    case "high": return "#ef4444";
    case "medium": return "#f59e0b";
    default: return "#10b981";
  }
}

export default function DelayPredictor() {
  const [origin, setOrigin] = useState("KJFK");
  const [destination, setDestination] = useState("EGLL");
  const [airline, setAirline] = useState("BA");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const predict = async () => {
    setLoading(true);
    // Simulate API call with mock prediction
    await new Promise((r) => setTimeout(r, 1500));

    const seed = (origin + destination + airline).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const prob = Math.min(0.95, Math.max(0.08, 0.3 + ((seed % 50) - 25) / 100));
    const mins = Math.round(prob * 35 + (seed % 20));

    setResult({
      delay_probability: prob,
      expected_delay_minutes: mins,
      confidence: 0.84,
      risk_level: prob > 0.7 ? "high" : prob > 0.4 ? "medium" : "low",
      explanation: `Based on historical patterns for ${origin}→${destination}, this ${airline} flight has a ${(prob * 100).toFixed(1)}% probability of delay (~${mins} min).`,
      top_factors: [
        { feature: "Time of Day", contribution: 0.15, direction: "increases_delay" },
        { feature: "Airport Congestion", contribution: 0.12, direction: "increases_delay" },
        { feature: "Weather Conditions", contribution: 0.08, direction: "increases_delay" },
        { feature: "Day of Week", contribution: -0.04, direction: "decreases_delay" },
        { feature: "Airline Performance", contribution: -0.06, direction: "decreases_delay" },
      ],
    });
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <BrainCircuit className="w-5 h-5 text-[#8b5cf6]" />
        <h3 className="text-sm font-semibold text-[#f1f5f9]">AI Delay Predictor</h3>
      </div>

      {/* Input form */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1 block">Origin</label>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#f1f5f9] outline-none focus:border-[#8b5cf6]/50 transition-colors font-mono-data"
          >
            {AIRPORTS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1 block">Destination</label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#f1f5f9] outline-none focus:border-[#8b5cf6]/50 transition-colors font-mono-data"
          >
            {AIRPORTS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1 block">Airline</label>
          <select
            value={airline}
            onChange={(e) => setAirline(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#f1f5f9] outline-none focus:border-[#8b5cf6]/50 transition-colors font-mono-data"
          >
            {AIRLINES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <button
        onClick={predict}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <BrainCircuit className="w-4 h-4" />
            Predict Delay
          </>
        )}
      </button>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 space-y-4"
          >
            {/* Probability gauge */}
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <motion.circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={getRiskColor(result.risk_level)}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${result.delay_probability * 251.3} 251.3`}
                    initial={{ strokeDasharray: "0 251.3" }}
                    animate={{ strokeDasharray: `${result.delay_probability * 251.3} 251.3` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold font-mono-data" style={{ color: getRiskColor(result.risk_level) }}>
                    {Math.round(result.delay_probability * 100)}%
                  </span>
                  <span className="text-[9px] text-[#64748b]">delay risk</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-[#f1f5f9] mb-1">
                  Expected delay: <span className="font-mono-data text-[#f59e0b]">{result.expected_delay_minutes} min</span>
                </p>
                <p className="text-xs text-[#94a3b8]">{result.explanation}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ color: getRiskColor(result.risk_level), background: `${getRiskColor(result.risk_level)}15` }}
                  >
                    {result.risk_level} risk
                  </span>
                  <span className="text-[10px] text-[#64748b] font-mono-data">
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            </div>

            {/* SHAP factors */}
            <div>
              <h4 className="text-xs font-semibold text-[#94a3b8] mb-2">Key Factors (SHAP Analysis)</h4>
              <div className="space-y-1.5">
                {result.top_factors.map((f, i) => (
                  <div key={f.feature} className="flex items-center gap-2">
                    {f.direction === "increases_delay" ? (
                      <TrendingUp className="w-3 h-3 text-[#ef4444] flex-shrink-0" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-[#10b981] flex-shrink-0" />
                    )}
                    <span className="text-xs text-[#94a3b8] flex-1">{f.feature}</span>
                    <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: f.direction === "increases_delay" ? "#ef4444" : "#10b981",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.abs(f.contribution) * 500}%` }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-mono-data w-10 text-right"
                      style={{ color: f.direction === "increases_delay" ? "#ef4444" : "#10b981" }}
                    >
                      {f.contribution > 0 ? "+" : ""}{(f.contribution * 100).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
