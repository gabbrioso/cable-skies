import fs from "fs/promises";
import path from "path";
import { THUMBS_DIR, UPLOADS_DIR } from "@/lib/paths";
import type { StorageAdapter } from "@/lib/storage/types";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function createLocalStorage(): StorageAdapter {
  return {
    async saveUpload(filename: string, data: Buffer): Promise<string> {
      await ensureDir(UPLOADS_DIR);
      const full = path.join(UPLOADS_DIR, filename);
      await fs.writeFile(full, data);
      return `uploads/${filename}`;
    },

    async saveThumb(filename: string, data: Buffer): Promise<string> {
      await ensureDir(THUMBS_DIR);
      const full = path.join(THUMBS_DIR, filename);
      await fs.writeFile(full, data);
      return `thumbs/${filename}`;
    },

    async read(storagePath: string): Promise<Buffer | null> {
      const full = path.join(
        process.cwd(),
        "data",
        storagePath.replace(/^\/+/, ""),
      );
      try {
        return await fs.readFile(full);
      } catch {
        return null;
      }
    },

    async remove(storagePath: string): Promise<void> {
      const full = path.join(
        process.cwd(),
        "data",
        storagePath.replace(/^\/+/, ""),
      );
      try {
        await fs.unlink(full);
      } catch {
        /* ignore missing */
      }
    },

    publicUrl(storagePath: string): string {
      return `/api/media/${storagePath}`;
    },
  };
}
