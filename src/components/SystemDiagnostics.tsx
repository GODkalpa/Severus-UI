"use client";

import React from "react";
import { motion } from "framer-motion";

export default function SystemDiagnostics() {
  return (
    <div className="flex flex-col gap-4 font-mono">
      <div className="relative w-40 h-40 flex items-center justify-center border border-primary/10">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent"
          animate={{ translateY: ["-100%", "100%"], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <svg className="absolute w-full h-full opacity-30">
          <motion.circle 
            cx="50%" 
            cy="50%" 
            fill="none" 
            r="45%" 
            stroke="#00F0FF" 
            strokeDasharray="5 15" 
            strokeWidth="1"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        </svg>
        <div className="text-center">
          <div className="text-[9px] text-primary/60 mb-1 tracking-tighter uppercase">SYS_INTEGRITY</div>
          <div className="text-xl font-bold glow-cyan">98.4%</div>
          <div className="h-px w-12 bg-primary/40 mx-auto my-1" />
          <div className="text-[8px] text-primary/40 truncate">CORE_LINK: ACTIVE</div>
        </div>
      </div>
      
      {/* System Resource Heatmap */}
      <div className="w-40 border border-primary/20 bg-black/40 p-2">
        <div className="text-[8px] text-primary/60 mb-2 uppercase tracking-widest font-bold">Resource_Heatmap</div>
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-3 bg-primary"
              animate={{ opacity: [0.2, 0.9, 0.4] }}
              transition={{ 
                duration: 1 + Math.random(), 
                repeat: Infinity, 
                delay: i * 0.1 
              }}
              style={{ backgroundColor: `rgba(0, 219, 233, ${0.2 + Math.random() * 0.8})` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
