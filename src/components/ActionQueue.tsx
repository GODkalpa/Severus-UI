"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Clock, Check } from "lucide-react";
import type { DashboardActionItem } from "@/hooks/useRealtimeDashboard";

interface ActionQueueProps {
  data: DashboardActionItem[];
}

export default function ActionQueue({ data }: ActionQueueProps) {
  const pendingCount = data.filter((t) => !t.completed).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Agenda
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
            {pendingCount} active
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-white/40 font-mono">LIVE</span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-grow overflow-y-auto space-y-2 pr-1">
        <AnimatePresence initial={false}>
          {data.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/30">
              No pending action items
            </div>
          ) : (
            data.slice(0, 15).map((task, i) => (
              <motion.div
                key={task.id || i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                  task.completed
                    ? "bg-white/[0.02] border-white/5 opacity-40"
                    : "bg-white/[0.04] border-white/10 hover:border-white/20"
                }`}
              >
                <div className="mt-0.5">
                  {task.completed ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  ) : (
                    <Circle className="w-4 h-4 text-white/30" />
                  )}
                </div>

                <div className="flex flex-col flex-grow min-w-0">
                  <span
                    className={`text-xs leading-snug font-medium truncate ${
                      task.completed ? "line-through text-white/50" : "text-white/90"
                    }`}
                  >
                    {task.title || "Untitled Task"}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[9px] px-1 rounded uppercase tracking-wider font-mono ${
                        task.priority === "high" || task.priority === "urgent"
                          ? "bg-red-500/15 text-red-400"
                          : task.priority === "low"
                          ? "bg-white/5 text-white/40"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {task.priority || "Normal"}
                    </span>
                    {task.dueDate && (
                      <span className="text-[10px] text-white/40 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
