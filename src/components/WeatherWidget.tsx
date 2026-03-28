"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
}

export default function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      try {
        // Fixed coordinates for Kathmandu (GMT +05:45)
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=27.700769&longitude=85.300140&current_weather=true"
        );
        const json = await res.json();
        const current = json.current_weather;
        setData({
          temperature: current.temperature,
          windspeed: current.windspeed,
          weathercode: current.weathercode,
        });
      } catch (err) {
        console.warn("Weather fetch failed", err);
      }
    }

    void fetchWeather();
    const interval = setInterval(fetchWeather, 1800000); // 30m
    return () => clearInterval(interval);
  }, []);

  const getWeatherDescription = (code: number) => {
    if (code === 0) return "CLEAR_SKY";
    if (code <= 3) return "PARTLY_CLOUDY";
    if (code <= 48) return "FOGGY_CON_ATM";
    if (code <= 67) return "DRIZZLE_LIGHT";
    if (code <= 82) return "RAIN_SHOWERS";
    return "STORM_POSSIBLE";
  };

  return (
    <div className="flex flex-col items-end gap-1 font-mono text-primary p-4 border-r-2 border-primary/20 bg-black/20 text-right backdrop-blur-md">
      <div className="text-[10px] uppercase tracking-[0.3em] opacity-50 mb-1">
        Atmos_Grid // Environmental_Scan
      </div>
      <AnimatePresence mode="wait">
        {data ? (
          <motion.div
            key="weather-data"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-1"
          >
            <div className="text-3xl font-bold tracking-tighter">
              {data.temperature}°<span className="text-sm ml-1 opacity-60">C</span>
            </div>
            <div className="text-[11px] uppercase tracking-widest text-secondary glow-amber">
              {getWeatherDescription(data.weathercode)}
            </div>
            <div className="flex gap-4 mt-2 justify-end opacity-60">
              <div className="text-[9px] uppercase tracking-tighter">
                WIND: {data.windspeed} km/h
              </div>
              <div className="text-[9px] uppercase tracking-tighter">
                LOC: KTM_NP
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-[11px] uppercase tracking-widest opacity-40 animate-pulse">
            SCANNING_ATMOSPHERE...
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
