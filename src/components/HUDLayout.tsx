"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  RefreshCw, 
  CheckSquare, 
  Wallet, 
  X, 
  Mic, 
  MicOff,
  Radio,
  Lock,
  Sparkles
} from "lucide-react";
import InteractiveSphere from "./InteractiveSphere";
import { ShaderCanvas } from "@/components/ui/phosphor-30";
import TranscriptDisplay from "./TranscriptDisplay";
import ActionQueue from "./ActionQueue";
import FinancialLedger from "./FinancialLedger";
import ClockWidget from "./ClockWidget";
import WeatherWidget from "./WeatherWidget";
import { useVoiceAssistant, VoiceAssistantStatus } from "@/hooks/useVoiceAssistant";
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
  onAuthError?: () => void;
}

export default function HUDLayout({ sessionToken, onAuthError }: HUDLayoutProps) {
  const {
    status,
    error,
    amplitude,
    activeModel,
    connect,
    analyserRef,
    playbackAnalyserRef,
    lastTranscript,
    partialTranscript,
  } = useVoiceAssistant(sessionToken, onAuthError);

  const { actionQueue, reminders, financialLedger } = useRealtimeDashboard(sessionToken, onAuthError);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<"agenda" | "finances" | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<"phosphor" | "sphere">("phosphor");

  // Push notifications
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  // Keyboard shortcut: Esc to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDrawer(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

      const backendUrl = getBackendBaseUrl();
      const response = await fetch(`${backendUrl}/api/push/subscribe?token=${sessionToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      if (response.ok) {
        setIsSubscribed(true);
      }
    } catch (e) {
      console.error("Subscription failed", e);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "recording":
        return { label: "Listening", color: "bg-emerald-400 shadow-[0_0_12px_#34d399]" };
      case "thinking":
        return { label: "Synthesizing", color: "bg-amber-400 shadow-[0_0_12px_#fbbf24]" };
      case "playing":
        return { label: "Responding", color: "bg-cyan-300 shadow-[0_0_12px_#67e8f9]" };
      case "connecting":
        return { label: "Connecting", color: "bg-slate-400 animate-pulse" };
      case "error":
        return { label: "Link Offline", color: "bg-red-500 shadow-[0_0_12px_#ef4444]" };
      default:
        return { label: "Active", color: "bg-emerald-400/80" };
    }
  };

  const statusBadge = getStatusBadge();
  const pendingTasks = actionQueue.filter((t) => !t.completed).length;

  const handleCenterpieceClick = () => {
    if (status === "error" || status === "idle") {
      connect();
    }
  };

  const handleLock = () => {
    localStorage.removeItem("severus_session");
    onAuthError?.();
  };

  return (
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden flex flex-col justify-between bg-black select-none">
      
      {/* 1. Header Bar: Transparent Minimalist Floating Header */}
      <header className="shrink-0 z-20 flex items-center justify-between px-6 py-5 bg-transparent border-none">
        {/* Left: Identity, Model & Visualizer Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusBadge.color}`} />
            <span className="text-sm font-semibold tracking-wide text-white">
              Severus
            </span>
          </div>
          <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/[0.04] text-white/50 border border-white/[0.08]">
            {activeModel || "v4.5"}
          </span>
          <button
            onClick={() => setVisualizerMode(visualizerMode === "phosphor" ? "sphere" : "phosphor")}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider bg-white/[0.04] text-white/60 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition"
            title="Switch between Phosphor Fractal and Organic Sphere"
          >
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>{visualizerMode === "phosphor" ? "PHOSPHOR" : "SPHERE"}</span>
          </button>
        </div>

        {/* Center: State Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-sans text-white/70">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="tracking-wide">{statusBadge.label}</span>
        </div>

        {/* Right: Ambient Indicators & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <WeatherWidget />
            <div className="h-4 w-px bg-white/10" />
            <ClockWidget />
          </div>

          <div className="flex items-center gap-2">
            {status === "error" && (
              <button
                onClick={() => connect()}
                className="p-1.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition"
                title="Reconnect Audio Link"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              </button>
            )}

            {!isSubscribed && (
              <button
                onClick={subscribeToPush}
                className="p-1.5 rounded-full bg-white/5 text-amber-400/80 border border-white/10 hover:bg-white/10 transition"
                title="Enable Push Notifications"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleLock}
              className="p-1.5 rounded-full bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/80 transition"
              title="Lock Terminal"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 1. Full-Screen Free-Floating Living Shader Background / Core (Zero Box, Zero Seam) */}
      <div 
        className="fixed inset-0 z-0 pointer-events-auto"
        onClick={handleCenterpieceClick}
      >
        {visualizerMode === "phosphor" ? (
          <ShaderCanvas
            amplitude={amplitude}
            voiceStatus={status}
            speedMultiplier={
              status === "thinking"
                ? 1.4
                : status === "playing"
                ? 1.15
                : status === "recording"
                ? 1.05
                : 0.8
            }
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] md:w-[460px] md:h-[460px]">
              <InteractiveSphere
                voiceStatus={status}
                amplitude={amplitude}
                analyserRef={analyserRef}
                playbackAnalyserRef={playbackAnalyserRef}
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Stage: Floating Transcripts / Live Captions */}
      <main className="relative flex-grow z-10 flex flex-col items-center justify-end pb-10 sm:pb-16 pointer-events-none">
        <div className="w-full max-w-xl px-4 pointer-events-auto">
          <TranscriptDisplay
            text={lastTranscript}
            partialText={partialTranscript}
            status={status}
          />
        </div>
      </main>

      {/* 3. Floating Bottom Dock */}
      <footer className="shrink-0 z-20 pb-6 pt-2 px-4 flex justify-center">
        <div className="flex items-center gap-2 p-1.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
          {/* Agenda Button */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === "agenda" ? null : "agenda")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
              activeDrawer === "agenda"
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Agenda</span>
            {pendingTasks > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-mono">
                {pendingTasks}
              </span>
            )}
          </button>

          <div className="w-px h-4 bg-white/10" />

          {/* Finances Button */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === "finances" ? null : "finances")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
              activeDrawer === "finances"
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>Finances</span>
          </button>

          {/* Quick Voice Indicator */}
          <div className="hidden sm:flex items-center pl-2 pr-3 py-1 text-[11px] text-white/30 font-mono">
            {status === "recording" ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Mic className="w-3 h-3" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <MicOff className="w-3 h-3 opacity-40" /> Standby
              </span>
            )}
          </div>
        </div>
      </footer>

      {/* 4. Contextual Intelligence Slide-over Drawer / Bottom Sheet */}
      <AnimatePresence>
        {activeDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDrawer(null)}
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            />

            {/* Desktop Slide-over Panel (Right) */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="hidden md:flex fixed top-0 right-0 bottom-0 z-40 w-96 bg-black/95 backdrop-blur-2xl border-l border-white/10 flex-col shadow-2xl p-6"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {activeDrawer === "agenda" ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Wallet className="w-4 h-4 text-amber-400" />
                  )}
                  <h3 className="text-sm font-semibold text-white tracking-wide capitalize">
                    {activeDrawer === "agenda" ? "Action Agenda" : "Financial Ledger"}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-grow pt-4 overflow-hidden">
                {activeDrawer === "agenda" ? (
                  <ActionQueue data={actionQueue} reminders={reminders} />
                ) : (
                  <FinancialLedger data={financialLedger} />
                )}
              </div>
            </motion.div>

            {/* Mobile Bottom Sheet (PWA) */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-40 max-h-[82vh] bg-black/95 backdrop-blur-2xl border-t border-white/10 rounded-t-2xl flex flex-col shadow-2xl p-5"
            >
              {/* Swipe Handle */}
              <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-4" />

              {/* Mobile Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {activeDrawer === "agenda" ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Wallet className="w-4 h-4 text-amber-400" />
                  )}
                  <h3 className="text-sm font-semibold text-white tracking-wide capitalize">
                    {activeDrawer === "agenda" ? "Action Agenda" : "Financial Ledger"}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Drawer Content */}
              <div className="flex-grow pt-4 overflow-y-auto max-h-[60vh]">
                {activeDrawer === "agenda" ? (
                  <ActionQueue data={actionQueue} reminders={reminders} />
                ) : (
                  <FinancialLedger data={financialLedger} />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
