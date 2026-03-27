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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const connect = () => {
    setStatus("connecting");
    const socket = new WebSocket("ws://localhost:8000/ws/severus");
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Connected to Severus Backend");
      setStatus("connected");
      startRecording();
    };

    socket.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        console.log("Received audio blob from backend");
        playAudio(event.data);
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
    };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(event.data);
        }
      };

      mediaRecorder.start(250); // 250ms chunks
      setStatus("recording");
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("Microphone access denied");
      setStatus("error");
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
      mediaRecorderRef.current?.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  return { status, error };
}
