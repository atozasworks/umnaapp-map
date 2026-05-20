-- Location model (vehicle / user GPS points). Run if admin or Prisma reports "Location" table missing.
-- PostGIS is required for the "point" column (same as Prisma schema). If extension fails, create table
-- without "point", then run: npx prisma db push  (from backend/) to align columns.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS "Location" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "userId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "point" geometry(Point,4326),
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Location_vehicleId_idx" ON "Location"("vehicleId");
CREATE INDEX IF NOT EXISTS "Location_userId_idx" ON "Location"("userId");
CREATE INDEX IF NOT EXISTS "Location_timestamp_idx" ON "Location"("timestamp");
CREATE INDEX IF NOT EXISTS "Location_latitude_longitude_idx" ON "Location"("latitude", "longitude");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Location_vehicleId_fkey') THEN
    ALTER TABLE "Location" ADD CONSTRAINT "Location_vehicleId_fkey"
      FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Location_userId_fkey') THEN
    ALTER TABLE "Location" ADD CONSTRAINT "Location_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
