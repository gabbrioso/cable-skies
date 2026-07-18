export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  taken_at TEXT,
  storage_path TEXT NOT NULL,
  thumb_path TEXT NOT NULL,
  dither_path TEXT,
  sky_ratio REAL NOT NULL DEFAULT 0,
  cable_density REAL NOT NULL DEFAULT 0,
  tangle REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'approved',
  source TEXT NOT NULL DEFAULT 'upload',
  note TEXT,
  place_name TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);

CREATE TABLE IF NOT EXISTS route_meta (
  id TEXT PRIMARY KEY,
  work_lat REAL NOT NULL,
  work_lng REAL NOT NULL,
  home_lat REAL NOT NULL,
  home_lng REAL NOT NULL,
  updated_at TEXT NOT NULL
);
`;
