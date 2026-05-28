-- Track last grid-based place extraction (one per user per UTC day)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "last_grid_extract_at" TIMESTAMP(3);
