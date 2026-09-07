"use client";

import Component from "@/components/ui/phosphor-30";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DemoPage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Phosphor-30 Shader Background / Fullscreen */}
      <Component />

      {/* Floating Navigation Pill */}
      <div className="fixed top-6 left-6 z-50">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-xs text-white/80 hover:text-white hover:bg-black/80 transition shadow-2xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Severus</span>
        </Link>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] text-white/50 font-mono tracking-widest uppercase">
          Phosphor-30 Raymarched Visualizer
        </div>
      </div>
    </div>
  );
}
