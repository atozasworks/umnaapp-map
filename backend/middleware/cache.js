import { createClient } from 'redis'

let redisClient = null

// Initialize Redis client
if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  })

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err)
  })

  redisClient.on('connect', () => {
    console.log('✅ Redis connected')
  })

  redisClient.connect().catch(console.error)
}

/** Stable cache key from path + sorted query params (avoids duplicate keys). */
function buildCacheKey(req) {
  const params = new URLSearchParams()
  const entries = Object.entries(req.query || {}).sort(([a], [b]) => a.localeCompare(b))
  for (const [key, value] of entries) {
    if (value == null) continue
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)))
    } else {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return `cache:${req.path}${qs ? `?${qs}` : ''}`
}

/**
 * Cache middleware
 * @param {number} ttl - Time to live in seconds
 */
export const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    if (!redisClient) {
      return next() // Skip caching if Redis is not available
    }

    try {
      const cacheKey = buildCacheKey(req)

      // Try to get from cache
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        res.setHeader('X-Cache', 'HIT')
        return res.json(JSON.parse(cached))
      }

      // Store original json method
      const originalJson = res.json.bind(res)

      // Override json method to cache response
      res.json = function (data) {
        // Cache the response
        if (redisClient && res.statusCode === 200) {
          redisClient.setEx(cacheKey, ttl, JSON.stringify(data)).catch(console.error)
        }
        res.setHeader('X-Cache', 'MISS')
        return originalJson(data)
      }

      next()
    } catch (error) {
      console.error('Cache middleware error:', error)
      next() // Continue without caching on error
    }
  }
}

/**
 * Clear cache by pattern using SCAN (non-blocking vs KEYS).
 */
export const clearCache = async (pattern) => {
  if (!redisClient) return

  try {
    const batch = []
    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      batch.push(key)
      if (batch.length >= 50) {
        await redisClient.del(batch)
        batch.length = 0
      }
    }
    if (batch.length > 0) {
      await redisClient.del(batch)
    }
  } catch (error) {
    console.error('Clear cache error:', error)
  }
}

export default redisClient
