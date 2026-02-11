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
      // Generate cache key from request
      const cacheKey = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`

      // Try to get from cache
      const cached = await redisClient.get(cacheKey)
      if (cached) {
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
 * Clear cache by pattern
 */
export const clearCache = async (pattern) => {
  if (!redisClient) return

  try {
    const keys = await redisClient.keys(pattern)
    if (keys.length > 0) {
      await redisClient.del(keys)
    }
  } catch (error) {
    console.error('Clear cache error:', error)
  }
}

export default redisClient

