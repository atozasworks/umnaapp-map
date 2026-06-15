-- Phase 7: Business claims + personal place labels
-- Safe to run multiple times (IF NOT EXISTS guards).

-- 1. Place ownership stamp (set when an admin approves a claim)
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "claimed_by_id" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "claim_verified_at" TIMESTAMP(3);

-- 2. Business ownership claims
CREATE TABLE IF NOT EXISTS "BusinessClaim" (
  "id"             TEXT NOT NULL,
  "place_id"       TEXT NOT NULL,
  "user_id"        TEXT NOT NULL,
  "user_name"      TEXT,
  "contact_email"  TEXT,
  "contact_phone"  TEXT,
  "role"           TEXT NOT NULL DEFAULT 'owner',
  "message"        TEXT,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "review_note"    TEXT,
  "reviewed_by_id" TEXT,
  "reviewed_at"    TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessClaim_place_id_user_id_key" ON "BusinessClaim"("place_id", "user_id");
CREATE INDEX IF NOT EXISTS "BusinessClaim_place_id_idx" ON "BusinessClaim"("place_id");
CREATE INDEX IF NOT EXISTS "BusinessClaim_user_id_idx" ON "BusinessClaim"("user_id");
CREATE INDEX IF NOT EXISTS "BusinessClaim_status_idx" ON "BusinessClaim"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessClaim_place_id_fkey') THEN
    ALTER TABLE "BusinessClaim" ADD CONSTRAINT "BusinessClaim_place_id_fkey"
      FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessClaim_user_id_fkey') THEN
    ALTER TABLE "BusinessClaim" ADD CONSTRAINT "BusinessClaim_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Personal place labels
CREATE TABLE IF NOT EXISTS "PlaceLabel" (
  "id"         TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "place_id"   TEXT,
  "label"      TEXT NOT NULL,
  "latitude"   DOUBLE PRECISION,
  "longitude"  DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaceLabel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlaceLabel_user_id_place_id_key" ON "PlaceLabel"("user_id", "place_id");
CREATE INDEX IF NOT EXISTS "PlaceLabel_user_id_idx" ON "PlaceLabel"("user_id");
CREATE INDEX IF NOT EXISTS "PlaceLabel_place_id_idx" ON "PlaceLabel"("place_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlaceLabel_user_id_fkey') THEN
    ALTER TABLE "PlaceLabel" ADD CONSTRAINT "PlaceLabel_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlaceLabel_place_id_fkey') THEN
    ALTER TABLE "PlaceLabel" ADD CONSTRAINT "PlaceLabel_place_id_fkey"
      FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
