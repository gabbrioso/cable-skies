"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;
  uniform vec2 uResolution;
  uniform vec2 uMouse; // 0–1 screen UV

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
      p *= 2.05;
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

  void main() {
    float pixel = 2.25;
    vec2 px = floor(vUv * uResolution / pixel) * pixel / uResolution;

    // Cursor parting — push sample coords outward from mouse
    vec2 toCursor = px - uMouse;
    // Correct for aspect so the clearing is circular
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 toAspect = toCursor * vec2(aspect, 1.0);
    float dist = length(toAspect);
    float radius = 0.28;
    float influence = smoothstep(radius, 0.0, dist);
    vec2 dir = dist > 0.0001 ? normalize(toAspect) : vec2(0.0);
    // Displace UV away from cursor (clouds move apart)
    vec2 parted = px + dir * influence * 0.22 * vec2(1.0 / aspect, 1.0);

    vec2 driftA = vec2(uScroll * 0.18 + uTime * 0.006, uScroll * 0.12);
    vec2 driftB = vec2(-uScroll * 0.1, uScroll * 0.22 + uTime * 0.004);
    vec2 driftC = vec2(uScroll * 0.08, -uScroll * 0.15 + 2.7);

    float n1 = fbm(parted * vec2(1.6, 2.0) + driftA);
    float n2 = fbm(parted * vec2(2.1, 1.5) + driftB + vec2(3.1, -1.4));
    float n3 = fbm(parted * vec2(1.2, 2.4) + driftC);

    float field = n1 * 0.42 + n2 * 0.33 + n3 * 0.35;
    float clouds = smoothstep(0.38, 0.72, field);
    clouds *= 0.72;

    // Also thin density near the cursor so a clear gap opens
    clouds *= 1.0 - influence * 0.95;

    float threshold = bayer4(gl_FragCoord.xy / pixel);
    float dithered = step(threshold, clouds);
    if (dithered < 0.5) discard;

    float gray = 0.19;
    gl_FragColor = vec4(vec3(gray), 1.0);
  }
`;

interface DitheredCloudsProps {
  scrollProgress: number;
}

export function DitheredClouds({ scrollProgress }: DitheredCloudsProps) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  const mouseTarget = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseSmooth = useRef(new THREE.Vector2(0.5, 0.5));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouseTarget.current.set(
        e.clientX / window.innerWidth,
        1 - e.clientY / window.innerHeight,
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ clock }) => {
    if (!mat.current || !mesh.current) return;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
    mat.current.uniforms.uScroll.value = scrollRef.current;
    mat.current.uniforms.uResolution.value.set(size.width, size.height);

    mouseSmooth.current.lerp(mouseTarget.current, 0.08);
    mat.current.uniforms.uMouse.value.copy(mouseSmooth.current);

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    mesh.current.position.copy(camera.position).addScaledVector(dir, 45);
    mesh.current.quaternion.copy(camera.quaternion);

    const dist = 45;
    const vFov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFov / 2) * dist;
    const width = height * ((camera as THREE.PerspectiveCamera).aspect || 1);
    mesh.current.scale.set(width * 1.15, height * 1.15, 1);
  });

  return (
    <mesh ref={mesh} renderOrder={-10} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent={false}
        depthWrite={false}
        depthTest
        fog={false}
      />
    </mesh>
  );
}
