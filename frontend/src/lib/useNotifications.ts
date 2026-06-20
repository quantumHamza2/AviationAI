"use client";

import { useState, useEffect, useCallback } from "react";

export interface Notification {
  id: string;
  type: "weather" | "delay" | "system" | "alert";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  timestamp: Date;
  read: boolean;
}

const MOCK_TITLES: Record<string, string[]> = {
  weather: [
    "Storm Warning — Chicago O'Hare",
    "Low Visibility Alert — London Heathrow",
    "Strong Winds — Dubai International",
    "Thunderstorm Advisory — Atlanta",
    "Fog Warning — San Francisco",
  ],
  delay: [
    "Delay Spike at JFK — 23 flights affected",
    "Gate congestion at LAX Terminal 4",
    "Runway closure at ORD — expect 30 min delays",
    "Air traffic hold at ATL — departures paused",
    "Taxi queue building at CDG — avg 18 min wait",
  ],
  system: [
    "AI Model updated — accuracy improved to 87%",
    "New weather data source connected",
    "Prediction engine retrained successfully",
    "Backend sync completed — all systems green",
  ],
  alert: [
    "Emergency landing at DFW — runway 17R closed",
    "Security hold at LHR Terminal 5",
    "Medical diversion to MIA — expect delays",
  ],
};

function randomNotification(): Notification {
  const types = ["weather", "delay", "system", "alert"] as const;
  const type = types[Math.floor(Math.random() * types.length)];
  const titles = MOCK_TITLES[type];
  const title = titles[Math.floor(Math.random() * titles.length)];
  const severity: Notification["severity"] =
    type === "alert" ? "critical" : type === "weather" ? "warning" : "info";

  const messages: Record<string, string> = {
    weather: "Weather conditions may impact flight operations. Check the Weather Intel page for details.",
    delay: "Multiple flights are experiencing delays. Review the Flight Tracker for live updates.",
    system: "A system update has been applied. No action needed — everything is running smoothly.",
    alert: "This is a high-priority alert. Immediate attention may be required.",
  };

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    message: messages[type],
    severity,
    timestamp: new Date(),
    read: false,
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Seed with 3 initial notifications
    return Array.from({ length: 3 }, () => {
      const n = randomNotification();
      n.timestamp = new Date(Date.now() - Math.random() * 600000); // within last 10 min
      return n;
    });
  });

  // Generate a new notification every 30–60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) => [randomNotification(), ...prev].slice(0, 50));
    }, 30000 + Math.random() * 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((n: Notification) => {
    setNotifications((prev) => [n, ...prev].slice(0, 50));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    dismissNotification,
    markAsRead,
    markAllRead,
    clearAll,
  };
}
