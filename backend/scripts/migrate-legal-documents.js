/**
 * Legal documents: editable Privacy Policy & Terms.
 * Run from backend/:  node scripts/migrate-legal-documents.js
 */
import '../loadEnv.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.join(__dirname, '../prisma/add-legal-documents.sql')

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

  console.log('Applying legal documents migration...')
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'LegalDocument'
    ) AS legal_document
  `
  const ok = rows[0]?.legal_document
  console.log(ok ? '✓ Legal documents migration complete (LegalDocument).' : '✗ Migration incomplete.')
  process.exit(ok ? 0 : 1)
}

main()
  .catch((err) => {
    console.error('Migration failed:', err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
