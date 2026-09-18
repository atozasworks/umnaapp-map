import session from 'express-session'
import pg from 'pg'

const { Pool } = pg

/**
 * Express-session store backed by PostgreSQL (DATABASE_URL).
 */
export function createPgSessionStore(databaseUrl, { tableName = 'atozas_sso_sessions', ttlSeconds = 30 * 24 * 60 * 60 } = {}) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
    application_name: 'umnaapp-atozas-sso',
  })
  pool.on('error', (err) => {
    console.warn('⚠️  ATOZAS Postgres session store error:', err.message)
  })

  const table = quoteIdent(tableName)
  const ready = pool.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      sid varchar(255) PRIMARY KEY,
      sess jsonb NOT NULL,
      expire timestamp(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ${quoteIdent(`${tableName}_expire_idx`)} ON ${table} (expire);
  `)

  class PgSessionStore extends session.Store {
    async get(sid, callback) {
      try {
        await ready
        const { rows } = await pool.query(
          `SELECT sess FROM ${table} WHERE sid = $1 AND expire > NOW()`,
          [sid]
        )
        callback(null, rows[0]?.sess || null)
      } catch (err) {
        callback(err)
      }
    }

    async set(sid, sess, callback) {
      try {
        await ready
        const expire = sessionExpiry(sess, ttlSeconds)
        await pool.query(
          `INSERT INTO ${table} (sid, sess, expire)
           VALUES ($1, $2::jsonb, $3)
           ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire`,
          [sid, JSON.stringify(sess), expire]
        )
        callback(null)
      } catch (err) {
        callback(err)
      }
    }

    async destroy(sid, callback) {
      try {
        await ready
        await pool.query(`DELETE FROM ${table} WHERE sid = $1`, [sid])
        callback(null)
      } catch (err) {
        callback(err)
      }
    }

    async touch(sid, sess, callback) {
      try {
        await ready
        const expire = sessionExpiry(sess, ttlSeconds)
        await pool.query(`UPDATE ${table} SET expire = $2 WHERE sid = $1`, [sid, expire])
        callback(null)
      } catch (err) {
        callback(err)
      }
    }
  }

  return new PgSessionStore()
}

function sessionExpiry(sess, ttlSeconds) {
  const maxAgeMs = Number(sess?.cookie?.maxAge)
  const ttlMs = Number.isFinite(maxAgeMs) && maxAgeMs > 0 ? maxAgeMs : ttlSeconds * 1000
  return new Date(Date.now() + ttlMs)
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`
}
