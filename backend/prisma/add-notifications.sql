-- Run when upgrading an existing database: psql $DATABASE_URL -f prisma/add-notifications.sql

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_user_id_read_idx" ON "Notification"("user_id", "read");
CREATE INDEX IF NOT EXISTS "Notification_user_id_created_at_idx" ON "Notification"("user_id", "created_at");

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_user_id_fkey";
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_user_id_idx" ON "PushSubscription"("user_id");

ALTER TABLE "PushSubscription" DROP CONSTRAINT IF EXISTS "PushSubscription_user_id_fkey";
ALTER TABLE "PushSubscription"
  ADD CONSTRAINT "PushSubscription_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
