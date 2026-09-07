"use client";

import React, { useEffect, useState } from "react";
import { Cloud, Sun, CloudRain, CloudLightning, CloudFog } from "lucide-react";

interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
  locationLabel: string;
}

export default function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    async function fetchWeather(lat: number = 26.8126, lon: number = 87.2834, locTag: string = "Dharan") {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const json = await res.json();
        const current = json.current_weather;
        setData({
          temperature: Math.round(current.temperature),
          windspeed: Math.round(current.windspeed),
          weathercode: current.weathercode,
          locationLabel: locTag,
        });
      } catch (err) {
        console.warn("Weather fetch failed", err);
      }
    }

    const initLocationAndWeather = () => {
      if (typeof navigator !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            void fetchWeather(pos.coords.latitude, pos.coords.longitude, "Local");
          },
          () => {
            void fetchWeather(26.8126, 87.2834, "Dharan");
          },
          { timeout: 5000 }
        );
      } else {
        void fetchWeather(26.8126, 87.2834, "Dharan");
      }
    };

    initLocationAndWeather();
    const interval = setInterval(initLocationAndWeather, 1800000); // 30m
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-4 h-4 text-amber-400" />;
    if (code <= 3) return <Cloud className="w-4 h-4 text-slate-300" />;
    if (code <= 48) return <CloudFog className="w-4 h-4 text-slate-400" />;
    if (code <= 82) return <CloudRain className="w-4 h-4 text-cyan-400" />;
    return <CloudLightning className="w-4 h-4 text-amber-300" />;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return "Clear";
    if (code <= 3) return "Partly Cloudy";
    if (code <= 48) return "Foggy";
    if (code <= 67) return "Drizzle";
    if (code <= 82) return "Rain";
    return "Storm";
  };

  if (!data) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-white/30 font-sans">
        <Cloud className="w-3.5 h-3.5 opacity-50" />
        <span>Weather...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-white/80">
      {getWeatherIcon(data.weathercode)}
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-semibold font-mono">{data.temperature}°C</span>
        <span className="text-[10px] text-white/40 font-sans">
          {getWeatherDescription(data.weathercode)}
        </span>
      </div>
    </div>
  );
}
