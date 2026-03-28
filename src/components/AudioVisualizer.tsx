import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceAssistantStatus } from "@/hooks/useVoiceAssistant";

interface AudioVisualizerProps {
  voiceStatus?: VoiceAssistantStatus;
  amplitude?: number;

  activeModel?: string;
}

export default function AudioVisualizer({ 
  voiceStatus = "idle", 
  amplitude = 0, 
  activeModel = "SVR_CORE_v1"
}: AudioVisualizerProps) {
  const [pulse, setPulse] = useState(0);
  const barCount = 100;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  // Mock system metrics that fluctuate slightly
  const [sysMetrics, setSysMetrics] = useState({ cpu: 12, ram: 42 });

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 100);
      setSysMetrics(prev => ({
        cpu: Math.max(5, Math.min(99, prev.cpu + (Math.random() * 4 - 2))),
        ram: Math.max(30, Math.min(95, prev.ram + (Math.random() * 2 - 1)))
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Determine colors based on status
  const isRecording = voiceStatus === "recording";
  const isPlaying = voiceStatus === "playing";
  const isThinking = voiceStatus === "thinking";
  const isError = voiceStatus === "error";

  // TOXIC GREEN THEME
  const primaryColor = isError ? "#ef4444" : "#00ff41"; 
  const glowClass = isError ? "glow-red" : "glow-green";

  // Calculate dynamic spikes based on real amplitude
  const getSpikeHeight = (i: number) => {
    if (isThinking) return Math.random() * 5;
    if (isRecording || isPlaying) {
      // Use amplitude to scale basic height
      const baseSpike = amplitude * 40;
      // Add some variance per bar
      return baseSpike * (0.5 + Math.random() * 0.5);
    }
    return 0;
  };

  return (
    <div className="relative w-[600px] h-[600px] flex items-center justify-center font-mono select-none">
      
      {/* 1. AMBIENT BLOOM (TOXIC GREEN) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <motion.div 
          className="absolute w-[450px] h-[450px] rounded-full blur-[80px]" 
          animate={{ 
            backgroundColor: primaryColor,
            scale: (isRecording || isPlaying) ? [1, 1 + amplitude, 1] : isThinking ? [1, 1.05, 1] : 1,
            opacity: (isRecording || isPlaying) ? [0.1, 0.2 + amplitude * 0.3, 0.1] : 0.1
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      </div>

      {/* 2. OUTER REFERENCE RINGS */}
      <motion.div 
        className="absolute w-full h-full rounded-full border-[0.5px]"
        style={{ borderColor: `${primaryColor}1a` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
      >
        {[0, 90, 180, 270].map(deg => (
          <div key={deg} style={{ transform: `rotate(${deg}deg)` }} className="absolute inset-0">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-[0.5px] h-3" style={{ backgroundColor: `${primaryColor}33` }} />
            </div>
          </div>
        ))}
      </motion.div>

      {/* 3. RADIAL DATA BARS (REACTIVE) */}
      <div className="absolute inset-0 pointer-events-none">
        {bars.map((i) => {
          const angle = (i / barCount) * 360;
          const isAccent = i % 10 === 0;
          const baseHeight = isAccent ? 12 : 5;
          const spike = getSpikeHeight(i);
          
          return (
            <div key={i} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
              <motion.div 
                className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[1px]"
                initial={false}
                animate={{ 
                  height: baseHeight + spike,
                  opacity: (isRecording || isPlaying) ? (0.2 + amplitude) : (isAccent ? 0.3 : 0.1),
                  backgroundColor: primaryColor,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              />
            </div>
          );
        })}
      </div>

      {/* 4. MID PROTOCOL RING */}
      <motion.div 
        className="absolute w-[72%] h-[72%] border rounded-full"
        style={{ borderColor: `${primaryColor}22` }}
        animate={{ 
          rotate: isThinking ? [0, 360] : -360,
          scale: (isRecording || isPlaying) ? 1 + (amplitude * 0.05) : 1
        }}
        transition={{ 
          rotate: { duration: isThinking ? 5 : 100, repeat: Infinity, ease: "linear" },
          scale: { type: "spring", stiffness: 200 }
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-3 text-[7px] tracking-[0.4em] font-bold" style={{ color: `${primaryColor}aa` }}>
          {voiceStatus.toUpperCase()} // SYS_{isThinking ? "BUSY" : "STABLE"}
        </div>
        
        {/* Thinking Shards */}
        {isThinking && [0, 60, 120, 180, 240, 300].map(deg => (
          <motion.div 
            key={deg}
            className="absolute w-1.5 h-1.5 border border-[#00ff41]/50"
            style={{ 
              top: '50%', 
              left: '50%', 
              transform: `rotate(${deg}deg) translate(180px) rotate(-${deg}deg)` 
            }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: deg / 360 }}
          />
        ))}
      </motion.div>

      {/* 5. CENTRAL COMMAND NODE */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* SVG Core Waveform */}
        <svg className="absolute w-[260px] h-[260px] overflow-visible" viewBox="0 0 100 100">
          <motion.circle 
            cx={50}
            cy={50}
            r={24}
            fill="none"
            stroke={primaryColor} strokeWidth="0.5" strokeOpacity="0.1" 
            style={{ transformOrigin: "50% 50%" }}
            animate={{ 
              scale: (isRecording || isPlaying) ? 1 + amplitude : 1,
              opacity: isThinking ? [0.1, 0.4, 0.1] : 0.1
            }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          />
          {[0, 1, 2].map((layer) => (
            <motion.circle
              key={layer}
              cx={50}
              cy={50}
              r={30 + layer * 8}
              fill="none"
              stroke={primaryColor}
              strokeWidth="0.5"
              strokeDasharray={isThinking ? "5 20" : "1 15"}
              animate={{ 
                rotate: (layer % 2 === 0 ? 360 : -360) * (isThinking ? 4 : 1),
                opacity: [0.1, 0.3, 0.1],
                scale: (isRecording || isPlaying) ? 1 + (amplitude * (0.02 * layer)) : 1
              }}
              transition={{ duration: (30 + layer * 15) / (isThinking ? 4 : 1), repeat: Infinity, ease: "linear" }}
              className="opacity-10"
            />
          ))}
        </svg>

        {/* Status Readout */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <div className="text-[7px] tracking-[0.5em] uppercase font-bold" style={{ color: `${primaryColor}88` }}>
            {isPlaying ? "VOX_DOWNLINK" : isRecording ? "VOX_UPLINK" : "CORE_ID"}
          </div>
          <motion.div 
            className={`text-2xl font-black text-white tracking-widest ${glowClass}`}
            animate={{ 
              scale: (isRecording || isPlaying) ? 1 + (amplitude * 0.1) : 1
            }}
          >
            {activeModel}<span className="text-[8px] ml-1 font-normal opacity-50">v4.0</span>
          </motion.div>
        </div>



        <div className="w-40 h-[1px] bg-gradient-to-r from-transparent via-[#00ff41]/30 to-transparent mb-6 mt-12" />

        {/* Real-time System Metrics */}
        <div className="grid grid-cols-2 gap-8 text-[7px] font-bold tracking-[0.3em]">
          <div className="flex flex-col items-start gap-1">
            <span style={{ color: `${primaryColor}66` }}>CPU_LOAD</span>
            <div className="flex items-center gap-2">
              <div className="w-12 h-1 bg-white/5 overflow-hidden">
                <motion.div className="h-full bg-[#00ff41]" animate={{ width: `${sysMetrics.cpu}%` }} />
              </div>
              <span className="text-white/80">{sysMetrics.cpu.toFixed(1)}%</span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1">
            <span style={{ color: `${primaryColor}66` }}>MEM_FLOW</span>
            <div className="flex items-center gap-2">
              <div className="w-12 h-1 bg-white/5 overflow-hidden">
                <motion.div className="h-full bg-[#00ff41]" animate={{ width: `${sysMetrics.ram}%` }} />
              </div>
              <span className="text-white/80">{(sysMetrics.ram / 10).toFixed(2)} GB</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. PERIPHERAL ANNOTATIONS (REACTIVE) */}
      <div className="absolute inset-0 pointer-events-none text-[6px] font-bold tracking-widest" style={{ color: `${primaryColor}66` }}>
        <div className="absolute top-[35%] right-[12%] text-right">
          SIGNAL_STRENGTH<br/>
          <span className="text-white/80">{(98.2 + Math.random()).toFixed(2)} dBm</span>
        </div>
        <div className="absolute bottom-[35%] left-[12%] text-left">
          LATENCY_DELTA<br/>
          <span className="text-white/80">{(12 + Math.random() * 5).toFixed(0)} ms</span>
        </div>
      </div>

      {/* 7. RADIAL GUIDES */}
      <div className="absolute w-[65%] h-px bg-white/5" />
      <div className="absolute h-[65%] w-px bg-white/5" />
    </div>
  );
}
