"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { VoiceAssistantStatus } from "@/hooks/useVoiceAssistant";

interface InteractiveSphereProps {
  voiceStatus?: VoiceAssistantStatus;
  amplitude?: number;
  analyserRef?: React.MutableRefObject<AnalyserNode | null>;
  playbackAnalyserRef?: React.MutableRefObject<AnalyserNode | null>;
  onSphereClick?: () => void;
  className?: string;
}

const VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_amplitude;
uniform float u_state; // 0: idle, 1: recording, 2: thinking, 3: playing, 4: error
uniform vec2 u_pointer; // Normalized pointer coords [-1, 1]
uniform vec2 u_rotation; // Drag rotation [rotY, rotX]

out vec4 fragColor;

// --- Simplex 3D Noise ---
vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// 3D rotation matrix around Y and X axes
mat3 rotateYX(vec2 rot) {
  float cy = cos(rot.x);
  float sy = sin(rot.x);
  float cx = cos(rot.y);
  float sx = sin(rot.y);
  
  mat3 rY = mat3(
    cy,  0.0, sy,
    0.0, 1.0, 0.0,
   -sy,  0.0, cy
  );
  
  mat3 rX = mat3(
    1.0, 0.0, 0.0,
    0.0, cx, -sx,
    0.0, sx,  cx
  );
  
  return rY * rX;
}

// Signed Distance Field of Organic Displaced Sphere
float map(vec3 p, out float displacement) {
  float radius = 0.72;
  
  // Apply drag & continuous rotation
  mat3 rot = rotateYX(u_rotation + vec2(u_time * 0.12, u_time * 0.06));
  vec3 pRot = rot * p;

  // Multi-frequency organic fluid noise
  float speed = u_time * (u_state == 2.0 ? 1.8 : 0.8);
  float freq1 = 2.2;
  float freq2 = 4.5;
  
  float n1 = snoise(pRot * freq1 + vec3(0.0, speed, 0.0));
  float n2 = snoise(pRot * freq2 - vec3(speed * 0.7, 0.0, speed * 0.5));
  
  // Dynamics based on state and amplitude
  float ampFactor = u_amplitude * 0.45;
  if (u_state == 1.0) {
    // Recording / Listening: reactive ripple
    ampFactor = max(ampFactor, 0.08) + u_amplitude * 0.6;
  } else if (u_state == 2.0) {
    // Thinking: swirling turbulent waves
    ampFactor = 0.18 + sin(u_time * 4.0) * 0.06;
  } else if (u_state == 3.0) {
    // Speaking: vibrant melodic pulse
    ampFactor = max(ampFactor, 0.12) + u_amplitude * 0.5;
  }

  displacement = (n1 * 0.6 + n2 * 0.4) * (0.09 + ampFactor);

  // Pointer magnetic pull
  vec3 pointerPos = vec3(u_pointer.x * 0.8, -u_pointer.y * 0.8, 0.5);
  float distToPointer = length(p - pointerPos);
  displacement += smoothstep(0.8, 0.0, distToPointer) * 0.06;

  return length(p) - (radius + displacement);
}

// Surface Normal computation via gradient
vec3 calcNormal(vec3 p) {
  const float h = 0.003;
  float d;
  float dX = map(p + vec3(h, 0.0, 0.0), d) - map(p - vec3(h, 0.0, 0.0), d);
  float dY = map(p + vec3(0.0, h, 0.0), d) - map(p - vec3(0.0, h, 0.0), d);
  float dZ = map(p + vec3(0.0, 0.0, h), d) - map(p - vec3(0.0, 0.0, h), d);
  return normalize(vec3(dX, dY, dZ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  // Camera setup
  vec3 ro = vec3(0.0, 0.0, 2.3);
  vec3 rd = normalize(vec3(uv, -1.5));

  // State color palettes (Anti-Safe Harbor, No Purple)
  // State 0: Idle (Deep Emerald + Cyan Luminescence)
  vec3 idleCore = vec3(0.0, 0.72, 0.55);
  vec3 idleRim  = vec3(0.08, 0.85, 0.82);

  // State 1: Listening / Recording (Vibrant Bioluminescent Mint + Emerald)
  vec3 recCore  = vec3(0.0, 0.95, 0.45);
  vec3 recRim   = vec3(0.3, 1.0, 0.7);

  // State 2: Thinking (Solar Amber & Golden Ember)
  vec3 thinkCore = vec3(1.0, 0.55, 0.08);
  vec3 thinkRim  = vec3(1.0, 0.82, 0.25);

  // State 3: Speaking (Radiant Celestial White + Cyan Aura)
  vec3 speakCore = vec3(0.85, 0.95, 1.0);
  vec3 speakRim  = vec3(0.15, 0.9, 0.7);

  // State 4: Error (Warning Crimson)
  vec3 errCore   = vec3(0.95, 0.15, 0.15);
  vec3 errRim    = vec3(1.0, 0.4, 0.3);

  // Select target palette
  vec3 colCore = idleCore;
  vec3 colRim  = idleRim;

  if (u_state > 3.5) {
    colCore = errCore;
    colRim = errRim;
  } else if (u_state > 2.5) {
    colCore = speakCore;
    colRim = speakRim;
  } else if (u_state > 1.5) {
    colCore = thinkCore;
    colRim = thinkRim;
  } else if (u_state > 0.5) {
    colCore = recCore;
    colRim = recRim;
  }

  // Fast Bounding Sphere Check to avoid unnecessary raymarch on background pixels
  float bRadius = 1.05;
  float bDist = dot(ro, rd);
  float cDist = dot(ro, ro) - bDist * bDist;
  
  vec3 finalColor = vec3(0.0);
  float alpha = 0.0;

  // Ambient back-glow / halo
  float distToCenter = length(uv);
  float haloIntensity = smoothstep(0.8, 0.2, distToCenter) * 0.15;
  if (u_state == 2.0) haloIntensity *= 1.4;
  else if (u_state == 3.0) haloIntensity *= 1.6;
  finalColor += colRim * haloIntensity * (1.0 + u_amplitude * 0.8);

  if (cDist < bRadius * bRadius) {
    // Raymarch inside bounding region
    float t = -bDist - sqrt(bRadius * bRadius - cDist);
    float tMax = -bDist + sqrt(bRadius * bRadius - cDist);
    t = max(t, 0.0);

    bool hit = false;
    vec3 p = vec3(0.0);
    float disp = 0.0;

    for (int i = 0; i < 48; i++) {
      p = ro + rd * t;
      float d = map(p, disp);
      if (d < 0.0015) {
        hit = true;
        break;
      }
      t += d * 0.72; // Conservative step for sharp noise resolution
      if (t > tMax) break;
    }

    if (hit) {
      vec3 normal = calcNormal(p);
      vec3 viewDir = -rd;

      // Lighting components
      vec3 lightPos = vec3(1.2, 1.5, 1.8);
      vec3 lightDir = normalize(lightPos - p);
      
      float diff = max(dot(normal, lightDir), 0.0);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);

      // Fresnel Rim Glow (The iridescent liquid edge)
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.8);
      
      // Subsurface organic scattering
      float sss = smoothstep(-0.4, 0.6, dot(normal, -lightDir)) * 0.35;

      // Base shading with chromatic depth
      vec3 surfaceCol = mix(colCore * 0.3, colCore, diff * 0.7 + sss);
      surfaceCol += colRim * fresnel * 1.5;
      surfaceCol += vec3(1.0) * spec * 0.85;

      // Internal bioluminescent pulse
      float corePulse = (sin(u_time * 2.5 + disp * 15.0) * 0.5 + 0.5) * 0.25;
      surfaceCol += colCore * corePulse;

      finalColor = surfaceCol;
      alpha = 1.0;
    }
  }

  // Smooth vignette edge falloff
  fragColor = vec4(finalColor, max(alpha, length(finalColor) * 1.2));
}
`;

export default function InteractiveSphere({
  voiceStatus = "idle",
  amplitude = 0,
  analyserRef,
  playbackAnalyserRef,
  onSphereClick,
  className = "",
}: InteractiveSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const animFrameIdRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());

  // Uniform locations
  const uniformsRef = useRef<{
    u_resolution?: WebGLUniformLocation | null;
    u_time?: WebGLUniformLocation | null;
    u_amplitude?: WebGLUniformLocation | null;
    u_state?: WebGLUniformLocation | null;
    u_pointer?: WebGLUniformLocation | null;
    u_rotation?: WebGLUniformLocation | null;
  }>({});

  // Physics & Inertia for Drag / Tilt
  const pointerPosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const rotationRef = useRef({ rotY: 0, rotX: 0, velY: 0, velX: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const smoothedAmpRef = useRef(0);

  const [webglFailed, setWebglFailed] = useState(false);

  // Map VoiceAssistantStatus to float index
  const getStateNumber = useCallback((status: VoiceAssistantStatus): number => {
    switch (status) {
      case "idle":
      case "connecting":
      case "connected":
        return 0.0;
      case "recording":
        return 1.0;
      case "thinking":
        return 2.0;
      case "playing":
        return 3.0;
      case "error":
        return 4.0;
      default:
        return 0.0;
    }
  }, []);

  // WebGL2 Initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    if (!gl) {
      console.warn("WebGL2 not supported on this device. Using CSS fallback.");
      setWebglFailed(true);
      return;
    }

    glRef.current = gl;

    // Compile Shaders
    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vert = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vert || !frag) {
      setWebglFailed(true);
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      setWebglFailed(true);
      return;
    }

    gl.useProgram(program);

    // Quad Buffer
    const quad = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Cache Uniform Locations
    uniformsRef.current = {
      u_resolution: gl.getUniformLocation(program, "u_resolution"),
      u_time: gl.getUniformLocation(program, "u_time"),
      u_amplitude: gl.getUniformLocation(program, "u_amplitude"),
      u_state: gl.getUniformLocation(program, "u_state"),
      u_pointer: gl.getUniformLocation(program, "u_pointer"),
      u_rotation: gl.getUniformLocation(program, "u_rotation"),
    };

    // Render Loop
    const render = () => {
      if (!gl || !canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = Math.floor(canvas.clientWidth * dpr);
      const displayHeight = Math.floor(canvas.clientHeight * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      // Elapsed time in seconds
      const elapsed = (Date.now() - startTimeRef.current) * 0.001;

      // Pointer easing
      pointerPosRef.current.x += (pointerPosRef.current.targetX - pointerPosRef.current.x) * 0.1;
      pointerPosRef.current.y += (pointerPosRef.current.targetY - pointerPosRef.current.y) * 0.1;

      // Rotation inertia
      if (!isDraggingRef.current) {
        rotationRef.current.velY *= 0.94;
        rotationRef.current.velX *= 0.94;
        rotationRef.current.rotY += rotationRef.current.velY;
        rotationRef.current.rotX += rotationRef.current.velX;
      }

      // Audio Amplitude Sampling
      let realAmp = amplitude;
      const activeAnalyser =
        voiceStatus === "playing" ? playbackAnalyserRef?.current : analyserRef?.current;
      if (activeAnalyser && (voiceStatus === "recording" || voiceStatus === "playing")) {
        const freqData = new Uint8Array(activeAnalyser.frequencyBinCount);
        activeAnalyser.getByteFrequencyData(freqData);
        let sum = 0;
        const count = Math.min(32, freqData.length);
        for (let i = 0; i < count; i++) {
          sum += freqData[i] / 255;
        }
        realAmp = Math.max(realAmp, sum / count);
      }

      // Smooth amplitude rise & fall
      if (realAmp > smoothedAmpRef.current) {
        smoothedAmpRef.current += (realAmp - smoothedAmpRef.current) * 0.4;
      } else {
        smoothedAmpRef.current += (realAmp - smoothedAmpRef.current) * 0.08;
      }

      // Update Uniforms
      const u = uniformsRef.current;
      if (u.u_resolution) gl.uniform2f(u.u_resolution, canvas.width, canvas.height);
      if (u.u_time) gl.uniform1f(u.u_time, elapsed);
      if (u.u_amplitude) gl.uniform1f(u.u_amplitude, smoothedAmpRef.current);
      if (u.u_state) gl.uniform1f(u.u_state, getStateNumber(voiceStatus));
      if (u.u_pointer) gl.uniform2f(u.u_pointer, pointerPosRef.current.x, pointerPosRef.current.y);
      if (u.u_rotation) gl.uniform2f(u.u_rotation, rotationRef.current.rotY, rotationRef.current.rotX);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, [voiceStatus, amplitude, analyserRef, playbackAnalyserRef, getStateNumber]);

  // Pointer & Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointerPosRef.current.targetX = Math.max(-1, Math.min(1, nx));
    pointerPosRef.current.targetY = Math.max(-1, Math.min(1, ny));

    if (isDraggingRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      const factor = 0.008;
      rotationRef.current.rotY += dx * factor;
      rotationRef.current.rotX += dy * factor;
      rotationRef.current.velY = dx * factor;
      rotationRef.current.velX = dy * factor;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      className={`relative flex items-center justify-center select-none cursor-pointer group ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        isDraggingRef.current = false;
        pointerPosRef.current.targetX = 0;
        pointerPosRef.current.targetY = 0;
      }}
      onClick={onSphereClick}
      title="Click to interact with Severus"
    >
      {/* WebGL2 Canvas */}
      {!webglFailed ? (
        <canvas
          ref={canvasRef}
          className="w-full h-full block rounded-full transition-transform duration-500 group-hover:scale-[1.02] active:scale-[0.98]"
        />
      ) : (
        /* CSS Fallback if WebGL2 not present */
        <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-300 blur-sm animate-pulse" />
      )}

      {/* Subtle Ambient Depth Ring */}
      <div className="absolute inset-0 rounded-full pointer-events-none border border-white/5 opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
    </div>
  );
}
