/**
 * Creates the Favorite table (personal bookmarks).
 * Run from backend/:  node scripts/migrate-favorites.js
 */
import '../loadEnv.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.join(__dirname, '../prisma/add-favorites.sql')

const sql = fs.readFileSync(sqlPath, 'utf8')
// Strip line comments, then split on semicolons at end of statements only.
const withoutComments = sql.replace(/--[^\n]*/g, '')
const statements = withoutComments
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

async function main() {
  console.log('Applying Favorite table migration...')
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'Favorite'
    ) AS ok
  `
  const ok = rows[0]?.ok
  console.log(ok ? '✓ Favorite table is ready.' : '✗ Favorite table was not created.')
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
}).finally(() => prisma.$disconnect())
