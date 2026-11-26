/**
 * Creates the OpenPlace table (open-data place catalogue used by the Place Extractor).
 * Run from backend/:  node scripts/migrate-open-places.js
 */
import '../loadEnv.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.join(__dirname, '../prisma/add-open-places.sql')

const sql = fs.readFileSync(sqlPath, 'utf8')
const statements = sql
  .replace(/--[^\n]*/g, '')
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

async function main() {
  console.log('Applying OpenPlace table migration...')
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  // Optional: trigram index makes "contains" name search fast. Needs the pg_trgm
  // extension, which some hosts only allow a superuser to create — search still
  // works without it, just slower on large imports.
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "OpenPlace_name_trgm_idx" ON "OpenPlace" USING GIN (lower(name) gin_trgm_ops)'
    )
    console.log('✓ Trigram name index is ready.')
  } catch (err) {
    console.warn('! Trigram name index skipped (pg_trgm unavailable):', err.message.split('\n')[0])
  }

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
