"use client";

import { useEffect, useRef } from "react";

interface MapSkyBackdropProps {
  longitude: number;
  latitude: number;
  zoom: number;
}

const VERT = /* glsl */ `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPan;   // world-linked drift from map center
  uniform float uZoom;
  uniform vec2 uMouse; // 0–1

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = mat2(1.6, 1.2, -1.2, 1.6) * p;
      a *= 0.5;
    }
    return v;
  }

  float bayer4(vec2 p) {
    vec2 xy = floor(mod(p, 4.0));
    float idx = xy.x + xy.y * 4.0;
    float v = 0.0;
    if (idx < 0.5) v = 0.0;
    else if (idx < 1.5) v = 8.0;
    else if (idx < 2.5) v = 2.0;
    else if (idx < 3.5) v = 10.0;
    else if (idx < 4.5) v = 12.0;
    else if (idx < 5.5) v = 4.0;
    else if (idx < 6.5) v = 14.0;
    else if (idx < 7.5) v = 6.0;
    else if (idx < 8.5) v = 3.0;
    else if (idx < 9.5) v = 11.0;
    else if (idx < 10.5) v = 1.0;
    else if (idx < 11.5) v = 9.0;
    else if (idx < 12.5) v = 15.0;
    else if (idx < 13.5) v = 7.0;
    else if (idx < 14.5) v = 13.0;
    else v = 5.0;
    return v / 16.0;
  }

  // Large-scale atmospheric circulation (jet bands + slow gyres)
  vec2 wind(vec2 p, float t) {
    float lat = p.y;
    float jet = 0.55 + 0.45 * sin(lat * 3.4 + t * 0.04);
    vec2 zonal = vec2(jet, 0.04 * sin(p.x * 2.2 + t * 0.08));

    vec2 c1 = p - vec2(0.35 + 0.08 * sin(t * 0.03), 0.55);
    vec2 g1 = vec2(-c1.y, c1.x) * (0.22 / (0.35 + length(c1)));

    vec2 c2 = p - vec2(0.72 - 0.06 * cos(t * 0.025), 0.38);
    vec2 g2 = vec2(c2.y, -c2.x) * (0.16 / (0.4 + length(c2)));

    vec2 w = zonal + g1 + g2;
    float m = length(w);
    return m > 0.0001 ? w / m * (0.35 + jet * 0.45) : vec2(0.4, 0.0);
  }

  void main() {
    float pixel = 2.25;
    vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    vec2 px = floor(vUv * uResolution / pixel) * pixel / uResolution;

    // Cursor gently parts the deck
    vec2 toCursor = (px - uMouse) * aspect;
    float dist = length(toCursor);
    float influence = smoothstep(0.32, 0.0, dist);
    vec2 dir = dist > 0.0001 ? normalize(toCursor) : vec2(0.0);
    vec2 parted = px + dir * influence * 0.16 * vec2(1.0 / aspect.x, 1.0);

    // Map pan/zoom locks clouds to the "ground" as you fly
    float scale = exp2(12.0 - uZoom) * 0.55;
    vec2 world = (parted - 0.5) * aspect * scale + uPan;

    float t = uTime;
    vec2 p0 = world * 1.15;
    vec2 w0 = wind(fract(p0 * 0.08 + 0.5), t);
    vec2 p1 = p0 - w0 * t * 0.045;
    vec2 w1 = wind(fract(p1 * 0.08 + 0.5), t * 0.9);
    vec2 p2 = p1 - w1 * t * 0.028;

    float n1 = fbm(p2 * 1.4 + vec2(t * 0.012, -t * 0.008));
    float n2 = fbm(p2 * 2.2 + w0 * 2.0 + vec2(3.1, -1.4));
    float n3 = fbm(p2 * 0.85 - w1 * 1.5 + vec2(-2.2, 4.0) + t * 0.006);

    // High cirrus streaks aligned with wind
    vec2 streakUv = p2 * vec2(0.35, 2.8) + w0 * t * 0.02;
    float streaks = fbm(streakUv) * 0.55;

    float field = n1 * 0.4 + n2 * 0.32 + n3 * 0.28 + streaks * 0.22;
    float clouds = smoothstep(0.36, 0.74, field);
    clouds *= 0.78;
    clouds *= 1.0 - influence * 0.9;

    // Soft vignette sky depth
    float vignette = smoothstep(1.15, 0.25, length((px - 0.5) * aspect));
    clouds *= 0.55 + vignette * 0.45;

    float threshold = bayer4(gl_FragCoord.xy / pixel);
    float dithered = step(threshold, clouds);

    // Deep sky base + dithered cloud gray (spine-matched)
    float sky = 0.02 + 0.03 * (1.0 - vignette);
    float gray = mix(sky, 0.2, dithered);
    gl_FragColor = vec4(vec3(gray), 1.0);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) throw new Error("shader");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(info || "compile failed");
  }
  return s;
}

export function MapSkyBackdrop({
  longitude,
  latitude,
  zoom,
}: MapSkyBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ longitude, latitude, zoom });
  viewRef.current = { longitude, latitude, zoom };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uResolution = gl.getUniformLocation(prog, "uResolution");
    const uPan = gl.getUniformLocation(prog, "uPan");
    const uZoom = gl.getUniformLocation(prog, "uZoom");
    const uMouse = gl.getUniformLocation(prog, "uMouse");

    const mouseTarget = { x: 0.5, y: 0.5 };
    const mouseSmooth = { x: 0.5, y: 0.5 };

    const onMove = (e: PointerEvent) => {
      mouseTarget.x = e.clientX / window.innerWidth;
      mouseTarget.y = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    const t0 = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const frame = (now: number) => {
      resize();
      const t = (now - t0) / 1000;
      const v = viewRef.current;

      mouseSmooth.x += (mouseTarget.x - mouseSmooth.x) * 0.08;
      mouseSmooth.y += (mouseTarget.y - mouseSmooth.y) * 0.08;

      // Mercator-ish pan so flying the map drifts the cloud deck
      const panX = ((v.longitude + 180) / 360) * 24;
      const panY = ((90 - v.latitude) / 180) * 14;

      gl.uniform1f(uTime, t);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform2f(uPan, panX, panY);
      gl.uniform1f(uZoom, v.zoom);
      gl.uniform2f(uMouse, mouseSmooth.x, mouseSmooth.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="map-sky"
      aria-hidden
    />
  );
}
