"use client";

import { useEffect, useState } from "react";
import { Search, Wifi, WifiOff, Globe } from "lucide-react";
import NotificationCenter from "@/components/Notifications/NotificationCenter";

export default function TopBar() {
  const [utcTime, setUtcTime] = useState("");
  const [localTime, setLocalTime] = useState("");
  const [connected] = useState(true);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setUtcTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setLocalTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 border-b border-white/5"
      style={{ background: "rgba(10, 14, 26, 0.8)", backdropFilter: "blur(16px)" }}>
      
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 w-full hover:border-white/10 transition-colors">
          <Search className="w-4 h-4 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search flights, airports, routes..."
            className="bg-transparent text-sm text-[#f1f5f9] placeholder-[#64748b] outline-none w-full"
          />
          <kbd className="text-[10px] text-[#64748b] bg-white/5 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-5">
        {/* Clock */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#64748b]" />
            <span className="font-mono-data text-[#94a3b8]">{utcTime}</span>
            <span className="text-[10px] text-[#64748b]">UTC</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div>
            <span className="font-mono-data text-[#94a3b8]">{localTime}</span>
            <span className="text-[10px] text-[#64748b] ml-1">Local</span>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-1.5">
          {connected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-[#10b981] status-dot" />
              <Wifi className="w-3.5 h-3.5 text-[#10b981]" />
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <WifiOff className="w-3.5 h-3.5 text-[#ef4444]" />
            </>
          )}
        </div>

        {/* Notification Center */}
        <NotificationCenter />
      </div>
    </header>
  );
}
