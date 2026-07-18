"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import type { FlowRibbon, ProfileSample } from "@/lib/spine/wires";
import { photoIdAtY } from "@/lib/spine/wires";
import type { OrderedPhoto } from "@/lib/route/order";

export type WireAppearance = "atelier" | "diagram";

interface WireStrandProps {
  ribbon: FlowRibbon;
  photos: OrderedPhoto[];
  profile: ProfileSample[];
  onHover: (photoId: string | null, y: number | null) => void;
  onClick: (photoId: string) => void;
  /** atelier = glossy black (main); diagram = brighter gray (overview) */
  appearance?: WireAppearance;
}

export function WireStrand({
  ribbon,
  photos,
  profile,
  onHover,
  onClick,
  appearance = "atelier",
}: WireStrandProps) {
  const [hovered, setHovered] = useState(false);

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(ribbon.points, false, "catmullrom", 0.45),
    [ribbon.points],
  );

  const idAt = (y: number) => photoIdAtY(photos, profile, y);
  const diagram = appearance === "diagram";
  const radius = ribbon.radius * (hovered ? 1.35 : 1);
  /** Slight pad for picking without outer strands swallowing the core */
  const pickRadius = ribbon.radius * 1.35 + 0.028;
  const tubular = diagram ? 100 : 140;
  const radial = diagram ? 6 : 8;

  return (
    <group>
      {/* Generous invisible pick mesh — keeps core cables selectable */}
      <mesh
        userData={{ cablePick: true }}
        onPointerMove={(e) => {
          e.stopPropagation();
          onHover(idAt(e.point.y), e.point.y);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(idAt(e.point.y), e.point.y);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null, null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(idAt(e.point.y));
        }}
      >
        <tubeGeometry args={[curve, tubular, pickRadius, radial, false]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <mesh castShadow={!diagram} raycast={() => null}>
        <tubeGeometry args={[curve, tubular, radius, radial, false]} />
        {diagram ? (
          <meshStandardMaterial
            color={hovered ? "#d8dee6" : "#b8c0c9"}
            metalness={0.22}
            roughness={0.4}
            emissive={hovered ? "#a8b2be" : "#7a8490"}
            emissiveIntensity={hovered ? 0.55 : 0.32}
          />
        ) : (
          <meshPhysicalMaterial
            color={hovered ? "#141414" : "#070707"}
            metalness={0.92}
            roughness={0.18}
            clearcoat={0.85}
            clearcoatRoughness={0.12}
            envMapIntensity={hovered ? 1.6 : 1.25}
            ior={1.45}
          />
        )}
      </mesh>

      {hovered && (
        <>
          <mesh raycast={() => null}>
            <tubeGeometry
              args={[curve, tubular, radius * 1.55, radial, false]}
            />
            <meshBasicMaterial
              color={diagram ? "#f0f4f8" : "#dce6f2"}
              transparent
              opacity={0.55}
              depthWrite={false}
              side={THREE.BackSide}
            />
          </mesh>
          <mesh raycast={() => null}>
            <tubeGeometry
              args={[curve, tubular, radius * 1.95, radial, false]}
            />
            <meshBasicMaterial
              color={diagram ? "#c8d4e0" : "#9eb6d4"}
              transparent
              opacity={0.22}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.BackSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
