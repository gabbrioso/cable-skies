import path from "path";

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const THUMBS_DIR = path.join(DATA_DIR, "thumbs");
export const DB_PATH = path.join(DATA_DIR, "cable-skies.sqlite");
export const ASSETS_DIR = path.join(ROOT, "assets");
