import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { isAllowedAdminEmail } from '../services/adminAllowlistService.js'

export const ADMIN_SESSION_COOKIE = 'umnaapp_admin_session'

/** Default short-lived admin session (override with ADMIN_SESSION_TTL, e.g. 2h / 30m). */
const DEFAULT_SESSION_TTL = '4h'

/** jti → expiry ms — allows logout to invalidate tokens before JWT expiry (same process). */
const revokedJtis = new Map()

/**
 * Admin sessions are signed with JWT_SECRET (same as the main app).
 * ADMIN_SECRET is no longer used for authentication.
 */
export function getAdminSessionSigningSecret() {
  const secret = (process.env.JWT_SECRET || '').trim()
  if (!secret || secret.length < 16) return null
  return secret
}

/**
 * Startup check: JWT_SECRET is required to issue admin session cookies.
 * Allowlist is seeded separately from ADMIN_BOOTSTRAP_EMAILS.
 */
export function validateAdminAuthConfigOrExit() {
  const secret = getAdminSessionSigningSecret()
  if (!secret) {
    console.warn(
      '⚠️  JWT_SECRET missing or too short — admin session cookies cannot be issued. Set JWT_SECRET (>=16 chars).'
    )
    return
  }
  if ((process.env.ADMIN_SECRET || '').trim()) {
    console.warn(
      '⚠️  ADMIN_SECRET is set but ignored — admin login uses OTP to pre-approved Gmail addresses only.'
    )
  }
}

/** @deprecated Use validateAdminAuthConfigOrExit — kept as alias for older imports. */
export const validateAdminSecretOrExit = validateAdminAuthConfigOrExit

export function getAdminSessionTtl() {
  const raw = (process.env.ADMIN_SESSION_TTL || '').trim()
  return raw || DEFAULT_SESSION_TTL
}

function pruneRevoked() {
  const now = Date.now()
  for (const [jti, exp] of revokedJtis) {
    if (exp <= now) revokedJtis.delete(jti)
  }
}

export function revokeAdminSessionJti(jti, expSeconds) {
  if (!jti) return
  pruneRevoked()
  const expMs = expSeconds ? expSeconds * 1000 : Date.now() + 4 * 60 * 60 * 1000
  revokedJtis.set(jti, expMs)
}

function isRevoked(jti) {
  if (!jti) return false
  pruneRevoked()
  const exp = revokedJtis.get(jti)
  if (exp == null) return false
  if (exp <= Date.now()) {
    revokedJtis.delete(jti)
    return false
  }
  return true
}

export function parseCookies(req) {
  const header = req.headers.cookie
  if (!header || typeof header !== 'string') return {}
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    if (!key) continue
    try {
      out[key] = decodeURIComponent(val)
    } catch {
      out[key] = val
    }
  }
  return out
}

export function createAdminSessionToken(email) {
  const secret = getAdminSessionSigningSecret()
  if (!secret) throw new Error('JWT_SECRET not configured')
  const normalized = String(email || '')
    .trim()
    .toLowerCase()
  if (!normalized) throw new Error('Admin session requires email')
  const jti = crypto.randomUUID()
  return jwt.sign(
    { role: 'admin', typ: 'admin_session', email: normalized },
    secret,
    {
      expiresIn: getAdminSessionTtl(),
      jwtid: jti,
    }
  )
}

/**
 * Verify an admin session JWT. Returns payload or null.
 * Does not check allowlist (async) — adminAuth middleware does that.
 */
export function verifyAdminSessionToken(token) {
  const secret = getAdminSessionSigningSecret()
  if (!secret || !token) return null
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    })
    if (payload?.role !== 'admin' || payload?.typ !== 'admin_session') return null
    if (!payload?.email) return null
    if (isRevoked(payload.jti)) return null
    return payload
  } catch {
    return null
  }
}

export function getAdminSessionFromRequest(req) {
  const cookies = parseCookies(req)
  const token = cookies[ADMIN_SESSION_COOKIE]
  if (!token) return null
  return verifyAdminSessionToken(token)
}

export function adminSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production'
  const maxAgeMs = ttlToMs(getAdminSessionTtl())
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/admin',
    maxAge: maxAgeMs,
  }
}

/** Best-effort parse of jwt expiresIn-style strings (Nh / Nm / Ns / Nd / plain seconds). */
export function ttlToMs(ttl) {
  if (typeof ttl === 'number' && Number.isFinite(ttl)) return Math.max(1000, ttl * 1000)
  const s = String(ttl || '').trim()
  const m = /^(\d+)\s*([smhd])?$/i.exec(s)
  if (!m) return 4 * 60 * 60 * 1000
  const n = parseInt(m[1], 10)
  const unit = (m[2] || 's').toLowerCase()
  const mult = unit === 'd' ? 86400 : unit === 'h' ? 3600 : unit === 'm' ? 60 : 1
  return Math.max(1000, n * mult * 1000)
}

export function setAdminSessionCookie(res, token) {
  const opts = adminSessionCookieOptions()
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    `Path=${opts.path}`,
    `Max-Age=${Math.floor(opts.maxAge / 1000)}`,
    'HttpOnly',
    `SameSite=${opts.sameSite === 'none' ? 'None' : opts.sameSite === 'strict' ? 'Strict' : 'Lax'}`,
  ]
  if (opts.secure) parts.push('Secure')
  res.append('Set-Cookie', parts.join('; '))
}

export function clearAdminSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    'Path=/api/admin',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (isProd) parts.push('Secure')
  res.append('Set-Cookie', parts.join('; '))
}

/**
 * Protects admin API routes. Requires a valid short-lived httpOnly session
 * cookie from OTP login, and the email must still be on the allowlist.
 */
export async function adminAuth(req, res, next) {
  if (!getAdminSessionSigningSecret()) {
    return res.status(503).json({
      error: 'Admin API unavailable. Set JWT_SECRET (min 16 characters) in backend .env',
    })
  }

  const payload = getAdminSessionFromRequest(req)
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const stillAllowed = await isAllowedAdminEmail(payload.email)
    if (!stillAllowed) {
      clearAdminSessionCookie(res)
      return res.status(401).json({ error: 'Admin access revoked for this email' })
    }
  } catch (e) {
    console.error('[adminAuth] allowlist check failed', e)
    return res.status(503).json({ error: 'Admin allowlist unavailable' })
  }

  req.adminSession = payload
  next()
}
