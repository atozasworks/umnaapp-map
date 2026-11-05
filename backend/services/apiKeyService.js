import prisma from '../config/database.js'
import {
  DEFAULT_RATE_LIMIT_PER_MIN,
  MAX_KEYS_PER_USER,
  decryptApiKey,
  encryptApiKey,
  featuresToList,
  generateRawApiKey,
  hashApiKey,
  isWellFormedApiKey,
  mergeScopes,
} from '../utils/apiKeyCrypto.js'

const lookupCache = new Map()
const NEGATIVE_TTL_MS = 5_000

const pendingUsage = new Map()
let flushTimer = null

function cacheGet(keyHash) {
  const hit = lookupCache.get(keyHash)
  if (!hit) return undefined
  if (hit.exp <= Date.now()) {
    lookupCache.delete(keyHash)
    return undefined
  }
  return hit.row
}

function cacheSet(keyHash, row, ttl) {
  lookupCache.set(keyHash, { row, exp: Date.now() + ttl })
}

export function invalidateApiKeyCache(keyHash) {
  if (keyHash) lookupCache.delete(keyHash)
}

export function noteApiKeyUse(id) {
  const row = pendingUsage.get(id) || { count: 0, lastUsedAt: new Date() }
  row.count += 1
  row.lastUsedAt = new Date()
  pendingUsage.set(id, row)
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null
      flushApiKeyUsage().catch((err) => {
        console.error('[api-key] usage flush failed:', err.message)
      })
    }, 10_000)
    flushTimer.unref?.()
  }
}

export async function flushApiKeyUsage() {
  if (!pendingUsage.size) return
  const batch = [...pendingUsage.entries()]
  pendingUsage.clear()
  await Promise.all(
    batch.map(([id, { count, lastUsedAt }]) =>
      prisma.apiKey
        .update({
          where: { id },
          data: { requestCount: { increment: count }, lastUsedAt },
        })
        .catch(() => {})
    )
  )
}

function toOwnerDto(row) {
  let key = ''
  if (row.keyEncrypted) {
    try {
      key = decryptApiKey(row.keyEncrypted)
    } catch (err) {
      console.error('[api-key] decrypt failed for', row.id, err.message)
    }
  }
  return {
    id: row.id,
    name: row.name,
    key,
    keyPrefix: row.keyPrefix,
    features: featuresToList(row),
    status: row.active ? 'active' : 'revoked',
    requestCount: row.requestCount,
    lastUsedAt: row.lastUsedAt,
    rateLimitPerMin: row.rateLimitPerMin,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
  }
}

function assertFeatures(scopes) {
  if (!featuresToList({ scopes }).length) {
    const err = new Error('Select at least one feature: Map, Places, or Directions')
    err.status = 400
    throw err
  }
}

export async function listApiKeys(userId) {
  await flushApiKeyUsage()
  const rows = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toOwnerDto)
}

export async function createApiKey(userId, { name, features }) {
  const trimmed = String(name || '').trim()
  if (trimmed.length < 1 || trimmed.length > 80) {
    const err = new Error('Key name must be 1–80 characters')
    err.status = 400
    throw err
  }
  const scopes = mergeScopes([], features)
  assertFeatures(scopes)

  const count = await prisma.apiKey.count({ where: { userId } })
  if (count >= MAX_KEYS_PER_USER) {
    const err = new Error(`You can create up to ${MAX_KEYS_PER_USER} API keys`)
    err.status = 400
    throw err
  }

  const raw = generateRawApiKey()
  const row = await prisma.apiKey.create({
    data: {
      userId,
      name: trimmed,
      keyPrefix: raw.slice(0, 16),
      keyHash: hashApiKey(raw),
      keyEncrypted: encryptApiKey(raw),
      plan: 'free',
      scopes,
      allowedOrigins: [],
      active: true,
      rateLimitPerMin: DEFAULT_RATE_LIMIT_PER_MIN,
    },
  })
  return toOwnerDto(row)
}

async function ownKey(userId, id) {
  const row = await prisma.apiKey.findFirst({ where: { id, userId } })
  if (!row) {
    const err = new Error('API key not found')
    err.status = 404
    throw err
  }
  return row
}

export async function updateApiKey(userId, id, { name, features }) {
  const row = await ownKey(userId, id)
  const data = {}
  if (name != null) {
    const trimmed = String(name).trim()
    if (trimmed.length < 1 || trimmed.length > 80) {
      const err = new Error('Key name must be 1–80 characters')
      err.status = 400
      throw err
    }
    data.name = trimmed
  }
  if (features != null) {
    const scopes = mergeScopes(row.scopes, features)
    assertFeatures(scopes)
    data.scopes = scopes
  }
  if (!Object.keys(data).length) return toOwnerDto(row)
  const updated = await prisma.apiKey.update({ where: { id: row.id }, data })
  invalidateApiKeyCache(row.keyHash)
  return toOwnerDto(updated)
}

export async function regenerateApiKey(userId, id) {
  const row = await ownKey(userId, id)
  if (!row.active) {
    const err = new Error('Revoked keys cannot be regenerated. Create a new key instead.')
    err.status = 400
    throw err
  }
  const raw = generateRawApiKey()
  const updated = await prisma.apiKey.update({
    where: { id: row.id },
    data: {
      keyPrefix: raw.slice(0, 16),
      keyHash: hashApiKey(raw),
      keyEncrypted: encryptApiKey(raw),
    },
  })
  invalidateApiKeyCache(row.keyHash)
  return toOwnerDto(updated)
}

export async function revokeApiKey(userId, id) {
  const row = await ownKey(userId, id)
  if (!row.active) return toOwnerDto(row)
  const updated = await prisma.apiKey.update({
    where: { id: row.id },
    data: { active: false, revokedAt: new Date() },
  })
  invalidateApiKeyCache(row.keyHash)
  return toOwnerDto(updated)
}

export async function deleteApiKey(userId, id) {
  const row = await ownKey(userId, id)
  await prisma.apiKey.delete({ where: { id: row.id } })
  invalidateApiKeyCache(row.keyHash)
}

/**
 * Resolve a presented secret to an active key row, or null.
 * Does not reveal whether the key was unknown vs revoked.
 */
export async function findActiveApiKey(raw) {
  if (!isWellFormedApiKey(raw)) return null
  const keyHash = hashApiKey(raw)
  const cached = cacheGet(keyHash)
  if (cached !== undefined) return cached

  const row = await prisma.apiKey.findUnique({ where: { keyHash } })
  if (!row || !row.active) {
    cacheSet(keyHash, null, NEGATIVE_TTL_MS)
    return null
  }
  return row
}
