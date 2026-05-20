-- Extra Google extraction fields (maps URL, vicinity, full types list)
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "google_types" JSONB;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "google_maps_url" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "vicinity" TEXT;
