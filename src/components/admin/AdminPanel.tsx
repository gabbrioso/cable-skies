"use client";

import { useCallback, useEffect, useState } from "react";
import type { Photo, PhotoStatus } from "@/lib/types";

type ApiPhoto = Photo & { url: string; thumbUrl: string };

export function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [filter, setFilter] = useState<PhotoStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/photos?status=${filter}`);
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setPhotos(data.photos ?? []);
  }, [filter]);

  useEffect(() => {
    // Probe existing admin cookie
    fetch("/api/photos?status=all")
      .then((r) => {
        if (r.ok) setAuthed(true);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Wrong password");
      return;
    }
    setAuthed(true);
  }

  async function setStatus(id: string, status: PhotoStatus) {
    await fetch(`/api/photos/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this photo permanently?")) return;
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    await load();
  }

  if (!authed) {
    return (
      <main className="admin-page">
        <h1>Admin</h1>
        <form onSubmit={login} className="admin-login">
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary">
            Enter
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <h1>Moderate skies</h1>
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            setAuthed(false);
          }}
        >
          Log out
        </button>
      </header>

      <div className="admin-filters">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={filter === s ? "active" : ""}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <ul className="admin-list">
        {photos.map((p) => (
          <li key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumbUrl} alt="" />
            <div>
              <p>
                <strong>{p.placeName || "No place"}</strong>
              </p>
              <p>
                {p.status} · {p.source} · dens {p.cableDensity.toFixed(2)}
              </p>
              <p className="muted">
                {p.note || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}
              </p>
              <div className="admin-actions">
                <button type="button" onClick={() => setStatus(p.id, "approved")}>
                  Approve
                </button>
                <button type="button" onClick={() => setStatus(p.id, "rejected")}>
                  Reject
                </button>
                <button type="button" onClick={() => setStatus(p.id, "pending")}>
                  Pending
                </button>
                <button type="button" onClick={() => remove(p.id)}>
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
