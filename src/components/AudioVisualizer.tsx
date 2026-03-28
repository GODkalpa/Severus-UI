import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceAssistantStatus } from "@/hooks/useVoiceAssistant";

interface AudioVisualizerProps {
  voiceStatus?: VoiceAssistantStatus;
  amplitude?: number;
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
  const [sysMetrics, setSysMetrics] = useState({ cpu: 12, ram: 4.2 });

  // --- Aesthetic Constants ---
  const BAR_COUNT = 100;
  const INNER_RADIUS = 130;
  const OUTER_RADIUS = 260;
  const DECAY_RATE = 0.05; // Weighted fall speed
  const ACCENT_COLOR = voiceStatus === "error" ? "#ff2a2a" : "#00ff41";
  const GLOW_COLOR = voiceStatus === "error" ? "rgba(255,42,42,0.6)" : "rgba(0,255,65,0.6)";

  useEffect(() => {
    const interval = setInterval(() => {
      setSysMetrics(prev => ({
        cpu: Math.max(5, Math.min(99, prev.cpu + (Math.random() * 4 - 2))),
        ram: Math.max(2, Math.min(16, prev.ram + (Math.random() * 0.2 - 0.1)))
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId: number;
    const smoothedData = new Float32Array(BAR_COUNT).fill(0);
    let rotationAngle = 0;
    let radarSweep = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Reset & Clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // --- Digital Glitch Layer (Error Only) ---
      if (voiceStatus === "error") {
        ctx.translate(Math.random() * 4 - 2, Math.random() * 4 - 2);
      }

      // --- Data Collection ---
      const activeAnalyser = voiceStatus === "playing" ? playbackAnalyserRef?.current : analyserRef?.current;
      let dataArray = new Uint8Array(0);
      let avgAmp = 0;

      if (activeAnalyser && (voiceStatus === "recording" || voiceStatus === "playing")) {
        dataArray = new Uint8Array(activeAnalyser.frequencyBinCount);
        activeAnalyser.getByteFrequencyData(dataArray);
        
        // Populate smoothed data with physics (weighted rise, decay fall)
        for (let i = 0; i < BAR_COUNT; i++) {
          const rawIdx = Math.floor((i / BAR_COUNT) * (dataArray.length / 4));
          const val = dataArray[rawIdx] / 255;
          if (val > smoothedData[i]) smoothedData[i] = val; // Instant rise
          else smoothedData[i] -= DECAY_RATE; // Smooth decay
          if (smoothedData[i] < 0) smoothedData[i] = 0;
          avgAmp += smoothedData[i];
        }
        avgAmp /= BAR_COUNT;
      } else if (voiceStatus === "thinking") {
        // Pseudo-data for thinking state
        for (let i = 0; i < BAR_COUNT; i++) {
          const val = Math.sin((Date.now() / 150) + i * 0.5) * 0.2 + 0.3;
          smoothedData[i] = val;
          avgAmp += val;
        }
        avgAmp /= BAR_COUNT;
      } else {
        // Idle breathing
        for (let i = 0; i < BAR_COUNT; i++) {
          smoothedData[i] = Math.max(0, smoothedData[i] - DECAY_RATE);
        }
      }

      // 1. --- BACKGROUND AMBIENT PULSE ---
      const pulseSize = (INNER_RADIUS + (avgAmp * 150)) * 1.5;
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, pulseSize);
      bgGrad.addColorStop(0, `${ACCENT_COLOR}15`);
      bgGrad.addColorStop(0.5, `${ACCENT_COLOR}05`);
      bgGrad.addColorStop(1, "transparent");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. --- OUTER GEARS / PROTOCOL RINGS ---
      rotationAngle += 0.005;
      radarSweep += 0.03;

      const drawRing = (radius: number, speed: number, darthRatio: number, opacity: string) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotationAngle * speed);
        ctx.strokeStyle = `${ACCENT_COLOR}${opacity}`;
        ctx.setLineDash([darthRatio, darthRatio * 2]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      };

      drawRing(INNER_RADIUS + 10, 1, 10, "33");
      drawRing(OUTER_RADIUS - 20, -0.5, 20, "1a");
      drawRing(OUTER_RADIUS + 10, 0.2, 5, "0d");

      // 3. --- DUAL BAR SYSTEM ---
      ctx.save();
      ctx.translate(centerX, centerY);
      
      for (let i = 0; i < BAR_COUNT; i++) {
        const rad = (i / BAR_COUNT) * Math.PI * 2;
        const s = smoothedData[i];
        
        // Outward Bar
        const hOut = 10 + (s * 80);
        const gradOut = ctx.createLinearGradient(
          Math.cos(rad) * INNER_RADIUS, Math.sin(rad) * INNER_RADIUS,
          Math.cos(rad) * (INNER_RADIUS + hOut), Math.sin(rad) * (INNER_RADIUS + hOut)
        );
        gradOut.addColorStop(0, `${ACCENT_COLOR}33`);
        gradOut.addColorStop(0.5, ACCENT_COLOR);
        gradOut.addColorStop(1, "transparent");

        ctx.strokeStyle = gradOut;
        ctx.lineWidth = 2 + (s * 2);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(Math.cos(rad) * INNER_RADIUS, Math.sin(rad) * INNER_RADIUS);
        ctx.lineTo(Math.cos(rad) * (INNER_RADIUS + hOut), Math.sin(rad) * (INNER_RADIUS + hOut));
        ctx.stroke();

        // Inward Ghost Bar (depth effect)
        const hIn = 5 + (s * 20);
        ctx.strokeStyle = `${ACCENT_COLOR}1a`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rad) * (INNER_RADIUS - 10), Math.sin(rad) * (INNER_RADIUS - 10));
        ctx.lineTo(Math.cos(rad) * (INNER_RADIUS - 10 - hIn), Math.sin(rad) * (INNER_RADIUS - 10 - hIn));
        ctx.stroke();
      }
      ctx.restore();

      // 4. --- RADAR SCAN (Thinking Mode) ---
      if (voiceStatus === "thinking") {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(radarSweep);
        const radarGrad = ctx.createRadialGradient(0, 0, INNER_RADIUS, 0, 0, OUTER_RADIUS);
        radarGrad.addColorStop(0, `${ACCENT_COLOR}00`);
        radarGrad.addColorStop(1, `${ACCENT_COLOR}44`);
        ctx.fillStyle = radarGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, OUTER_RADIUS, -0.4, 0.4);
        ctx.fill();
        ctx.restore();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [voiceStatus, analyserRef, playbackAnalyserRef]);

  return (
    <div className="relative w-[500px] h-[500px] flex items-center justify-center font-mono overflow-visible">
      {/* High-fidelity Canvas */}
      <canvas 
        ref={canvasRef} 
        width={1000} 
        height={1000} 
        className="absolute inset-0 w-full h-full pointer-events-none scale-[1.2]"
      />

      {/* Aesthetic Overlay Controls */}
      <div className="relative z-10 flex flex-col items-center pointer-events-none">
        {/* Central Hub Core */}
        <div className="status-hub flex flex-col items-center text-center">
          <div className="text-[10px] tracking-[1em] text-[#00ff41]/50 mb-2 font-black">
            {voiceStatus === "thinking" ? "COGNITIVE_ARRAY" : "CORE_STABILITY"}
          </div>
          
          <h1 className={`text-3xl font-black text-white px-8 py-2 border-y border-white/10 tracking-[0.2em] ${voiceStatus === "error" ? 'text-red-500' : ''}`}>
            {activeModel}<span className="text-[10px] opacity-30 ml-2">SVR_v4.5</span>
          </h1>

          <div className="mt-8 grid grid-cols-2 gap-12 text-[8px] font-bold tracking-widest text-white/40">
            <div className="flex flex-col items-center">
              <span>CPU_LINK_FREQ</span>
              <div className="flex gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    className="w-2 h-4 border border-[#00ff41]/20 bg-[#00ff41]/5"
                    animate={{ opacity: sysMetrics.cpu / 20 > i ? 1 : 0.2, backgroundColor: sysMetrics.cpu / 20 > i ? GLOW_COLOR : "rgba(0,0,0,0)" }}
                    transition={{ duration: 0.1 }}
                  />
                ))}
              </div>
              <span className="mt-1 text-white/60">{sysMetrics.cpu.toFixed(2)}%</span>
            </div>

            <div className="flex flex-col items-center">
              <span>MEM_SYNC_RATE</span>
              <div className="flex gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    className="w-2 h-4 border border-[#00ff41]/20 bg-[#00ff41]/5"
                    animate={{ opacity: sysMetrics.ram > i * 3 ? 1 : 0.2, backgroundColor: sysMetrics.ram > i * 3 ? GLOW_COLOR : "rgba(0,0,0,0)" }}
                    transition={{ duration: 0.1 }}
                  />
                ))}
              </div>
              <span className="mt-1 text-white/60">{sysMetrics.ram.toFixed(2)} GB</span>
            </div>
          </div>
        </div>

        {/* Floating Technical Coordinates */}
        <div className="absolute top-[-50px] right-[-50px] text-[8px] text-white/20 whitespace-nowrap">
          SECURE_ENCLAVE: <span className="text-white/40">0x{Math.floor(sysMetrics.cpu * 1638).toString(16).toUpperCase()}</span><br/>
          BUFFER_STATE: <span className="text-white/40">{voiceStatus.toUpperCase()}</span>
        </div>
        <div className="absolute bottom-[-50px] left-[-50px] text-[8px] text-white/20 whitespace-nowrap">
          LATENCY_DELTA: <span className="text-white/40">14.02ms</span><br/>
          SYNC_PROTOCOL: <span className="text-white/40">REVELIO_v4</span>
        </div>
      </div>
    </div>
  );
}

