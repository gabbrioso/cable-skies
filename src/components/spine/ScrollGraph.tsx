"use client";

import type { ProfileSample } from "@/lib/spine/wires";

interface ScrollGraphProps {
  profile: ProfileSample[];
  scrollProgress: number;
  maxRadius: number;
  /** Called when user scrubs the graph (0–1) */
  onScrub?: (progress: number) => void;
  infoOpen?: boolean;
  onToggleInfo?: () => void;
}

/**
 * Wide vertical “scrollbar” with warp line-graphs inside.
 * Scrubbing moves the page / camera along the route.
 */
export function ScrollGraph({
  profile,
  scrollProgress,
  maxRadius,
  onScrub,
  infoOpen = false,
  onToggleInfo,
}: ScrollGraphProps) {
  if (profile.length < 2) return null;

  const W = 140;
  const H = 780;
  const padL = 18;
  const padR = 14;
  const padT = 28;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const step = Math.max(1, Math.floor(profile.length / 56));
  const samples = profile.filter(
    (_, i) => i % step === 0 || i === profile.length - 1,
  );

  const xOf = (norm: number) => padL + norm * plotW;
  const yOf = (t: number) => padT + t * plotH;

  const radiusPath = samples
    .map((s, i) => {
      const n = (s.radius / (maxRadius || 1)) * 0.92;
      return `${i === 0 ? "M" : "L"} ${xOf(n).toFixed(1)} ${yOf(s.t).toFixed(1)}`;
    })
    .join(" ");

  const shortPath = samples
    .map((s, i) => {
      const n = (1 - s.axialWeight) * 0.92;
      return `${i === 0 ? "M" : "L"} ${xOf(n).toFixed(1)} ${yOf(s.t).toFixed(1)}`;
    })
    .join(" ");

  const stiffPath = samples
    .map((s, i) => {
      const n = s.stiffness * 0.92;
      return `${i === 0 ? "M" : "L"} ${xOf(n).toFixed(1)} ${yOf(s.t).toFixed(1)}`;
    })
    .join(" ");

  const thumbY = yOf(scrollProgress);
  const thumbH = 36;

  function progressFromClientY(
    clientY: number,
    el: SVGSVGElement,
  ): number {
    const rect = el.getBoundingClientRect();
    const y = ((clientY - rect.top) / rect.height) * H;
    const t = (y - padT) / plotH;
    return Math.min(1, Math.max(0, t));
  }

  return (
    <aside className="scroll-graph" aria-label="Route scroll graph">
      <div className="scroll-graph-track">
        <svg
          className="scroll-graph-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(scrollProgress * 100)}
          aria-orientation="vertical"
          onPointerDown={(e) => {
            const svg = e.currentTarget;
            svg.setPointerCapture(e.pointerId);
            const p = progressFromClientY(e.clientY, svg);
            onScrub?.(p);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return;
            const p = progressFromClientY(e.clientY, e.currentTarget);
            onScrub?.(p);
          }}
        >
          {/* Track background */}
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            className="scroll-graph-bg"
          />

          {/* Grid */}
          {Array.from({ length: 5 }, (_, i) => {
            const x = padL + (i / 4) * plotW;
            return (
              <line
                key={`vx-${i}`}
                x1={x}
                y1={padT}
                x2={x}
                y2={padT + plotH}
                className="scroll-graph-grid"
              />
            );
          })}
          {Array.from({ length: 13 }, (_, i) => {
            const y = padT + (i / 12) * plotH;
            return (
              <line
                key={`hy-${i}`}
                x1={padL}
                y1={y}
                x2={padL + plotW}
                y2={y}
                className="scroll-graph-grid"
              />
            );
          })}

          {/* Axes */}
          <line
            x1={padL}
            y1={padT}
            x2={padL}
            y2={padT + plotH}
            className="scroll-graph-axis"
          />
          <line
            x1={padL}
            y1={padT + plotH}
            x2={padL + plotW}
            y2={padT + plotH}
            className="scroll-graph-axis"
          />

          <text x={padL} y={16} className="scroll-graph-label">
            top
          </text>
          <text x={padL} y={H - 10} className="scroll-graph-label">
            end
          </text>

          {/* Line graphs */}
          <path d={radiusPath} className="scroll-graph-curve scroll-graph-curve-a" />
          <path d={shortPath} className="scroll-graph-curve scroll-graph-curve-b" />
          <path d={stiffPath} className="scroll-graph-curve scroll-graph-curve-c" />

          {/* Scrollbar thumb */}
          <rect
            x={4}
            y={thumbY - thumbH / 2}
            width={W - 8}
            height={thumbH}
            rx={2}
            className="scroll-graph-thumb"
          />
          <line
            x1={padL}
            y1={thumbY}
            x2={padL + plotW}
            y2={thumbY}
            className="scroll-graph-cursor"
          />
        </svg>
      </div>

      <div className="scroll-graph-legend-row">
        <button
          type="button"
          className={`scroll-graph-info btn-dither${infoOpen ? " is-active" : ""}`}
          aria-label={infoOpen ? "Hide warp info" : "Show warp info"}
          aria-pressed={infoOpen}
          onClick={(e) => {
            e.stopPropagation();
            onToggleInfo?.();
          }}
        >
          i
        </button>
        <ul className="scroll-graph-legend">
          <li>
            <span className="sg-swatch sg-a" /> density
          </li>
          <li>
            <span className="sg-swatch sg-b" /> compress
          </li>
          <li>
            <span className="sg-swatch sg-c" /> tangle
          </li>
        </ul>
      </div>
    </aside>
  );
}
