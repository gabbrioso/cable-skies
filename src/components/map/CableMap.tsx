"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Map, {
  Marker,
  NavigationControl,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Photo } from "@/lib/types";
import { LINE_MAP_STYLE } from "@/lib/map/lineStyle";
import { MapSkyBackdrop } from "@/components/map/MapSkyBackdrop";
import { PhotoLightbox } from "@/components/map/PhotoLightbox";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { SiteNav } from "@/components/nav/SiteNav";
import { displayPlaceLabel } from "@/lib/geo/place";

export type ApiPhoto = Photo & {
  url: string;
  thumbUrl: string;
  ditherUrl?: string;
  originalUrl?: string;
};

interface CableMapProps {
  initialPhotoId?: string | null;
  openContribute?: boolean;
}

export function CableMap({
  initialPhotoId,
  openContribute = false,
}: CableMapProps) {
  const searchParams = useSearchParams();
  const contributeFromUrl = searchParams.get("contribute") === "1";
  const shouldOpenContribute = openContribute || contributeFromUrl;

  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [selected, setSelected] = useState<ApiPhoto | null>(null);
  const [uploadOpen, setUploadOpen] = useState(shouldOpenContribute);
  const [pinMode, setPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 121.0,
    latitude: 14.55,
    zoom: 12,
  });

  const loadPhotos = useCallback(async () => {
    const res = await fetch("/api/photos");
    const data = (await res.json()) as { photos: ApiPhoto[] };
    setPhotos(data.photos ?? []);
    return data.photos ?? [];
  }, []);

  useEffect(() => {
    if (shouldOpenContribute) setUploadOpen(true);
  }, [shouldOpenContribute]);

  useEffect(() => {
    loadPhotos().then((list) => {
      if (list.length === 0) return;
      const focus =
        (initialPhotoId && list.find((p) => p.id === initialPhotoId)) || null;

      if (focus) {
        setSelected(focus);
        setViewState((v) => ({
          ...v,
          longitude: focus.lng,
          latitude: focus.lat,
          zoom: 14,
        }));
        return;
      }

      const lats = list.map((p) => p.lat);
      const lngs = list.map((p) => p.lng);
      setViewState((v) => ({
        ...v,
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        zoom: 12.5,
      }));
    });
  }, [loadPhotos, initialPhotoId]);

  const onMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!pinMode) return;
      setPendingPin({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      setPinMode(false);
    },
    [pinMode],
  );

  const markerPhotos = useMemo(() => photos, [photos]);
  /** Below default (~12.5), markers become metric tiles */
  const zoomedOut = viewState.zoom < 11.25;

  return (
    <div className="map-shell map-shell--void">
      <MapSkyBackdrop
        longitude={viewState.longitude}
        latitude={viewState.latitude}
        zoom={viewState.zoom}
      />
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={onMapClick}
        mapStyle={LINE_MAP_STYLE}
        style={{ width: "100%", height: "100%", background: "transparent" }}
        canvasContextAttributes={{ alpha: true, antialias: true }}
        cursor={pinMode ? "crosshair" : undefined}
      >
        <NavigationControl position="bottom-right" />

        {markerPhotos.map((photo) => {
          const size = zoomedOut
            ? 10 + photo.cableDensity * 10
            : 44 + photo.cableDensity * 28;
          const label = displayPlaceLabel(photo);
          // High density + tangle + low open sky → near #000; inverse → near #FFF
          const clutter = Math.min(
            1,
            Math.max(
              0,
              photo.cableDensity * 0.4 +
                photo.tangle * 0.4 +
                (1 - photo.skyRatio) * 0.2,
            ),
          );
          const tileTone = Math.round(255 * (1 - clutter));
          const tileColor = `rgb(${tileTone}, ${tileTone}, ${tileTone})`;
          return (
            <Marker
              key={photo.id}
              longitude={photo.lng}
              latitude={photo.lat}
              anchor={zoomedOut ? "center" : "bottom"}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelected(photo);
              }}
            >
              <button
                type="button"
                className={`photo-marker-wrap${zoomedOut ? " photo-marker-wrap--tile" : ""}`}
                aria-label={`Open ${label}`}
                title={
                  zoomedOut
                    ? `${label} · density ${(photo.cableDensity * 100).toFixed(0)}% · tangle ${(photo.tangle * 100).toFixed(0)}% · open sky ${(photo.skyRatio * 100).toFixed(0)}%`
                    : undefined
                }
              >
                <span
                  className={`photo-marker${zoomedOut ? " photo-marker--metric-tile" : " photo-marker--bw"}`}
                  style={{
                    width: size,
                    height: size,
                    ...(zoomedOut ? { backgroundColor: tileColor } : null),
                  }}
                >
                  {!zoomedOut && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbUrl || photo.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                      <span className="photo-marker-ring" />
                    </>
                  )}
                </span>
                {!zoomedOut && (
                  <span className="photo-marker-label">{label}</span>
                )}
              </button>
            </Marker>
          );
        })}

        {pendingPin && (
          <Marker
            longitude={pendingPin.lng}
            latitude={pendingPin.lat}
            anchor="center"
          >
            <span className="pending-pin" />
          </Marker>
        )}
      </Map>

      <SiteNav variant="map" onContribute={() => setUploadOpen(true)} />

      {pinMode && (
        <div className="pin-banner">Click the map to place your photo</div>
      )}

      {selected && (
        <PhotoLightbox photo={selected} onClose={() => setSelected(null)} />
      )}

      {uploadOpen && (
        <UploadPanel
          pendingPin={pendingPin}
          pinMode={pinMode}
          onRequestPin={() => {
            setPinMode(true);
            setPendingPin(null);
          }}
          onClearPin={() => setPendingPin(null)}
          onCancelPin={() => {
            setPinMode(false);
            setPendingPin(null);
          }}
          onClose={() => {
            setUploadOpen(false);
            setPinMode(false);
          }}
          onUploaded={async (photo) => {
            await loadPhotos();
            setSelected(photo);
            setUploadOpen(false);
            setPinMode(false);
            setPendingPin(null);
            setViewState((v) => ({
              ...v,
              longitude: photo.lng,
              latitude: photo.lat,
              zoom: 14,
            }));
          }}
        />
      )}
    </div>
  );
}
