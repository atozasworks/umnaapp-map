/**
 * Adds User.last_login_at and backfills from Session.
 * Run from backend/:  node scripts/migrate-last-login-at.js
 */
import '../loadEnv.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.join(__dirname, '../prisma/add-last-login-at.sql')

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

  console.log('Applying last_login_at migration...')
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  const rows = await prisma.$queryRaw`
    SELECT
      EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'last_login_at'
      ) AS has_col,
      (SELECT COUNT(*)::int FROM "User" WHERE "last_login_at" IS NOT NULL) AS with_login
  `
  const ok = Boolean(rows[0]?.has_col)
  console.log(
    ok
      ? `✓ last_login_at ready (${rows[0]?.with_login ?? 0} users backfilled from Session).`
      : '✗ Migration incomplete.'
  )
  process.exit(ok ? 0 : 1)
}

main()
  .catch((err) => {
    console.error('Migration failed:', err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
