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
