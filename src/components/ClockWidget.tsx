"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
    second: "2-digit" 
  });
  
  const dateStr = time.toLocaleDateString("en-US", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });

  return (
    <div className="flex flex-col gap-1 font-mono text-primary p-4 border-l-2 border-primary/20 bg-black/20 backdrop-blur-md">
      <div className="text-[10px] uppercase tracking-[0.3em] opacity-50 mb-1">
        Temporal_Sync // Local_Time
      </div>
      <motion.div 
        key={timeStr}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        className="text-4xl font-bold tracking-tighter glow-green"
      >
        {timeStr}
      </motion.div>
      <div className="text-[11px] uppercase tracking-widest opacity-80">
        {dateStr}
      </div>
      <div className="mt-2 flex gap-2">
        <div className="px-1.5 py-0.5 border border-primary/30 text-[8px] bg-primary/10 tracking-widest">
          GMT_OFFSET: +05:45 // DHARAN_CORE_SYNC
        </div>
        <div className="px-1.5 py-0.5 border border-green-500/30 text-[8px] bg-green-500/10 text-green-400 tracking-widest">
          UTC_SYNC_OK
        </div>
      </div>
    </div>
  );
}
