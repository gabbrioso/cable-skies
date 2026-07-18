import { createClient } from "@supabase/supabase-js";
import type { StorageAdapter } from "@/lib/storage/types";

/**
 * Production adapter for Supabase Storage.
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET.
 */
export function createSupabaseStorage(): StorageAdapter {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "photos";

  if (!url || !key) {
    throw new Error(
      "Supabase storage requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const client = createClient(url, key);

  return {
    async saveUpload(filename: string, data: Buffer) {
      const storagePath = `uploads/${filename}`;
      const { error } = await client.storage
        .from(bucket)
        .upload(storagePath, data, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (error) throw error;
      return storagePath;
    },

    async saveThumb(filename: string, data: Buffer) {
      const storagePath = `thumbs/${filename}`;
      const { error } = await client.storage
        .from(bucket)
        .upload(storagePath, data, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (error) throw error;
      return storagePath;
    },

    async read(storagePath: string) {
      const { data, error } = await client.storage
        .from(bucket)
        .download(storagePath);
      if (error || !data) return null;
      const ab = await data.arrayBuffer();
      return Buffer.from(ab);
    },

    async remove(storagePath: string) {
      await client.storage.from(bucket).remove([storagePath]);
    },

    publicUrl(storagePath: string) {
      return client.storage.from(bucket).getPublicUrl(storagePath).data
        .publicUrl;
    },
  };
}
