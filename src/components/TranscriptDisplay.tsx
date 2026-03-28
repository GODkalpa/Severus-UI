"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TranscriptDisplayProps {
  text: string | null;
  status: string;
}

export default function TranscriptDisplay({ text, status }: TranscriptDisplayProps) {
  const isTranscribing = status === "recording" || status === "thinking" || status === "playing";
  
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-10">
      <AnimatePresence mode="wait">
        {text && isTranscribing ? (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-primary animate-pulse" />
              <span className="text-[10px] font-mono text-primary/60 uppercase tracking-[0.4em]">
                Uplink_Transcript_Echo
              </span>
              <span className="w-1.5 h-1.5 bg-primary animate-pulse" />
            </div>
            
            <p className="text-xl md:text-2xl font-mono text-white glow-green tracking-tight leading-relaxed max-w-full italic">
              "{text}"
            </p>
            
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-primary/30 to-transparent mt-2" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
