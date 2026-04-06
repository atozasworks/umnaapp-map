-- Add source column to Place (contribution = Add Place, saved = save from search)
-- Usage: psql $DATABASE_URL -f add-place-source-column.sql
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'contribution';
