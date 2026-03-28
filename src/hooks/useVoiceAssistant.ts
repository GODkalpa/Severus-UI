"use client";

import { useEffect, useRef, useState } from "react";
import { getVoiceBackendUrl } from "@/lib/backend";

export type VoiceAssistantStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "recording"
  | "thinking"
  | "playing"
  | "error";

export function useVoiceAssistant(sessionToken: string = "") {
  const [status, setStatus] = useState<VoiceAssistantStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("SVR_CORE_v1");

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null); 
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const statusRef = useRef<VoiceAssistantStatus>("idle");
  const connectionIdRef = useRef(0);
  const connectTimeoutRef = useRef<number | null>(null);
  
  const audioQueueRef = useRef<Blob[]>([]);
  const isProcessingQueueRef = useRef(false);
  const serverFinishedRef = useRef(false);

  const updateStatus = (nextStatus: VoiceAssistantStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    if (nextStatus !== "recording") {
      setPartialTranscript(null);
    }
  };

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Amplitude monitoring loop
  useEffect(() => {
    let animationFrame: number;
    
    const updateAmplitude = () => {
      if (statusRef.current === "recording" && analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        setAmplitude(Math.min(1, rms * 5)); // Boost for visibility
      } else if (statusRef.current === "playing" && playbackAnalyserRef.current) {
        const dataArray = new Uint8Array(playbackAnalyserRef.current.frequencyBinCount);
        playbackAnalyserRef.current.getByteTimeDomainData(dataArray);
        
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        setAmplitude(Math.min(1, rms * 5));
      } else {
        setAmplitude(0);
      }
      animationFrame = requestAnimationFrame(updateAmplitude);
    };

    updateAmplitude();
    return () => cancelAnimationFrame(animationFrame);
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

    analyserRef.current?.disconnect();
    analyserRef.current = null;

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
    // legacy playAudio - now handled by queue
    audioQueueRef.current.push(blob);
    void processAudioQueue();
  };

  const processAudioQueue = async () => {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) {
      // If queue is empty and server sent EOS, we're done
      if (audioQueueRef.current.length === 0 && serverFinishedRef.current && statusRef.current === "playing") {
        console.log("Audio queue empty and server finished, resuming recording");
        updateStatus("recording");
        serverFinishedRef.current = false;
        await resumeRecording();
      }
      return;
    }

    isProcessingQueueRef.current = true;
    const blob = audioQueueRef.current.shift()!;
    
    try {
      await playAudioSegment(blob);
    } catch (err) {
      console.error("Error playing audio segment:", err);
    } finally {
      isProcessingQueueRef.current = false;
      // Continue to next item in queue
      void processAudioQueue();
    }
  };

  const playAudioSegment = (blob: Blob) => {
    return new Promise<void>(async (resolve) => {
      await resumeRecording();
      updateStatus("playing");

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      // Setup analyser for playback
      if (audioContextRef.current) {
        const source = audioContextRef.current.createMediaElementSource(audio);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioContextRef.current.destination);
        playbackAnalyserRef.current = analyser;
      }
      
      // Track metadata to help with visualization if needed
      audio.onplay = () => {
        // Optional: you could update state here if you want to track which segment is playing
      };

      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };

      audio.onerror = (e) => {
        console.error("Audio segment playback error:", e);
        URL.revokeObjectURL(url);
        resolve();
      };

      try {
        await audio.play();
      } catch (err) {
        console.error("Playback start error:", err);
        URL.revokeObjectURL(url);
        resolve();
      }
    });
  };

  const startRecording = async (connectionId: number) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        const reason = window.isSecureContext
          ? "Microphone API is unavailable in this browser"
          : "Microphone requires HTTPS or localhost";

        throw new Error(reason);
      }

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
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      sourceRef.current = source;
      analyserRef.current = analyser;
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

      source.connect(analyser); // Connect to analyser
      source.connect(processor); // Also connect to processor
      processor.connect(audioContext.destination);

      updateStatus("recording");
    } catch (err) {
      console.error("Microphone access failed:", err);
      setError(err instanceof Error ? err.message : "Microphone access failed");
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

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "::1";

    if (!window.isSecureContext && !isLocalhost) {
      setError("Voice requires HTTPS or localhost");
      updateStatus("error");
      return;
    }

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
      console.log("Connected to Severus Backend - Sending Auth Handshake");
      
      // Send authentication message first
      socket.send(JSON.stringify({
        type: "AUTH",
        token: sessionToken
      }));

      updateStatus("connected");
      void startRecording(nextConnectionId);
    };

    socket.onmessage = (event) => {
      if (nextConnectionId !== connectionIdRef.current) {
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        void playAudio(new Blob([event.data], { type: "audio/mpeg" }));
      } else if (typeof event.data === "string") {
        if (event.data === "THINKING") {
          console.log("Backend is thinking...");
          updateStatus("thinking");
        } else if (event.data.startsWith("TRANSCRIPT:")) {
          const text = event.data.replace("TRANSCRIPT:", "");
          setLastTranscript(text);
          setPartialTranscript(null);
        } else if (event.data.startsWith("PARTIAL:")) {
          const text = event.data.replace("PARTIAL:", "");
          setPartialTranscript(text);
        } else if (event.data.startsWith("{") && event.data.endsWith("}")) {
          // Likely system metrics JSON
          try {
            const metrics = JSON.parse(event.data);
            if (metrics.type === "SYSMETRICS") {
              setActiveModel(metrics.model || activeModel);
            }
          } catch(e) {}
        } else if (event.data === "EOS") {
          console.log("Received EOS signal from backend");
          serverFinishedRef.current = true;
          // Trigger queue processing in case it skipped during empty states
          void processAudioQueue();
        }
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

  return { 
    status, 
    error, 
    lastTranscript, 
    partialTranscript, 
    amplitude, 
    activeModel 
  };
}
