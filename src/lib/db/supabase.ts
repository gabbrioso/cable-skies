import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import type { DbAdapter } from "@/lib/db";
import type { Photo, PhotoInput, PhotoStatus, RouteMeta } from "@/lib/types";

function rowToPhoto(row: Record<string, unknown>): Photo {
  return {
    id: String(row.id),
    lat: Number(row.lat),
    lng: Number(row.lng),
    takenAt: (row.taken_at as string | null) ?? null,
    storagePath: String(row.storage_path),
    thumbPath: String(row.thumb_path),
    ditherPath: (row.dither_path as string | null) ?? null,
    skyRatio: Number(row.sky_ratio),
    cableDensity: Number(row.cable_density),
    tangle: Number(row.tangle),
    status: row.status as PhotoStatus,
    source: row.source as "seed" | "upload",
    note: (row.note as string | null) ?? null,
    placeName: (row.place_name as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function photoToRow(input: PhotoInput & { id: string; createdAt?: string }) {
  return {
    id: input.id,
    lat: input.lat,
    lng: input.lng,
    taken_at: input.takenAt ?? null,
    storage_path: input.storagePath,
    thumb_path: input.thumbPath,
    dither_path: input.ditherPath ?? null,
    sky_ratio: input.skyRatio,
    cable_density: input.cableDensity,
    tangle: input.tangle,
    status: input.status ?? "approved",
    source: input.source,
    note: input.note ?? null,
    place_name: input.placeName ?? null,
    created_at: input.createdAt ?? new Date().toISOString(),
  };
}

export function createSupabaseDb(): DbAdapter {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase DB requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const client = createClient(url, key);

  return {
    async listPhotos(status = "approved") {
      if (status === "all") {
        const { data, error } = await client
          .from("photos")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []).map(rowToPhoto);
      }
      const { data, error } = await client
        .from("photos")
        .select("*")
        .eq("status", status)
        .order("taken_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToPhoto);
    },

    async getPhoto(id) {
      const { data, error } = await client
        .from("photos")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToPhoto(data) : null;
    },

    async insertPhoto(input) {
      const id = input.id ?? nanoid();
      const row = photoToRow({ ...input, id });
      const { data, error } = await client
        .from("photos")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return rowToPhoto(data!);
    },

    async upsertPhoto(input) {
      const existing = await this.getPhoto(input.id);
      const row = photoToRow({
        ...input,
        createdAt: existing?.createdAt,
      });
      const { data, error } = await client
        .from("photos")
        .upsert(row)
        .select()
        .single();
      if (error) throw error;
      return rowToPhoto(data!);
    },

    async updateStatus(id, status) {
      const { data, error } = await client
        .from("photos")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data ? rowToPhoto(data) : null;
    },

    async deletePhoto(id) {
      const { error } = await client.from("photos").delete().eq("id", id);
      return !error;
    },

    async getRouteMeta() {
      const { data, error } = await client
        .from("route_meta")
        .select("*")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: String(data.id),
        workLat: Number(data.work_lat),
        workLng: Number(data.work_lng),
        homeLat: Number(data.home_lat),
        homeLng: Number(data.home_lng),
        updatedAt: String(data.updated_at),
      } satisfies RouteMeta;
    },

    async setRouteMeta(meta) {
      const updatedAt = new Date().toISOString();
      const { data, error } = await client
        .from("route_meta")
        .upsert({
          id: "default",
          work_lat: meta.workLat,
          work_lng: meta.workLng,
          home_lat: meta.homeLat,
          home_lng: meta.homeLng,
          updated_at: updatedAt,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: String(data!.id),
        workLat: Number(data!.work_lat),
        workLng: Number(data!.work_lng),
        homeLat: Number(data!.home_lat),
        homeLng: Number(data!.home_lng),
        updatedAt: String(data!.updated_at),
      };
    },
  };
}
