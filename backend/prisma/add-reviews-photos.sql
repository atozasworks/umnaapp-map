-- Add PlaceReview table
CREATE TABLE IF NOT EXISTS "PlaceReview" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "placeId"    TEXT NOT NULL REFERENCES "Place"("id") ON DELETE CASCADE,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "user_name"  TEXT,
  "rating"     INTEGER NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
  "comment"    TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PlaceReview_placeId_userId_key" UNIQUE ("placeId", "userId")
);

CREATE INDEX IF NOT EXISTS "PlaceReview_placeId_idx" ON "PlaceReview"("placeId");
CREATE INDEX IF NOT EXISTS "PlaceReview_userId_idx"  ON "PlaceReview"("userId");

-- Add PlacePhoto table
CREATE TABLE IF NOT EXISTS "PlacePhoto" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "placeId"    TEXT NOT NULL REFERENCES "Place"("id") ON DELETE CASCADE,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "user_name"  TEXT,
  "dataUrl"    TEXT NOT NULL,
  "caption"    TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PlacePhoto_placeId_idx" ON "PlacePhoto"("placeId");
CREATE INDEX IF NOT EXISTS "PlacePhoto_userId_idx"  ON "PlacePhoto"("userId");

-- Add lat/lng index on Place for nearby queries
CREATE INDEX IF NOT EXISTS "Place_latitude_longitude_idx" ON "Place"("latitude", "longitude");
