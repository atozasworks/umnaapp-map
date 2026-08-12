-- Admin OTP auth: allowlist + OTP challenges (idempotent)
CREATE TABLE IF NOT EXISTS "AdminAllowedEmail" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  CONSTRAINT "AdminAllowedEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminAllowedEmail_email_key" ON "AdminAllowedEmail"("email");
CREATE INDEX IF NOT EXISTS "AdminAllowedEmail_email_idx" ON "AdminAllowedEmail"("email");

CREATE TABLE IF NOT EXISTS "AdminOtp" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "otp_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminOtp_email_idx" ON "AdminOtp"("email");
CREATE INDEX IF NOT EXISTS "AdminOtp_expires_at_idx" ON "AdminOtp"("expires_at");
