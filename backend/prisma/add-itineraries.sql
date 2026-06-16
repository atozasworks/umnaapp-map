-- Co-Edited Group Itineraries — collaborative trip planning.
-- Run against PostgreSQL, or from backend: npx prisma db push
-- After running, regenerate the client: npx prisma generate

CREATE TABLE IF NOT EXISTS "Itinerary" (
  "id"          TEXT PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "owner_id"    TEXT NOT NULL,
  "share_token" TEXT NOT NULL,
  "cover_emoji" TEXT,
  "start_date"  TIMESTAMP(3),
  "end_date"    TIMESTAMP(3),
  "auto_sort"   BOOLEAN NOT NULL DEFAULT false,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Itinerary_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Itinerary_share_token_key" ON "Itinerary"("share_token");
CREATE INDEX IF NOT EXISTS "Itinerary_owner_id_idx" ON "Itinerary"("owner_id");
CREATE INDEX IF NOT EXISTS "Itinerary_share_token_idx" ON "Itinerary"("share_token");
CREATE INDEX IF NOT EXISTS "Itinerary_updated_at_idx" ON "Itinerary"("updated_at");

CREATE TABLE IF NOT EXISTS "ItineraryMember" (
  "id"           TEXT PRIMARY KEY,
  "itinerary_id" TEXT NOT NULL,
  "user_id"      TEXT NOT NULL,
  "role"         TEXT NOT NULL DEFAULT 'editor',
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItineraryMember_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ItineraryMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItineraryMember_itinerary_id_user_id_key" ON "ItineraryMember"("itinerary_id", "user_id");
CREATE INDEX IF NOT EXISTS "ItineraryMember_user_id_idx" ON "ItineraryMember"("user_id");
CREATE INDEX IF NOT EXISTS "ItineraryMember_itinerary_id_idx" ON "ItineraryMember"("itinerary_id");

CREATE TABLE IF NOT EXISTS "ItineraryStop" (
  "id"            TEXT PRIMARY KEY,
  "itinerary_id"  TEXT NOT NULL,
  "place_id"      TEXT,
  "name"          TEXT NOT NULL,
  "category"      TEXT,
  "latitude"      DOUBLE PRECISION NOT NULL,
  "longitude"     DOUBLE PRECISION NOT NULL,
  "address"       TEXT,
  "notes"         TEXT,
  "position"      INTEGER NOT NULL DEFAULT 0,
  "day_index"     INTEGER,
  "added_by_id"   TEXT,
  "added_by_name" TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItineraryStop_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ItineraryStop_itinerary_id_position_idx" ON "ItineraryStop"("itinerary_id", "position");

CREATE TABLE IF NOT EXISTS "ItineraryComment" (
  "id"         TEXT PRIMARY KEY,
  "stop_id"    TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "user_name"  TEXT,
  "body"       TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItineraryComment_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "ItineraryStop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ItineraryComment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ItineraryComment_stop_id_created_at_idx" ON "ItineraryComment"("stop_id", "created_at");

CREATE TABLE IF NOT EXISTS "ItineraryVote" (
  "id"         TEXT PRIMARY KEY,
  "stop_id"    TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "value"      INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItineraryVote_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "ItineraryStop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ItineraryVote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItineraryVote_stop_id_user_id_key" ON "ItineraryVote"("stop_id", "user_id");
CREATE INDEX IF NOT EXISTS "ItineraryVote_stop_id_idx" ON "ItineraryVote"("stop_id");
