"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import type { DashboardActionItem } from "@/hooks/useRealtimeDashboard";

interface ActionQueueProps {
  data: DashboardActionItem[];
}

export default function ActionQueue({ data }: ActionQueueProps) {
  return (
    <div className="flex flex-col gap-4 font-mono p-4 border-r-2 border-primary/20 bg-black/40 w-64 h-64 overflow-hidden">
      <div className="flex justify-between items-center border-b border-primary/20 pb-2 mb-2">
        <span className="text-[10px] text-primary/60 tracking-[0.2em] uppercase font-bold">Active_Agenda</span>
        <div className="flex gap-1">
          <motion.div 
            className="w-1 h-1 bg-primary"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[8px] text-primary/40 uppercase tracking-tighter">Sync_Live</span>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence initial={false}>
          {data.slice(0, 10).map((task, i) => (
            <motion.div
              key={task.id || i}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-center gap-3 mb-3 pb-2 border-b border-white/5 last:border-0"
            >
              {task.completed ? (
                <CheckCircle2 className="w-3 h-3 text-secondary" />
              ) : (
                <Circle className="w-3 h-3 text-primary/60" />
              )}
              <div className="flex flex-col flex-grow">
                <span className="text-[10px] text-white leading-tight uppercase font-medium">
                  {task.title || "Unknown Task"}
                </span>
                <span className="text-[7px] text-white/40 uppercase tracking-widest">
                  {task.priority || "Normal"}
                </span>
              </div>
              <Clock className="w-2.5 h-2.5 text-white/20" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <div className="absolute bottom-2 right-4 pointer-events-none opacity-20">
        <span className="text-[40px] font-black text-primary select-none">QUEUE</span>
      </div>
    </div>
  );
}
