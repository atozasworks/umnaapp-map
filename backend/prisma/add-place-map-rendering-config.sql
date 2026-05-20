-- Advanced map rendering configuration (Google Maps–style) per place
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "map_rendering_config" JSONB;

CREATE INDEX IF NOT EXISTS "Place_map_rendering_config_gin_idx"
  ON "Place" USING GIN ("map_rendering_config");
