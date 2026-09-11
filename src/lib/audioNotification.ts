// Web Audio API Synthesized Cyber Chime & Notification Audio System

let audioCtx: AudioContext | null = null;
let isUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function initAudioUnlock(): void {
  if (typeof window === "undefined" || isUnlocked) return;

  const unlock = async () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
        isUnlocked = true;
      } catch (err) {
        console.warn("AudioContext resume failed:", err);
      }
    } else if (ctx && ctx.state === "running") {
      isUnlocked = true;
    }

    if (isUnlocked) {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    }
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
}

export function isAudioMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("severus_audio_muted") === "true";
}

export function setAudioMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("severus_audio_muted", muted ? "true" : "false");
}

export function triggerTacticalVibration(pattern: number[] = [150, 80, 150, 80, 300]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors on unsupported devices
    }
  }
}

/**
 * Synthesizes a futuristic, crystal-clear HUD alert chime using pure Web Audio API.
 * Guarantees zero-latency, zero network asset loading, and offline reliability.
 */
export async function playCyberChime(): Promise<void> {
  if (isAudioMuted()) {
    triggerTacticalVibration();
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    triggerTacticalVibration();

    const now = ctx.currentTime;

    // Master Gain & Limiter
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.35, now);
    masterGain.connect(ctx.destination);

    // Multi-Tone Resonant Cyber Arpeggio (D5 -> A5 -> D6)
    const tones = [
      { freq: 880.0, start: now, duration: 0.7, type: "sine" as OscillatorType },
      { freq: 1318.51, start: now + 0.07, duration: 0.75, type: "sine" as OscillatorType },
      { freq: 1760.0, start: now + 0.15, duration: 0.9, type: "sine" as OscillatorType },
      // Subtle crystalline high harmonic sparkle
      { freq: 2637.02, start: now + 0.16, duration: 0.6, type: "triangle" as OscillatorType },
    ];

    tones.forEach(({ freq, start, duration, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(4000, start);
      filter.Q.setValueAtTime(2, start);

      // Fast, percussive attack (4ms) with smooth exponential decay
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(start);
      osc.stop(start + duration + 0.05);
    });
  } catch (err) {
    console.warn("Cyber chime playback failed:", err);
  }
}
