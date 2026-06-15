-- Phase 9: PostGIS spatial column + indexes for Place
-- Safe to run multiple times. Requires the PostGIS extension to be installable
-- (managed Postgres providers usually allow CREATE EXTENSION postgis).

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Geometry column (SRID 4326 / WGS84) on Place
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "geom" geometry(Point, 4326);

-- 3. Backfill from existing latitude/longitude
UPDATE "Place"
   SET "geom" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)
 WHERE "geom" IS NULL
   AND "longitude" IS NOT NULL
   AND "latitude" IS NOT NULL;

-- 4. Keep geom in sync with lat/lng on insert & update
CREATE OR REPLACE FUNCTION place_sync_geom() RETURNS trigger AS $$
BEGIN
  IF NEW."latitude" IS NOT NULL AND NEW."longitude" IS NOT NULL THEN
    NEW."geom" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326);
  ELSE
    NEW."geom" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS place_sync_geom_trg ON "Place";
CREATE TRIGGER place_sync_geom_trg
  BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "Place"
  FOR EACH ROW EXECUTE FUNCTION place_sync_geom();

-- 5. Spatial index (GiST) — powers ST_DWithin / ST_Contains
CREATE INDEX IF NOT EXISTS "Place_geom_gix" ON "Place" USING GIST ("geom");

-- 6. Composite btree indexes for common list / search filters
CREATE INDEX IF NOT EXISTS "Place_approval_status_category_idx" ON "Place" ("approval_status", "category");
CREATE INDEX IF NOT EXISTS "Place_approval_status_created_at_idx" ON "Place" ("approval_status", "createdAt");

-- 7. Trigram indexes to accelerate name ILIKE/contains searches
CREATE INDEX IF NOT EXISTS "Place_name_trgm_idx" ON "Place" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Place_name_en_trgm_idx" ON "Place" USING GIN ("place_name_en" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Place_name_local_trgm_idx" ON "Place" USING GIN ("place_name_local" gin_trgm_ops);

-- Optional sanity check:
--   SELECT id, ST_AsText(geom) FROM "Place" WHERE geom IS NOT NULL LIMIT 5;
