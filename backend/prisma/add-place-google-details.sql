-- Google Maps extraction details on Place
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "google_place_id" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "google_type" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "full_address" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "village" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "taluk" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "pincode" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "review_count" INTEGER;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "opening_hours" JSONB;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "business_status" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "google_reviews" JSONB;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "nearby_places" JSONB;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "google_photos" JSONB;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "extracted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Place_google_place_id_idx" ON "Place"("google_place_id");
CREATE INDEX IF NOT EXISTS "Place_extracted_at_idx" ON "Place"("extracted_at");

-- One Google place id per user (NULL google_place_id allowed for manual entries)
CREATE UNIQUE INDEX IF NOT EXISTS "Place_userId_google_place_id_key"
  ON "Place"("userId", "google_place_id")
  WHERE "google_place_id" IS NOT NULL;
