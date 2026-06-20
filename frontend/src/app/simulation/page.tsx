"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Layout/Sidebar";
import TopBar from "@/components/Layout/TopBar";
import { Cpu, Play, Pause, RotateCcw, Zap, Clock, Plane, ChevronDown } from "lucide-react";

interface Gate {
  id: string;
  status: "occupied" | "available" | "maintenance";
  aircraft?: string;
  airline?: string;
  eta?: string;
}

interface Runway {
  id: string;
  status: "active_arrival" | "active_departure" | "idle" | "closed";
  aircraft?: string;
  windInfo?: string;
}

interface SimAircraft {
  id: string;
  callsign: string;
  x: number;
  y: number;
  phase: "approach" | "landing" | "taxiing" | "gate" | "departing" | "takeoff";
  heading: number;
  speed: number;
  targetX?: number;
  targetY?: number;
}

const AIRLINES = ["DL", "UA", "AA", "BA", "EK", "SQ", "LH", "AF"];
const AIRPORTS = ["KATL", "KLAX", "KJFK", "KORD", "EGLL", "OMDB"];

function generateGates(count: number): Gate[] {
  return Array.from({ length: count }, (_, i) => {
    const r = Math.random();
    const status = r < 0.6 ? "occupied" : r < 0.9 ? "available" : "maintenance";
    return {
      id: `${String.fromCharCode(65 + Math.floor(i / 8))}${(i % 8) + 1}`,
      status,
      aircraft: status === "occupied" ? `${AIRLINES[i % AIRLINES.length]}${1000 + Math.floor(Math.random() * 8000)}` : undefined,
      airline: status === "occupied" ? AIRLINES[i % AIRLINES.length] : undefined,
      eta: status === "occupied" ? `${Math.floor(Math.random() * 45 + 5)}m` : undefined,
    };
  });
}

function generateRunways(): Runway[] {
  return [
    { id: "09L/27R", status: "active_arrival", aircraft: "UA2847", windInfo: "270° @ 12kt" },
    { id: "09R/27L", status: "active_departure", aircraft: "DL1523", windInfo: "270° @ 12kt" },
    { id: "04L/22R", status: "idle", windInfo: "270° @ 12kt" },
    { id: "04R/22L", status: "closed", windInfo: "Maintenance" },
  ];
}

function generateAircraft(): SimAircraft[] {
  const ac: SimAircraft[] = [];
  for (let i = 0; i < 12; i++) {
    const phase = (["approach", "taxiing", "gate", "departing"] as const)[i % 4];
    ac.push({
      id: `sim-${i}`,
      callsign: `${AIRLINES[i % AIRLINES.length]}${2000 + i * 100}`,
      x: phase === "approach" ? 50 + Math.random() * 80 : phase === "gate" ? 300 + (i % 6) * 55 : 200 + Math.random() * 300,
      y: phase === "approach" ? 30 + Math.random() * 60 : phase === "gate" ? 280 + (i % 3) * 40 : 150 + Math.random() * 200,
      phase,
      heading: phase === "approach" ? 90 : phase === "departing" ? 270 : 0,
      speed: phase === "approach" ? 2 : phase === "taxiing" ? 0.5 : phase === "departing" ? 1.5 : 0,
    });
  }
  return ac;
}

function statusColor(s: string): string {
  switch (s) {
    case "occupied": case "active_arrival": return "#3b82f6";
    case "available": case "idle": return "#10b981";
    case "maintenance": case "closed": return "#ef4444";
    case "active_departure": return "#f59e0b";
    default: return "#64748b";
  }
}

export default function SimulationPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [airport, setAirport] = useState("KATL");
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [gates, setGates] = useState<Gate[]>([]);
  const [runways, setRunways] = useState<Runway[]>([]);
  const [simAircraft, setSimAircraft] = useState<SimAircraft[]>([]);
  const [simTime, setSimTime] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    setGates(generateGates(24));
    setRunways(generateRunways());
    setSimAircraft(generateAircraft());
  }, [airport]);

  // Canvas airport renderer
  const renderAirport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, h);

    // Runway stripes
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(60, h / 2 - 8, w - 120, 16);
    ctx.fillRect(60, h / 2 + 50 - 8, w - 120, 16);

    // Runway markings
    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, h / 2); ctx.lineTo(w - 60, h / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(60, h / 2 + 50); ctx.lineTo(w - 60, h / 2 + 50); ctx.stroke();
    ctx.setLineDash([]);

    // Runway labels
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "left";
    ctx.fillText("09L/27R", 20, h / 2 + 4);
    ctx.fillText("09R/27L", 20, h / 2 + 54);

    // Taxiways
    ctx.strokeStyle = "rgba(59,130,246,0.08)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2 + 16); ctx.lineTo(w / 2, h / 2 + 90);
    ctx.moveTo(w / 2 - 100, h / 2 + 16); ctx.lineTo(w / 2 - 100, h / 2 + 90);
    ctx.moveTo(w / 2 + 100, h / 2 + 16); ctx.lineTo(w / 2 + 100, h / 2 + 90);
    ctx.stroke();

    // Terminal building
    ctx.fillStyle = "rgba(30,37,56,0.6)";
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    const termX = w / 2 - 180, termY = h / 2 + 100, termW = 360, termH = 60;
    ctx.beginPath();
    ctx.roundRect(termX, termY, termW, termH, 8);
    ctx.fill(); ctx.stroke();

    ctx.font = "9px 'Inter', sans-serif";
    ctx.fillStyle = "#64748b"; ctx.textAlign = "center";
    ctx.fillText("TERMINAL", w / 2, termY + termH / 2 + 3);

    // Gates along terminal
    const gateCount = Math.min(gates.length, 12);
    for (let i = 0; i < gateCount; i++) {
      const g = gates[i];
      const gx = termX + 20 + i * (termW - 40) / (gateCount - 1);
      const gy = termY - 8;

      ctx.beginPath(); ctx.arc(gx, gy, 4, 0, Math.PI * 2);
      ctx.fillStyle = statusColor(g.status);
      ctx.fill();

      if (g.aircraft) {
        ctx.save(); ctx.translate(gx, gy - 14);
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(-2.5, 3); ctx.lineTo(2.5, 3); ctx.closePath();
        ctx.fillStyle = "#3b82f6"; ctx.fill();
        ctx.restore();
      }

      ctx.font = "7px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#64748b"; ctx.textAlign = "center";
      ctx.fillText(g.id, gx, gy + 14);
    }

    // Simulated aircraft
    simAircraft.forEach((ac) => {
      const col = ac.phase === "approach" ? "#06d6a0" : ac.phase === "departing" || ac.phase === "takeoff" ? "#f59e0b" : "#3b82f6";
      ctx.save();
      ctx.translate(ac.x, ac.y);
      ctx.rotate((ac.heading * Math.PI) / 180);
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-4, 5); ctx.lineTo(4, 5); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.restore();

      if (ac.speed > 0) {
        ctx.beginPath(); ctx.arc(ac.x, ac.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = `${col}15`; ctx.fill();
      }

      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left";
      ctx.fillText(ac.callsign, ac.x + 10, ac.y + 3);
    });

    // Compass
    ctx.font = "9px 'Inter', sans-serif";
    ctx.fillStyle = "#64748b"; ctx.textAlign = "center";
    ctx.fillText("N", w - 30, 25); ctx.fillText("S", w - 30, h - 15);
    ctx.fillText("W", 15, h / 2 + 3); ctx.fillText("E", w - 15, h / 2 + 3);

    ctx.restore();
    if (playing) animRef.current = requestAnimationFrame(renderAirport);
  }, [gates, simAircraft, playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    animRef.current = requestAnimationFrame(renderAirport);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animRef.current); };
  }, [renderAirport]);

  // Simulation tick
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setSimTime((t) => t + 1);
      setSimAircraft((prev) =>
        prev.map((ac) => ({
          ...ac,
          x: ac.x + Math.cos((ac.heading * Math.PI) / 180) * ac.speed * speed,
          y: ac.y + Math.sin((ac.heading * Math.PI) / 180) * ac.speed * speed,
        }))
      );
    }, 100);
    return () => clearInterval(interval);
  }, [playing, speed]);

  const occupiedCount = gates.filter((g) => g.status === "occupied").length;
  const availableCount = gates.filter((g) => g.status === "available").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen" style={{ marginLeft: 240 }}>
        <TopBar />
        <div className="p-6 space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#f1f5f9]">Digital Twin Simulation</h1>
              <p className="text-sm text-[#64748b] mt-1">Real-time airport operations modeling & visualization</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Airport selector */}
              <div className="relative">
                <select value={airport} onChange={(e) => setAirport(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-8 text-sm text-[#f1f5f9] outline-none cursor-pointer hover:border-white/20 transition-colors">
                  {AIRPORTS.map((a) => <option key={a} value={a} className="bg-[#111827]">{a}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b] pointer-events-none" />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                <Cpu className="w-3.5 h-3.5 text-[#8b5cf6]" />
                <span className="text-[10px] text-[#94a3b8]">T+{Math.floor(simTime / 10)}m</span>
              </div>
            </div>
          </motion.div>

          {/* Controls */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex items-center gap-4">
            <div className="flex items-center gap-2 glass-card px-4 py-2.5">
              <button onClick={() => setPlaying(!playing)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                {playing ? <Pause className="w-4 h-4 text-[#f59e0b]" /> : <Play className="w-4 h-4 text-[#10b981]" />}
              </button>
              <button onClick={() => { setSimTime(0); setSimAircraft(generateAircraft()); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <RotateCcw className="w-4 h-4 text-[#94a3b8]" />
              </button>
              <div className="w-px h-5 bg-white/10" />
              {[0.5, 1, 2, 4].map((s) => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded text-[10px] font-mono-data transition-colors ${speed === s ? "bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30" : "text-[#64748b] hover:text-[#94a3b8]"}`}>
                  {s}x
                </button>
              ))}
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                <Plane className="w-3.5 h-3.5 text-[#3b82f6]" />
                <span className="text-xs text-[#94a3b8]">{simAircraft.length} aircraft</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                <Zap className="w-3.5 h-3.5 text-[#06d6a0]" />
                <span className="text-xs text-[#94a3b8]">{availableCount} gates free</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                <Clock className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span className="text-xs text-[#94a3b8]">{occupiedCount} occupied</span>
              </div>
            </div>
          </motion.div>

          {/* Main grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Airport Canvas */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="col-span-12 lg:col-span-8 glass-card overflow-hidden" style={{ height: 420 }}>
              <canvas ref={canvasRef} className="w-full h-full" />
            </motion.div>

            {/* Runway Status */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="col-span-12 lg:col-span-4 space-y-4">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3">Runway Status</h3>
                <div className="space-y-2.5">
                  {runways.map((rw) => (
                    <div key={rw.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/3 border border-white/5">
                      <div className="w-2 h-2 rounded-full" style={{ background: statusColor(rw.status) }} />
                      <div className="flex-1">
                        <span className="text-xs font-mono-data text-[#f1f5f9]">{rw.id}</span>
                        <p className="text-[10px] text-[#64748b]">{rw.status.replace(/_/g, " ")}</p>
                      </div>
                      <span className="text-[9px] text-[#64748b]">{rw.windInfo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aircraft Queue */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3">Aircraft Queue</h3>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  {simAircraft.map((ac) => (
                    <div key={ac.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/3">
                      <span className="text-[10px] font-mono-data text-[#f1f5f9]">{ac.callsign}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
                        color: ac.phase === "approach" ? "#06d6a0" : ac.phase === "departing" ? "#f59e0b" : "#3b82f6",
                        background: ac.phase === "approach" ? "#06d6a015" : ac.phase === "departing" ? "#f59e0b15" : "#3b82f615",
                      }}>{ac.phase}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Gate Grid */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="glass-card p-5">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Gate Occupancy — {airport}</h3>
            <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
              {gates.map((g) => (
                <div key={g.id} className="flex flex-col items-center p-2 rounded-lg border transition-colors cursor-default"
                  style={{ borderColor: `${statusColor(g.status)}30`, background: `${statusColor(g.status)}08` }}>
                  <span className="text-[10px] font-mono-data text-[#f1f5f9]">{g.id}</span>
                  <div className="w-2 h-2 rounded-full mt-1" style={{ background: statusColor(g.status) }} />
                  {g.aircraft && <span className="text-[8px] text-[#64748b] mt-0.5 truncate w-full text-center">{g.aircraft}</span>}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-white/5">
              {[{ label: "Occupied", color: "#3b82f6" }, { label: "Available", color: "#10b981" }, { label: "Maintenance", color: "#ef4444" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-[10px] text-[#64748b]">{l.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
