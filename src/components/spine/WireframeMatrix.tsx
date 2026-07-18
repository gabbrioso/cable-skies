"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import type { ProfileSample } from "@/lib/spine/wires";

interface WireframeMatrixProps {
  profile: ProfileSample[];
  maxRadius: number;
  /** Multiplier for line opacity (overview uses a lower value) */
  opacityScale?: number;
}

type Pts = [number, number, number][];

/**
 * 3D wireframe matrix attached to the cable cylinder.
 * Uses fat lines (Line2) so lineweight actually renders thicker.
 */
export function WireframeMatrix({
  profile,
  maxRadius,
  opacityScale = 1,
}: WireframeMatrixProps) {
  const { rings, meridians, axes } = useMemo(() => {
    const rings: Pts[] = [];
    const meridians: Pts[] = [];
    const axes: Pts[] = [];

    if (profile.length < 2) return { rings, meridians, axes };

    const ringStep = Math.max(1, Math.floor(profile.length / 18));
    const segs = 32;

    for (let i = 0; i < profile.length; i += ringStep) {
      const s = profile[i];
      const R = s.radius * 1.08;
      const pts: Pts = [];
      for (let k = 0; k <= segs; k++) {
        const a = (k / segs) * Math.PI * 2;
        pts.push([Math.cos(a) * R, s.y, Math.sin(a) * R]);
      }
      rings.push(pts);
    }

    const meridianCount = 8;
    for (let m = 0; m < meridianCount; m++) {
      const theta = (m / meridianCount) * Math.PI * 2;
      const pts: Pts = profile.map((s) => {
        const R = s.radius * 1.08;
        return [Math.cos(theta) * R, s.y, Math.sin(theta) * R];
      });
      meridians.push(pts);
    }

    const y0 = profile[0].y;
    const y1 = profile[profile.length - 1].y;
    axes.push([
      [0, y0, 0],
      [0, y1, 0],
    ]);

    const tickIdx = [
      0,
      Math.floor(profile.length * 0.33),
      Math.floor(profile.length * 0.66),
      profile.length - 1,
    ];
    for (const i of tickIdx) {
      const s = profile[i];
      const R = Math.max(s.radius, maxRadius * 0.35) * 1.15;
      axes.push([
        [-R, s.y, 0],
        [R, s.y, 0],
      ]);
      axes.push([
        [0, s.y, -R],
        [0, s.y, R],
      ]);
    }

    return { rings, meridians, axes };
  }, [profile, maxRadius]);

  return (
    <group>
      {rings.map((pts, i) => (
        <Line
          key={`ring-${i}`}
          points={pts}
          color="#d0d0d0"
          lineWidth={1.75}
          transparent
          opacity={0.42 * opacityScale}
          depthWrite={false}
        />
      ))}
      {meridians.map((pts, i) => (
        <Line
          key={`mer-${i}`}
          points={pts}
          color="#c8c8c8"
          lineWidth={1.55}
          transparent
          opacity={0.38 * opacityScale}
          depthWrite={false}
        />
      ))}
      {axes.map((pts, i) => (
        <Line
          key={`axis-${i}`}
          points={pts}
          color="#e0e0e0"
          lineWidth={2.1}
          transparent
          opacity={0.5 * opacityScale}
          depthWrite={false}
        />
      ))}
    </group>
  );
}
