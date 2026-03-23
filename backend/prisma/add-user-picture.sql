-- Add picture column to User table for profile image
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "picture" TEXT;
