"use client";

import React from "react";
import { motion } from "framer-motion";

export default function InternalFeed() {
  const logs = [
    "[SYS] PING // UPLINK_04: 12ms",
    "[MEM] ADDR_0xFF23: STORE_SUCCESS",
    "[NET] AES_256_HANDSHAKE: OK",
    "[BIO] SCAN: NO_ANOMALIES",
    "[UPL] SYNC: ORBITAL_HUB_01",
    "[CRN] UPDATE_UI: EXECUTING...",
    "[SYS] BOOT_SEQUENCE: STEP_42",
    "[MEM] BUFFER_CLEAR: DONE",
    "[NET] UPLINK_SECURE: BROADCASTING",
    "[SYS] KERNEL_WATCHDOG: ACTIVE",
  ];

  return (
    <div className="flex flex-col items-end gap-4 font-mono">
      {/* Network Uplink Topology */}
      <div className="w-64 h-24 border border-primary/20 bg-black/40 p-2 relative overflow-hidden">
        <div className="text-[8px] text-primary/60 mb-2 uppercase tracking-tighter font-bold">Uplink_Topology</div>
        <div className="flex justify-around items-center h-12">
          <motion.div 
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <div className="h-px w-8 bg-primary/30" />
          <div className="w-4 h-4 border border-primary flex items-center justify-center">
            <motion.div 
              className="w-1 h-1 bg-primary"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
          <div className="h-px w-8 bg-primary/30" />
          <motion.div 
            className="w-2 h-2 rounded-full bg-primary/40"
            animate={{ opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
        </div>
        <div className="absolute bottom-1 right-2 text-[7px] text-primary/30">SIGNAL_STRENGTH: 88dBm</div>
      </div>
      
      {/* Internal Feed Logs */}
      <div className="w-64 h-36 overflow-hidden flex flex-col border border-primary/20 bg-black/20 p-2">
        <div className="text-[9px] text-primary/60 border-b border-primary/20 pb-1 mb-2 font-bold uppercase tracking-tighter flex justify-between">
          <span>Internal_Feed</span>
          <motion.span 
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-secondary"
          >
            REC ●
          </motion.span>
        </div>
        <div className="flex-grow overflow-hidden relative">
          <motion.div 
            className="absolute w-full font-mono text-[8px] text-primary/60 leading-tight uppercase"
            animate={{ y: ["0%", "-50%"] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            {logs.concat(logs).map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
