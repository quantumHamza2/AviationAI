"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, CheckCheck, Trash2, CloudLightning, Clock, Cpu, AlertTriangle } from "lucide-react";
import { useNotifications, type Notification } from "@/lib/useNotifications";

const TYPE_ICON: Record<string, React.ElementType> = {
  weather: CloudLightning,
  delay: Clock,
  system: Cpu,
  alert: AlertTriangle,
};

const SEVERITY_COLOR: Record<string, string> = {
  info: "#3b82f6",
  warning: "#f59e0b",
  critical: "#ef4444",
};

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, dismissNotification, markAsRead, markAllRead, clearAll } =
    useNotifications();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.severity === filter);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-white/5 transition-colors"
      >
        <Bell className="w-5 h-5 text-[#94a3b8]" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-[#ef4444] text-[9px] font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 w-[380px] max-h-[480px] rounded-2xl overflow-hidden flex flex-col z-[100]"
            style={{
              background: "rgba(10, 14, 26, 0.97)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#f1f5f9]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Mark all read">
                  <CheckCheck className="w-3.5 h-3.5 text-[#64748b]" />
                </button>
                <button onClick={clearAll} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Clear all">
                  <Trash2 className="w-3.5 h-3.5 text-[#64748b]" />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="px-4 py-2 flex gap-1.5 border-b border-white/5">
              {(["all", "critical", "warning", "info"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    filter === f
                      ? "bg-white/10 text-[#f1f5f9]"
                      : "text-[#64748b] hover:text-[#94a3b8]"
                  }`}
                >
                  {f === "all" ? "All" : f === "critical" ? "🔴 Urgent" : f === "warning" ? "🟡 Warnings" : "🔵 Info"}
                </button>
              ))}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
              <AnimatePresence initial={false}>
                {filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-8 h-8 text-[#334155] mx-auto mb-2" />
                    <p className="text-xs text-[#64748b]">No notifications</p>
                  </div>
                ) : (
                  filtered.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      onRead={markAsRead}
                      onDismiss={dismissNotification}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({
  notif,
  onRead,
  onDismiss,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon = TYPE_ICON[notif.type] || AlertTriangle;
  const color = SEVERITY_COLOR[notif.severity] || "#3b82f6";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      onClick={() => onRead(notif.id)}
      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors group ${
        notif.read ? "opacity-60 hover:opacity-80" : "hover:bg-white/5"
      }`}
    >
      <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-[#f1f5f9] leading-snug">{notif.title}</p>
          {!notif.read && <div className="w-2 h-2 rounded-full bg-[#3b82f6] flex-shrink-0 mt-1" />}
        </div>
        <p className="text-[10px] text-[#94a3b8] mt-0.5 line-clamp-2">{notif.message}</p>
        <p className="text-[9px] text-[#475569] mt-1">{timeAgo(notif.timestamp)}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(notif.id); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 transition-all"
      >
        <X className="w-3 h-3 text-[#64748b]" />
      </button>
    </motion.div>
  );
}
