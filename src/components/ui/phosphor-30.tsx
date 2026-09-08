"use client";
import React, { useEffect, useRef } from "react";

/* shader */ 
const SHADER_SRC = `#version 300 es
precision highp float;

out vec4 fragColor;
in vec2 v_uv;

uniform vec3  iResolution;   // (width, height, dpr)
uniform float iTime;         // seconds
uniform int   iFrame;        // frame counter
uniform vec4  iMouse;        // (x, y, L, R)
uniform float iAudio;        // Real-time audio amplitude [0, 1]

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2  r  = iResolution.xy;
    float t  = iTime;
    vec3  FC = vec3(fragCoord, 0.0);
    vec4  o  = vec4(0.0);

    // Smooth, organic audio reactivity (gentle breathing, no harsh jumping)
    float amp = clamp(iAudio, 0.0, 1.0);
    float radius = 3.0 + amp * 0.15;

    float s = 0.0;
    // Mobile-optimized step count (55 steps vs 80) retains full volumetric detail while saving 32% GPU load
    for (float i = 0.0, z = 0.0, d = 0.0; i++ < 5.5e1; o += (cos(s + vec4(0.0, 1.0, 8.0, 0.0)) + 1.0) / max(d, 0.002))
    {
        vec3 p = z * normalize(FC.rgb * 2.0 - r.xyy);
        vec3 a = normalize(cos(vec3(5.0, 0.0, 1.0) + t - d * 4.0));
        p.z += 6.5; // Refined smaller sphere size

        a = a * dot(a, p) - cross(a, p);
        // 6 iterations instead of 8 reduces inner loop overhead by 25%
        for (d = 1.0; d++ < 7.0; )
            a -= sin(a * d + t * (1.0 + amp * 0.15)).zxy / d;

        z += d = 0.1 * abs(length(p) - radius) + 0.07 * abs(cos(s = a.y));
    }
    
    // Soft, natural luminescence flare
    o *= (1.0 + amp * 0.25);
    o = tanh(clamp(o / 4.2e3, -20.0, 20.0));

    fragColor = vec4(o.rgb, 1.0);
}

void main(){
  mainImage(fragColor, gl_FragCoord.xy);
}
`;

/* ========= Вершинный шейдер: fullscreen triangle ========= */
const VERT_SRC = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/* ========= Утилиты (без throw) ========= */
function safeCompile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
  const log = gl.getShaderInfoLog(sh) || "";
  return { shader: ok ? sh : null, log };
}
function safeLink(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  const ok = gl.getProgramParameter(prog, gl.LINK_STATUS);
  const log = gl.getProgramInfoLog(prog) || "";
  return { program: ok ? prog : null, log };
}
function drawError(gl: WebGL2RenderingContext, msg: string) {
  console.error(msg);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(0.0, 0.0, 0.0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

/* ========= Канвас-рантайм с безопасным cleanup ========= */
export function ShaderCanvas({
  fragSource = SHADER_SRC,
  pixelRatio,
  speedMultiplier = 1.0,
  amplitude = 0,
  voiceStatus = "idle",
  className,
  style,
  onClick,
}: {
  fragSource?: string;
  pixelRatio?: number;
  speedMultiplier?: number;
  amplitude?: number;
  voiceStatus?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, l: 0, r: 0 });

  const speedRef = useRef<number>(speedMultiplier);
  const amplitudeRef = useRef<number>(amplitude);
  const voiceStatusRef = useRef<string>(voiceStatus);
  const smoothedAudioRef = useRef<number>(0);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    amplitudeRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas = canvasEl;
    const glCtx = canvas.getContext("webgl2", {
      premultipliedAlpha: false,
      powerPreference: "high-performance",
      desynchronized: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!glCtx) return;
    const gl = glCtx;

    let disposed = false;
    let vao: WebGLVertexArrayObject | null = null;
    let vbo: WebGLBuffer | null = null;
    let program: WebGLProgram | null = null;
    let ro: ResizeObserver | null = null;
    let resizeScheduled = false;

    let mouseBound = false;
    let touchBound = false;
    let ctxBound = false;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current.x = Math.max(0, Math.min(x, rect.width));
      mouseRef.current.y = Math.max(0, Math.min(rect.height - y, rect.height));
    };
    const onDown = (e: MouseEvent) => { if (e.button === 0) mouseRef.current.l = 1; if (e.button === 2) mouseRef.current.r = 1; };
    const onUp   = (e: MouseEvent) => { if (e.button === 0) mouseRef.current.l = 0; if (e.button === 2) mouseRef.current.r = 0; };
    const onCtxMenu = (e: Event) => e.preventDefault();

    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      mouseRef.current.x = Math.max(0, Math.min(x, rect.width));
      mouseRef.current.y = Math.max(0, Math.min(rect.height - y, rect.height));
    };
    const onTouchStart = (e: TouchEvent) => {
      mouseRef.current.l = 1;
      if (e.touches.length) {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current.x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
        mouseRef.current.y = Math.max(0, Math.min(rect.height - (e.touches[0].clientY - rect.top), rect.height));
      }
    };
    const onTouchEnd = () => { mouseRef.current.l = 0; };

    const getDpr = () => {
      if (pixelRatio) return pixelRatio;
      const sys = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const isMobile =
        typeof window !== "undefined" &&
        (window.innerWidth < 768 ||
          "ontouchstart" in window ||
          (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));

      // Mobile / touch devices: clamp DPR to 0.75 - 1.0 (bilinear hardware filtering prevents lag while preserving fluid fidelity)
      if (isMobile) {
        return Math.max(0.75, Math.min(1.0, sys * 0.75));
      }
      // Desktop: clamp DPR between 1.0 and 1.25 to prevent 4K GPU overdraw
      return Math.max(1, Math.min(1.25, sys));
    };

    function applySize() {
      resizeScheduled = false;
      if (disposed || !gl) return;
      const dpr = getDpr();
      const cssW = Math.max(1, (canvas.clientWidth | 0));
      const cssH = Math.max(1, (canvas.clientHeight | 0));
      const w = Math.max(1, Math.floor(cssW * dpr));
      const h = Math.max(1, Math.floor(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    function scheduleSize() {
      if (resizeScheduled) return;
      resizeScheduled = true;
      requestAnimationFrame(applySize);
    }

    let uResolution: WebGLUniformLocation | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uFrame: WebGLUniformLocation | null = null;
    let uMouse: WebGLUniformLocation | null = null;
    let uAudio: WebGLUniformLocation | null = null;

    function initGL() {
      if (disposed || !gl) return false;

      // Clean up previous WebGL handles if any
      if (vbo) { try { gl.deleteBuffer(vbo); } catch {} vbo = null; }
      if (vao) { try { gl.deleteVertexArray(vao); } catch {} vao = null; }
      if (program) { try { gl.deleteProgram(program); } catch {} program = null; }

      // Geometry
      vao = gl.createVertexArray();
      vbo = gl.createBuffer();
      if (!vao || !vbo) { drawError(gl, "Failed to create VAO/VBO"); return false; }
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      // Shaders
      const { shader: vs, log: vsLog } = safeCompile(gl, gl.VERTEX_SHADER, VERT_SRC);
      if (!vs) { drawError(gl, `Vertex compile error:\n${vsLog}`); return false; }
      const { shader: fs, log: fsLog } = safeCompile(gl, gl.FRAGMENT_SHADER, fragSource);
      if (!fs) { drawError(gl, `Fragment compile error:\n${fsLog}`); gl.deleteShader(vs); return false; }
      const linked = safeLink(gl, vs, fs);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!linked.program) { drawError(gl, `Program link error:\n${linked.log}`); return false; }
      program = linked.program;

      // Uniforms
      uResolution = gl.getUniformLocation(program, "iResolution");
      uTime = gl.getUniformLocation(program, "iTime");
      uFrame = gl.getUniformLocation(program, "iFrame");
      uMouse = gl.getUniformLocation(program, "iMouse");
      uAudio = gl.getUniformLocation(program, "iAudio");

      return true;
    }

    if (!initGL()) return cleanup;

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    const onContextRestored = () => {
      initGL();
      scheduleSize();
      lastTimestamp = performance.now();
      frameRef.current = 0;
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };

    // ResizeObserver
    ro = new ResizeObserver(scheduleSize);
    ro.observe(canvas);
    scheduleSize();

    // Mouse Listeners
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("contextmenu", onCtxMenu);
    mouseBound = true;

    // Touch Listeners
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    touchBound = true;

    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    ctxBound = true;

    // Animation Loop
    startRef.current = performance.now();
    frameRef.current = 0;
    let accumulatedTime = 0;
    let lastTimestamp = performance.now();

    function tick(now: number) {
      if (disposed) return;
      if (gl.isContextLost()) { rafRef.current = requestAnimationFrame(tick); return; }

      // Clamp delta to prevent erratic jumps on wake or lag spikes
      const delta = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      // Fluid, organic audio smoothing (low-pass filter without abrupt spikes)
      let targetAmp = amplitudeRef.current || 0;
      if (voiceStatusRef.current === "thinking") {
        targetAmp = Math.max(targetAmp, 0.2 + Math.sin(now * 0.003) * 0.1);
      } else if (voiceStatusRef.current === "playing") {
        targetAmp = Math.max(targetAmp * 0.8, 0.15);
      } else if (voiceStatusRef.current === "recording") {
        targetAmp = Math.max(targetAmp * 0.8, 0.05);
      }

      // Smooth exponential filter: 0.08 rise, 0.04 fall for silky breathing
      const filterRate = targetAmp > smoothedAudioRef.current ? 0.08 : 0.04;
      smoothedAudioRef.current += (targetAmp - smoothedAudioRef.current) * filterRate;

      accumulatedTime = (accumulatedTime + delta * speedRef.current) % 10000.0;
      frameRef.current += 1;

      try {
        if (resizeScheduled) applySize();

        gl.useProgram(program);

        const dpr = getDpr();
        const w = canvas.width, h = canvas.height;

        if (uResolution) gl.uniform3f(uResolution, w, h, dpr);
        if (uTime) gl.uniform1f(uTime, accumulatedTime);
        if (uFrame) gl.uniform1i(uFrame, frameRef.current);
        if (uAudio) gl.uniform1f(uAudio, smoothedAudioRef.current);
        if (uMouse) {
          const m = mouseRef.current;
          gl.uniform4f(uMouse, m.x * dpr, m.y * dpr, m.l, m.r);
        }

        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } catch (err) {
        drawError(gl, (err as Error)?.message ?? String(err));
      }

      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    // Pause on background tab or locked mobile screen to conserve GPU/battery
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      } else {
        lastTimestamp = performance.now();
        if (!rafRef.current && !disposed) {
          rafRef.current = requestAnimationFrame(tick);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Cleanup
    function cleanup() {
      disposed = true;

      document.removeEventListener("visibilitychange", onVisibilityChange);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (mouseBound) {
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("mousedown", onDown);
        canvas.removeEventListener("mouseup", onUp);
        canvas.removeEventListener("contextmenu", onCtxMenu);
        mouseBound = false;
      }

      if (touchBound) {
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("touchend", onTouchEnd);
        touchBound = false;
      }

      if (ctxBound) {
        canvas.removeEventListener("webglcontextlost", onContextLost);
        canvas.removeEventListener("webglcontextrestored", onContextRestored);
        ctxBound = false;
      }

      if (ro) { try { ro.disconnect(); } catch {} ro = null; }

      if (gl) {
        if (vbo) { try { gl.deleteBuffer(vbo); } catch {} vbo = null; }
        if (vao) { try { gl.deleteVertexArray(vao); } catch {} vao = null; }
        if (program) { try { gl.deleteProgram(program); } catch {} program = null; }
      }
    }

    return cleanup;
  }, [fragSource, pixelRatio]);

  return (
    <div
      onClick={onClick}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
      />
    </div>
  );
}

/* ========= Default export: фуллскрин по умолчанию ========= */
export default function Component({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        background: "black",
        overflow: "hidden",
        ...style,
      }}
    >
      <ShaderCanvas fragSource={SHADER_SRC} />
    </div>
  );
}
