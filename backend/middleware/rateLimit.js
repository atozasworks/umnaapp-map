import { createClient } from 'redis'

let redisClient = null

// Initialize Redis client for rate limiting
if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  })

  redisClient.on('error', (err) => {
    console.error('Redis Rate Limit Client Error:', err)
  })

  redisClient.connect().catch(console.error)
}

/**
 * Rate limiting middleware using Redis
 * @param {string} keyPrefix - Prefix for rate limit key
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowSeconds - Time window in seconds
 */
export const rateLimitMiddleware = (keyPrefix, maxRequests, windowSeconds) => {
  return async (req, res, next) => {
    if (!redisClient) {
      return next() // Skip rate limiting if Redis is not available
    }

    try {
      // Use user ID if authenticated, otherwise use IP
      const identifier = req.user?.id || req.ip || 'anonymous'
      const key = `ratelimit:${keyPrefix}:${identifier}`

      // Get current count
      const current = await redisClient.get(key)
      const count = current ? parseInt(current) : 0

      if (count >= maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds} seconds.`,
          retryAfter: windowSeconds,
        })
      }

      // Increment counter
      if (count === 0) {
        // First request in window, set expiration
        await redisClient.setEx(key, windowSeconds, '1')
      } else {
        await redisClient.incr(key)
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count - 1))
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowSeconds * 1000).toISOString())

      next()
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      next() // Continue on error to avoid blocking requests
    }
  }
}

/**
 * Tiered rate limiter: applies a different cap for authenticated users vs
 * anonymous clients, keyed by user id (authenticated) or IP (anonymous).
 * Use for public endpoints that should still reward signed-in users and
 * throttle abuse — e.g. the support chatbot. Requires optionalAuth to run
 * first so req.user is populated when a valid token is present.
 *
 * @param {string} keyPrefix
 * @param {object} opts
 * @param {number} opts.authMax   max requests for authenticated users
 * @param {number} opts.anonMax   max requests for anonymous clients
 * @param {number} opts.windowSeconds
 */
export const tieredRateLimitMiddleware = (keyPrefix, { authMax, anonMax, windowSeconds }) => {
  return async (req, res, next) => {
    if (!redisClient) return next()
    try {
      const isAuthed = Boolean(req.user?.id)
      const identifier = isAuthed ? `u:${req.user.id}` : `ip:${req.ip || 'anonymous'}`
      const maxRequests = isAuthed ? authMax : anonMax
      const key = `ratelimit:${keyPrefix}:${identifier}`

      const current = await redisClient.get(key)
      const count = current ? parseInt(current) : 0

      if (count >= maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          message: isAuthed
            ? `Rate limit exceeded (${maxRequests} per ${windowSeconds}s). Please slow down.`
            : `Rate limit exceeded (${maxRequests} per ${windowSeconds}s). Sign in for a higher limit.`,
          retryAfter: windowSeconds,
        })
      }

      if (count === 0) {
        await redisClient.setEx(key, windowSeconds, '1')
      } else {
        await redisClient.incr(key)
      }

      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count - 1))
      next()
    } catch (error) {
      console.error('Tiered rate limit error:', error)
      next()
    }
  }
}

