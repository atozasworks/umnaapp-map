-- Track last successful app login per user (admin User list sorts by this).
-- Safe to run multiple times. Backfills from existing Session rows.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_last_login_at_idx"
  ON "User" ("last_login_at");

-- Backfill from the most recent Session per user (only where still null).
UPDATE "User" u
SET "last_login_at" = s.last_login
FROM (
  SELECT "userId", MAX("createdAt") AS last_login
  FROM "Session"
  GROUP BY "userId"
) s
WHERE u.id = s."userId"
  AND u."last_login_at" IS NULL;
