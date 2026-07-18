import exifr from "exifr";

export interface GpsMeta {
  lat: number | null;
  lng: number | null;
  takenAt: string | null;
}

export async function extractGps(buffer: Buffer): Promise<GpsMeta> {
  try {
    const [gps, data] = await Promise.all([
      exifr.gps(buffer),
      exifr.parse(buffer, {
        pick: ["DateTimeOriginal", "CreateDate"],
      }),
    ]);

    const lat =
      gps && typeof gps.latitude === "number" && Number.isFinite(gps.latitude)
        ? gps.latitude
        : null;
    const lng =
      gps && typeof gps.longitude === "number" && Number.isFinite(gps.longitude)
        ? gps.longitude
        : null;

    let takenAt: string | null = null;
    const rawDate = data?.DateTimeOriginal ?? data?.CreateDate;
    if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
      takenAt = rawDate.toISOString();
    } else if (typeof rawDate === "string") {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) takenAt = parsed.toISOString();
    }

    return { lat, lng, takenAt };
  } catch {
    return { lat: null, lng: null, takenAt: null };
  }
}
