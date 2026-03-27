"use client";

import { useEffect, useRef, useState } from "react";
import { getVoiceBackendUrl } from "@/lib/backend";

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
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const statusRef = useRef<VoiceAssistantStatus>(status);
  const connectionIdRef = useRef(0);
  const connectTimeoutRef = useRef<number | null>(null);

  const updateStatus = (nextStatus: VoiceAssistantStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  };

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearConnectTimeout = () => {
    if (connectTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(connectTimeoutRef.current);
    connectTimeoutRef.current = null;
  };

  const clearAudioPlayback = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const suspendRecording = async () => {
    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state !== "running") {
      return;
    }

    try {
      await audioContext.suspend();
    } catch (err) {
      console.warn("Unable to suspend microphone capture.", err);
    }
  };

  const resumeRecording = async () => {
    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state !== "suspended") {
      return;
    }

    try {
      await audioContext.resume();
    } catch (err) {
      console.warn("Unable to resume microphone capture.", err);
    }
  };

  const stopRecording = () => {
    processorRef.current?.disconnect();
    processorRef.current = null;

    sourceRef.current?.disconnect();
    sourceRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext) {
      void audioContext.close().catch((err) => {
        console.warn("Unable to close microphone context.", err);
      });
    }
  };

  const playAudio = async (blob: Blob) => {
    await suspendRecording();
    clearAudioPlayback();
    updateStatus("playing");

    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.src = url;

    audio.onplay = () => updateStatus("playing");
    audio.onended = () => {
      if (audioUrlRef.current === url) {
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
      }

      updateStatus("recording");
      void resumeRecording();
    };

    audio.onerror = () => {
      if (audioUrlRef.current === url) {
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
      }

      updateStatus("recording");
      void resumeRecording();
    };

    try {
      await audio.play();
    } catch (err) {
      console.error("Playback error:", err);
      clearAudioPlayback();
      updateStatus("recording");
      await resumeRecording();
    }
  };

  const startRecording = async (connectionId: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (connectionId !== connectionIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const AudioContextClass =
        window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error("AudioContext is not supported in this browser.");
      }

      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      sourceRef.current = source;
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
          return;
        }

        if (statusRef.current !== "recording") {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        socketRef.current.send(pcmData.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      updateStatus("recording");
    } catch (err) {
      console.error("Microphone access failed:", err);
      setError("Microphone access failed");
      updateStatus("error");
      socketRef.current?.close();
    }
  };

  const connect = () => {
    const nextConnectionId = connectionIdRef.current + 1;
    connectionIdRef.current = nextConnectionId;

    socketRef.current?.close();
    clearAudioPlayback();
    stopRecording();

    setError(null);
    updateStatus("connecting");
    clearConnectTimeout();

    const backendUrl = getVoiceBackendUrl();
    if (!backendUrl) {
      setError("Voice backend URL is not configured");
      updateStatus("error");
      return;
    }

    const socket = new WebSocket(backendUrl);
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;
    connectTimeoutRef.current = window.setTimeout(() => {
      if (nextConnectionId !== connectionIdRef.current || socket.readyState !== WebSocket.CONNECTING) {
        return;
      }

      console.error("Voice backend connection timed out:", backendUrl);
      setError("Voice backend connection timed out");
      updateStatus("error");
      socket.close();
    }, 8000);

    socket.onopen = () => {
      if (nextConnectionId !== connectionIdRef.current) {
        socket.close();
        return;
      }

      clearConnectTimeout();
      console.log("Connected to Severus Backend");
      updateStatus("connected");
      void startRecording(nextConnectionId);
    };

    socket.onmessage = (event) => {
      if (nextConnectionId !== connectionIdRef.current) {
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        console.log("Received audio buffer from backend");
        void playAudio(new Blob([event.data], { type: "audio/mpeg" }));
      }
    };

    socket.onerror = (err) => {
      if (nextConnectionId !== connectionIdRef.current) {
        return;
      }

      clearConnectTimeout();
      console.error("WebSocket error:", err);
      setError("WebSocket connection failed");
      updateStatus("error");
    };

    socket.onclose = () => {
      if (nextConnectionId !== connectionIdRef.current) {
        return;
      }

      clearConnectTimeout();
      console.log("WebSocket disconnected");
      socketRef.current = null;
      clearAudioPlayback();
      stopRecording();

      if (statusRef.current !== "error") {
        updateStatus("idle");
      }
    };
  };

  useEffect(() => {
    connect();

    return () => {
      connectionIdRef.current += 1;
      clearConnectTimeout();
      socketRef.current?.close();
      socketRef.current = null;
      clearAudioPlayback();
      stopRecording();
    };
  }, []);

  return { status, error };
}
