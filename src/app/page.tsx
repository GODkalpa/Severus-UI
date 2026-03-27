"use client";

import React, { useState } from "react";
import BiometricLock from "@/components/BiometricLock";
import HUDLayout from "@/components/HUDLayout";
import { AnimatePresence } from "framer-motion";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <main className="relative min-h-screen bg-black">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <BiometricLock key="lock" onSuccess={() => setIsAuthenticated(true)} />
        ) : (
          <HUDLayout key="hud" />
        )}
      </AnimatePresence>
    </main>
  );
}
