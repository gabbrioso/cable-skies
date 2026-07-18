"use client";

import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import type { CityZone, ProfileSample } from "@/lib/spine/wires";

function zoneSamples(zone: CityZone, profile: ProfileSample[]) {
  return profile.filter(
    (s) => s.t >= zone.t0 - 1e-6 && s.t <= zone.t1 + 1e-6,
  );
}

function buildLathe(
  samples: ProfileSample[],
  radiusScale: number,
): THREE.LatheGeometry | null {
  if (samples.length < 2) return null;
  const pts = samples.map(
    (s) => new THREE.Vector2(Math.max(0.15, s.radius * radiusScale), s.y),
  );
  return new THREE.LatheGeometry(pts, 40);
}

/** True if the ray already hits any cable pick mesh — zone must yield */
function rayHitsCable(
  cablesRoot: THREE.Object3D | null | undefined,
  raycaster: THREE.Raycaster,
): boolean {
  if (!cablesRoot) return false;
  const hits: THREE.Intersection[] = [];
  cablesRoot.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    if (!obj.userData?.cablePick) return;
    obj.raycast(raycaster, hits);
  });
  return hits.length > 0;
}

interface ZoneBandProps {
  zone: CityZone;
  profile: ProfileSample[];
  active: boolean;
  /** Group containing cable pick meshes — zone yields to these */
  cablesRoot: RefObject<THREE.Group | null>;
  /** Hover only — never opens the photo modal */
  onZoneHover: (y: number | null) => void;
  /** Glow opacity when active (overview uses a brighter value) */
  glowOpacity?: number;
}

/**
 * Zone hover volume (not clickable) + subtle glow.
 * Never steals hits from cables — including those at the core.
 */
export function ZoneBand({
  zone,
  profile,
  active,
  cablesRoot,
  onZoneHover,
  glowOpacity = 0.039,
}: ZoneBandProps) {
  const { hitGeo, glowGeo } = useMemo(() => {
    const samples = zoneSamples(zone, profile);
    if (samples.length < 2) {
      return {
        hitGeo: null as THREE.LatheGeometry | null,
        glowGeo: null as THREE.LatheGeometry | null,
      };
    }
    return {
      hitGeo: buildLathe(samples, 1.08),
      glowGeo: buildLathe(samples, 1.1),
    };
  }, [zone, profile]);

  const zoneRaycast = useMemo(() => {
    return function zoneRaycast(
      this: THREE.Mesh,
      raycaster: THREE.Raycaster,
      intersects: THREE.Intersection[],
    ) {
      if (rayHitsCable(cablesRoot.current, raycaster)) return;
      THREE.Mesh.prototype.raycast.call(this, raycaster, intersects);
    };
  }, [cablesRoot]);

  useEffect(() => {
    return () => {
      hitGeo?.dispose();
      glowGeo?.dispose();
    };
  }, [hitGeo, glowGeo]);

  if (!hitGeo) return null;

  return (
    <group>
      <mesh
        geometry={hitGeo}
        raycast={zoneRaycast}
        onPointerMove={(e) => {
          e.stopPropagation();
          onZoneHover(e.point.y);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onZoneHover(e.point.y);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onZoneHover(null);
        }}
      >
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {active && glowGeo && (
        <mesh geometry={glowGeo} raycast={() => null}>
          <meshBasicMaterial
            color="#e8eef5"
            transparent
            opacity={glowOpacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
