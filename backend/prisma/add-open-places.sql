-- Open-data place catalogue (Overture Maps, Foursquare OS Places, government CSVs).
-- Reference data only: rows are NOT shown on the map. The Place Extractor reads
-- from here and a user-selected subset is copied into "Place" for approval.
-- Plain lat/lng columns on purpose: works with or without the PostGIS extension.
-- Run from backend/:  npm run migrate:open-places

CREATE TABLE IF NOT EXISTS "OpenPlace" (
  id            TEXT PRIMARY KEY,
  source        TEXT NOT NULL,
  source_id     TEXT NOT NULL,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'Other',
  raw_category  TEXT,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  full_address  TEXT,
  locality      TEXT,
  region        TEXT,
  postcode      TEXT,
  country       TEXT,
  phone         TEXT,
  website       TEXT,
  confidence    REAL,
  dataset       TEXT,
  release       TEXT,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "OpenPlace_lat_lng_idx" ON "OpenPlace" (latitude, longitude);
CREATE INDEX IF NOT EXISTS "OpenPlace_source_idx" ON "OpenPlace" (source);
CREATE INDEX IF NOT EXISTS "OpenPlace_category_idx" ON "OpenPlace" (category);
CREATE INDEX IF NOT EXISTS "OpenPlace_name_lower_idx" ON "OpenPlace" (lower(name) text_pattern_ops);

-- Bookkeeping for the auto-add job (scripts/auto-add-open-places.js): what was decided for
-- each catalogue row, and which "Place" it became or matched.
ALTER TABLE "OpenPlace" ADD COLUMN IF NOT EXISTS place_id TEXT;
ALTER TABLE "OpenPlace" ADD COLUMN IF NOT EXISTS auto_status TEXT;
ALTER TABLE "OpenPlace" ADD COLUMN IF NOT EXISTS auto_note TEXT;
ALTER TABLE "OpenPlace" ADD COLUMN IF NOT EXISTS auto_checked_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "OpenPlace_auto_status_idx" ON "OpenPlace" (auto_status);
