-- Public API keys for Map, Places, and Directions.
-- Creates the table if missing, then adds any newer columns.
-- Safe to re-run. From backend/: npm run migrate:api-keys

CREATE TABLE IF NOT EXISTS "ApiKey" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key_prefix" TEXT NOT NULL,
  "key_hash" TEXT NOT NULL,
  "key_encrypted" TEXT,
  "plan" TEXT NOT NULL DEFAULT 'free',
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowed_origins" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TIMESTAMP(3),
  "rate_limit_per_min" INTEGER NOT NULL DEFAULT 120,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "key_prefix" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "key_hash" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "key_encrypted" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "allowed_origins" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "request_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP(3);
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "rate_limit_per_min" INTEGER NOT NULL DEFAULT 120;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3);

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
