-- Public provenance / audit trail for every place lifecycle event.
-- Run against PostgreSQL, or from backend: npx prisma db push
CREATE TABLE IF NOT EXISTS "PlaceAudit" (
  "id"         TEXT PRIMARY KEY,
  "place_id"   TEXT NOT NULL,
  "action"     TEXT NOT NULL,
  "actor_type" TEXT NOT NULL DEFAULT 'user',
  "actor_id"   TEXT,
  "actor_name" TEXT,
  "changes"    JSONB,
  "snapshot"   JSONB,
  "note"       TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PlaceAudit_place_id_created_at_idx" ON "PlaceAudit"("place_id", "created_at");
CREATE INDEX IF NOT EXISTS "PlaceAudit_action_idx" ON "PlaceAudit"("action");
CREATE INDEX IF NOT EXISTS "PlaceAudit_created_at_idx" ON "PlaceAudit"("created_at");
