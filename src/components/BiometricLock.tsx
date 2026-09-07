"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Lock, ShieldCheck, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { bufferToBase64, recursiveBase64ToBuffer } from "@/lib/webauthn";
import { getBackendBaseUrl } from "@/lib/backend";

interface BiometricLockProps {
  onSuccess: (token: string) => void;
}

export default function BiometricLock({ onSuccess }: BiometricLockProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("Initializing Security Enclave...");
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "CHECKING">("CHECKING");
  const [masterSecret, setMasterSecret] = useState("");

  const backendUrl = getBackendBaseUrl() || "http://localhost:8000";

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/auth/login/begin`);
      if (res.ok) {
        setMode("LOGIN");
        setStatus("Ready for Biometric Authentication");
      } else {
        setMode("REGISTER");
        setStatus("New Device • Master Secret Required");
      }
    } catch (err) {
      console.error("Backend unavailable", err);
      setStatus("Backend Gateway Offline");
    }
  };

  const handleAuth = async () => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      if (mode === "LOGIN") {
        await login();
      } else {
        await register();
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
        setMode("REGISTER");
        setStatus("Passkey registration required for this device");
      } else {
        setStatus(err.message || "Authentication Failed");
      }
      setIsScanning(false);
    }
  };

  const login = async () => {
    setStatus("Generating Security Challenge...");
    const beginRes = await fetch(`${backendUrl}/api/auth/login/begin`);
    if (!beginRes.ok) {
      const err = await beginRes.json();
      setMode("REGISTER");
      setStatus("Device Unrecognized • Setup Required");
      throw new Error(err.detail || "Authentication Challenge Failed");
    }

    const { options, challengeId } = await beginRes.json();

    setStatus("Touch Sensor or Enter Passkey...");
    const publicKey = recursiveBase64ToBuffer(options.publicKey);
    const credential: any = await navigator.credentials.get({ publicKey });

    setStatus("Verifying Enclave Signature...");
    const completeRes = await fetch(
      `${backendUrl}/api/auth/login/complete?challenge_id=${challengeId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: credential.id,
          rawId: bufferToBase64(credential.rawId),
          type: credential.type,
          response: {
            authenticatorData: bufferToBase64(credential.response.authenticatorData),
            clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
            signature: bufferToBase64(credential.response.signature),
            userHandle: credential.response.userHandle
              ? bufferToBase64(credential.response.userHandle)
              : null,
          },
        }),
      }
    );

    const result = await completeRes.json();
    if (!completeRes.ok) {
      throw new Error(result.detail || "Authentication Failed");
    }

    if (result.status === "success") {
      setStatus("Access Granted");
      localStorage.setItem("severus_session", result.sessionToken);
      setTimeout(() => onSuccess(result.sessionToken), 400);
    } else {
      setMode("REGISTER");
      setStatus("Identity Mismatch • Re-register");
      throw new Error(result.detail || "Authentication Failed");
    }
  };

  const register = async () => {
    if (!masterSecret) {
      setStatus("Master Secret Required");
      setIsScanning(false);
      return;
    }

    setStatus("Authorizing Hardware Key...");
    const userId = "severus-owner-fixed";
    const beginRes = await fetch(`${backendUrl}/api/auth/register/begin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        master_secret: masterSecret,
      }),
    });

    if (!beginRes.ok) {
      const err = await beginRes.json();
      throw new Error(err.detail || "Registration Challenge Failed");
    }

    const { options, challengeId } = await beginRes.json();

    setStatus("Register Passkey on this device...");
    const publicKey = recursiveBase64ToBuffer(options.publicKey);
    const credential: any = await navigator.credentials.create({ publicKey });

    setStatus("Finalizing Enclave Anchor...");
    const completeRes = await fetch(
      `${backendUrl}/api/auth/register/complete?challenge_id=${challengeId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: credential.id,
          rawId: bufferToBase64(credential.rawId),
          type: credential.type,
          response: {
            attestationObject: bufferToBase64(credential.response.attestationObject),
            clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
          },
        }),
      }
    );

    const result = await completeRes.json();
    if (!completeRes.ok) {
      throw new Error(result.detail || "Registration Verification Failed");
    }

    if (result.status === "success") {
      setStatus("Key Registered Successfully");
      setMode("LOGIN");
      setIsScanning(false);
      setTimeout(handleAuth, 800);
    } else {
      throw new Error("Registration Verification Failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06080c] select-none px-4">
      {/* Background Ambient Glow */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center p-8 rounded-2xl bg-[#0c1219]/80 backdrop-blur-2xl border border-white/10 shadow-2xl text-center"
      >
        {/* Biometric Interactive Emblem */}
        <div
          onClick={handleAuth}
          className="relative group cursor-pointer w-28 h-28 mb-6 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all duration-500"
        >
          {/* Subtle Ambient Pulse Ring */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-25" />

          {mode === "REGISTER" ? (
            <ShieldCheck className="w-12 h-12 text-amber-400/90" />
          ) : (
            <Fingerprint
              className={cn(
                "w-12 h-12 text-emerald-400 transition-all duration-300",
                isScanning ? "animate-pulse scale-110 text-emerald-300" : "group-hover:scale-105"
              )}
            />
          )}
        </div>

        {/* Title & Status */}
        <h2 className="text-lg font-semibold tracking-wide text-white mb-1 font-sans">
          {mode === "REGISTER" ? "Device Setup" : "Severus Access"}
        </h2>
        <p className="text-xs text-white/50 tracking-normal font-sans mb-6 min-h-[1.5rem]">
          {status}
        </p>

        {/* Master Secret Input (Registration mode only) */}
        <AnimatePresence>
          {mode === "REGISTER" && !isScanning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mb-4"
            >
              <div className="relative">
                <input
                  type="password"
                  placeholder="Master Secret"
                  value={masterSecret}
                  onChange={(e) => setMasterSecret(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/60 transition"
                />
                <KeyRound className="absolute right-3.5 top-3 w-4 h-4 text-white/30" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <button
          onClick={handleAuth}
          disabled={isScanning}
          className={cn(
            "w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-lg",
            isScanning
              ? "bg-white/10 text-white/40 cursor-not-allowed"
              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 active:scale-[0.98]"
          )}
        >
          {isScanning
            ? "Verifying Enclave..."
            : mode === "REGISTER"
            ? "Register Device"
            : "Authenticate Passkey"}
        </button>

        {/* Switch Mode Toggle */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-white/40">
          {mode === "LOGIN" ? (
            <button
              onClick={() => {
                setMode("REGISTER");
                setStatus("Enter Master Secret to add this device");
              }}
              className="hover:text-white/80 transition underline decoration-white/20 underline-offset-4"
            >
              Register New Device
            </button>
          ) : (
            <button
              onClick={() => {
                setMode("LOGIN");
                setStatus("Ready for Biometric Authentication");
              }}
              className="hover:text-white/80 transition underline decoration-white/20 underline-offset-4"
            >
              Return to Login
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
