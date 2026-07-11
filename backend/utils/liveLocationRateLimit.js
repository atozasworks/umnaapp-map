const emitBuckets = new Map()
const persistBuckets = new Map()

export function allowLiveLocationEmit(shareId, userId, maxHz = 1) {
  const key = `${shareId}:${userId}`
  const now = Date.now()
  const minInterval = 1000 / maxHz
  const last = emitBuckets.get(key) || 0
  if (now - last < minInterval) return false
  emitBuckets.set(key, now)
  return true
}

export function allowLiveLocationPersist(shareId, userId, minIntervalMs = 5000) {
  const key = `${shareId}:${userId}`
  const now = Date.now()
  const last = persistBuckets.get(key) || 0
  if (now - last < minIntervalMs) return false
  persistBuckets.set(key, now)
  return true
}
