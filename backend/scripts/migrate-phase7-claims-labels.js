/**
 * Phase 7: Business claims + personal place labels.
 * Run from backend/:  node scripts/migrate-phase7-claims-labels.js
 */
import '../loadEnv.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.join(__dirname, '../prisma/add-phase7-claims-labels.sql')

function splitSqlStatements(sql) {
  const withoutComments = sql.replace(/--[^\n]*/g, '')
  const statements = []
  let current = ''
  let inDollarQuote = false

  for (let i = 0; i < withoutComments.length; i += 1) {
    const ch = withoutComments[i]
    if (ch === '$' && withoutComments[i + 1] === '$') {
      inDollarQuote = !inDollarQuote
      current += '$$'
      i += 1
      continue
    }
    if (ch === ';' && !inDollarQuote) {
      const trimmed = current.trim()
      if (trimmed) statements.push(trimmed)
      current = ''
      continue
    }
    current += ch
  }

  const tail = current.trim()
  if (tail) statements.push(tail)
  return statements
}

async function main() {
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const statements = splitSqlStatements(sql)

  console.log('Applying phase 7 claims + labels migration...')
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  const rows = await prisma.$queryRaw`
    SELECT
      EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Place' AND column_name = 'claimed_by_id'
      ) AS place_cols,
      EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'BusinessClaim'
      ) AS business_claim,
      EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'PlaceLabel'
      ) AS place_label
  `
  const { place_cols: placeCols, business_claim: businessClaim, place_label: placeLabel } = rows[0] || {}
  const ok = placeCols && businessClaim && placeLabel
  console.log(
    ok
      ? '✓ Phase 7 migration complete (Place.claimed_by_id, BusinessClaim, PlaceLabel).'
      : '✗ Migration incomplete.',
    { placeCols, businessClaim, placeLabel }
  )
  process.exit(ok ? 0 : 1)
}

main()
  .catch((err) => {
    console.error('Migration failed:', err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
