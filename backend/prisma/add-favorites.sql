-- Add Favorite table: personal bookmarks of locations (user x place/coords)
-- Unlike Place rows, deleting a Favorite never affects the underlying Place.
CREATE TABLE IF NOT EXISTS "Favorite" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "place_id"   TEXT REFERENCES "Place"("id") ON DELETE SET NULL,
  "name"       TEXT NOT NULL,
  "latitude"   DOUBLE PRECISION NOT NULL,
  "longitude"  DOUBLE PRECISION NOT NULL,
  "category"   TEXT,
  "address"    JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Favorite_user_id_idx"        ON "Favorite"("user_id");
CREATE INDEX IF NOT EXISTS "Favorite_place_id_idx"       ON "Favorite"("place_id");
CREATE INDEX IF NOT EXISTS "Favorite_user_lat_lng_idx"   ON "Favorite"("user_id", "latitude", "longitude");

-- Partial unique index: a user can favorite a given DB place at most once.
-- External favorites with NULL place_id can coexist (deduped in app by coords).
CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_user_place_uniq"
  ON "Favorite"("user_id", "place_id") WHERE "place_id" IS NOT NULL;
