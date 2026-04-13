-- Place approval workflow: pending contributions → approved after N days (see PLACE_AUTO_APPROVE_DAYS) or admin action
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "approval_status" TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);
UPDATE "Place" SET "approval_status" = 'approved' WHERE "approval_status" IS NULL OR TRIM("approval_status") = '';
CREATE INDEX IF NOT EXISTS "Place_approval_status_idx" ON "Place"("approval_status");
