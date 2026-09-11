"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, ExternalLink } from "lucide-react";

export interface TacticalAlert {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  url?: string;
}

interface NotificationToastProps {
  alert: TacticalAlert | null;
  onDismiss: () => void;
  onOpen?: (url?: string) => void;
}

export default function NotificationToast({ alert, onDismiss, onOpen }: NotificationToastProps) {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 6500);
    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-md pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/40 bg-zinc-950/90 backdrop-blur-xl p-3.5 shadow-[0_0_30px_rgba(16,185,129,0.18)]">
            {/* Top scanning ambient line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase">
                    {alert.title || "SEVERUS ALERT"}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {alert.timestamp}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-200 leading-relaxed break-words font-sans">
                  {alert.body}
                </p>

                {alert.url && alert.url !== "/" && (
                  <button
                    onClick={() => onOpen?.(alert.url)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    <span>View Target</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={onDismiss}
                className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition"
                aria-label="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
