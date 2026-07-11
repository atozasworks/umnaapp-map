-- Secure, timed live-location sharing.
-- Stores only the latest point and a SHA-256 share-token hash.
-- Safe to re-run. Regenerate the Prisma client after applying.

CREATE TABLE IF NOT EXISTS "LiveLocationShare" (
  "id"               TEXT PRIMARY KEY,
  "owner_id"         TEXT NOT NULL,
  "token_hash"       TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'active',
  "duration_minutes" INTEGER NOT NULL,
  "expires_at"       TIMESTAMP(3) NOT NULL,
  "ended_at"         TIMESTAMP(3),
  "ended_reason"     TEXT,
  "last_latitude"    DOUBLE PRECISION,
  "last_longitude"   DOUBLE PRECISION,
  "last_accuracy"    DOUBLE PRECISION,
  "last_speed"       DOUBLE PRECISION,
  "last_heading"     DOUBLE PRECISION,
  "last_updated_at"  TIMESTAMP(3),
  "presence_status"  TEXT NOT NULL DEFAULT 'active',
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "LiveLocationViewer" (
  "id"              TEXT PRIMARY KEY,
  "share_id"        TEXT NOT NULL,
  "user_id"         TEXT NOT NULL,
  "first_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_viewed_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LiveLocationShare_owner_id_fkey'
  ) THEN
    ALTER TABLE "LiveLocationShare"
      ADD CONSTRAINT "LiveLocationShare_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LiveLocationViewer_share_id_fkey'
  ) THEN
    ALTER TABLE "LiveLocationViewer"
      ADD CONSTRAINT "LiveLocationViewer_share_id_fkey"
      FOREIGN KEY ("share_id") REFERENCES "LiveLocationShare"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LiveLocationViewer_user_id_fkey'
  ) THEN
    ALTER TABLE "LiveLocationViewer"
      ADD CONSTRAINT "LiveLocationViewer_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LiveLocationShare_status_check'
  ) THEN
    ALTER TABLE "LiveLocationShare"
      ADD CONSTRAINT "LiveLocationShare_status_check"
      CHECK ("status" IN ('active', 'stopped', 'expired'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LiveLocationShare_duration_minutes_check'
  ) THEN
    ALTER TABLE "LiveLocationShare"
      ADD CONSTRAINT "LiveLocationShare_duration_minutes_check"
      CHECK ("duration_minutes" IN (15, 60, 480, 1440));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LiveLocationShare_presence_status_check'
  ) THEN
    ALTER TABLE "LiveLocationShare"
      ADD CONSTRAINT "LiveLocationShare_presence_status_check"
      CHECK ("presence_status" IN ('active', 'paused'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "LiveLocationShare_token_hash_key"
  ON "LiveLocationShare"("token_hash");
CREATE INDEX IF NOT EXISTS "LiveLocationShare_owner_id_created_at_idx"
  ON "LiveLocationShare"("owner_id", "created_at");
CREATE INDEX IF NOT EXISTS "LiveLocationShare_status_expires_at_idx"
  ON "LiveLocationShare"("status", "expires_at");
CREATE INDEX IF NOT EXISTS "LiveLocationShare_updated_at_idx"
  ON "LiveLocationShare"("updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "LiveLocationViewer_share_id_user_id_key"
  ON "LiveLocationViewer"("share_id", "user_id");
CREATE INDEX IF NOT EXISTS "LiveLocationViewer_user_id_last_viewed_at_idx"
  ON "LiveLocationViewer"("user_id", "last_viewed_at");
CREATE INDEX IF NOT EXISTS "LiveLocationViewer_share_id_idx"
  ON "LiveLocationViewer"("share_id");
