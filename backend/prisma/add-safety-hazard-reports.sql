-- Community road-safety / hazard reports for Safe Route Navigation.
-- Safe to re-run. Regenerate the Prisma client after applying.

CREATE TABLE IF NOT EXISTS "SafetyHazardReport" (
  "id"           TEXT PRIMARY KEY,
  "user_id"      TEXT NOT NULL,
  "type"         TEXT NOT NULL,
  "latitude"     DOUBLE PRECISION NOT NULL,
  "longitude"    DOUBLE PRECISION NOT NULL,
  "severity"     INTEGER NOT NULL DEFAULT 3,
  "description"  TEXT,
  "road_name"    TEXT,
  "status"       TEXT NOT NULL DEFAULT 'pending',
  "expires_at"   TIMESTAMP(3),
  "approved_at"  TIMESTAMP(3),
  "moderated_by" TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SafetyHazardReport_user_id_fkey'
  ) THEN
    ALTER TABLE "SafetyHazardReport"
      ADD CONSTRAINT "SafetyHazardReport_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SafetyHazardReport_status_check'
  ) THEN
    ALTER TABLE "SafetyHazardReport"
      ADD CONSTRAINT "SafetyHazardReport_status_check"
      CHECK ("status" IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SafetyHazardReport_severity_check'
  ) THEN
    ALTER TABLE "SafetyHazardReport"
      ADD CONSTRAINT "SafetyHazardReport_severity_check"
      CHECK ("severity" >= 1 AND "severity" <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SafetyHazardReport_type_check'
  ) THEN
    ALTER TABLE "SafetyHazardReport"
      ADD CONSTRAINT "SafetyHazardReport_type_check"
      CHECK ("type" IN (
        'unsafe_road',
        'poor_lighting',
        'flood',
        'accident',
        'road_block',
        'harassment',
        'construction',
        'heavy_traffic',
        'safe_road'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SafetyHazardReport_status_created_at_idx"
  ON "SafetyHazardReport"("status", "created_at");
CREATE INDEX IF NOT EXISTS "SafetyHazardReport_type_status_idx"
  ON "SafetyHazardReport"("type", "status");
CREATE INDEX IF NOT EXISTS "SafetyHazardReport_lat_lng_idx"
  ON "SafetyHazardReport"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "SafetyHazardReport_expires_at_idx"
  ON "SafetyHazardReport"("expires_at");
CREATE INDEX IF NOT EXISTS "SafetyHazardReport_user_id_idx"
  ON "SafetyHazardReport"("user_id");
