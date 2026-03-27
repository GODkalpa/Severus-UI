"use client";

import React from "react";
import { motion } from "framer-motion";

export default function NeuralFeed() {
  return (
    <div className="flex flex-col gap-6 font-mono">
      <div className="border-l-2 border-primary/40 pl-4 space-y-4">
        <div>
          <div className="text-[9px] text-outline uppercase tracking-widest">Ambient_Temp</div>
          <div className="text-xl text-white">21.4°<span className="text-primary text-xs ml-1">C</span></div>
        </div>
        <div>
          <div className="text-[9px] text-outline uppercase tracking-widest">Oxygen_Sat</div>
          <div className="text-xl text-primary glow-cyan">98%</div>
        </div>
      </div>
      
      {/* Neural Activity Scan */}
      <div className="w-48 h-16 border border-primary/20 bg-black/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 text-[8px] p-1 text-primary/60 font-bold uppercase">NEURAL_ACTIVITY</div>
        <div className="flex items-center h-full pt-4">
          <motion.svg 
            className="w-[200%] h-8" 
            preserveAspectRatio="none" 
            viewBox="0 0 200 20"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            <path 
              d="M0 10 Q 12.5 0, 25 10 T 50 10 T 75 10 T 100 10 T 125 10 T 150 10 T 175 10 T 200 10" 
              fill="none" 
              opacity="0.6" 
              stroke="#00F0FF" 
              strokeWidth="0.5" 
            />
          </motion.svg>
        </div>
      </div>
    </div>
  );
}
