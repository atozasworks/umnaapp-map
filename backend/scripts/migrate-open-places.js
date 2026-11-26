/**
 * Creates the OpenPlace table (open-data place catalogue used by the Place Extractor).
 * Run from backend/:  node scripts/migrate-open-places.js
 */
import '../loadEnv.js'
import prisma from '../config/database.js'
import { applyOpenPlaceSchema } from '../services/openPlaceSetup.js'

async function main() {
  console.log('Applying OpenPlace table migration...')
  const { trigram, reason } = await applyOpenPlaceSchema()
  if (trigram) console.log('✓ Trigram name index is ready.')
  else console.warn('! Trigram name index skipped (pg_trgm unavailable):', reason)

  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'OpenPlace'
    ) AS ok
  `
  const ok = rows[0]?.ok
  console.log(ok ? '✓ OpenPlace table is ready.' : '✗ OpenPlace table was not created.')
  process.exitCode = ok ? 0 : 1
}

main()
  .catch((err) => {
    console.error('Migration failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
