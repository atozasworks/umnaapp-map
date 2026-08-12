/**
 * Seed pre-approved admin Gmail addresses into AdminAllowedEmail.
 *
 * Usage:
 *   node scripts/seed-admin-allowed-emails.js
 *   npm run seed:admin-emails
 */
import '../loadEnv.js'
import prisma from '../config/database.js'
import { normalizeAdminGmail } from '../services/adminAllowlistService.js'

/** Default allowlist — always seeded (idempotent upsert). */
const SEED_ADMIN_GMAILS = ['geethajyothi2000@gmail.com']

async function main() {
  if (!prisma.adminAllowedEmail) {
    console.error(
      '❌ AdminAllowedEmail model unavailable. Run: npm run migrate:admin-otp && npx prisma generate'
    )
    process.exit(1)
  }

  const fromEnv = String(process.env.ADMIN_BOOTSTRAP_EMAILS || '')
    .split(/[,;\s]+/)
    .map((e) => normalizeAdminGmail(e))
    .filter(Boolean)

  const emails = [...new Set([...SEED_ADMIN_GMAILS.map(normalizeAdminGmail).filter(Boolean), ...fromEnv])]

  if (!emails.length) {
    console.error('❌ No valid Gmail addresses to seed')
    process.exit(1)
  }

  let upserted = 0
  for (const email of emails) {
    await prisma.adminAllowedEmail.upsert({
      where: { email },
      create: { email, createdBy: 'seed' },
      update: {},
    })
    upserted += 1
    console.log(`✓ allowed admin Gmail: ${email}`)
  }

  console.log(`✅ Seeded ${upserted} admin Gmail address(es)`)
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })
