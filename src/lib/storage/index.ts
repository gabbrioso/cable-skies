import { createLocalStorage } from "@/lib/storage/local";
import type { StorageAdapter } from "@/lib/storage/types";

export type { StorageAdapter } from "@/lib/storage/types";

export async function getStorage(): Promise<StorageAdapter> {
  if (process.env.STORAGE_BACKEND === "supabase") {
    const { createSupabaseStorage } = await import("@/lib/storage/supabase");
    return createSupabaseStorage();
  }
  return createLocalStorage();
}
