"use client";

import { useEffect } from "react";
import type { ApiPhoto } from "@/components/map/CableMap";
import { displayPlaceLabel } from "@/lib/geo/place";

interface UploadSuccessModalProps {
  photo: ApiPhoto;
  onContinue: () => void;
}

const POETIC_LINES = [
  "Your sky has entered the weave — another breath held between the wires.",
  "A new patch of shared light finds its place among the cables.",
  "Thank you. The spine grows by one more thread of open air.",
  "What you saw above the street now rests in the archive of the commons.",
];

export function UploadSuccessModal({
  photo,
  onContinue,
}: UploadSuccessModalProps) {
  const label = displayPlaceLabel(photo);
  const line =
    POETIC_LINES[
      Math.abs(
        [...photo.id].reduce((h, ch) => h + ch.charCodeAt(0), 0),
      ) % POETIC_LINES.length
    ];
  const imageSrc =
    photo.originalUrl || photo.url || photo.thumbUrl || "";

  useEffect(() => {
    const t = window.setTimeout(onContinue, 5200);
    return () => window.clearTimeout(t);
  }, [onContinue]);

  return (
    <div
      className="upload-success"
      role="dialog"
      aria-modal
      aria-labelledby="upload-success-title"
    >
      <div className="upload-success-card">
        <p className="upload-success-kicker">Received</p>
        <h2 id="upload-success-title" className="upload-success-title">
          Your sky is home
        </h2>
        <figure className="upload-success-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt={label} />
        </figure>
        <p className="upload-success-place">{label}</p>
        <p className="upload-success-poem">{line}</p>
        <button type="button" className="btn-mono" onClick={onContinue}>
          View on the map
        </button>
      </div>
    </div>
  );
}
