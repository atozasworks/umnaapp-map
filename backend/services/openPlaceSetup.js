/**
 * Creates the OpenPlace catalogue table and its indexes (prisma/add-open-places.sql).
 *
 * Every statement is "IF NOT EXISTS", so this is safe to run again. The server
 * calls it the first time the catalogue is needed, so a fresh deployment works
 * without a manual migration step; scripts/migrate-open-places.js runs the same code.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../config/database.js'

const SQL_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../prisma/add-open-places.sql')

/** @returns {Promise<{trigram: boolean}>} trigram is false when the pg_trgm extension is unavailable */
export async function applyOpenPlaceSchema() {
  const statements = fs
    .readFileSync(SQL_PATH, 'utf8')
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  // Optional: a trigram index makes "contains" name search fast. It needs the pg_trgm
  // extension, which some hosts only let a superuser create. Search works without it.
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "OpenPlace_name_trgm_idx" ON "OpenPlace" USING GIN (lower(name) gin_trgm_ops)'
    )
    return { trigram: true }
  } catch (err) {
    return { trigram: false, reason: err.message.split('\n')[0] }
  }
}
