import { sqliteDb } from "@/lib/db/sqlite";
import type { Photo, PhotoInput, PhotoStatus, RouteMeta } from "@/lib/types";

export interface DbAdapter {
  listPhotos(status?: PhotoStatus | "all"): Promise<Photo[]>;
  getPhoto(id: string): Promise<Photo | null>;
  insertPhoto(input: PhotoInput): Promise<Photo>;
  upsertPhoto(input: PhotoInput & { id: string }): Promise<Photo>;
  updateStatus(id: string, status: PhotoStatus): Promise<Photo | null>;
  deletePhoto(id: string): Promise<boolean>;
  getRouteMeta(): Promise<RouteMeta | null>;
  setRouteMeta(meta: Omit<RouteMeta, "id" | "updatedAt">): Promise<RouteMeta>;
}

function localAdapter(): DbAdapter {
  return {
    listPhotos: async (status) => sqliteDb.listPhotos(status),
    getPhoto: async (id) => sqliteDb.getPhoto(id),
    insertPhoto: async (input) => sqliteDb.insertPhoto(input),
    upsertPhoto: async (input) => sqliteDb.upsertPhoto(input),
    updateStatus: async (id, status) => sqliteDb.updateStatus(id, status),
    deletePhoto: async (id) => sqliteDb.deletePhoto(id),
    getRouteMeta: async () => sqliteDb.getRouteMeta(),
    setRouteMeta: async (meta) => sqliteDb.setRouteMeta(meta),
  };
}

async function supabaseAdapter(): Promise<DbAdapter> {
  const { createSupabaseDb } = await import("@/lib/db/supabase");
  return createSupabaseDb();
}

export async function getDb(): Promise<DbAdapter> {
  if (process.env.STORAGE_BACKEND === "supabase") {
    return supabaseAdapter();
  }
  return localAdapter();
}
