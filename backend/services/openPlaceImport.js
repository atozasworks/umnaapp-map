/**
 * On-demand import of open place data (Overture) for one area, plus a record of
 * which areas have been imported ("OpenPlaceCoverage").
 *
 * Used by:
 *   - the Place Extractor, so a town nobody imported yet is downloaded the first
 *     time someone asks for it (ensureAreaImported)
 *   - the admin "Extract & add all" region job (importOvertureBbox)
 *
 * The download runs scripts/import-open-places.js as a child process so DuckDB
 * stays out of the server process. Only one download runs at a time.
 */
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../config/database.js'

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IMPORT_SCRIPT = path.join(BACKEND_DIR, 'scripts', 'import-open-places.js')
const IMPORT_TIMEOUT_MS = (parseInt(process.env.AUTO_ADD_IMPORT_TIMEOUT_MIN, 10) || 20) * 60 * 1000

/** Extra margin (degrees, ~2 km) downloaded around a requested area, so nearby requests are already covered. */
const AREA_PADDING_DEG = 0.02
/** A failed area is not retried for this long. */
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000
/** New areas one user may trigger per day (in memory; resets on restart). */
export const USER_AREA_IMPORTS_PER_DAY = parseInt(process.env.OPEN_PLACES_USER_IMPORTS_PER_DAY, 10) || 5

let coverageReady = null
export function ensureCoverageTable() {
  if (!coverageReady) {
    coverageReady = prisma
      .$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "OpenPlaceCoverage" (
           id BIGSERIAL PRIMARY KEY,
           source TEXT NOT NULL DEFAULT 'overture',
           min_lat DOUBLE PRECISION NOT NULL,
           max_lat DOUBLE PRECISION NOT NULL,
           min_lng DOUBLE PRECISION NOT NULL,
           max_lng DOUBLE PRECISION NOT NULL,
           place_count INTEGER,
           imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
         )`
      )
      .catch((err) => {
        coverageReady = null
        throw err
      })
  }
  return coverageReady
}

/** True when one earlier import contains the whole box. */
export async function isAreaCovered(bbox) {
  await ensureCoverageTable()
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM "OpenPlaceCoverage"
     WHERE min_lat <= $1 AND max_lat >= $2 AND min_lng <= $3 AND max_lng >= $4 LIMIT 1`,
    bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng
  )
  return rows.length > 0
}

export async function recordCoverage(bbox, placeCount = null) {
  await ensureCoverageTable()
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpenPlaceCoverage" (min_lat, max_lat, min_lng, max_lng, place_count) VALUES ($1, $2, $3, $4, $5)`,
    bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng, placeCount
  )
}

function runImportScript(bbox, onLine) {
  const { minLng, minLat, maxLng, maxLat } = bbox
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [IMPORT_SCRIPT, '--source', 'overture', '--bbox', `${minLng},${minLat},${maxLng},${maxLat}`],
      { cwd: BACKEND_DIR, env: process.env, windowsHide: true }
    )
    let tail = ''
    let imported = null
    const onData = (buf) => {
      const text = buf.toString()
      tail = (tail + text).slice(-2000)
      const m = text.match(/Imported (\d+) places/)
      if (m) imported = parseInt(m[1], 10)
      // Progress lines use "\r"; keep the last piece of each chunk (not the per-category table).
      const last = text.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean).pop()
      if (last && !/^\d+\s+\S/.test(last)) onLine?.(last)
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Downloading the open data took too long and was stopped.'))
    }, IMPORT_TIMEOUT_MS)
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) return resolve(imported ?? 0)
      const reason = (tail.match(/Import failed: (.+)/) || [])[1] || `import script exited with code ${code}`
      reject(new Error(reason.trim()))
    })
  })
}

/** Downloads wait for each other: two DuckDB processes at once would only slow both down. */
let queue = Promise.resolve()

/**
 * Download one area into the catalogue and remember that it is covered.
 * @returns {Promise<number>} places imported
 */
export function importOvertureBbox(bbox, onLine) {
  const run = queue.then(async () => {
    const count = await runImportScript(bbox, onLine)
    await recordCoverage(bbox, count)
    return count
  })
  queue = run.catch(() => {})
  return run
}

// ---- Place Extractor: make sure an area is in the catalogue ----------------

/** key → { status:'importing'|'failed', startedAt, error, promise } */
const areaJobs = new Map()
/** userId → { day:'YYYY-MM-DD', count } */
const userImports = new Map()

const today = () => new Date().toISOString().slice(0, 10)

function userQuotaLeft(userId) {
  const row = userImports.get(userId)
  if (!row || row.day !== today()) return USER_AREA_IMPORTS_PER_DAY
  return USER_AREA_IMPORTS_PER_DAY - row.count
}

function countUserImport(userId) {
  const row = userImports.get(userId)
  if (!row || row.day !== today()) userImports.set(userId, { day: today(), count: 1 })
  else row.count++
}

function padded(bbox) {
  // Snap outwards to a 0.01° grid so nearby requests share one download.
  const down = (v) => Math.floor((v - AREA_PADDING_DEG) * 100) / 100
  const up = (v) => Math.ceil((v + AREA_PADDING_DEG) * 100) / 100
  return { minLat: down(bbox.minLat), maxLat: up(bbox.maxLat), minLng: down(bbox.minLng), maxLng: up(bbox.maxLng) }
}

/**
 * Called repeatedly by the client until it answers "ready".
 * The first call for an area nobody imported starts the download in the background.
 * @returns {Promise<{status:'ready'|'importing'|'failed'|'limit', imported?:number, message?:string, seconds?:number}>}
 */
export async function ensureAreaImported(bbox, userId) {
  if (await isAreaCovered(bbox)) return { status: 'ready' }

  const area = padded(bbox)
  const key = `${area.minLat},${area.minLng},${area.maxLat},${area.maxLng}`
  const existing = areaJobs.get(key)
  if (existing?.status === 'importing') {
    return { status: 'importing', seconds: Math.round((Date.now() - existing.startedAt) / 1000) }
  }
  if (existing?.status === 'failed' && Date.now() - existing.failedAt < FAILURE_COOLDOWN_MS) {
    return { status: 'failed', message: existing.error }
  }
  if (userQuotaLeft(userId) <= 0) {
    return {
      status: 'limit',
      message: `You can open up ${USER_AREA_IMPORTS_PER_DAY} new areas per day. Try again tomorrow, or pick an area that is already loaded.`,
    }
  }

  countUserImport(userId)
  const job = { status: 'importing', startedAt: Date.now(), error: null, failedAt: 0 }
  areaJobs.set(key, job)
  importOvertureBbox(area)
    .then(() => areaJobs.delete(key))
    .catch((err) => {
      console.error('[open-places] on-demand import failed:', err.message)
      job.status = 'failed'
      job.error = err.message || 'Download failed'
      job.failedAt = Date.now()
    })
  return { status: 'importing', seconds: 0 }
}
