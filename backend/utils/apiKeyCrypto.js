import crypto from 'crypto'

export const API_KEY_PREFIX = 'umna_live_'
export const FEATURES = ['map', 'places', 'directions']
const FEATURE_SET = new Set(FEATURES)
export const DEFAULT_RATE_LIMIT_PER_MIN = 120
export const MAX_KEYS_PER_USER = 25

function encryptionKey() {
  const secret = (process.env.API_KEY_SECRET || process.env.JWT_SECRET || '').trim()
  if (!secret) {
    const err = new Error('JWT_SECRET is required to protect API keys')
    err.status = 500
    throw err
  }
  return crypto.createHash('sha256').update(`umna-api-key:${secret}`).digest()
}

export function generateRawApiKey() {
  return API_KEY_PREFIX + crypto.randomBytes(32).toString('base64url')
}

export function hashApiKey(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex')
}

export function encryptApiKey(raw) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const enc = Buffer.concat([cipher.update(String(raw), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`
}

export function decryptApiKey(payload) {
  const [ivB, tagB, dataB] = String(payload || '').split('.')
  if (!ivB || !tagB || !dataB) throw new Error('Invalid encrypted API key')
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivB, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function isWellFormedApiKey(raw) {
  return (
    typeof raw === 'string' &&
    (raw.startsWith(API_KEY_PREFIX) || raw.startsWith('umna_test_')) &&
    raw.length >= 20 &&
    raw.length <= 120 &&
    /^[A-Za-z0-9_-]+$/.test(raw)
  )
}

export function hasScope(row, name) {
  return (row?.scopes || []).some((scope) => String(scope).toLowerCase() === name)
}

/**
 * Decide whether an active key may call a feature.
 * Map keys may call Places endpoints only from the embedded map surface.
 * A null feature means "any of Map, Places, or Directions" (legal documents).
 */
export function keyAllowsFeature(row, feature, embedSurface = false) {
  if (!row || row.active === false) {
    return { ok: false, status: 401 }
  }
  if (!feature) {
    if (FEATURES.some((name) => hasScope(row, name))) return { ok: true }
    return { ok: false, status: 403, feature: null }
  }
  if (hasScope(row, feature)) return { ok: true }
  if (feature === 'places' && embedSurface && hasScope(row, 'map')) return { ok: true }
  return { ok: false, status: 403, feature }
}

/** Keep unrelated scopes (ai, reviews:read, …) and replace product features. */
export function mergeScopes(existing, features) {
  const flags = normalizeFeatures(features)
  const kept = (existing || []).filter((scope) => !FEATURE_SET.has(String(scope).toLowerCase()))
  if (flags.map) kept.push('map')
  if (flags.places) kept.push('places')
  if (flags.directions) kept.push('directions')
  return kept
}

export function normalizeFeatures(input) {
  const list = Array.isArray(input) ? input : []
  const set = new Set(list.map((f) => String(f || '').trim().toLowerCase()))
  return {
    map: set.has('map'),
    places: set.has('places'),
    directions: set.has('directions'),
  }
}

export function featuresToList(row) {
  return FEATURES.filter((name) => hasScope(row, name))
}
