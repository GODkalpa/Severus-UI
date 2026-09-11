"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
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
import NotificationToast, { TacticalAlert } from "./NotificationToast";
import { 
  playCyberChime, 
  initAudioUnlock, 
  isAudioMuted, 
  setAudioMuted 
} from "@/lib/audioNotification";
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
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isMuted, setIsMuted] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [activeAlert, setActiveAlert] = useState<TacticalAlert | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<"agenda" | "finances" | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<"phosphor" | "sphere">("phosphor");

  // Push notifications, BroadcastChannel & Audio Unlock setup
  useEffect(() => {
    initAudioUnlock();
    setIsMuted(isAudioMuted());

    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }

    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            setIsSubscribed(!!sub);
          });
        })
        .catch((err) => {
          console.warn("ServiceWorker registration error:", err);
        });
    }

    const handleIncomingAlert = (data: { title?: string; body?: string; url?: string; timestamp?: string }) => {
      void playCyberChime();
      setActiveAlert({
        id: Date.now().toString(),
        title: data.title || "SEVERUS ALERT",
        body: data.body || "Intelligence update received.",
        timestamp:
          data.timestamp ||
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        url: data.url,
      });
    };

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("severus_notifications");
        bc.onmessage = (ev) => {
          if (ev.data && ev.data.type === "SEVERUS_PUSH_NOTIFICATION") {
            handleIncomingAlert(ev.data);
          }
        };
      } catch (e) {
        console.warn("BroadcastChannel error:", e);
      }
    }

    const swHandler = (ev: MessageEvent) => {
      if (ev.data && ev.data.type === "SEVERUS_PUSH_NOTIFICATION") {
        handleIncomingAlert(ev.data);
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", swHandler);
    }

    return () => {
      bc?.close();
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", swHandler);
      }
    };
  }, []);

  // Keyboard shortcut: Esc to close drawer or notification popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDrawer(null);
        setShowNotifMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const subscribeToPush = async () => {
    setNotifFeedback(null);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setNotifFeedback("Web Push is unsupported on this browser.");
        return;
      }

      // Explicit permission request for iOS Safari PWA / Android Chrome
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setNotifFeedback("Permission not granted. Please allow notifications in site settings.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if (!vapidKey) {
        setNotifFeedback("VAPID public key not found in configuration.");
        return;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const backendUrl = getBackendBaseUrl();
      const response = await fetch(`${backendUrl}/api/push/subscribe?token=${sessionToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      if (response.ok) {
        setIsSubscribed(true);
        setNotifFeedback("Tactical Push Uplink Established!");
        void playCyberChime();
        setActiveAlert({
          id: Date.now().toString(),
          title: "SEVERUS // UPLINK SYNCHRONIZED",
          body: "Mobile PWA notification and acoustic chime system online.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      } else {
        setNotifFeedback("Backend failed to save device subscription.");
      }
    } catch (e: unknown) {
      console.error("Subscription failed", e);
      const msg = e instanceof Error ? e.message : "Subscription request failed";
      setNotifFeedback(`Subscription error: ${msg}`);
    }
  };

  const testNotificationAndChime = async () => {
    setIsTesting(true);
    setNotifFeedback("Triggering cyber chime and test pulse...");

    // 1. Play instant synthesized cyber chime
    await playCyberChime();

    // 2. Display foreground tactical HUD alert
    setActiveAlert({
      id: Date.now().toString(),
      title: "SEVERUS // TACTICAL TEST",
      body: "Acoustic cyber chime and foreground HUD banner verified.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    // 3. Trigger backend push test if subscribed
    if (isSubscribed) {
      try {
        const backendUrl = getBackendBaseUrl();
        const res = await fetch(`${backendUrl}/api/push/test?token=${sessionToken}`, {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          setNotifFeedback(`Test push dispatched to ${data.delivered_to_devices ?? 1} device(s)!`);
        } else {
          setNotifFeedback("Backend push test request failed.");
        }
      } catch {
        setNotifFeedback("Network error dispatching backend push test.");
      }
    } else {
      setNotifFeedback("Device not subscribed yet. Tap 'Enable Push Alerts' for background OS alerts.");
    }
    setIsTesting(false);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setAudioMuted(next);
    if (!next) {
      void playCyberChime();
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
      
      {/* Tactical HUD Alert Toast Banner */}
      <NotificationToast 
        alert={activeAlert} 
        onDismiss={() => setActiveAlert(null)} 
        onOpen={(url) => { 
          if (url && url !== "/") window.location.href = url; 
        }} 
      />

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

            {/* Notification & Chime Tactical Center */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className={`relative p-1.5 rounded-full border transition ${
                  permission === "denied"
                    ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                    : isSubscribed
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-white/5 text-amber-400/80 border-white/10 hover:bg-white/10"
                }`}
                title="Communications & Notification Uplink"
                aria-label="Toggle notifications menu"
              >
                {permission === "denied" ? (
                  <BellOff className="w-3.5 h-3.5" />
                ) : isSubscribed ? (
                  <BellRing className="w-3.5 h-3.5" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}

                {/* Status Indicator Dot */}
                <span
                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                    permission === "denied"
                      ? "bg-red-500 shadow-[0_0_6px_#ef4444]"
                      : isSubscribed
                      ? "bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse"
                      : "bg-amber-400 shadow-[0_0_6px_#fbbf24]"
                  }`}
                />
              </button>

              {/* Notification Center Popover */}
              <AnimatePresence>
                {showNotifMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-80 z-50 rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-2xl p-4 shadow-2xl text-left font-sans select-text"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span className="text-xs font-mono font-medium tracking-wider text-white">
                          TACTICAL COMMS
                        </span>
                      </div>
                      <button
                        onClick={() => setShowNotifMenu(false)}
                        className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition"
                        aria-label="Close notification menu"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Diagnostics Rows */}
                    <div className="py-3 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-zinc-400">Permissions</span>
                        <span
                          className={`text-[11px] font-semibold uppercase ${
                            permission === "granted"
                              ? "text-emerald-400"
                              : permission === "denied"
                              ? "text-red-400"
                              : "text-amber-400"
                          }`}
                        >
                          {permission}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-zinc-400">Push Uplink</span>
                        <span
                          className={`text-[11px] font-semibold uppercase ${
                            isSubscribed ? "text-emerald-400" : "text-zinc-500"
                          }`}
                        >
                          {isSubscribed ? "Synchronized" : "Disconnected"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-zinc-400">Cyber Chime</span>
                        <button
                          onClick={handleToggleMute}
                          className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition"
                        >
                          {isMuted ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-red-400" />
                              <span className="text-red-400">Muted</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Active</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Feedback message */}
                    {notifFeedback && (
                      <div className="mb-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300 leading-snug">
                        {notifFeedback}
                      </div>
                    )}

                    {permission === "denied" && (
                      <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300 leading-snug">
                        Push notifications are blocked in your browser. Click the lock/site settings icon in your browser URL bar to allow notifications.
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="space-y-2 pt-1 font-mono">
                      <button
                        onClick={testNotificationAndChime}
                        disabled={isTesting}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs tracking-wider transition active:scale-[0.98]"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isTesting ? "SENDING TEST..." : "TEST CHIME & PUSH"}</span>
                      </button>

                      <button
                        onClick={subscribeToPush}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold tracking-wider transition active:scale-[0.98]"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        <span>{isSubscribed ? "RESYNC PUSH LINK" : "ENABLE PUSH ALERTS"}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
