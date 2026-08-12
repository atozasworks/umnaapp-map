import '../loadEnv.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.join(__dirname, '../prisma/add-admin-otp-auth.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

// Strip full-line SQL comments, then split statements.
const withoutLineComments = sql
  .split(/\r?\n/)
  .filter((line) => !/^\s*--/.test(line))
  .join('\n')

const statements = withoutLineComments
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean)

for (const stmt of statements) {
  try {
    await prisma.$executeRawUnsafe(stmt)
    console.log('✓', stmt.slice(0, 72).replace(/\s+/g, ' '))
  } catch (e) {
    console.error('✗', e.message)
    process.exitCode = 1
  }
}

await prisma.$disconnect()
console.log('Done.')
