import { displayPlaceLabel } from "@/lib/geo/place";
import type { StorageAdapter } from "@/lib/storage/types";
import type { Photo } from "@/lib/types";

export function serializePhoto(photo: Photo, storage: StorageAdapter) {
  const ditherUrl = photo.ditherPath
    ? storage.publicUrl(photo.ditherPath)
    : storage.publicUrl(photo.thumbPath);

  const placeName = displayPlaceLabel(photo);

  return {
    ...photo,
    placeName,
    /** Color original (archive) */
    originalUrl: storage.publicUrl(photo.storagePath),
    /** Dithered full image — primary display */
    url: ditherUrl,
    /** Dithered thumb for map markers */
    thumbUrl: storage.publicUrl(photo.thumbPath),
    ditherUrl,
  };
}
