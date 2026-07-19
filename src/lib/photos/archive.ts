/** Soft cap for the public archive (free-tier Supabase / non-funded project). */
export function getMaxPhotos(): number {
  const raw = process.env.MAX_PHOTOS;
  if (raw == null || raw === "") return 120;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 120;
}

export function isArchiveFullError(message: string | undefined | null): boolean {
  if (!message) return false;
  return /archive is full|storage.*quota|payload too large|exceeded.*limit|no space|disk full/i.test(
    message,
  );
}

export const ARCHIVE_FULL_CODE = "archive_full" as const;
