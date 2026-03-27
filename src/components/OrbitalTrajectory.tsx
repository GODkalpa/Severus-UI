"use client";

import React from "react";
import { motion } from "framer-motion";
import { LocateFixed } from "lucide-react";

export default function OrbitalTrajectory() {
  return (
    <div className="flex flex-col items-end gap-4 text-right font-mono">
      <div className="relative w-40 h-40 border border-primary/10 flex items-center justify-center">
        <motion.svg 
          className="w-[80%] h-[80%] opacity-40" 
          viewBox="0 0 100 100"
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="50" cy="50" fill="none" r="45" stroke="#00F0FF" strokeWidth="0.5" />
          <ellipse cx="50" cy="50" fill="none" rx="45" ry="15" stroke="#00F0FF" strokeWidth="0.5" />
          <ellipse cx="50" cy="50" fill="none" rx="15" ry="45" stroke="#00F0FF" strokeWidth="0.5" />
        </motion.svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <LocateFixed className="text-primary w-5 h-5" />
          </motion.div>
        </div>
      </div>
      
      <div className="text-[9px] text-primary/80 space-y-1 bg-black/40 p-2 border-r border-primary/40 w-full">
        <div className="text-white/40 uppercase">TRAJECTORY_CALC:</div>
        <div className="text-primary">V_ORB: 7.67 KM/S</div>
        <div>ALT: 42,402.12 FT</div>
        <div className="text-primary-container">AZIMUTH: 142.8°</div>
        <div className="flex gap-1 mt-2 justify-end">
          <div className="w-1 h-1 bg-primary" />
          <div className="w-1 h-1 bg-primary/40" />
          <div className="w-1 h-1 bg-primary" />
        </div>
      </div>
    </div>
  );
}
