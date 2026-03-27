"use client";

import React from "react";
import { motion } from "framer-motion";

interface BiometricsWidgetProps {
  data: any[];
}

export default function BiometricsWidget({ data }: BiometricsWidgetProps) {
  // Use the latest biometric entry if available
  const latest = data[0] || { calories: 0, heart_rate: 0, steps: 0 };
  
  const metrics = [
    { label: "CALORIES", value: latest.calories || 0, max: 2500, color: "#00F0FF" },
    { label: "HEART_RATE", value: latest.heart_rate || 72, max: 200, color: "#FF3B3B" },
    { label: "STEPS", value: latest.steps || 0, max: 10000, color: "#3BFF3B" },
  ];

  return (
    <div className="flex flex-col gap-6 font-mono p-4 border-l-2 border-primary/20 bg-black/40">
      <div className="text-[10px] text-primary/60 tracking-[0.3em] uppercase mb-2">BIOMETRIC_UPLINK</div>
      <div className="flex gap-8">
        {metrics.map((metric, i) => {
          const percentage = Math.min((metric.value / metric.max) * 100, 100);
          const circumference = 2 * Math.PI * 30;
          const strokeDashoffset = circumference - (percentage / 100) * circumference;

          return (
            <div key={metric.label} className="relative flex flex-col items-center">
              <svg className="w-20 h-20 -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="40"
                  cy="40"
                  r="30"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="4"
                />
                {/* Progress Ring */}
                <motion.circle
                  cx="40"
                  cy="40"
                  r="30"
                  fill="none"
                  stroke={metric.color}
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="drop-shadow-[0_0_8px_var(--tw-shadow-color)]"
                  style={{ '--tw-shadow-color': metric.color } as any}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                <span className="text-[10px] font-bold text-white leading-none">
                  {Math.round(metric.value)}
                </span>
                <span className="text-[6px] text-white/40 uppercase tracking-tighter">
                  {metric.label.split('_')[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Real-time pulse indicator */}
      <div className="flex items-center gap-2 mt-2">
        <motion.div 
          className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ff0000]"
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="text-[8px] text-white/60 uppercase tracking-widest">LIVE_TELEMETRY_SYNC</span>
      </div>
    </div>
  );
}
