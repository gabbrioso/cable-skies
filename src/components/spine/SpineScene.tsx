"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import type { OrderedPhoto } from "@/lib/route/order";
import {
  buildSpineGeometry,
  CABLE_COUNT,
  CABLE_COUNT_MIN,
  zoneAtY,
  type CityZone,
  type FlowRibbon,
  type ProfileSample,
} from "@/lib/spine/wires";
import { WireStrand } from "@/components/spine/WireStrand";
import { WireframeMatrix } from "@/components/spine/WireframeMatrix";
import { ZoneBand } from "@/components/spine/ZoneGlow";
import {
  EndOfCablePanel,
  EndOfCableTracker,
} from "@/components/spine/EndOfCable";
import { DitheredClouds } from "@/components/spine/DitheredClouds";
import { ScrollGraph } from "@/components/spine/ScrollGraph";
import { SpineOverview } from "@/components/spine/SpineOverview";
import { MetricBars } from "@/components/metrics/MetricBars";
import { displayPlaceLabel } from "@/lib/geo/place";

export interface PhotoWithUrls extends OrderedPhoto {
  url: string;
  thumbUrl: string;
  /** Color original — shown B&W in hover details (no dither) */
  originalUrl?: string;
}

interface SpineSceneProps {
  photos: PhotoWithUrls[];
  onSelectPhoto: (photo: PhotoWithUrls) => void;
  scrollProgress: number;
}

function SciencePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <aside
      className={`spine-info-panel${open ? " is-open" : ""}`}
      aria-hidden={!open}
      aria-label="Warp matrix info"
    >
      <div className="spine-info-panel-inner">
        <button
          type="button"
          className="spine-info-close btn-dither"
          onClick={onClose}
          aria-label="Close info"
        >
          Close
        </button>
        <p className="spine-science-kicker">
          City zones · {CABLE_COUNT_MIN}–{CABLE_COUNT} cables
        </p>
        <h2>Y · cities along route</h2>
        <p>
          A fixed set of continuous cables runs the full height. At each city
          band they bloom, knot, or open — never break.
        </p>
        <ul>
          <li>density → more lanes peel from the core</li>
          <li>tangle → twist &amp; knot amplitude</li>
          <li>open sky → wider spacing on the ring</li>
        </ul>
      </div>
    </aside>
  );
}

const AUTO_SPIN = 0.04;
const SCROLL_SPIN = 2.4;
/** Shift cable + matrix toward the right of the frame */
const OBJECT_X = 3.2;

function ScrollCamera({
  scrollProgress,
  yMin,
  yMax,
}: {
  scrollProgress: number;
  yMin: number;
  yMax: number;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const span = yMax - yMin || 1;
    const targetY = yMax - scrollProgress * span;
    // Snappier follow so end-of-cable projection stays locked while scrolling
    const ease = scrollProgress > 0.8 ? 0.18 : 0.08;
    const camY = THREE.MathUtils.lerp(camera.position.y, targetY, ease);
    const z = THREE.MathUtils.lerp(9.2, 11.0, scrollProgress);
    camera.position.set(-1.2, camY, z);
    camera.lookAt(OBJECT_X * 0.55, targetY, 0);
  });

  return null;
}

function FlowSpine({
  photos,
  ribbons,
  profile,
  zones,
  maxRadius,
  hoveredZone,
  setHoverId,
  setHoveredZone,
  onSelectPhoto,
  spinY,
}: {
  photos: PhotoWithUrls[];
  ribbons: FlowRibbon[];
  profile: ProfileSample[];
  zones: CityZone[];
  maxRadius: number;
  hoveredZone: CityZone | null;
  setHoverId: (id: string | null) => void;
  setHoveredZone: (zone: CityZone | null) => void;
  onSelectPhoto: (photo: PhotoWithUrls) => void;
  spinY: React.MutableRefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const cablesRef = useRef<THREE.Group>(null);
  const overCable = useRef(false);
  const overZone = useRef(false);
  const byId = useMemo(
    () => new Map(photos.map((p) => [p.id, p])),
    [photos],
  );

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y = spinY.current;
  });

  /** Cable hover drives photo details + zone */
  const onCableHover = (id: string | null, y: number | null) => {
    overCable.current = id != null;
    if (id == null || y == null) {
      setHoverId(null);
      if (!overZone.current) setHoveredZone(null);
      return;
    }
    setHoverId(id);
    setHoveredZone(zoneAtY(profile, zones, y));
  };

  /** Zone body hover — highlight only, never photo / modal */
  const onZoneHover = (y: number | null) => {
    overZone.current = y != null;
    if (y == null) {
      if (!overCable.current) {
        setHoveredZone(null);
        setHoverId(null);
      }
      return;
    }
    setHoveredZone(zoneAtY(profile, zones, y));
    if (!overCable.current) setHoverId(null);
  };

  return (
    <group position={[OBJECT_X, 0, 0]}>
      <group ref={group}>
        <WireframeMatrix profile={profile} maxRadius={maxRadius} />
        <group ref={cablesRef}>
          {ribbons.map((ribbon) => (
            <WireStrand
              key={ribbon.id}
              ribbon={ribbon}
              photos={photos}
              profile={profile}
              onHover={onCableHover}
              onClick={(id) => {
                const photo = byId.get(id);
                if (photo) onSelectPhoto(photo);
              }}
            />
          ))}
        </group>
        {zones.map((zone) => (
          <ZoneBand
            key={`${zone.city}-${zone.t0}`}
            zone={zone}
            profile={profile}
            cablesRoot={cablesRef}
            active={
              hoveredZone != null &&
              hoveredZone.city === zone.city &&
              hoveredZone.t0 === zone.t0
            }
            onZoneHover={onZoneHover}
          />
        ))}
      </group>
    </group>
  );
}

function AtelierLights() {
  return (
    <>
      <ambientLight intensity={0.03} />
      <directionalLight position={[8, 10, 6]} intensity={1.8} color="#ff4d9a" />
      <directionalLight position={[-10, 4, -4]} intensity={1.5} color="#3de0ff" />
      <directionalLight position={[2, -2, -12]} intensity={1.4} color="#ffc14d" />
      <pointLight position={[0, -6, 4]} intensity={1.1} color="#8b5cff" />
      <spotLight
        position={[0, 14, 2]}
        angle={0.5}
        penumbra={0.85}
        intensity={2.2}
        color="#ffffff"
        distance={45}
        decay={1.4}
      />

      <Environment resolution={256}>
        <color attach="background" args={["#000000"]} />
        <Lightformer
          form="rect"
          intensity={5}
          color="#ff4d9a"
          scale={[6, 2.5, 1]}
          position={[6, 7, 3]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={4.5}
          color="#3de0ff"
          scale={[5, 8, 1]}
          position={[-9, 2, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={3.8}
          color="#ffc14d"
          scale={[4, 6, 1]}
          position={[8, -1, -4]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={2.5}
          color="#8b5cff"
          scale={7}
          position={[0, 0, -11]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="circle"
          intensity={2}
          color="#ffffff"
          scale={2}
          position={[0, 10, 0]}
          target={[0, 0, 0]}
        />
      </Environment>
    </>
  );
}

function SpinController({
  spinY,
  dragging,
  scrollBoost,
}: {
  spinY: React.MutableRefObject<number>;
  dragging: React.MutableRefObject<boolean>;
  scrollBoost: React.MutableRefObject<number>;
}) {
  useFrame((_, delta) => {
    if (dragging.current) return;
    const boost = scrollBoost.current;
    spinY.current += delta * (AUTO_SPIN + boost * SCROLL_SPIN);
    scrollBoost.current = Math.max(0, boost - delta * 1.8);
  });
  return null;
}

export function SpineScene({
  photos,
  onSelectPhoto,
  scrollProgress,
}: SpineSceneProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<CityZone | null>(null);
  const [displayCity, setDisplayCity] = useState<string | null>(null);
  const [displayHoverId, setDisplayHoverId] = useState<string | null>(null);
  const endPanelRef = useRef<HTMLDivElement>(null);
  /** Only when the cylinder foot reads as a line at true scroll end */
  const endVisible = scrollProgress >= 0.975;
  const hovered = photos.find((p) => p.id === hoverId) ?? null;
  const displayHovered =
    photos.find((p) => p.id === displayHoverId) ?? null;
  const geometry = useMemo(() => buildSpineGeometry(photos), [photos]);

  const spinY = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const dragMode = useRef<"none" | "spin" | "scroll">("none");
  const scrollBoost = useRef(0);
  const prevScroll = useRef(scrollProgress);

  useEffect(() => {
    const delta = Math.abs(scrollProgress - prevScroll.current);
    if (delta > 0.0001) {
      scrollBoost.current = Math.min(1, scrollBoost.current + delta * 18);
    }
    prevScroll.current = scrollProgress;
  }, [scrollProgress]);

  /** Keep labels mounted briefly so exit motion can ease out */
  useEffect(() => {
    if (hoveredZone) {
      setDisplayCity(hoveredZone.city);
      return;
    }
    const t = window.setTimeout(() => setDisplayCity(null), 420);
    return () => window.clearTimeout(t);
  }, [hoveredZone]);

  useEffect(() => {
    if (hoverId) {
      setDisplayHoverId(hoverId);
      return;
    }
    const t = window.setTimeout(() => setDisplayHoverId(null), 420);
    return () => window.clearTimeout(t);
  }, [hoverId]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    dragMode.current = "none";
    lastX.current = e.clientX;
    lastY.current = e.clientY;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;

    if (dragMode.current === "none") {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      dragMode.current = Math.abs(dx) >= Math.abs(dy) ? "spin" : "scroll";
    }

    if (dragMode.current === "spin") {
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      spinY.current += dx * 0.006;
      return;
    }

    window.scrollBy(0, -dy * 0.65);
    lastX.current = e.clientX;
    lastY.current = e.clientY;
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    dragMode.current = "none";
  }, []);

  const onScrub = useCallback((progress: number) => {
    const el = document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    if (max > 0) {
      window.scrollTo({ top: progress * max, behavior: "auto" });
    }
  }, []);

  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
    <div
      className="spine-canvas spine-canvas--frame"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Canvas
        camera={{
          position: [-1.2, geometry.yMax, 9.2],
          fov: 34,
          near: 0.1,
          far: 200,
        }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 28, 70]} />

        <Suspense fallback={null}>
          <DitheredClouds scrollProgress={scrollProgress} />
          <AtelierLights />
          <ScrollCamera
            scrollProgress={scrollProgress}
            yMin={geometry.yMin}
            yMax={geometry.yMax}
          />
          <SpinController
            spinY={spinY}
            dragging={dragging}
            scrollBoost={scrollBoost}
          />
          <FlowSpine
            photos={photos}
            ribbons={geometry.ribbons}
            profile={geometry.profile}
            zones={geometry.zones}
            maxRadius={geometry.maxRadius}
            hoveredZone={hoveredZone}
            setHoverId={setHoverId}
            setHoveredZone={setHoveredZone}
            onSelectPhoto={onSelectPhoto}
            spinY={spinY}
          />
          <EndOfCableTracker
            y={geometry.yMin}
            objectX={OBJECT_X}
            panelRef={endPanelRef}
            visible={endVisible}
          />
        </Suspense>
      </Canvas>

      <SciencePanel open={infoOpen} onClose={() => setInfoOpen(false)} />

      <div
        className={`spine-side-stack${endVisible ? " is-end-hidden" : ""}`}
      >
        <div
          className={`spine-city-slot${hoveredZone ? " is-on" : ""}`}
          aria-hidden={!hoveredZone}
        >
          <div className="spine-city-slot-inner">
            {displayCity && (
              <h2 className="spine-city-heading">
                <span key={displayCity} className="spine-city-heading-text">
                  {displayCity}
                </span>
              </h2>
            )}
          </div>
        </div>
        <div
          className={`spine-hover-slot${hovered ? " is-on" : ""}`}
          aria-hidden={!hovered}
        >
          <div className="spine-hover-slot-inner">
            {displayHovered && (
              <div className="spine-hover-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    displayHovered.originalUrl ||
                    displayHovered.url ||
                    displayHovered.thumbUrl
                  }
                  alt={displayPlaceLabel(displayHovered)}
                />
                <div className="spine-hover-meta">
                  <div className="spine-hover-text">
                    <p className="spine-hover-place">
                      <span
                        key={displayHovered.id}
                        className="spine-hover-place-text"
                      >
                        {displayPlaceLabel(displayHovered)}
                      </span>
                    </p>
                    {displayHovered.note && (
                      <p className="spine-hover-note">
                        {displayHovered.note}
                      </p>
                    )}
                  </div>
                  <MetricBars
                    cableDensity={displayHovered.cableDensity}
                    tangle={displayHovered.tangle}
                    skyRatio={displayHovered.skyRatio}
                    compact
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <SpineOverview geometry={geometry} photos={photos} />
      </div>

      <div
        className={`scroll-graph-wrap${endVisible ? " is-end-hidden" : ""}`}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
      >
        <ScrollGraph
          profile={geometry.profile}
          scrollProgress={scrollProgress}
          maxRadius={geometry.maxRadius}
          onScrub={onScrub}
          infoOpen={infoOpen}
          onToggleInfo={() => setInfoOpen((v) => !v)}
        />
      </div>

      <div
        className={`spine-hint${endVisible ? " is-hidden" : ""}`}
      >
        Scroll to descend · Drag to spin
      </div>
    </div>

    {/* Outside drag-capture frame so Add a Sky can navigate to the map */}
    <EndOfCablePanel visible={endVisible} panelRef={endPanelRef} />
    </>
  );
}
