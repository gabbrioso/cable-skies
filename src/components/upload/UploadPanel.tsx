"use client";

import { useState } from "react";
import type { ApiPhoto } from "@/components/map/CableMap";

interface UploadPanelProps {
  pendingPin: { lat: number; lng: number } | null;
  onRequestPin: () => void;
  onClearPin: () => void;
  onClose: () => void;
  onUploaded: (photo: ApiPhoto) => void;
}

export function UploadPanel({
  pendingPin,
  onRequestPin,
  onClearPin,
  onClose,
  onUploaded,
}: UploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPin, setNeedsPin] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a photo first.");
      return;
    }

    setBusy(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);
    // Place name is the primary label; server fills from GPS if left blank
    body.append("placeName", placeName.trim());
    body.append("note", note.trim());
    if (pendingPin) {
      body.append("lat", String(pendingPin.lat));
      body.append("lng", String(pendingPin.lng));
    }

    try {
      const res = await fetch("/api/photos", { method: "POST", body });
      const data = await res.json();

      if (res.status === 422 && data.needsPin) {
        setNeedsPin(true);
        setError("This photo has no GPS. Drop a pin on the map, then submit again.");
        setBusy(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Upload failed");
        setBusy(false);
        return;
      }

      onUploaded(data.photo as ApiPhoto);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload-panel upload-panel--void" role="dialog">
      <button type="button" className="upload-close" onClick={onClose}>
        Close
      </button>
      <h2>Contribute a sky</h2>
      <p className="upload-lead">
        Upload a photo of suspended cables. The place name becomes its label on
        the map — leave blank to fill from GPS.
      </p>

      <form onSubmit={submit}>
        <label className="file-label">
          <span>{file ? file.name : "Choose JPEG, PNG, WebP, or HEIC"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label>
          Place name
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="e.g. Pasig Rosario Sky — or leave blank for GPS"
          />
        </label>

        <label>
          Note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. Dense overhead weave — little unbroken sky remains."
          />
        </label>

        {(needsPin || pendingPin) && (
          <div className="pin-controls">
            {pendingPin ? (
              <p>
                Pin set at {pendingPin.lat.toFixed(5)}, {pendingPin.lng.toFixed(5)}{" "}
                <button type="button" className="btn-mono btn-mono-ghost" onClick={onClearPin}>
                  Clear
                </button>
              </p>
            ) : (
              <button type="button" className="btn-mono btn-mono-ghost" onClick={onRequestPin}>
                Drop pin on map
              </button>
            )}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-mono" disabled={busy}>
          {busy ? "Dithering…" : "Upload"}
        </button>
      </form>
    </div>
  );
}
