export type PhotoStatus = "pending" | "approved" | "rejected";
export type PhotoSource = "seed" | "upload";

export interface Photo {
  id: string;
  lat: number;
  lng: number;
  takenAt: string | null;
  storagePath: string;
  thumbPath: string;
  ditherPath: string | null;
  skyRatio: number;
  cableDensity: number;
  tangle: number;
  status: PhotoStatus;
  source: PhotoSource;
  note: string | null;
  placeName: string | null;
  createdAt: string;
}

export interface PhotoInput {
  id?: string;
  lat: number;
  lng: number;
  takenAt?: string | null;
  storagePath: string;
  thumbPath: string;
  ditherPath?: string | null;
  skyRatio: number;
  cableDensity: number;
  tangle: number;
  status?: PhotoStatus;
  source: PhotoSource;
  note?: string | null;
  placeName?: string | null;
}

export interface DensityScore {
  skyRatio: number;
  cableDensity: number;
  tangle: number;
}

export interface RouteMeta {
  id: string;
  workLat: number;
  workLng: number;
  homeLat: number;
  homeLng: number;
  updatedAt: string;
}
