-- Add Place translation columns (run this on production if place_name_en is missing)
-- Usage: psql $DATABASE_URL -f add-place-translation-columns.sql
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "place_name_en" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "place_name_local" TEXT;
UPDATE "Place" SET "place_name_en" = "name" WHERE "place_name_en" IS NULL AND "name" IS NOT NULL;
