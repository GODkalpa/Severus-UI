"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BiometricLockProps {
  onSuccess: () => void;
}

export default function BiometricLock({ onSuccess }: BiometricLockProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("AWAITING WEBAUTHN VERIFICATION...");
  const [progress, setProgress] = useState(0);

  const startScan = async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setStatus("INITIALIZING BIOMETRIC HANDSHAKE...");
    
    // Mock WebAuthn / Biometric Scan
    for (let i = 0; i <= 100; i += 5) {
      setProgress(i);
      if (i === 40) setStatus("VERIFYING NEURAL SIGNATURE...");
      if (i === 80) setStatus("DECRYPTING SECURE ENCLAVE...");
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    
    setStatus("ACCESS GRANTED");
    setTimeout(() => {
      onSuccess();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none">
      <div className="flex flex-col items-center max-w-lg w-full px-4 text-center">
        {/* Biometric Core */}
        <motion.div 
          className="relative group cursor-pointer mb-12"
          onClick={startScan}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Visual Anchor Brackets */}
          <div className="absolute -top-8 -left-8 w-6 h-6 border-t-2 border-l-2 border-primary/40" />
          <div className="absolute -top-8 -right-8 w-6 h-6 border-t-2 border-r-2 border-primary/40" />
          <div className="absolute -bottom-8 -left-8 w-6 h-6 border-b-2 border-l-2 border-primary/40" />
          <div className="absolute -bottom-8 -right-8 w-6 h-6 border-b-2 border-r-2 border-primary/40" />
          
          {/* Fingerprint Container */}
          <div className="relative p-8 overflow-hidden rounded-none">
            <Fingerprint 
              size={160} 
              className={cn(
                "text-primary transition-all duration-1000",
                isScanning ? "opacity-50 blur-[1px]" : "glow-lg"
              )} 
            />
            
            {/* Active Scan Line */}
            <AnimatePresence>
              {isScanning && (
                <motion.div 
                  className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_#00f0ff,0_0_30px_#00f0ff]"
                  initial={{ top: "0%" }}
                  animate={{ top: "100%" }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5, 
                    ease: "linear" 
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Decorative Data Flanks */}
          <div className="absolute -left-32 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-end hidden md:flex font-mono">
            <div className="text-[8px] text-outline tracking-widest opacity-60">0x7F4A22</div>
            <div className={cn("text-[8px] tracking-widest font-bold", isScanning ? "text-primary" : "text-secondary")}>
              {isScanning ? "SCANNING" : "LOCKED"}
            </div>
            <div className="text-[8px] text-outline tracking-widest opacity-60">PRTCL_V8</div>
          </div>
          
          <div className="absolute -right-32 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-start hidden md:flex font-mono">
            <div className="text-[8px] text-outline tracking-widest opacity-60">ENCRYPT:AES-256</div>
            <div className="text-[8px] text-primary tracking-widest font-bold">READY</div>
            <div className="text-[8px] text-outline tracking-widest opacity-60">
              {isScanning ? `${progress}%` : "WAITING..."}
            </div>
          </div>
        </motion.div>

        {/* Status Messaging */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <motion.span 
              className="w-2 h-2 bg-primary"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <h1 className="font-mono text-white text-lg tracking-[0.2em] uppercase font-bold glow-cyan">
              {status}
            </h1>
          </div>
          <p className="font-mono text-on-surface-variant/80 text-[10px] tracking-[0.3em] uppercase max-w-xs mx-auto">
            Biometric handshake required for level 4 clearance to [AETHER_CORE]
          </p>
        </div>

        {/* Action Cluster */}
        <div className="mt-16 flex flex-col items-center gap-6">
          <button 
            className="px-8 py-3 border border-primary/30 text-primary text-xs tracking-[0.2em] font-bold hover:bg-primary hover:text-black transition-all duration-300 uppercase group relative overflow-hidden rounded-none"
            onClick={startScan}
            disabled={isScanning}
          >
            <span className="relative z-10 group-hover:tracking-[0.4em] transition-all duration-500">
              {isScanning ? `Processing_${progress}%` : "Initialize_Local_Key"}
            </span>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-8 bg-outline/30" />
            <button className="text-[10px] text-on-surface-variant hover:text-white transition-opacity tracking-widest uppercase opacity-60">
              [ ABORT_UPLINK ]
            </button>
            <div className="h-[1px] w-8 bg-outline/30" />
          </div>
        </div>

        {/* Progress Bar (Visual Only) */}
        {isScanning && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
            <motion.div 
              className="h-full bg-primary shadow-[0_0_10px_#00f0ff]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Footer Environmental Chatter */}
        <div className="mt-24 font-mono text-[8px] text-outline opacity-40 uppercase tracking-[0.4em] flex justify-between w-full">
          <span>Node: 127.0.0.1</span>
          <span>Latency: 12ms</span>
          <span>Secure_Socket: Active</span>
        </div>
      </div>
    </div>
  );
}
