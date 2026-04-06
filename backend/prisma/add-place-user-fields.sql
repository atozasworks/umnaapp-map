-- Add user name and email to Place table (saved when place is added)
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "user_name" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "user_email" TEXT;
