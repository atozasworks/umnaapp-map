-- Daily "Add a Place" reminder emails.
-- Adds per-user unsubscribe preference + last-sent timestamp used to dedupe
-- sends to once per day. Safe to run multiple times.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "daily_reminder_opt_out" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "last_daily_reminder_at" TIMESTAMP(3);

-- Speeds up the daily candidate scan (opted-in users not yet mailed today).
CREATE INDEX IF NOT EXISTS "User_daily_reminder_idx"
  ON "User" ("daily_reminder_opt_out", "last_daily_reminder_at");
