"use client";

import React, { useState, useEffect } from "react";
import BiometricLock from "@/components/BiometricLock";
import HUDLayout from "@/components/HUDLayout";
import { AnimatePresence } from "framer-motion";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("severus_session");
    if (stored) {
      setSessionToken(stored);
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthSuccess = (token: string) => {
    localStorage.setItem("severus_session", token);
    setSessionToken(token);
    setIsAuthenticated(true);
  };

  const handleAuthError = () => {
    console.warn("Session invalid or expired. Returning to biometric authentication.");
    localStorage.removeItem("severus_session");
    setSessionToken(null);
    setIsAuthenticated(false);
  };

  return (
    <main className="relative min-h-screen bg-black">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <BiometricLock key="lock" onSuccess={handleAuthSuccess} />
        ) : (
          <HUDLayout key="hud" sessionToken={sessionToken || ""} onAuthError={handleAuthError} />
        )}
      </AnimatePresence>
    </main>
  );
}
