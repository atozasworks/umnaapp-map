-- Scheduled auto-approval timestamp (createdAt + PLACE_AUTO_APPROVE_DAYS at insert time)
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "auto_approve_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Place_auto_approve_at_idx" ON "Place"("auto_approve_at");

-- Backfill pending places: auto-approve 10 days after createdAt
UPDATE "Place"
SET "auto_approve_at" = "createdAt" + INTERVAL '10 days'
WHERE "approval_status" = 'pending'
  AND "auto_approve_at" IS NULL
  AND "createdAt" IS NOT NULL;
