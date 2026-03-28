"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { bufferToBase64, recursiveBase64ToBuffer } from "@/lib/webauthn";

interface BiometricLockProps {
  onSuccess: (token: string) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";

export default function BiometricLock({ onSuccess }: BiometricLockProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("INITIALIZING SECURITY...");
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "CHECKING">("CHECKING");
  const [masterSecret, setMasterSecret] = useState("");

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login/begin`);
      if (res.ok) {
        setMode("LOGIN");
        setStatus("READY TO REVEAL");
      } else {
        setMode("REGISTER");
        setStatus("NO KEY DETECTED - MASTER SECRET REQUIRED");
      }
    } catch (err) {
      console.error("Backend unavailable", err);
      setStatus("METEOROLOGICAL_SENSORS_OFFLINE");
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
      setStatus(`ERROR: ${err.message || "HANDSHAKE_FAILED"}`);
      setIsScanning(false);
    }
  };

  const login = async () => {
    setStatus("GENERATING_CHALLENGE...");
    const beginRes = await fetch(`${BACKEND_URL}/api/auth/login/begin`);
    if (!beginRes.ok) {
      const err = await beginRes.json();
      throw new Error(err.detail || "Authentication Challenge Failed");
    }

    const { options, challengeId } = await beginRes.json();
    
    setStatus("WAITING FOR HARDWARE SIGNATURE...");
    const publicKey = recursiveBase64ToBuffer(options.publicKey);
    const credential: any = await navigator.credentials.get({ publicKey });

    setStatus("VERIFYING_SIGNATURE...");
    const completeRes = await fetch(`${BACKEND_URL}/api/auth/login/complete?challenge_id=${challengeId}`, {
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
          userHandle: credential.response.userHandle ? bufferToBase64(credential.response.userHandle) : null,
        },
      }),
    });

    const result = await completeRes.json();
    if (!completeRes.ok) {
      throw new Error(result.detail || "Authentication Failed");
    }

    if (result.status === "success") {
      setStatus("ACCESS GRANTED");
      localStorage.setItem("severus_session", result.sessionToken);
      setTimeout(() => onSuccess(result.sessionToken), 500);
    } else {
      throw new Error(result.detail || "Authentication Failed");
    }
  };

  const register = async () => {
    if (!masterSecret) {
      setStatus("MASTER SECRET REQUIRED");
      setIsScanning(false);
      return;
    }

    setStatus("CLAIMING_OWNERSHIP...");
    const userId = "severus-owner-" + Math.random().toString(36).substring(7);
    const beginRes = await fetch(`${BACKEND_URL}/api/auth/register/begin`, {
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
    
    setStatus("CREATING_SECURE_ENCLAVE...");
    const publicKey = recursiveBase64ToBuffer(options.publicKey);
    const credential: any = await navigator.credentials.create({ publicKey });

    setStatus("FINALIZING_KEY...");
    const completeRes = await fetch(`${BACKEND_URL}/api/auth/register/complete?challenge_id=${challengeId}`, {
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
    });

    const result = await completeRes.json();
    if (!completeRes.ok) {
      throw new Error(result.detail || "Registration Verification Failed");
    }

    if (result.status === "success") {
      setStatus("KEY REGISTERED");
      setMode("LOGIN");
      setIsScanning(false);
      // Automatically attempt login after registration
      setTimeout(handleAuth, 1000);
    } else {
      throw new Error("Registration Verification Failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md select-none">
      <div className="flex flex-col items-center max-w-lg w-full px-4 text-center">
        {/* Biometric Core */}
        <motion.div 
          className="relative group cursor-pointer mb-12"
          onClick={handleAuth}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Visual Anchor Brackets */}
          <div className="absolute -top-8 -left-8 w-6 h-6 border-t-2 border-l-2 border-primary/40" />
          <div className="absolute -top-8 -right-8 w-6 h-6 border-t-2 border-r-2 border-primary/40" />
          <div className="absolute -bottom-8 -left-8 w-6 h-6 border-b-2 border-l-2 border-primary/40" />
          <div className="absolute -bottom-8 -right-8 w-6 h-6 border-b-2 border-r-2 border-primary/40" />
          
          {/* Icon Container */}
          <div className="relative p-8 overflow-hidden rounded-none">
            {mode === "REGISTER" ? (
              <ShieldCheck size={160} className={cn("text-yellow-400 glow-yellow", isScanning && "animate-pulse")} />
            ) : (
              <Fingerprint 
                size={160} 
                className={cn(
                  "text-primary transition-all duration-1000",
                  isScanning ? "opacity-30 blur-[2px]" : "glow-lg"
                )} 
              />
            )}
            
            {/* Active Scan Line */}
            <AnimatePresence>
              {isScanning && (
                <motion.div 
                  className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_#00f0ff]"
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
        </motion.div>

        {/* Interaction Group */}
        <div className="space-y-6 w-full max-w-sm">
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

          <AnimatePresence>
            {mode === "REGISTER" && !isScanning && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <input 
                  type="password"
                  placeholder="ENTER_MASTER_SECRET"
                  value={masterSecret}
                  onChange={(e) => setMasterSecret(e.target.value)}
                  className="w-full bg-black/40 border border-primary/20 p-3 font-mono text-primary text-center text-sm focus:outline-none focus:border-primary/60 transition-colors uppercase tracking-widest placeholder:opacity-30"
                />
                <p className="font-mono text-[10px] text-yellow-400/60 uppercase">
                  First-time setup: Claim ownership using your secret
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center gap-6 mt-8">
            <button 
              className={cn(
                "px-12 py-4 border border-primary/40 text-primary text-sm tracking-[0.3em] font-bold transition-all duration-300 uppercase relative overflow-hidden group",
                isScanning ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/10"
              )}
              onClick={handleAuth}
              disabled={isScanning}
            >
              <span className="relative z-10">
                {isScanning ? "AUTHENTICATING..." : mode === "REGISTER" ? "REVELIO_INIT" : "REVELIO"}
              </span>
            </button>
            
            <p className="font-mono text-on-surface-variant/40 text-[8px] tracking-[0.4em] uppercase">
              Secure Hardware Handshake V4.2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
