import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { VoiceAssistantStatus } from "@/hooks/useVoiceAssistant";

interface AudioVisualizerProps {
  voiceStatus?: VoiceAssistantStatus;
}

export default function AudioVisualizer({ voiceStatus = "idle" }: AudioVisualizerProps) {
  const [pulse, setPulse] = useState(0);
  const barCount = 100;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Determine colors based on status
  const isRecording = voiceStatus === "recording";
  const isPlaying = voiceStatus === "playing";
  const primaryColor = isPlaying ? "#ff6b00" : "#00f0ff";
  const glowClass = isPlaying ? "glow-orange" : "glow-cyan";

  return (
    <div className="relative w-[600px] h-[600px] flex items-center justify-center font-mono select-none">
      
      {/* 1. AMBIENT BLOOM */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <motion.div 
          className="absolute w-[400px] h-[400px] rounded-full blur-3xl" 
          animate={{ 
            backgroundColor: primaryColor,
            scale: isRecording ? [1, 1.2, 1] : 1
          }}
          transition={{ duration: 2, repeat: Infinity }}
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

      {/* 3. RADIAL DATA BARS */}
      <div className="absolute inset-0 pointer-events-none">
        {bars.map((i) => {
          const angle = (i / barCount) * 360;
          const isAccent = i % 10 === 0;
          const height = isAccent ? 12 : 5;
          const spike = isPlaying ? Math.random() * 20 : Math.random() * 8;
          
          return (
            <div key={i} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
              <motion.div 
                className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[0.5px]"
                style={{ backgroundColor: `${primaryColor}33` }}
                animate={{ 
                  height: [height, height + spike, height],
                  opacity: isAccent ? [0.3, 0.7, 0.3] : 0.1,
                  backgroundColor: isPlaying ? "#ff6b00" : "#00f0ff"
                }}
                transition={{ duration: 0.3 + Math.random() * 0.5, repeat: Infinity }}
              />
            </div>
          );
        })}
      </div>

      {/* 4. MID PROTOCOL RING */}
      <motion.div 
        className="absolute w-[70%] h-[70%] border rounded-full"
        style={{ borderColor: `${primaryColor}1a` }}
        animate={{ rotate: -360 }}
        transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-2 text-[6px] tracking-[0.4em] font-bold" style={{ color: `${primaryColor}66` }}>
          {voiceStatus.toUpperCase()}_STABLE
        </div>
      </motion.div>

      {/* 5. CENTRAL COMMAND NODE */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* SVG Core Waveform */}
        <svg className="absolute w-[240px] h-[240px] overflow-visible" viewBox="0 0 100 100">
          <motion.circle 
            cx="50%" cy="50%" r="22" fill="none" 
            stroke={primaryColor} strokeWidth="0.2" strokeOpacity="0.1" 
            animate={{ r: isRecording ? [22, 25, 22] : 22 }}
          />
          {[0, 1].map((layer) => (
            <motion.circle
              key={layer}
              cx="50%"
              cy="50%"
              r={28 + layer * 6}
              fill="none"
              stroke={primaryColor}
              strokeWidth="0.4"
              strokeDasharray="1 10"
              animate={{ 
                rotate: layer === 0 ? 360 : -360,
                stroke: primaryColor
              }}
              transition={{ duration: 20 + layer * 10, repeat: Infinity, ease: "linear" }}
              className="opacity-20"
            />
          ))}
        </svg>

        {/* Status Readout */}
        <div className="flex flex-col items-center gap-1 mb-4">
          <div className="text-[7px] tracking-[0.5em] uppercase font-bold" style={{ color: `${primaryColor}66` }}>
            {voiceStatus === "playing" ? "TTS_OUTPUT" : "CORE_FRQ"}
          </div>
          <motion.div 
            className={`text-3xl font-black text-white tracking-widest ${glowClass}`}
            animate={{ scale: isPlaying ? [1, 1.1, 1] : 1 }}
          >
            {isPlaying ? "AI_RT" : "74.2"}<span className="text-[10px] ml-1 font-normal" style={{ color: `${primaryColor}99` }}>{isPlaying ? "VOX" : "HZ"}</span>
          </motion.div>
        </div>

        <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-4" style={{ backgroundImage: `linear-gradient(to right, transparent, ${primaryColor}33, transparent)` }} />

        {/* Integrated Action Monitor */}
        <div className="flex flex-col items-center h-6 overflow-hidden">
          <motion.div
            animate={{ y: [0, -24, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="flex flex-col items-center gap-2 text-[6px] tracking-widest"
            style={{ color: `${primaryColor}66` }}
          >
            <div>{isRecording ? "STREAMING_AUDIO..." : "SCANNING_UPLINK..."}</div>
            <div className="font-bold italic" style={{ color: `${primaryColor}99` }}>
              {isPlaying ? "SYNTHESIZING_VOICE" : "NEURAL_SYNC_ACTIVE"}
            </div>
            <div>{isPlaying ? "AUDIO_BUFFER_READY" : "BUFFERING_DATA_STRM..."}</div>
          </motion.div>
        </div>

        {/* Progress Matrix */}
        <div className="flex gap-1 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div 
              key={i}
              className="w-2 h-0.5"
              style={{ backgroundColor: `${primaryColor}1a` }}
              animate={{ 
                backgroundColor: (pulse / 12) >= i ? primaryColor : `${primaryColor}0d`,
                boxShadow: (pulse / 12) >= i ? `0 0 5px ${primaryColor}` : "none"
              }}
            />
          ))}
        </div>
      </div>

      {/* 6. PERIPHERAL ANNOTATIONS */}
      <div className="absolute inset-0 pointer-events-none text-[6px] font-bold tracking-widest" style={{ color: `${primaryColor}4d` }}>
        <div className="absolute top-[30%] right-[15%] text-right">
          ALOC<br/>
          <span className="text-white/60">12.4G</span>
        </div>
        <div className="absolute bottom-[30%] left-[15%] text-left">
          FLOW<br/>
          <span className="text-white/60">821M</span>
        </div>
      </div>

      {/* 7. RADIAL GUIDES */}
      <div className="absolute w-[60%] h-px" style={{ backgroundColor: `${primaryColor}05` }} />
      <div className="absolute h-[60%] w-px" style={{ backgroundColor: `${primaryColor}05` }} />
    </div>
  );
}
