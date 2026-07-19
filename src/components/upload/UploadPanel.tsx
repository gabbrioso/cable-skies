"use client";

import { useState } from "react";
import Link from "next/link";
import type { ApiPhoto } from "@/components/map/CableMap";
import { prepareUploadFile } from "@/lib/images/prepare-upload";

interface UploadPanelProps {
  pendingPin: { lat: number; lng: number } | null;
  pinMode?: boolean;
  onRequestPin: () => void;
  onClearPin: () => void;
  onCancelPin?: () => void;
  onClose: () => void;
  onUploaded: (photo: ApiPhoto) => void;
}

export function UploadPanel({
  pendingPin,
  pinMode = false,
  onRequestPin,
  onClearPin,
  onCancelPin,
  onClose,
  onUploaded,
}: UploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPin, setNeedsPin] = useState(false);
  const [archiveFull, setArchiveFull] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a photo first.");
      return;
    }

    setBusy(true);
    setError(null);
    setArchiveFull(false);

    try {
      const prepared = await prepareUploadFile(file);
      const body = new FormData();
      body.append("file", prepared.file);
      body.append("placeName", placeName.trim());
      body.append("note", note.trim());

      const lat = pendingPin?.lat ?? prepared.lat;
      const lng = pendingPin?.lng ?? prepared.lng;
      if (lat != null && lng != null) {
        body.append("lat", String(lat));
        body.append("lng", String(lng));
      }

      const res = await fetch("/api/photos", { method: "POST", body });
      let data: {
        error?: string;
        needsPin?: boolean;
        code?: string;
        photo?: ApiPhoto;
      } = {};
      try {
        data = await res.json();
      } catch {
        if (res.status === 413) {
          setError("Photo too large for the server. Try a smaller image.");
          return;
        }
        setError("Upload failed — please try again.");
        return;
      }

      if (res.status === 507 || data.code === "archive_full") {
        setArchiveFull(true);
        return;
      }

      if (data.code === "not_sky") {
        setError(
          data.error ||
            "This doesn’t look like a sky photo. Please upload a photo of the sky — with or without overhead cables.",
        );
        return;
      }

      if (res.status === 422 && data.needsPin) {
        setNeedsPin(true);
        setError(
          "This photo has no GPS. Tap “Drop pin on map”, place it, then submit again.",
        );
        return;
      }

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      if (!data.photo) {
        setError("Upload failed");
        return;
      }

      onUploaded(data.photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (archiveFull) {
    return (
      <div className="upload-panel upload-panel--void upload-panel--full" role="dialog">
        <button type="button" className="upload-close" onClick={onClose}>
          Close
        </button>
        <h2>The archive is full</h2>
        <p className="upload-lead">
          Thank you for participating in Cable Skies. The photo database has
          reached its limit for now.
        </p>
        <p className="upload-lead upload-lead--soft">
          This is a non-funded project, so storage has to stay modest — that is
          why limits like this exist. Your interest still means a lot.
        </p>
        <div className="upload-full-actions">
          <Link href="/spine" className="btn-mono" onClick={onClose}>
            View the cable spine
          </Link>
          <Link href="/map" className="btn-mono btn-mono-ghost" onClick={onClose}>
            Explore the map
          </Link>
        </div>
      </div>
    );
  }

  if (pinMode) {
    return (
      <div className="upload-panel upload-panel--void upload-panel--pinning" role="dialog">
        <p className="upload-pinning-msg">Tap the map to place your photo</p>
        <button
          type="button"
          className="btn-mono btn-mono-ghost"
          onClick={onCancelPin ?? onClearPin}
        >
          Cancel pin
        </button>
      </div>
    );
  }

  return (
    <div className="upload-panel upload-panel--void" role="dialog">
      <button type="button" className="upload-close" onClick={onClose}>
        Close
      </button>
      <h2>Contribute a sky</h2>
      <p className="upload-lead">
        Upload a sky photo — HEIC from iPhone is fine. We convert and resize on
        your device for a reliable upload. Leave place name blank to fill from
        GPS.
      </p>

      <form onSubmit={submit}>
        <label className="file-label">
          <span>{file ? file.name : "Choose or take a photo (HEIC OK)"}</span>
          <input
            type="file"
            accept="image/*,.heic,.heif,image/heic,image/heif"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
              setNeedsPin(false);
            }}
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
                Pin set at {pendingPin.lat.toFixed(5)},{" "}
                {pendingPin.lng.toFixed(5)}{" "}
                <button
                  type="button"
                  className="btn-mono btn-mono-ghost"
                  onClick={onClearPin}
                >
                  Clear
                </button>
              </p>
            ) : (
              <button
                type="button"
                className="btn-mono btn-mono-ghost"
                onClick={onRequestPin}
              >
                Drop pin on map
              </button>
            )}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-mono" disabled={busy}>
          {busy ? "Converting…" : "Upload"}
        </button>
      </form>
    </div>
  );
}
