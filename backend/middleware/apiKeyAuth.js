import { optionalAuth } from './auth.js'
import { consumeRateLimit } from './rateLimit.js'
import { findActiveApiKey, noteApiKeyUse } from '../services/apiKeyService.js'
import { hasScope, keyAllowsFeature } from '../utils/apiKeyCrypto.js'

const EMBED_HEADER = 'x-umna-surface'

export function extractPresentedKey(req) {
  const header = req.get('x-api-key')
  if (header && String(header).trim()) return String(header).trim()
  const auth = req.get('authorization') || ''
  const match = auth.match(/^ApiKey\s+(\S+)\s*$/i)
  if (match) return match[1].trim()
  const queryKey = req.query?.key
  if (typeof queryKey === 'string' && queryKey.trim()) return queryKey.trim()
  return ''
}

function originAllowed(row, req) {
  const list = Array.isArray(row?.allowedOrigins) ? row.allowedOrigins.filter(Boolean) : []
  if (!list.length) return true
  const headerOrigin = req.get('origin') || ''
  let requestOrigin = headerOrigin
  if (!requestOrigin) {
    try {
      requestOrigin = new URL(req.get('referer') || '').origin
    } catch {
      requestOrigin = ''
    }
  }
  return list.some((allowed) => {
    try {
      return new URL(allowed).origin === requestOrigin
    } catch {
      return String(allowed).replace(/\/+$/, '') === requestOrigin
    }
  })
}

/** True only for fetches made by our own embedded map page. */
export function isEmbedSurface(req) {
  if (String(req.get(EMBED_HEADER) || '').toLowerCase() !== 'embed') return false
  const referer = String(req.get('referer') || '')
  try {
    const url = new URL(referer)
    const path = url.pathname || ''
    const host = (url.hostname || '').toLowerCase()
    const mapsHost = (process.env.MAPS_HOST || process.env.VITE_MAPS_HOST || '').toLowerCase()
    if (host.startsWith('maps.') || (mapsHost && host === mapsHost)) return true
    return (
      path === '/embedded-map' ||
      path.startsWith('/embedded-map/') ||
      path === '/map' ||
      path.startsWith('/map/')
    )
  } catch {
    return false
  }
}

function sendLimit(res, result, message) {
  if (result.unavailable) {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Rate limiting unavailable. Redis is required for rate limiting.',
    })
  }
  res.setHeader('X-RateLimit-Limit', result.limit)
  res.setHeader('X-RateLimit-Remaining', 0)
  if (result.retryAfter) res.setHeader('Retry-After', String(result.retryAfter))
  return res.status(429).json({
    error: 'Too many requests',
    message: message || `Rate limit exceeded. Maximum ${result.limit} requests per minute.`,
    retryAfter: result.retryAfter,
  })
}

/**
 * Require a valid API key and the given feature.
 * feature `places` also accepts a Map key when the call comes from /embedded-map,
 * so the map can draw markers without granting the Places API to other apps.
 * feature null accepts any active key that has at least one feature enabled.
 *
 * @param {'map'|'places'|'directions'|null} feature
 * @param {{ allowMapEmbed?: boolean }} [opts]
 */
export function requirePublicApiKey(feature, { allowMapEmbed = false } = {}) {
  return async (req, res, next) => {
    try {
      const ip = req.ip || 'unknown'
      const ipGate = await consumeRateLimit('public:apikey-ip', ip, 300, 60)
      if (!ipGate.allowed) {
        return sendLimit(res, ipGate, 'Rate limit exceeded. Try again in a minute.')
      }

      const raw = extractPresentedKey(req)
      const row = await findActiveApiKey(raw)
      if (!row) {
        return res.status(401).json({
          error: 'A valid API key is required',
          code: 'API_KEY_REQUIRED',
        })
      }

      if (!isEmbedSurface(req) && !originAllowed(row, req)) {
        return res.status(403).json({
          error: 'This API key is not allowed from this origin',
          code: 'API_KEY_ORIGIN_FORBIDDEN',
        })
      }

      const decision = keyAllowsFeature(row, feature, allowMapEmbed && isEmbedSurface(req))
      if (!decision.ok) {
        return res.status(403).json({
          error: 'This API key is not allowed to use this feature',
          feature: decision.feature || feature,
          code: 'API_KEY_FEATURE_FORBIDDEN',
        })
      }

      const limit = Math.min(Math.max(row.rateLimitPerMin || 120, 1), 1000)
      const keyGate = await consumeRateLimit('public:apikey', row.id, limit, 60)
      if (!keyGate.allowed) {
        return sendLimit(
          res,
          keyGate,
          `Rate limit exceeded. Maximum ${keyGate.limit} requests per minute for this API key.`
        )
      }

      res.setHeader('X-RateLimit-Limit', keyGate.limit)
      res.setHeader('X-RateLimit-Remaining', keyGate.remaining ?? 0)
      noteApiKeyUse(row.id)
      req.apiKey = {
        id: row.id,
        userId: row.userId,
        features: {
          map: hasScope(row, 'map'),
          places: hasScope(row, 'places'),
          directions: hasScope(row, 'directions'),
        },
      }
      return next()
    } catch (error) {
      console.error('[api-key] auth error:', error.message)
      return res.status(500).json({ error: 'API key authentication failed' })
    }
  }
}

/**
 * Legal documents stay available to the signed-in UMNAAPP app.
 * External callers still need a valid API key.
 */
export function requirePublicApiKeyOrAppSession() {
  const requireKey = requirePublicApiKey(null)
  return (req, res, next) => {
    optionalAuth(req, res, (err) => {
      if (err) return next(err)
      if (req.user) return next()
      return requireKey(req, res, next)
    })
  }
}
