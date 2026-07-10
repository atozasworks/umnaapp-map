-- Editable legal documents (Privacy Policy, Terms & Conditions).
-- One row per document type ('privacy' | 'terms'). Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "LegalDocument" (
  "id"         TEXT NOT NULL,
  "type"       TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "content"    TEXT NOT NULL,
  "version"    INTEGER NOT NULL DEFAULT 1,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegalDocument_type_key" ON "LegalDocument"("type");
CREATE INDEX IF NOT EXISTS "LegalDocument_type_idx" ON "LegalDocument"("type");
