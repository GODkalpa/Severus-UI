"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, Minus, ArrowUpRight } from "lucide-react";
import type { DashboardFinancialEntry } from "@/hooks/useRealtimeDashboard";

interface FinancialLedgerProps {
  data: DashboardFinancialEntry[];
}

export default function FinancialLedger({ data }: FinancialLedgerProps) {
  const total = data.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="flex flex-col gap-4 font-mono p-4 border border-primary/10 bg-black/60 w-72 h-48 overflow-hidden backdrop-blur-md">
      <div className="flex justify-between items-end mb-2">
        <div>
          <span className="text-[9px] text-primary/60 tracking-[0.3em] uppercase block mb-1">Financial_Ledger</span>
          <div className="text-xl font-bold text-white tracking-widest glow-cyan">
            ${total.toFixed(2)}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[7px] text-white/40 mb-1 font-mono">24H_CHANGE</div>
          <div className="flex items-center gap-1 text-secondary text-[10px] font-bold">
            <TrendingDown className="w-2.5 h-2.5" />
            0.4%
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-2" />

      <div className="flex-grow overflow-hidden relative">
        <AnimatePresence initial={false}>
          {data.slice(0, 5).map((expense, i) => (
            <motion.div
              key={expense.id || i}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.6, ease: "anticipate" }}
              className="flex justify-between items-center mb-2 px-2 py-1 bg-white/5 border-l-2 border-primary/40"
            >
              <div className="flex flex-col">
                <span className="text-[9px] text-white/90 uppercase truncate w-32">
                  {expense.category || "General"}
                </span>
                <span className="text-[7px] text-white/30 uppercase tracking-tighter">
                  {expense.description || "No description"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-secondary font-bold">-${expense.amount?.toFixed(2)}</span>
                <ArrowUpRight className="w-2 h-2 text-white/20" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="absolute top-0 right-0 p-1 opacity-10">
        <Minus className="text-primary w-24 h-24 rotate-[30deg]" />
      </div>
    </div>
  );
}
