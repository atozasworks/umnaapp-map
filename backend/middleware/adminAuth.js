/** Guessable values that must never be used as an admin secret. */
const WEAK_ADMIN_SECRETS = new Set([
  'admin',
  '123456',
  'default',
  'password',
  'secret',
  'changeme',
  'admin123',
  'test',
  'umnaapp',
])

/**
 * Validate ADMIN_SECRET at startup. Refuses to start (exit 1) when a secret is
 * SET but weak/guessable or too short — a misconfiguration that would expose
 * the admin API. An unset secret is allowed (admin API stays disabled via the
 * 503 in adminAuth) so non-admin deployments still boot.
 */
export function validateAdminSecretOrExit() {
  const raw = (process.env.ADMIN_SECRET || '').trim()
  if (!raw) {
    console.warn(
      '⚠️  ADMIN_SECRET not set — admin API is DISABLED. Set a random string (>=16 chars) to enable it.'
    )
    return
  }
  if (WEAK_ADMIN_SECRETS.has(raw.toLowerCase()) || raw.length < 16) {
    console.error(
      '❌ ADMIN_SECRET is weak or too short. Refusing to start. Use a random string of at least 16 characters (not "admin", "123456", "default", etc.).'
    )
    process.exit(1)
  }
}

/**
 * Protects admin API. Set ADMIN_SECRET in .env (long random string).
 * Send: Authorization: Bearer <ADMIN_SECRET> or X-Admin-Key: <ADMIN_SECRET>
 */
export function adminAuth(req, res, next) {
  const secret = process.env.ADMIN_SECRET?.trim()
  if (!secret || secret.length < 16) {
    return res.status(503).json({
      error: 'Admin API disabled. Set ADMIN_SECRET (min 16 characters) in backend .env',
    })
  }
  const header = req.headers.authorization
  const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : null
  const key = bearer || req.headers['x-admin-key']
  if (!key || key !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}
