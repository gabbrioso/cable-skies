"use client";

import {
  useLayoutEffect,
  useRef,
  type SyntheticEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface EndOfCableTrackerProps {
  y: number;
  objectX: number;
  /** Drop below the cylinder foot so the tip clears the mesh */
  offsetY?: number;
  panelRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
}

/**
 * Pins the top-center of the panel to the bottom-center of the spine model,
 * clamped so it stays inside the viewport on any screen size.
 */
export function EndOfCableTracker({
  y,
  objectX,
  offsetY = 0.55,
  panelRef,
  visible,
}: EndOfCableTrackerProps) {
  const { camera, size } = useThree();
  const world = useRef(new THREE.Vector3());

  useFrame(() => {
    const el = panelRef.current;
    if (!el) return;

    world.current.set(objectX, y - offsetY, 0);
    world.current.project(camera);

    let sx = (world.current.x * 0.5 + 0.5) * size.width;
    let sy = (-world.current.y * 0.5 + 0.5) * size.height;
    const inFront = world.current.z < 1;

    // Mobile: center to viewport width (model sits off-center)
    const isMobile = size.width <= 720;
    if (isMobile) sx = size.width * 0.5;

    const root = getComputedStyle(document.documentElement);
    const safeTop = parseFloat(root.getPropertyValue("--safe-top")) || 0;
    const safeBottom = parseFloat(root.getPropertyValue("--safe-bottom")) || 0;
    const padX = Math.max(16, size.width * 0.04);
    const padTop = Math.max(88, size.height * 0.12, 72 + safeTop);
    const padBottom = Math.max(24, size.height * 0.05, 16 + safeBottom);
    const halfW = el.offsetWidth * 0.5;
    const h = el.offsetHeight;

    sx = Math.min(size.width - padX - halfW, Math.max(padX + halfW, sx));
    sy = Math.min(size.height - padBottom - h, Math.max(padTop, sy));

    el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, 0)`;
    const show = visible && inFront;
    el.style.opacity = show ? "1" : "0";
    // Keep hits enabled whenever the CTA is shown — don't let drag steal clicks
    el.style.pointerEvents = show ? "auto" : "none";
  });

  return null;
}

interface EndOfCablePanelProps {
  visible: boolean;
  panelRef: React.RefObject<HTMLDivElement | null>;
}

export function EndOfCablePanel({ visible, panelRef }: EndOfCablePanelProps) {
  const router = useRouter();

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
  }, [panelRef]);

  function goContribute(e: SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push("/map?contribute=1");
  }

  return (
    <div
      ref={panelRef}
      className={`spine-end-of-cable${visible ? " is-visible" : ""}`}
      aria-hidden={!visible}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="spine-end-title">
        <span>END OF</span>
        <span>CABLE</span>
      </h2>
      <div className="spine-end-cta">
        <p className="spine-end-copy">
          Upload an image of a Cable Sky to extend the Cable Spine
        </p>
        <a
          href="/map?contribute=1"
          className="spine-end-sky-btn"
          tabIndex={visible ? 0 : -1}
          onClick={goContribute}
          onPointerDown={(e) => e.stopPropagation()}
        >
          Add a Sky
        </a>
      </div>
    </div>
  );
}
