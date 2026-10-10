-- Live GPS road contributions. GeoJSON is canonical; PostGIS geometry is
-- added when the server has the PostGIS extension available.

CREATE TABLE IF NOT EXISTS "Road" (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  road_type VARCHAR(40) NOT NULL,
  surface VARCHAR(40) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  speed_limit INTEGER,
  description TEXT NOT NULL DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  geom_geojson JSONB NOT NULL,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "Road_approval_status_idx" ON "Road" (approval_status);
CREATE INDEX IF NOT EXISTS "Road_user_id_idx" ON "Road" (user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN
    BEGIN
      EXECUTE 'CREATE EXTENSION IF NOT EXISTS postgis';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'PostGIS install permission unavailable; Road will use GeoJSON storage';
    END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    EXECUTE 'ALTER TABLE "Road" ADD COLUMN IF NOT EXISTS geom geometry(LineString, 4326)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Road_geom_gix" ON "Road" USING GIST (geom)';
  END IF;
END $$;
