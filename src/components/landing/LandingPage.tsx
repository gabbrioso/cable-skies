"use client";

import Link from "next/link";
import { MapSkyBackdrop } from "@/components/map/MapSkyBackdrop";
import { useEffect, useState } from "react";

const LANDING_COPY =
  "Cable Skies is an interactive artwork that maps the electrical wires suspended above the city, turning overlooked infrastructure into a measure of how much sky remains shared. Through geotagged photographs, each location is scored for cable density, visual entanglement, and open sky, then translated into a living map and a three-dimensional cable spine. The denser the wires, the more the sky appears divided, occupied, and withdrawn from the public commons.";

/** Slow orbital drift so landing clouds keep moving without a map */
function useLandingView() {
  const [view, setView] = useState({
    longitude: 121.08,
    latitude: 14.58,
    zoom: 11.2,
  });

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      setView({
        longitude: 121.08 + Math.sin(t * 0.03) * 0.12,
        latitude: 14.58 + Math.cos(t * 0.022) * 0.06,
        zoom: 11.2 + Math.sin(t * 0.015) * 0.15,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return view;
}

/** Figma 1:4 / 2:19 — quatrefoil cloud outline Start button */
function CloudStartButton() {
  return (
    <Link href="/map" className="landing-cloud-start" aria-label="Start — open map">
      <svg
        className="landing-cloud-svg"
        viewBox="0 0 144 144"
        aria-hidden
        fill="none"
      >
        <path
          className="landing-cloud-path"
          d="M101.601 2C123.912 2 142 20.0876 142 42.3994C142 50.7046 139.496 58.4189 135.202 64.8359C132.338 69.1163 132.338 74.8837 135.202 79.1641C139.496 85.5811 142 93.2954 142 101.601C142 123.912 123.912 142 101.601 142C93.2954 142 85.5811 139.496 79.1641 135.202C74.8837 132.338 69.1163 132.338 64.8359 135.202C58.4189 139.496 50.7046 142 42.3994 142C20.0876 142 2 123.912 2 101.601C2.00008 93.2954 4.50395 85.5811 8.79785 79.1641C11.662 74.8837 11.662 69.1163 8.79785 64.8359C4.50395 58.4189 2.00008 50.7046 2 42.3994C2 20.0876 20.0876 2 42.3994 2C50.7046 2.00008 58.4189 4.50395 64.8359 8.79785C69.1163 11.662 74.8837 11.662 79.1641 8.79785C85.5811 4.50395 93.2954 2.00008 101.601 2Z"
          strokeWidth={4}
        />
      </svg>
      <span className="landing-cloud-label">Start</span>
    </Link>
  );
}

/**
 * Landing — Figma 1:7 (default) / 1:4 (hover).
 * Hover: CABLE ↑ / SKIES ↓ reveal cloud Start + project description.
 */
export function LandingPage() {
  const view = useLandingView();

  return (
    <main className="landing">
      <MapSkyBackdrop
        longitude={view.longitude}
        latitude={view.latitude}
        zoom={view.zoom}
      />

      <div className="landing-stage">
        <div className="landing-title-block">
          <h1 className="landing-title">
            <span className="landing-word landing-word--cable">CABLE</span>
            <span className="landing-mid">
              <CloudStartButton />
              <p className="landing-desc">{LANDING_COPY}</p>
            </span>
            <span className="landing-word landing-word--skies">SKIES</span>
          </h1>
          <a
            className="landing-credit"
            href="https://www.instagram.com/gabbriosostudio/"
            target="_blank"
            rel="noopener noreferrer"
          >
            by Gab Brioso Studio
          </a>
        </div>
      </div>
    </main>
  );
}
