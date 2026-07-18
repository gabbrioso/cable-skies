"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrderedPhoto } from "@/lib/route/order";
import {
  zoneAtY,
  type CityZone,
  type SpineGeometry,
} from "@/lib/spine/wires";
import { WireStrand } from "@/components/spine/WireStrand";
import { WireframeMatrix } from "@/components/spine/WireframeMatrix";
import { ZoneBand } from "@/components/spine/ZoneGlow";

interface SpineOverviewProps {
  geometry: SpineGeometry;
  photos: OrderedPhoto[];
}

function OverviewLights() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 12, 6]} intensity={1.65} color="#ffffff" />
      <directionalLight position={[-6, 4, -4]} intensity={0.75} color="#e0e4ea" />
      <directionalLight position={[2, -4, 8]} intensity={0.55} color="#d0d4da" />
    </>
  );
}

function OverviewModel({
  geometry,
  photos,
  hoveredZone,
  cablesRoot,
  onCableHover,
  onZoneHover,
}: {
  geometry: SpineGeometry;
  photos: OrderedPhoto[];
  hoveredZone: CityZone | null;
  cablesRoot: React.RefObject<THREE.Group | null>;
  onCableHover: (photoId: string | null, y: number | null) => void;
  onZoneHover: (y: number | null) => void;
}) {
  return (
    <group>
      <WireframeMatrix
        profile={geometry.profile}
        maxRadius={geometry.maxRadius}
        opacityScale={0.28}
      />
      <group ref={cablesRoot}>
        {geometry.ribbons.map((ribbon) => (
          <WireStrand
            key={ribbon.id}
            ribbon={ribbon}
            photos={photos}
            profile={geometry.profile}
            appearance="diagram"
            onHover={onCableHover}
            onClick={() => {}}
          />
        ))}
      </group>
      {geometry.zones.map((zone) => (
        <ZoneBand
          key={`${zone.city}-${zone.t0}`}
          zone={zone}
          profile={geometry.profile}
          cablesRoot={cablesRoot}
          active={
            hoveredZone != null &&
            hoveredZone.city === zone.city &&
            hoveredZone.t0 === zone.t0
          }
          onZoneHover={onZoneHover}
          glowOpacity={0.14}
        />
      ))}
    </group>
  );
}

export function SpineOverview({ geometry, photos }: SpineOverviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const cablesRef = useRef<THREE.Group>(null);
  const [hoveredZone, setHoveredZone] = useState<CityZone | null>(null);
  const overCable = useRef(false);
  const overZone = useRef(false);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const blockPageScroll = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener("wheel", blockPageScroll, { passive: false });
    return () => el.removeEventListener("wheel", blockPageScroll);
  }, []);

  const midY = (geometry.yMin + geometry.yMax) / 2;

  const onCableHover = (_id: string | null, y: number | null) => {
    overCable.current = y != null;
    if (y == null) {
      if (!overZone.current) setHoveredZone(null);
      return;
    }
    setHoveredZone(zoneAtY(geometry.profile, geometry.zones, y));
  };

  const onZoneHover = (y: number | null) => {
    overZone.current = y != null;
    if (y == null) {
      if (!overCable.current) setHoveredZone(null);
      return;
    }
    setHoveredZone(zoneAtY(geometry.profile, geometry.zones, y));
  };

  return (
    <div
      ref={frameRef}
      className="spine-overview"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      role="region"
      aria-label="Spine overview — drag to orbit, scroll to zoom"
    >
      <p className="spine-overview-label">Overview</p>
      {hoveredZone && (
        <p className="spine-overview-city" aria-live="polite">
          <span key={hoveredZone.city} className="spine-overview-city-text">
            {hoveredZone.city}
          </span>
        </p>
      )}
      <Canvas
        camera={{
          position: [10, midY * 0.15, 16],
          fov: 36,
          near: 0.1,
          far: 200,
        }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.35,
        }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none";
        }}
      >
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 50, 100]} />

        <Suspense fallback={null}>
          <OverviewLights />
          <OverviewModel
            geometry={geometry}
            photos={photos}
            hoveredZone={hoveredZone}
            cablesRoot={cablesRef}
            onCableHover={onCableHover}
            onZoneHover={onZoneHover}
          />
          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            zoomSpeed={0.85}
            rotateSpeed={0.7}
            panSpeed={0.6}
            minDistance={6}
            maxDistance={48}
            target={[0, midY * 0.05, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
