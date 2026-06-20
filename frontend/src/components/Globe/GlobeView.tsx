/* eslint-disable react-hooks/exhaustive-deps, react-hooks/rules-of-hooks */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Maximize2, Minimize2, RotateCcw } from "lucide-react";

interface Aircraft {
  id: string;
  callsign: string;
  lat: number;
  lon: number;
  alt: number;
  speed: number;
  heading: number;
  country: string;
  onGround: boolean;
  trail?: Array<{ lat: number; lon: number }>;
}

interface AirportNode {
  name: string;
  lat: number;
  lon: number;
  risk: number; // 0-1 weather risk
}

const AIRPORTS: AirportNode[] = [
  { name: "JFK", lat: 40.64, lon: -73.78, risk: 0.3 },
  { name: "LAX", lat: 33.94, lon: -118.41, risk: 0.15 },
  { name: "LHR", lat: 51.47, lon: -0.46, risk: 0.6 },
  { name: "DXB", lat: 25.25, lon: 55.36, risk: 0.1 },
  { name: "SIN", lat: 1.36, lon: 103.99, risk: 0.2 },
  { name: "HND", lat: 35.55, lon: 139.78, risk: 0.25 },
  { name: "CDG", lat: 49.01, lon: 2.55, risk: 0.55 },
  { name: "SYD", lat: -33.95, lon: 151.18, risk: 0.05 },
  { name: "DEL", lat: 28.57, lon: 77.10, risk: 0.4 },
  { name: "ATL", lat: 33.64, lon: -84.43, risk: 0.35 },
  { name: "ORD", lat: 41.97, lon: -87.91, risk: 0.7 },
  { name: "FRA", lat: 50.03, lon: 8.57, risk: 0.45 },
];

const ROUTES = [
  { from: "JFK", to: "LHR" }, { from: "LAX", to: "HND" },
  { from: "DXB", to: "SIN" }, { from: "CDG", to: "JFK" },
  { from: "DEL", to: "LHR" }, { from: "ATL", to: "LAX" },
  { from: "ORD", to: "DXB" }, { from: "SYD", to: "SIN" },
  { from: "FRA", to: "JFK" }, { from: "ATL", to: "LHR" },
];

function generateMockAircraft(count: number = 200): Aircraft[] {
  const countries = ["United States", "United Kingdom", "Germany", "China", "Japan", "India", "France", "UAE", "Singapore", "Australia"];
  const aircraft: Aircraft[] = [];
  const routeCoords = ROUTES.map((r) => ({
    from: AIRPORTS.find((a) => a.name === r.from)!,
    to: AIRPORTS.find((a) => a.name === r.to)!,
  }));

  for (let i = 0; i < count; i++) {
    const route = routeCoords[i % routeCoords.length];
    const progress = Math.random();
    const lat = route.from.lat + (route.to.lat - route.from.lat) * progress + (Math.random() - 0.5) * 10;
    const lon = route.from.lon + (route.to.lon - route.from.lon) * progress + (Math.random() - 0.5) * 15;
    const trail: Array<{ lat: number; lon: number }> = [];
    for (let t = 0; t < 5; t++) {
      const tp = Math.max(0, progress - (t + 1) * 0.03);
      trail.push({
        lat: route.from.lat + (route.to.lat - route.from.lat) * tp + (Math.random() - 0.5) * 2,
        lon: route.from.lon + (route.to.lon - route.from.lon) * tp + (Math.random() - 0.5) * 3,
      });
    }
    aircraft.push({
      id: `AC${i.toString(16).padStart(6, "0")}`,
      callsign: `${["DL", "UA", "AA", "BA", "EK", "SQ", "LH", "AF", "QF", "AI"][i % 10]}${1000 + Math.floor(Math.random() * 8000)}`,
      lat: Math.max(-85, Math.min(85, lat)),
      lon: ((lon + 180) % 360) - 180,
      alt: Math.floor(Math.random() * 40000 + 5000),
      speed: Math.floor(Math.random() * 200 + 400),
      heading: Math.floor(Math.random() * 360),
      country: countries[i % countries.length],
      onGround: Math.random() < 0.05,
      trail,
    });
  }
  return aircraft;
}

function riskColor(risk: number): string {
  if (risk >= 0.6) return "#ef4444";
  if (risk >= 0.35) return "#f59e0b";
  return "#10b981";
}

export default function GlobeView({ onSelectAircraft }: { onSelectAircraft?: (ac: Aircraft | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aircraft, setAircraft] = useState<Aircraft[]>(() => generateMockAircraft(200));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ airport: AirportNode; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAircraft((prev) =>
        prev.map((ac) => ({
          ...ac,
          lat: ac.lat + (Math.random() - 0.5) * 0.1,
          lon: ac.lon + (Math.random() - 0.5) * 0.1 + 0.02,
          heading: (ac.heading + (Math.random() - 0.5) * 5 + 360) % 360,
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    timeRef.current += 0.02;

    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, h);

    const projX = (lon: number) => ((lon + 180) / 360) * w * zoom + pan.x;
    const projY = (lat: number) => ((90 - lat) / 180) * h * zoom + pan.y;

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    for (let lat = -80; lat <= 80; lat += 20) {
      ctx.beginPath(); ctx.moveTo(projX(-180), projY(lat)); ctx.lineTo(projX(180), projY(lat)); ctx.stroke();
    }
    for (let lon = -180; lon <= 180; lon += 30) {
      ctx.beginPath(); ctx.moveTo(projX(lon), projY(90)); ctx.lineTo(projX(lon), projY(-90)); ctx.stroke();
    }

    // Continents
    drawContinents(ctx, projX, projY);

    // Route arcs
    ROUTES.forEach((route) => {
      const from = AIRPORTS.find((a) => a.name === route.from)!;
      const to = AIRPORTS.find((a) => a.name === route.to)!;
      const x1 = projX(from.lon), y1 = projY(from.lat);
      const x2 = projX(to.lon), y2 = projY(to.lat);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.15;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(midX, midY, x2, y2);
      ctx.strokeStyle = "rgba(99,102,241,0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Aircraft trails
    aircraft.forEach((ac) => {
      if (!ac.trail || ac.trail.length < 2) return;
      for (let t = 0; t < ac.trail.length - 1; t++) {
        const alpha = 0.15 * (1 - t / ac.trail.length);
        ctx.beginPath();
        ctx.moveTo(projX(ac.trail[t].lon), projY(ac.trail[t].lat));
        ctx.lineTo(projX(ac.trail[t + 1].lon), projY(ac.trail[t + 1].lat));
        ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Aircraft
    aircraft.forEach((ac) => {
      const x = projX(ac.lon), y = projY(ac.lat);
      if (x < -10 || x > w + 10 || y < -10 || y > h + 10) return;
      const isSelected = ac.id === selectedId;
      const color = ac.onGround ? "#64748b" : isSelected ? "#06d6a0" : "#3b82f6";

      if (isSelected) {
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6,214,160,0.15)"; ctx.fill();
      }
      ctx.save(); ctx.translate(x, y);
      ctx.rotate((ac.heading * Math.PI) / 180);
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-3, 4); ctx.lineTo(3, 4); ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); ctx.restore();

      if (isSelected) {
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#06d6a0"; ctx.textAlign = "left";
        ctx.fillText(ac.callsign, x + 10, y - 2);
        ctx.font = "9px 'Inter', sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`FL${Math.round(ac.alt / 100)} · ${ac.speed}kt`, x + 10, y + 10);
      }
    });

    // Airports with weather overlay
    AIRPORTS.forEach((ap) => {
      const x = projX(ap.lon), y = projY(ap.lat);
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return;
      const col = riskColor(ap.risk);

      // Weather risk ring
      const pulseR = 12 + Math.sin(timeRef.current * 2) * 3;
      ctx.beginPath(); ctx.arc(x, y, pulseR, 0, Math.PI * 2);
      ctx.fillStyle = `${col}10`; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = `${col}20`; ctx.fill();

      // Risk arc (partial circle showing risk level)
      ctx.beginPath();
      ctx.arc(x, y, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ap.risk);
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();

      // Center dot
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();

      ctx.font = "9px 'Inter', sans-serif";
      ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center";
      ctx.fillText(ap.name, x, y - 14);
    });

    ctx.restore();

  }, [aircraft, selectedId, zoom, pan]);

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
    const loop = () => {
      render();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const cw = rect.width, ch = rect.height;
    const projX = (lon: number) => ((lon + 180) / 360) * cw * zoom + pan.x;
    const projY = (lat: number) => ((90 - lat) / 180) * ch * zoom + pan.y;

    // Check airport click first
    for (const ap of AIRPORTS) {
      const ax = projX(ap.lon), ay = projY(ap.lat);
      if (Math.sqrt((mx - ax) ** 2 + (my - ay) ** 2) < 15) {
        setPopup({ airport: ap, x: e.clientX, y: e.clientY });
        return;
      }
    }
    setPopup(null);

    // Check aircraft click
    let closestAc: Aircraft | null = null;
    let closestDist = 20;
    for (const ac of aircraft) {
      const x = projX(ac.lon), y = projY(ac.lat);
      const d = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      if (d < closestDist) { closestDist = d; closestAc = ac; }
    }
    setSelectedId(closestAc?.id || null);
    onSelectAircraft?.(closestAc);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
      className="relative w-full h-full rounded-2xl overflow-hidden border border-white/5"
      style={{ background: "#0a0e1a" }}>
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" onClick={handleClick}
        onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }}
        onMouseMove={(e) => { if (isDragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }}
        onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}
        onWheel={(e) => setZoom((z) => Math.max(0.5, Math.min(5, z - e.deltaY * 0.001)))} />

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={() => setZoom((z) => Math.min(5, z + 0.5))} className="p-2 rounded-lg bg-black/50 backdrop-blur border border-white/10 hover:bg-white/10 transition-colors">
          <Maximize2 className="w-4 h-4 text-[#94a3b8]" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))} className="p-2 rounded-lg bg-black/50 backdrop-blur border border-white/10 hover:bg-white/10 transition-colors">
          <Minimize2 className="w-4 h-4 text-[#94a3b8]" />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-2 rounded-lg bg-black/50 backdrop-blur border border-white/10 hover:bg-white/10 transition-colors">
          <RotateCcw className="w-4 h-4 text-[#94a3b8]" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 px-3 py-2.5 rounded-xl bg-black/60 backdrop-blur border border-white/10 space-y-1.5">
        <p className="text-[9px] font-semibold text-[#94a3b8] uppercase tracking-wider">Legend</p>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span className="text-[10px] text-[#94a3b8]">Airborne</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#64748b]" /><span className="text-[10px] text-[#94a3b8]">Ground</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10b981]" /><span className="text-[10px] text-[#94a3b8]">Low Risk</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f59e0b]" /><span className="text-[10px] text-[#94a3b8]">Med Risk</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ef4444]" /><span className="text-[10px] text-[#94a3b8]">High Risk</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 border-t border-dashed border-[#6366f1]/40" /><span className="text-[10px] text-[#94a3b8]">Route</span></div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 px-4 py-2 rounded-xl bg-black/50 backdrop-blur border border-white/10">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span className="text-xs text-[#94a3b8] font-mono-data">{aircraft.filter(a => !a.onGround).length} airborne</span></div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#64748b]" /><span className="text-xs text-[#94a3b8] font-mono-data">{aircraft.filter(a => a.onGround).length} ground</span></div>
        <div className="w-px h-3 bg-white/10" />
        <span className="text-xs text-[#64748b] font-mono-data">Zoom: {zoom.toFixed(1)}x</span>
      </div>

      {/* Airport Popup */}
      {popup && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="fixed z-[60] p-4 rounded-xl border border-white/10"
          style={{ left: popup.x + 10, top: popup.y - 80, background: "rgba(10,14,26,0.95)", backdropFilter: "blur(16px)", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
          <div className="flex items-center justify-between gap-6 mb-2">
            <span className="text-sm font-bold font-mono-data text-[#f1f5f9]">{popup.airport.name}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: riskColor(popup.airport.risk), background: `${riskColor(popup.airport.risk)}15` }}>
              {popup.airport.risk >= 0.6 ? "HIGH" : popup.airport.risk >= 0.35 ? "MODERATE" : "LOW"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div><span className="text-[#64748b]">Lat</span><br /><span className="font-mono-data text-[#f1f5f9]">{popup.airport.lat.toFixed(2)}°</span></div>
            <div><span className="text-[#64748b]">Lon</span><br /><span className="font-mono-data text-[#f1f5f9]">{popup.airport.lon.toFixed(2)}°</span></div>
            <div><span className="text-[#64748b]">Weather Risk</span><br /><span className="font-mono-data" style={{ color: riskColor(popup.airport.risk) }}>{Math.round(popup.airport.risk * 100)}%</span></div>
          </div>
          <button onClick={() => setPopup(null)} className="mt-2 text-[9px] text-[#64748b] hover:text-[#f1f5f9]">Click anywhere to dismiss</button>
        </motion.div>
      )}
    </motion.div>
  );
}

function drawContinents(ctx: CanvasRenderingContext2D, projX: (lon: number) => number, projY: (lat: number) => number) {
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.lineWidth = 0.8;
  const continents = [
    [[-130,50],[-125,60],[-100,65],[-85,70],[-65,60],[-55,48],[-65,43],[-75,35],[-80,25],[-90,18],[-105,20],[-115,30],[-125,40],[-130,50]],
    [[-80,10],[-60,5],[-50,-5],[-35,-10],[-40,-22],[-50,-30],[-55,-40],[-65,-55],[-75,-45],[-70,-20],[-80,-5],[-80,10]],
    [[-10,36],[0,43],[5,48],[10,55],[20,60],[30,70],[40,65],[30,45],[25,38],[15,37],[5,36],[-10,36]],
    [[-15,30],[10,37],[30,32],[40,12],[50,0],[40,-15],[35,-30],[20,-35],[15,-25],[10,-5],[0,5],[-15,10],[-18,15],[-15,30]],
    [[25,40],[40,45],[50,55],[60,65],[80,70],[100,70],[120,65],[130,55],[140,50],[145,45],[130,35],[120,25],[110,20],[100,15],[80,10],[70,25],[50,30],[35,32],[25,40]],
    [[115,-15],[130,-12],[145,-15],[150,-25],[148,-35],[138,-35],[130,-30],[115,-22],[115,-15]],
  ];
  continents.forEach((points) => {
    ctx.beginPath();
    points.forEach((p, i) => { const x = projX(p[0]); const y = projY(p[1]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });
}
