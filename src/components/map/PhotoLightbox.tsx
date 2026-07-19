"use client";

import Link from "next/link";
import type { ApiPhoto } from "@/components/map/CableMap";
import { MetricBars } from "@/components/metrics/MetricBars";
import { displayPlaceLabel } from "@/lib/geo/place";

interface PhotoLightboxProps {
  photo: ApiPhoto;
  onClose: () => void;
  mapLink?: boolean;
}

export function PhotoLightbox({
  photo,
  onClose,
  mapLink = false,
}: PhotoLightboxProps) {
  const label = displayPlaceLabel(photo);

  return (
    <div className="lightbox lightbox--void" role="dialog" aria-modal onClick={onClose}>
      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lightbox-close" onClick={onClose}>
          Close
        </button>

        <figure className="lightbox-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url || photo.originalUrl || photo.thumbUrl}
            alt={label}
            onError={(e) => {
              const el = e.currentTarget;
              const fallback =
                photo.originalUrl && el.src !== photo.originalUrl
                  ? photo.originalUrl
                  : photo.thumbUrl;
              if (fallback && el.src !== fallback) el.src = fallback;
            }}
          />
        </figure>

        <div className="lightbox-below">
          <div className="lightbox-below-copy">
            <p className="lightbox-kicker">Location</p>
            <div className="lightbox-caption">
              <h2>{label}</h2>
              {photo.note && <p>{photo.note}</p>}
            </div>
            <div className="lightbox-actions">
              {mapLink ? (
                <Link href={`/map?photo=${photo.id}`}>View on map</Link>
              ) : (
                <Link href="/spine">See in spine</Link>
              )}
            </div>
          </div>

          <MetricBars
            cableDensity={photo.cableDensity}
            tangle={photo.tangle}
            skyRatio={photo.skyRatio}
          />
        </div>
      </div>
    </div>
  );
}
