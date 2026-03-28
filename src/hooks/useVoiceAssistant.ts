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
  const processorRef = useRef<AudioNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null); 
  
  // Persistent Playback Refs (Web Audio Graph)
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackGainRef = useRef<GainNode | null>(null);
  const playbackCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  const nextPlaybackTimeRef = useRef<number>(0);
  
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
    nextPlaybackTimeRef.current = 0;
    // We don't necessarily need to revoke URLs anymore as we work with buffers
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

    // Clean up persistent playback
    playbackGainRef.current?.disconnect();
    playbackAnalyserRef.current?.disconnect();
    playbackCompressorRef.current?.disconnect();
    playbackGainRef.current = null;
    playbackAnalyserRef.current = null;
    playbackCompressorRef.current = null;
    nextPlaybackTimeRef.current = 0;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext) {
      void audioContext.close().catch((err) => {
        console.warn("Unable to close microphone context.", err);
      });
    }
  };

  const playAudio = async (blob: Blob) => {
    // 1. ArrayBuffer is easier to handle for decoding
    const arrayBuffer = await blob.arrayBuffer();
    
    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // 2. Decode the aggregated MP3 block
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // 3. Setup Persistent Audio Graph if not already
      if (!playbackGainRef.current) {
        const analyser = audioContext.createAnalyser();
        const gainNode = audioContext.createGain();
        const compressor = audioContext.createDynamicsCompressor();

        analyser.fftSize = 256;
        
        // Massive volume boost (8x) with a compressor to prevent mobile clipping
        gainNode.gain.value = 8.0; 
        
        compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
        compressor.knee.setValueAtTime(40, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);
        compressor.attack.setValueAtTime(0, audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, audioContext.currentTime);

        // Chain: Source -> Analyser -> Gain -> Compressor -> Destination
        analyser.connect(gainNode);
        gainNode.connect(compressor);
        compressor.connect(audioContext.destination);

        playbackAnalyserRef.current = analyser;
        playbackGainRef.current = gainNode;
        playbackCompressorRef.current = compressor;
      }

      // 4. Schedule Playback
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackAnalyserRef.current!);

      // Calculate start time
      const now = audioContext.currentTime;
      let startTime = nextPlaybackTimeRef.current;

      // If we've drifted too far, reset to now
      if (startTime < now) {
        startTime = now + 0.05; // Tiny buffer for safety
      }

      source.start(startTime);
      updateStatus("playing");

      // Update next end time
      nextPlaybackTimeRef.current = startTime + audioBuffer.duration;

      source.onended = () => {
        // If current time is past the end of the scheduled queue, resume recording
        if (audioContext.currentTime >= nextPlaybackTimeRef.current - 0.1 && serverFinishedRef.current) {
          console.log("Speech finished, resuming recording mode.");
          updateStatus("recording");
          serverFinishedRef.current = false;
        }
      };

    } catch (err) {
      console.error("Audio scheduling failed:", err);
    }
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
      
      // Load the AudioWorklet module (located in the public/ folder)
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      sourceRef.current = source;
      analyserRef.current = analyser;
      processorRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) return;
        if (statusRef.current !== "recording") return;
        
        // This is high-performance binary audio data coming from the worklet thread
        socketRef.current.send(event.data);
      };

      source.connect(analyser);
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

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

    if (!sessionToken) {
      console.warn("No session token provided, skipping voice connection.");
      updateStatus("idle");
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
            } else if (metrics.type === "ERROR") {
              console.error("Backend Error:", metrics.message, metrics.detail);
              setError(metrics.message === "UNAUTHORIZED" 
                ? "Authentication failed. Please log in again." 
                : metrics.message);
              updateStatus("error");
              socket.close();
            }
          } catch(e) {}
        } else if (event.data === "EOS") {
          console.log("Received EOS signal from backend");
          serverFinishedRef.current = true;
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
    if (sessionToken) {
      connect();
    }

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
    activeModel,
    connect,
    analyserRef,
    playbackAnalyserRef
  };
}
