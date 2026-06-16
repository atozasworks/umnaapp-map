-- Phase 6: public profile visibility toggle (privacy control).
-- Defaults to TRUE so existing users keep a public profile; they can opt out
-- from Settings. Used by GET /api/users/:id/public.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profile_public" BOOLEAN NOT NULL DEFAULT true;
