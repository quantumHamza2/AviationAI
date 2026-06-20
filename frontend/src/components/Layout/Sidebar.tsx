"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Radar,
  CloudLightning,
  BrainCircuit,
  Building2,
  ChevronLeft,
  ChevronRight,
  Activity,
  Cpu,
  BarChart3,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Command Center", icon: LayoutDashboard, href: "/" },
  { id: "flights", label: "Flight Tracker", icon: Radar, href: "/flights" },
  { id: "weather", label: "Weather Intel", icon: CloudLightning, href: "/weather" },
  { id: "predictions", label: "AI Predictions", icon: BrainCircuit, href: "/predictions" },
  { id: "airports", label: "Airports", icon: Building2, href: "/airports" },
  { id: "simulation", label: "Digital Twin", icon: Cpu, href: "/simulation" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      className="fixed left-0 top-0 h-screen z-50 flex flex-col border-r border-white/5"
      style={{ background: "rgba(10, 14, 26, 0.95)", backdropFilter: "blur(20px)" }}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/5">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#06d6a0] to-[#3b82f6]">
          <Activity className="w-5 h-5 text-white" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#06d6a0] to-[#3b82f6] blur-lg opacity-40" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h1 className="text-lg font-bold gradient-text">AeroMind</h1>
            <p className="text-[10px] text-[#64748b] -mt-0.5 tracking-wider uppercase">
              Aviation AI
            </p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.id} href={item.href}>
              <motion.div
                className={`sidebar-item ${isActive ? "active" : ""}`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isActive && !collapsed && (
                  <motion.div
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-[#06d6a0]"
                    layoutId="activeIndicator"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-item w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Version */}
      {!collapsed && (
        <div className="px-5 pb-4">
          <p className="text-[10px] text-[#64748b]">AeroMind v3.0 · Phase 3</p>
        </div>
      )}
    </motion.aside>
  );
}
