-- Run this manually if Prisma migration fails (e.g. PostGIS not enabled)
-- CREATE EXTENSION IF NOT EXISTS postgis;  -- Uncomment if needed for Location table
CREATE TABLE IF NOT EXISTS "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "zoomLevel" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Place_userId_idx" ON "Place"("userId");
CREATE INDEX IF NOT EXISTS "Place_category_idx" ON "Place"("category");
CREATE INDEX IF NOT EXISTS "Place_createdAt_idx" ON "Place"("createdAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Place_userId_fkey') THEN
    ALTER TABLE "Place" ADD CONSTRAINT "Place_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add Place translation columns (Add Place auto-translation feature)
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "place_name_en" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "place_name_local" TEXT;
UPDATE "Place" SET "place_name_en" = "name" WHERE "place_name_en" IS NULL AND "name" IS NOT NULL;
