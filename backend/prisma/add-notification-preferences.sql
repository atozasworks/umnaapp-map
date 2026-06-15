-- Phase 8: per-user notification category preferences
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id"             TEXT NOT NULL,
  "user_id"        TEXT NOT NULL,
  "push_enabled"   BOOLEAN NOT NULL DEFAULT true,
  "place_approved" BOOLEAN NOT NULL DEFAULT true,
  "place_added"    BOOLEAN NOT NULL DEFAULT true,
  "festival"       BOOLEAN NOT NULL DEFAULT true,
  "business_claim" BOOLEAN NOT NULL DEFAULT true,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_user_id_key" ON "NotificationPreference"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationPreference_user_id_fkey') THEN
    ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
