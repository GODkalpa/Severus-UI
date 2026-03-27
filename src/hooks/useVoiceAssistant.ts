"use client";

import { useEffect, useRef, useState } from "react";

export type VoiceAssistantStatus = 
  | "idle" 
  | "connecting" 
  | "connected" 
  | "recording" 
  | "playing" 
  | "error";

export function useVoiceAssistant() {
  const [status, setStatus] = useState<VoiceAssistantStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const connect = () => {
    setStatus("connecting");
    const backendUrl = process.env.NEXT_PUBLIC_VOICE_BACKEND_URL || "ws://localhost:8001/ws/severus";
    const socket = new WebSocket(backendUrl);
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Connected to Severus Backend");
      setStatus("connected");
      startRecording();
    };

    socket.onmessage = async (event) => {
      // Backend handles TTS and returns binary audio
      if (event.data instanceof ArrayBuffer) {
        console.log("Received audio buffer from backend");
        const blob = new Blob([event.data], { type: "audio/mpeg" });
        playAudio(blob);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setError("WebSocket connection failed");
      setStatus("error");
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      if (status !== "error") setStatus("idle");
      stopRecording();
    };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        socketRef.current.send(pcmData.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setStatus("recording");
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("Microphone access denied");
      setStatus("error");
    }
  };

  const stopRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const playAudio = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    
    audio.onplay = () => setStatus("playing");
    audio.onended = () => {
      setStatus("recording");
      URL.revokeObjectURL(url);
    };
    
    audio.play().catch(err => {
      console.error("Playback error:", err);
      setStatus("recording");
    });
  };

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.close();
      stopRecording();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  return { status, error };
}
