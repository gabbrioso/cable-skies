import Database from "better-sqlite3";
import fs from "fs";
import { nanoid } from "nanoid";
import { DATA_DIR, DB_PATH, THUMBS_DIR, UPLOADS_DIR } from "@/lib/paths";
import { SCHEMA_SQL } from "@/lib/db/schema";
import type { Photo, PhotoInput, PhotoStatus, RouteMeta } from "@/lib/types";

let db: Database.Database | null = null;

function ensureDirs() {
  for (const dir of [DATA_DIR, UPLOADS_DIR, THUMBS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function migrate(database: Database.Database) {
  const cols = database
    .prepare(`PRAGMA table_info(photos)`)
    .all() as { name: string }[];
  if (!cols.some((c) => c.name === "dither_path")) {
    database.exec(`ALTER TABLE photos ADD COLUMN dither_path TEXT`);
  }
}

export function getSqlite(): Database.Database {
  if (db) return db;
  ensureDirs();
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA_SQL);
  migrate(db);
  return db;
}

type PhotoRow = {
  id: string;
  lat: number;
  lng: number;
  taken_at: string | null;
  storage_path: string;
  thumb_path: string;
  dither_path: string | null;
  sky_ratio: number;
  cable_density: number;
  tangle: number;
  status: PhotoStatus;
  source: "seed" | "upload";
  note: string | null;
  place_name: string | null;
  created_at: string;
};

function rowToPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    takenAt: row.taken_at,
    storagePath: row.storage_path,
    thumbPath: row.thumb_path,
    ditherPath: row.dither_path ?? null,
    skyRatio: row.sky_ratio,
    cableDensity: row.cable_density,
    tangle: row.tangle,
    status: row.status,
    source: row.source,
    note: row.note,
    placeName: row.place_name,
    createdAt: row.created_at,
  };
}

export const sqliteDb = {
  listPhotos(status?: PhotoStatus | "all"): Photo[] {
    const database = getSqlite();
    if (!status || status === "approved") {
      const rows = database
        .prepare(
          `SELECT * FROM photos WHERE status = 'approved' ORDER BY taken_at ASC, created_at ASC`,
        )
        .all() as PhotoRow[];
      return rows.map(rowToPhoto);
    }
    if (status === "all") {
      const rows = database
        .prepare(`SELECT * FROM photos ORDER BY created_at DESC`)
        .all() as PhotoRow[];
      return rows.map(rowToPhoto);
    }
    const rows = database
      .prepare(
        `SELECT * FROM photos WHERE status = ? ORDER BY created_at DESC`,
      )
      .all(status) as PhotoRow[];
    return rows.map(rowToPhoto);
  },

  getPhoto(id: string): Photo | null {
    const row = getSqlite()
      .prepare(`SELECT * FROM photos WHERE id = ?`)
      .get(id) as PhotoRow | undefined;
    return row ? rowToPhoto(row) : null;
  },

  insertPhoto(input: PhotoInput): Photo {
    const id = input.id ?? nanoid();
    const createdAt = new Date().toISOString();
    const status = input.status ?? "approved";
    getSqlite()
      .prepare(
        `INSERT INTO photos (
          id, lat, lng, taken_at, storage_path, thumb_path, dither_path,
          sky_ratio, cable_density, tangle, status, source, note, place_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.lat,
        input.lng,
        input.takenAt ?? null,
        input.storagePath,
        input.thumbPath,
        input.ditherPath ?? null,
        input.skyRatio,
        input.cableDensity,
        input.tangle,
        status,
        input.source,
        input.note ?? null,
        input.placeName ?? null,
        createdAt,
      );
    return this.getPhoto(id)!;
  },

  upsertPhoto(input: PhotoInput & { id: string }): Photo {
    const existing = this.getPhoto(input.id);
    if (existing) {
      getSqlite()
        .prepare(
          `UPDATE photos SET
            lat = ?, lng = ?, taken_at = ?, storage_path = ?, thumb_path = ?, dither_path = ?,
            sky_ratio = ?, cable_density = ?, tangle = ?, status = ?, source = ?,
            note = ?, place_name = ?
          WHERE id = ?`,
        )
        .run(
          input.lat,
          input.lng,
          input.takenAt ?? null,
          input.storagePath,
          input.thumbPath,
          input.ditherPath ?? existing.ditherPath,
          input.skyRatio,
          input.cableDensity,
          input.tangle,
          input.status ?? existing.status,
          input.source,
          input.note ?? null,
          input.placeName ?? null,
          input.id,
        );
      return this.getPhoto(input.id)!;
    }
    return this.insertPhoto(input);
  },

  updateStatus(id: string, status: PhotoStatus): Photo | null {
    getSqlite()
      .prepare(`UPDATE photos SET status = ? WHERE id = ?`)
      .run(status, id);
    return this.getPhoto(id);
  },

  deletePhoto(id: string): boolean {
    const result = getSqlite()
      .prepare(`DELETE FROM photos WHERE id = ?`)
      .run(id);
    return result.changes > 0;
  },

  getRouteMeta(): RouteMeta | null {
    const row = getSqlite()
      .prepare(`SELECT * FROM route_meta WHERE id = 'default'`)
      .get() as
      | {
          id: string;
          work_lat: number;
          work_lng: number;
          home_lat: number;
          home_lng: number;
          updated_at: string;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      workLat: row.work_lat,
      workLng: row.work_lng,
      homeLat: row.home_lat,
      homeLng: row.home_lng,
      updatedAt: row.updated_at,
    };
  },

  setRouteMeta(meta: Omit<RouteMeta, "id" | "updatedAt">): RouteMeta {
    const updatedAt = new Date().toISOString();
    getSqlite()
      .prepare(
        `INSERT INTO route_meta (id, work_lat, work_lng, home_lat, home_lng, updated_at)
         VALUES ('default', ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           work_lat = excluded.work_lat,
           work_lng = excluded.work_lng,
           home_lat = excluded.home_lat,
           home_lng = excluded.home_lng,
           updated_at = excluded.updated_at`,
      )
      .run(meta.workLat, meta.workLng, meta.homeLat, meta.homeLng, updatedAt);
    return this.getRouteMeta()!;
  },
};
