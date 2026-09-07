"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TranscriptDisplayProps {
  text: string | null;
  partialText?: string | null;
  status: string;
}

export default function TranscriptDisplay({ text, partialText, status }: TranscriptDisplayProps) {
  const activeText = partialText || text;
  const isTranscribing = Boolean(activeText && (status === "recording" || status === "thinking" || status === "playing"));

  return (
    <div className="w-full max-w-2xl px-6 py-2 min-h-[4rem] flex flex-col items-center justify-center text-center">
      <AnimatePresence mode="wait">
        {isTranscribing && activeText ? (
          <motion.div
            key={activeText}
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center gap-1.5"
          >
            <p className="text-base sm:text-lg md:text-xl font-medium text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] leading-relaxed tracking-normal font-sans max-w-xl">
              {activeText}
            </p>
            {partialText && (
              <span className="text-xs text-emerald-400/80 font-mono tracking-wider animate-pulse">
                listening...
              </span>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-white/30 font-sans tracking-wide"
          >
            {status === "idle" || status === "connected" ? "Listening passively • Tap sphere to interrupt" : ""}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
