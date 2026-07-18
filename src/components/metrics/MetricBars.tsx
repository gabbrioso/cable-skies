"use client";

interface MetricBarsProps {
  cableDensity: number;
  tangle: number;
  skyRatio: number;
  compact?: boolean;
}

/** Monochrome Anadol / spine-aligned metric readout */
const METRICS = [
  {
    key: "density",
    label: "Density",
    hint: "How much wire fills the frame",
    weight: 0.9,
    get: (p: MetricBarsProps) => p.cableDensity,
  },
  {
    key: "tangle",
    label: "Tangle",
    hint: "How knotted and crossed the lines feel",
    weight: 0.55,
    get: (p: MetricBarsProps) => p.tangle,
  },
  {
    key: "sky",
    label: "Open sky",
    hint: "How much unbroken sky remains",
    weight: 0.35,
    get: (p: MetricBarsProps) => p.skyRatio,
  },
] as const;

export function MetricBars({
  cableDensity,
  tangle,
  skyRatio,
  compact = false,
}: MetricBarsProps) {
  const values = { cableDensity, tangle, skyRatio };

  return (
    <div
      className={`metric-bars metric-bars--mono${compact ? " metric-bars--compact" : ""}`}
    >
      {METRICS.map((m) => {
        const value = m.get(values);
        const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
        return (
          <div key={m.key} className="metric-row">
            <div className="metric-row-head">
              <span className="metric-label">{m.label}</span>
              <span className="metric-value">{pct}%</span>
            </div>
            {!compact && <p className="metric-hint">{m.hint}</p>}
            <div className="metric-track" aria-hidden>
              <div
                className="metric-fill"
                style={{
                  width: `${pct}%`,
                  opacity: m.weight,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
