import pg from 'pg'

const { Pool } = pg

let pool = null
let _available = null

/** Whether UMNAAPP_OSM_DATABASE_URL is set. */
export function osmDatabaseConfigured() {
  return Boolean((process.env.UMNAAPP_OSM_DATABASE_URL || '').trim())
}

/** Read-only connection pool to umnaappdb (planet_osm_* tables). */
export async function getOsmPool() {
  const url = (process.env.UMNAAPP_OSM_DATABASE_URL || '').trim()
  if (!url) return null
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: Math.min(parseInt(process.env.UMNAAPP_OSM_POOL_MAX, 10) || 5, 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
      application_name: 'umnaapp-osm-query',
    })
    pool.on('error', (err) => console.warn('[osm-db] pool error:', err.message))
  }
  return pool
}

/** Probe (cached) whether planet_osm_point exists and is queryable. */
export async function osmDatabaseAvailable() {
  if (_available !== null) return _available
  if (!osmDatabaseConfigured()) {
    _available = false
    return false
  }
  try {
    const p = await getOsmPool()
    if (!p) {
      _available = false
      return false
    }
    const res = await p.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'planet_osm_point' LIMIT 1`
    )
    _available = res.rows.length > 0
  } catch (e) {
    console.warn('[osm-db] availability probe failed:', e.message)
    _available = false
  }
  return _available
}

export function resetOsmDatabaseProbe() {
  _available = null
}

export async function closeOsmPool() {
  if (pool) {
    await pool.end()
    pool = null
    _available = null
  }
}
