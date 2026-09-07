"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col text-right">
        <span className="text-sm font-mono font-semibold tracking-wider text-white/90">
          {timeStr}
        </span>
        <span className="text-[10px] text-white/40 tracking-wider">
          {dateStr}
        </span>
      </div>
    </div>
  );
}
