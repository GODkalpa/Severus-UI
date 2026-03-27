"use client";

import React from "react";
import { motion } from "framer-motion";
import AudioVisualizer from "./AudioVisualizer";
import SystemDiagnostics from "./SystemDiagnostics";
import OrbitalTrajectory from "./OrbitalTrajectory";
import BiometricsWidget from "./BiometricsWidget";
import ActionQueue from "./ActionQueue";
import FinancialLedger from "./FinancialLedger";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";

export default function HUDLayout() {
  const { status, error } = useVoiceAssistant();
  const { biometrics, actionQueue, financialLedger } = useRealtimeDashboard();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.5,
      },
    },
  };

  const itemLeft = {
    hidden: { x: -50, opacity: 0 },
    show: { x: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
  };

  const itemRight = {
    hidden: { x: 50, opacity: 0 },
    show: { x: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
  };

  const itemCenter = {
    hidden: { scale: 0.8, opacity: 0 },
    show: { scale: 1, opacity: 1, transition: { duration: 1, ease: "easeOut" } },
  };

  const itemTop = {
    hidden: { y: -30, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
  };

  const getStatusText = () => {
    switch (status) {
      case "connecting": return "CONNECTING...";
      case "connected": return "STABLE";
      case "recording": return "LISTENING";
      case "playing": return "PROCESSING_VOICE";
      case "error": return "LINK_ERROR";
      default: return "OPERATIONAL";
    }
  };

  return (
    <motion.main 
      className="relative w-screen h-screen overflow-hidden bg-black flex flex-col p-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Status Header */}
      <motion.div 
        variants={itemTop}
        className="absolute top-10 left-0 right-0 z-20 flex flex-col items-center pointer-events-none"
      >
        <div className="relative flex flex-col items-center gap-2">
          {/* Decorative Top Trace */}
          <div className="absolute -top-4 w-64 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          
          <div className="flex items-center gap-8">
            <div className="w-16 h-px bg-primary/20" />
            <div className="flex items-center gap-4">
              <motion.div 
                className={`w-2 h-2 ${status === 'error' ? 'bg-red-500 shadow-[0_0_12px_#ff0000]' : 'bg-primary shadow-[0_0_12px_#00f0ff]'}`}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <h2 className="font-mono text-2xl font-bold tracking-[0.5em] text-white uppercase glow-cyan">
                HUD: <span className={status === 'error' ? 'text-red-500' : 'text-primary-container'}>{getStatusText()}</span>
              </h2>
            </div>
            <div className="w-16 h-px bg-primary/20" />
          </div>
          
          <div className="text-[9px] text-primary/60 tracking-[1em] font-mono uppercase bg-black/40 px-4 py-1 border-x border-primary/20">
            {status === "error"
              ? error ?? "VOICE_LINK_ERROR"
              : status === "recording"
                ? "MIC_ACTIVE // UPLINK_HD"
                : "SECURE_ENCLAVE_ACTIVE"}
          </div>
        </div>
      </motion.div>

      {/* Main Content Areas */}
      <div className="flex-grow flex items-center justify-center relative">
        {/* Top Corners */}
        <motion.div variants={itemLeft} className="absolute top-0 left-0">
          <SystemDiagnostics />
        </motion.div>
        
        <motion.div variants={itemRight} className="absolute top-0 right-0">
          <OrbitalTrajectory />
        </motion.div>

        {/* Center Visualizer */}
        <motion.div variants={itemCenter} className="relative z-0">
          <AudioVisualizer voiceStatus={status} />
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 text-center w-max">
            <div className="flex gap-4 mb-2 justify-center">
              <div className="w-8 h-px bg-primary/40" />
              <div className="w-2 h-2 border border-primary/60 rotate-45" />
              <div className="w-8 h-px bg-primary/40" />
            </div>
            <span className="text-[14px] font-mono tracking-[0.5em] text-white/40 uppercase whitespace-nowrap">
              AETHER_OS // CORE_SYSTEM_V4.0_U
            </span>
          </div>
        </motion.div>

        {/* Bottom Corners */}
        <motion.div variants={itemLeft} className="absolute bottom-0 left-0">
          <BiometricsWidget data={biometrics} />
        </motion.div>
        
        <motion.div variants={itemRight} className="absolute bottom-0 right-0">
          <ActionQueue data={actionQueue} />
        </motion.div>

        {/* Financial Ledger (Floating Bottom Center) */}
        <motion.div 
          variants={itemCenter} 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10"
        >
          <FinancialLedger data={financialLedger} />
        </motion.div>
      </div>

      {/* Floating Side Data (Lower opacity environmentals) */}
      <motion.div 
        variants={itemLeft}
        className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col gap-8 opacity-40 font-mono"
      >
        <div className="flex flex-col border-l border-primary/60 pl-2">
          <span className="text-[7px] text-primary">A-01</span>
          <span className="text-[10px] text-white">48.2</span>
        </div>
        <div className="flex flex-col border-l border-primary/60 pl-2">
          <span className="text-[7px] text-primary">B-07</span>
          <span className="text-[10px] text-white">12.9</span>
        </div>
      </motion.div>

      <motion.div 
        variants={itemRight}
        className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col items-end gap-8 opacity-40"
      >
        <div className="w-8 h-1 bg-primary/40" />
        <div className="w-4 h-1 bg-primary" />
        <div className="w-12 h-1 bg-primary/20" />
      </motion.div>
    </motion.main>
  );
}
