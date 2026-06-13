-- Festival / jatre overlay: time-bound markers shown only during their window.
-- festival_start_date / festival_end_date define the event window; festival_recurrence
-- is 'yearly' (recurs every year on the same month/day) or 'none' (one-off).
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "festival_start_date" TIMESTAMP(3);
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "festival_end_date" TIMESTAMP(3);
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "festival_recurrence" TEXT;
-- festival_notified_at records the occurrence start we last broadcast to all
-- users, so the "festival is happening" notification fires once per occurrence.
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "festival_notified_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Place_festival_start_date_idx" ON "Place"("festival_start_date");
