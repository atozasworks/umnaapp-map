-- Extend the existing ApiKey table for Map, Places, and Directions.
-- Does not recreate the table or change current rows.
-- Run from backend/: npm run migrate:api-keys

ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "key_encrypted" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "request_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "rate_limit_per_min" INTEGER NOT NULL DEFAULT 120;

CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_key_hash_key" ON "ApiKey"("key_hash");
CREATE INDEX IF NOT EXISTS "ApiKey_user_id_created_at_idx" ON "ApiKey"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ApiKey_active_idx" ON "ApiKey"("active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ApiKey_user_id_fkey'
  ) THEN
    ALTER TABLE "ApiKey"
      ADD CONSTRAINT "ApiKey_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
