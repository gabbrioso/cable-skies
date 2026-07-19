import { createClient } from "@supabase/supabase-js";
import type { StorageAdapter } from "@/lib/storage/types";

/**
 * Production adapter for Supabase Storage.
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET.
 *
 * Important: pass a plain Uint8Array / Blob — Node Buffer can be stringified as
 * UTF-8 on Vercel and corrupt JPEGs (magic bytes become EF BF BD).
 */
function toUploadBlob(data: Buffer): Blob {
  // Fresh ArrayBuffer — Node Buffer can corrupt as UTF-8 on Vercel fetch
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(data);
  return new Blob([copy], { type: "image/jpeg" });
}

function isJpeg(data: Buffer): boolean {
  return data.length >= 2 && data[0] === 0xff && data[1] === 0xd8;
}

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

  async function putObject(storagePath: string, data: Buffer) {
    if (!isJpeg(data)) {
      throw new Error("Refusing to upload non-JPEG image bytes");
    }
    const { error } = await client.storage.from(bucket).upload(
      storagePath,
      toUploadBlob(data),
      {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "3600",
      },
    );
    if (error) throw error;
  }

  return {
    async saveUpload(filename: string, data: Buffer) {
      const storagePath = `uploads/${filename}`;
      await putObject(storagePath, data);
      return storagePath;
    },

    async saveThumb(filename: string, data: Buffer) {
      const storagePath = `thumbs/${filename}`;
      await putObject(storagePath, data);
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
