"use client";

import Link from "next/link";

export type SiteNavVariant = "map" | "spine";

interface SiteNavProps {
  variant: SiteNavVariant;
  /** Map page: opens upload panel */
  onContribute?: () => void;
}

const MAP_BLURB =
  "A living map of geotagged cable skies, where each marker reveals how much of the urban sky remains open or obstructed.";

const SPINE_BLURB =
  "A sculptural data object that transforms cable density and entanglement into a form you can scroll through, rotate, and feel.";

/**
 * Fixed top navigation — Figma 2:51 (map) / 2:52 (spine).
 * Circular buttons — Figma 2:49.
 */
export function SiteNav({ variant, onContribute }: SiteNavProps) {
  return (
    <header className="site-nav" data-variant={variant}>
      <div className="site-nav-header">
        <Link href="/" className="site-nav-logo">
          <span>CABLE</span>
          <span>SKIES</span>
        </Link>
        <p className="site-nav-blurb">
          {variant === "map" ? MAP_BLURB : SPINE_BLURB}
        </p>
      </div>

      <nav className="site-nav-actions" aria-label="Primary">
        {variant === "map" ? (
          <>
            <button
              type="button"
              className="btn-circle btn-circle--filled"
              onClick={onContribute}
            >
              <span className="btn-circle-label">Add a Sky</span>
            </button>
            <Link href="/spine" className="btn-circle btn-circle--ghost">
              <span className="btn-circle-label btn-circle-label--stack">
                <span>Enter the</span>
                <span>Cable Spine</span>
              </span>
            </Link>
          </>
        ) : (
          <Link href="/map" className="btn-circle btn-circle--ghost btn-circle--back">
            <span className="btn-circle-back-icon" aria-hidden>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M6.5 3.25V10.2917M4.33333 5.41667L6.5 3.25L8.66667 5.41667"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  transform="rotate(-90 6.5 6.5)"
                />
              </svg>
            </span>
            <span className="btn-circle-label btn-circle-label--stack">
              <span>Back to</span>
              <span>Map</span>
            </span>
          </Link>
        )}
      </nav>
    </header>
  );
}
