"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ArrowDownRight, Tag } from "lucide-react";
import type { DashboardFinancialEntry } from "@/hooks/useRealtimeDashboard";

interface FinancialLedgerProps {
  data: DashboardFinancialEntry[];
}

export default function FinancialLedger({ data }: FinancialLedgerProps) {
  const total = data.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header & Total */}
      <div className="flex justify-between items-start pb-3 border-b border-white/10 mb-3">
        <div>
          <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
            <Wallet className="w-3 h-3 text-emerald-400" />
            <span className="uppercase tracking-wider font-medium text-[10px]">
              Total Outflow
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
            {data.length} Records
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex-grow overflow-y-auto space-y-2 pr-1">
        <AnimatePresence initial={false}>
          {data.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/30">
              No recent transactions recorded
            </div>
          ) : (
            data.slice(0, 10).map((expense, i) => (
              <motion.div
                key={expense.id || i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <ArrowDownRight className="w-3.5 h-3.5 text-amber-400/80" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-white/90 truncate">
                      {expense.description || expense.category || "General Expense"}
                    </span>
                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />
                      {expense.category || "Uncategorized"}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono text-xs font-semibold text-emerald-400">
                  -${(expense.amount || 0).toFixed(2)}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
