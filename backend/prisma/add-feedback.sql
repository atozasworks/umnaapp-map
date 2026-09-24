-- Run when upgrading an existing database: psql $DATABASE_URL -f prisma/add-feedback.sql
-- Or: npm run migrate:feedback

CREATE TABLE IF NOT EXISTS "Feedback" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "user_name" TEXT,
  "user_email" TEXT NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "message" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'General',
  "rating" INTEGER,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Feedback_user_id_idx" ON "Feedback"("user_id");
CREATE INDEX IF NOT EXISTS "Feedback_created_at_idx" ON "Feedback"("created_at");

ALTER TABLE "Feedback" DROP CONSTRAINT IF EXISTS "Feedback_user_id_fkey";
ALTER TABLE "Feedback"
  ADD CONSTRAINT "Feedback_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
