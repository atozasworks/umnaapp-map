import pg from 'pg'

const { Pool } = pg

export function createMemoryPendingStore() {
  const map = new Map()
  return {
    async set(id, payload, ttlMs) {
      map.set(id, { payload, exp: Date.now() + ttlMs })
    },
    async take(id) {
      const row = map.get(id)
      map.delete(id)
      if (!row || row.exp < Date.now()) return null
      return row.payload
    },
  }
}

export function createPgPendingStore(databaseUrl, { tableName = 'atozas_oidc_pending' } = {}) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
    application_name: 'umnaapp-atozas-oidc-pending',
  })
  pool.on('error', (err) => {
    console.warn('⚠️  ATOZAS OIDC pending store error:', err.message)
  })

  const table = quoteIdent(tableName)
  const ready = pool.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id varchar(64) PRIMARY KEY,
      payload jsonb NOT NULL,
      expire timestamp(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ${quoteIdent(`${tableName}_expire_idx`)} ON ${table} (expire);
  `)

  return {
    async set(id, payload, ttlMs) {
      await ready
      const expire = new Date(Date.now() + ttlMs)
      await pool.query(
        `INSERT INTO ${table} (id, payload, expire)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, expire = EXCLUDED.expire`,
        [id, JSON.stringify(payload), expire]
      )
      await pool.query(`DELETE FROM ${table} WHERE expire < NOW()`).catch(() => {})
    },
    async take(id) {
      await ready
      const { rows } = await pool.query(
        `DELETE FROM ${table}
         WHERE id = $1 AND expire > NOW()
         RETURNING payload`,
        [id]
      )
      return rows[0]?.payload || null
    },
  }
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`
}
