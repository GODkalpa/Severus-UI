"use client";

import React from "react";
import { motion } from "framer-motion";
import AudioVisualizer from "./AudioVisualizer";
import ClockWidget from "./ClockWidget";
import WeatherWidget from "./WeatherWidget";

import ActionQueue from "./ActionQueue";
import FinancialLedger from "./FinancialLedger";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import { getBackendBaseUrl } from "@/lib/backend";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface HUDLayoutProps {
  sessionToken: string;
}

export default function HUDLayout({ sessionToken }: HUDLayoutProps) {
  const { 
    status, 
    error, 
    amplitude,
    activeModel,
    connect,
    analyserRef,
    playbackAnalyserRef
  } = useVoiceAssistant(sessionToken);
  const { actionQueue, financialLedger } = useRealtimeDashboard(sessionToken);
  const [isSubscribed, setIsSubscribed] = React.useState(false);

  React.useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("Service Worker registered:", reg);
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
        ),
      });

      // Send to backend
      const backendUrl = getBackendBaseUrl();
      const response = await fetch(`${backendUrl}/api/push/subscribe?token=${sessionToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      if (response.ok) {
        setIsSubscribed(true);
        console.log("Subscribed to REVELIO notifications");
      }
    } catch (e) {
      console.error("Subscription failed", e);
    }
  };

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
      case "thinking": return "THINKING...";
      case "playing": return "SPEAKING";
      case "error": return "LINK_ERROR";
      default: return "OPERATIONAL";
    }
  };

  return (
    <motion.main 
      className="relative w-full h-screen overflow-hidden bg-black flex flex-col"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Status Header - Fixed at top */}
      <motion.div 
        variants={itemTop}
        className="shrink-0 z-20 flex flex-col items-center py-6 px-4 border-b border-primary/10 bg-black/40 backdrop-blur-md"
      >
        <div className="relative flex flex-col items-center gap-2">
          {/* Decorative Top Trace */}
          <div className="absolute -top-4 w-64 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          
          <div className="flex items-center gap-4 md:gap-8">
            <div className="hidden md:block w-16 h-px bg-primary/20" />
            <div className="flex items-center gap-4">
              <motion.div 
                className={`w-2 h-2 ${
                  status === 'error' ? 'bg-red-500 shadow-[0_0_12px_#ff0000]' : 
                  status === 'thinking' ? 'bg-amber-400 shadow-[0_0_12px_#fbbf24]' :
                  status === 'playing' ? 'bg-[#00ff41] shadow-[0_0_12px_#00ff41]' :
                  'bg-[#00ff41] shadow-[0_0_12px_#00ff41]'
                }`}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <h2 className="font-mono text-xl md:text-2xl font-bold tracking-[0.2em] md:tracking-[0.5em] text-white uppercase glow-green">
                HUD: <span className={
                  status === 'error' ? 'text-red-500' : 
                  status === 'thinking' ? 'text-amber-400' :
                  status === 'playing' ? 'text-[#00ff41]' :
                  'text-[#00ff41]'
                }>{getStatusText()}</span>
              </h2>

              {/* Status Actions */}
              <div className="flex items-center gap-2">
                {status === "error" && (
                  <button 
                    onClick={() => connect()}
                    className="px-4 py-1 border border-red-500/40 bg-red-500/10 text-red-500 text-xs font-mono hover:bg-red-500/20 transition-all animate-pulse"
                  >
                    [ RE-LINK SYSTEM ]
                  </button>
                )}

                {/* Notification Toggle */}
                {!isSubscribed && (
                  <button 
                    onClick={subscribeToPush}
                    className="ml-4 p-2 rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-all animate-pulse"
                    title="Enable 24/7 Context Engine"
                  >
                    <span className="text-xs font-mono mr-2 hidden md:inline">REVELIO_NOTIFY</span>
                    🔔
                  </button>
                )}
              </div>
            </div>
            <div className="hidden md:block w-16 h-px bg-primary/20" />
          </div>
          
          <div className="text-[8px] md:text-[9px] text-primary/60 tracking-[0.5em] md:tracking-[1em] font-mono uppercase bg-black/40 px-4 py-1 border-x border-primary/20">
            {status === "error"
              ? error ?? "VOICE_LINK_ERROR"
              : status === "recording"
                ? "MIC_ACTIVE // UPLINK_HD"
                : status === "thinking"
                  ? "NEURAL_SYNAPSE_PROCESSING"
                  : status === "playing"
                    ? "AUDIO_DOWNLINK_ACTIVE"
                    : "SECURE_ENCLAVE_ACTIVE"}
          </div>
        </div>
      </motion.div>

      {/* Main Content Area - Scrollable on mobile, Fixed on desktop */}
      <div className="flex-grow relative overflow-y-auto md:overflow-hidden p-4 md:p-8 flex flex-col md:block">
        
        {/* Desktop Layout - Absolute positioned corners */}
        <div className="hidden md:block w-full h-full relative perspective-[2000px]">
          <motion.div 
            variants={itemLeft} 
            className="absolute top-0 left-0 origin-top-left"
            style={{ rotateY: 10, rotateX: -5 }}
          >
            <ClockWidget />
          </motion.div>
          
          <motion.div 
            variants={itemRight} 
            className="absolute top-0 right-0 origin-top-right text-right"
            style={{ rotateY: -10, rotateX: -5 }}
          >
            <WeatherWidget />
          </motion.div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-12">
            <motion.div variants={itemCenter}>
              <AudioVisualizer 
                voiceStatus={status} 
                amplitude={amplitude}
                activeModel={activeModel}
                analyserRef={analyserRef}
                playbackAnalyserRef={playbackAnalyserRef}
              />
            </motion.div>
            
            <motion.div variants={itemCenter} className="text-center">
              <div className="flex gap-4 mb-2 justify-center">
                <div className="w-8 h-px bg-primary/40" />
                <div className="w-2 h-2 border border-primary/60 rotate-45" />
                <div className="w-8 h-px bg-primary/40" />
              </div>
              <span className="text-[14px] font-mono tracking-[0.5em] text-white/40 uppercase whitespace-nowrap">
                SEVERUS // CORE_SYSTEM_V4.0_S
              </span>
            </motion.div>
          </div>

          <motion.div 
            variants={itemLeft} 
            className="absolute bottom-0 left-0 origin-bottom-left"
            style={{ rotateY: 10, rotateX: 5 }}
          >
            <ActionQueue data={actionQueue} />
          </motion.div>
          
          <motion.div 
            variants={itemRight} 
            className="absolute bottom-0 right-0 origin-bottom-right"
            style={{ rotateY: -10, rotateX: 5 }}
          >
            <FinancialLedger data={financialLedger} />
          </motion.div>
        </div>

        {/* Mobile Layout - Vertical Stack */}
        <div className="md:hidden flex flex-col gap-8 w-full pb-12">
          <div className="grid grid-cols-2 gap-4">
            <motion.div variants={itemLeft} className="p-2 border border-primary/10 bg-primary/5">
              <ClockWidget />
            </motion.div>
            <motion.div variants={itemRight} className="p-2 border border-primary/10 bg-primary/5 text-right">
              <WeatherWidget />
            </motion.div>
          </div>

          <motion.div variants={itemCenter} className="py-8 flex flex-col items-center gap-6">
            <AudioVisualizer 
              voiceStatus={status} 
              amplitude={amplitude}
              activeModel={activeModel}
              analyserRef={analyserRef}
              playbackAnalyserRef={playbackAnalyserRef}
            />
            <div className="text-center">
               <span className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase whitespace-nowrap">
                SEVERUS // CORE_SYSTEM_V4.0_S
              </span>
            </div>
          </motion.div>

          <motion.div variants={itemLeft} className="w-full">
            <ActionQueue data={actionQueue} />
          </motion.div>

          <motion.div variants={itemRight} className="w-full">
            <FinancialLedger data={financialLedger} />
          </motion.div>
        </div>
      </div>

      {/* HUD Background Scanlines / Glass Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </motion.main>
  );
}
