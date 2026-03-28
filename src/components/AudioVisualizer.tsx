import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { VoiceAssistantStatus } from "@/hooks/useVoiceAssistant";

interface AudioVisualizerProps {
  voiceStatus?: VoiceAssistantStatus;
  amplitude?: number; // Kept for legacy compatibility if needed
  activeModel?: string;
  analyserRef?: React.MutableRefObject<AnalyserNode | null>;
  playbackAnalyserRef?: React.MutableRefObject<AnalyserNode | null>;
}

export default function AudioVisualizer({ 
  voiceStatus = "idle", 
  activeModel = "SVR_CORE_v1",
  analyserRef,
  playbackAnalyserRef
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for metrics (still updated via interval but now isolated)
  const [sysMetrics, setSysMetrics] = useState({ cpu: 12, ram: 42 });

  useEffect(() => {
    const interval = setInterval(() => {
      setSysMetrics(prev => ({
        cpu: Math.max(5, Math.min(99, prev.cpu + (Math.random() * 4 - 2))),
        ram: Math.max(30, Math.min(95, prev.ram + (Math.random() * 2 - 1)))
      }));
    }, 1000); // Reduced interval substantially - metrics don't need 50ms updates
    return () => clearInterval(interval);
  }, []);

  const isRecording = voiceStatus === "recording";
  const isPlaying = voiceStatus === "playing";
  const isThinking = voiceStatus === "thinking";
  const isError = voiceStatus === "error";

  const primaryColor = isError ? "#ef4444" : "#00ff41"; 

  // --- HTML5 CANVAS RENDERING LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const barCount = 100;
    const innerRadius = 140; // Base radius for bars
    const outerRadius = 260; // Outer visual limit
    
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Clear the canvas
      ctx.clearRect(0, 0, width, height);
      
      // Determine which analyser to read from
      const activeAnalyser = isPlaying ? playbackAnalyserRef?.current : analyserRef?.current;
      let dataArray = new Uint8Array(0);
      let avgAmplitude = 0;

      if (activeAnalyser && (isRecording || isPlaying)) {
        dataArray = new Uint8Array(activeAnalyser.frequencyBinCount);
        activeAnalyser.getByteFrequencyData(dataArray);
        
        // Calculate average amplitude for overall animations
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        avgAmplitude = sum / dataArray.length / 255;
      }

      // 1. Ambient Bloom
      if (isRecording || isPlaying || isThinking) {
        const pulseScale = isThinking ? Math.sin(Date.now() / 200) * 0.05 + 1 : 1 + avgAmplitude;
        const gradient = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, 250 * pulseScale);
        gradient.addColorStop(0, `${primaryColor}1a`);
        gradient.addColorStop(1, "transparent");
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 280, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Reference Rings
      ctx.strokeStyle = `${primaryColor}1a`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius - 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius + 10, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Radial Data Bars
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const isAccent = i % 10 === 0;
        
        let barHeight = isAccent ? 15 : 5;
        
        if (isThinking) {
          // Floating "shards" effect for thinking
          barHeight += Math.sin((Date.now() / 100) + i) * 5;
        } else if (dataArray.length > 0) {
            // Map the frequency data to our 100 bars
            const dataIndex = Math.floor((i / barCount) * (dataArray.length / 4)); // Only use first 25% of frequencies for better visuals
            barHeight += (dataArray[dataIndex] / 255) * 60;
        }

        const startX = centerX + Math.cos(angle) * innerRadius;
        const startY = centerY + Math.sin(angle) * innerRadius;
        const endX = centerX + Math.cos(angle) * (innerRadius + barHeight);
        const endY = centerY + Math.sin(angle) * (innerRadius + barHeight);

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = isAccent ? 1.5 : 1;
        ctx.globalAlpha = isAccent ? 0.6 : 0.2 + (avgAmplitude * 0.3);
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // 4. Protocol Ring (Rotating)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Date.now() / (isThinking ? 1000 : 5000));
      
      ctx.strokeStyle = `${primaryColor}33`;
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.arc(0, 0, innerRadius * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isRecording, isPlaying, isThinking, isError, primaryColor, analyserRef, playbackAnalyserRef]);

  return (
    <div className="relative w-[600px] h-[600px] flex items-center justify-center font-mono select-none">
      
      {/* High-performance Canvas layer */}
      <canvas 
        ref={canvasRef} 
        width={1200} 
        height={1200} 
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Static / Semi-static overlays */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Core Waveform Overlays (SVG for crisp text/shapes) */}
        <svg className="absolute w-[260px] h-[260px] overflow-visible pointer-events-none" viewBox="0 0 100 100">
           <circle 
            cx={50} cy={50} r={42} 
            fill="none" stroke={primaryColor} strokeWidth="0.2" strokeOpacity="0.1" 
           />
        </svg>

        {/* Status Readout */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <div className="text-[7px] tracking-[0.5em] uppercase font-bold" style={{ color: `${primaryColor}88` }}>
            {isPlaying ? "VOX_DOWNLINK" : isRecording ? "VOX_UPLINK" : "CORE_ID"}
          </div>
          <div className={`text-2xl font-black text-white tracking-widest ${isError ? 'glow-red' : 'glow-green'}`}>
            {activeModel}<span className="text-[8px] ml-1 font-normal opacity-50">v4.0</span>
          </div>
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

      {/* Peripheral Annotations */}
      <div className="absolute inset-0 pointer-events-none text-[6px] font-bold tracking-widest" style={{ color: `${primaryColor}66` }}>
        <div className="absolute top-[35%] right-[12%] text-right">
          SIGNAL_STRENGTH<br/>
          <span className="text-white/80">98.24 dBm</span>
        </div>
        <div className="absolute bottom-[35%] left-[12%] text-left">
          LATENCY_DELTA<br/>
          <span className="text-white/80">14 ms</span>
        </div>
      </div>
    </div>
  );
}
