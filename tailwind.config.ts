import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00ff41", // Toxic Green
        "primary-container": "#0ccf3e",
        secondary: "#ff5625", // Orange
        surface: "#000000",
        outline: "#003b12",
        "on-surface-variant": "#d1ffd6",
      },
      fontFamily: {
        mono: ["var(--font-space-mono)", "monospace"],
      },
      animation: {
        "spin-slow": "spin 20s linear infinite",
        "spin-reverse-slow": "spin-reverse 25s linear infinite",
        "spin-fast": "spin 3s linear infinite",
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scanning": "scanning 2s ease-in-out infinite",
        "sine-wave": "sine-wave 15s linear infinite",
      },
      keyframes: {
        "spin-reverse": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        scanning: {
          "0%, 100%": { transform: "translateY(0%)", opacity: "0.2" },
          "50%": { transform: "translateY(100%)", opacity: "0.8" },
        },
        "sine-wave": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
