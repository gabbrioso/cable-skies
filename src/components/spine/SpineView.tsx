"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { orderPhotosAlongRoute } from "@/lib/route/order";
import type { Photo } from "@/lib/types";
import type { PhotoWithUrls } from "@/components/spine/SpineScene";
import { PhotoLightbox } from "@/components/map/PhotoLightbox";
import { SiteNav } from "@/components/nav/SiteNav";

const SpineScene = dynamic(
  () =>
    import("@/components/spine/SpineScene").then((m) => m.SpineScene),
  {
    ssr: false,
    loading: () => (
      <div className="spine-loading">Wrapping the cable spine…</div>
    ),
  },
);

type ApiPhoto = Photo & {
  url: string;
  thumbUrl: string;
  originalUrl?: string;
};

export function SpineView() {
  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [selected, setSelected] = useState<PhotoWithUrls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data: { photos: ApiPhoto[] }) => setPhotos(data.photos ?? []))
      .catch(() => setError("Could not load photos for the spine."));
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? el.scrollTop / max : 0;
      setScrollProgress(Math.min(1, Math.max(0, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ordered = useMemo(() => {
    const base = orderPhotosAlongRoute(photos);
    return base.map((p) => {
      const api = photos.find((x) => x.id === p.id)!;
      return {
        ...p,
        url: api.url,
        thumbUrl: api.thumbUrl,
        originalUrl: api.originalUrl,
      };
    });
  }, [photos]);

  return (
    <main className="spine-page spine-page--immersive">
      <div className="spine-scroll-spacer" aria-hidden />

      <div className="spine-sticky-frame">
        <SiteNav variant="spine" />

        {error && <p className="error-banner spine-error">{error}</p>}

        {ordered.length === 0 && !error ? (
          <div className="spine-loading">
            No approved photos yet. Ingest your ride or upload from the map.
          </div>
        ) : (
          <SpineScene
            photos={ordered}
            scrollProgress={scrollProgress}
            onSelectPhoto={(p) => setSelected(p)}
          />
        )}
      </div>

      {selected && (
        <PhotoLightbox
          photo={selected}
          onClose={() => setSelected(null)}
          mapLink
        />
      )}
    </main>
  );
}
