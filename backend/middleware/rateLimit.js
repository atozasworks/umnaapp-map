import { createClient } from 'redis'

let redisClient = null
let redisInitPromise = null
let loggedDevSkip = false

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

function redisUnavailableResponse(res, reason = 'Rate limiting unavailable') {
  return res.status(503).json({
    error: 'Service temporarily unavailable',
    message: `${reason}. Redis is required for rate limiting.`,
  })
}

/**
 * Fail fast in production when REDIS_URL is missing.
 * Development may omit Redis (rate limits skip with an explicit warning).
 */
export function validateRedisOrExit() {
  const url = (process.env.REDIS_URL || '').trim()
  if (isProduction() && !url) {
    console.error(
      '❌ REDIS_URL is required in production. Refusing to start without Redis (rate limiting must not be disabled).'
    )
    process.exit(1)
  }
  if (!url && !isProduction()) {
    console.warn(
      '⚠️  REDIS_URL not set — rate limiting is DISABLED in development. Set REDIS_URL to enable it.'
    )
  }
}

function createRedisClient() {
  const url = (process.env.REDIS_URL || '').trim()
  if (!url) return null

  const client = createClient({ url })
  client.on('error', (err) => {
    console.error('Redis Rate Limit Client Error:', err)
  })
  return client
}

/**
 * Connect Redis when REDIS_URL is set. In production, resolves only after a
 * successful PING so the server never listens with a half-connected client.
 */
export async function ensureRedisReady() {
  if (redisInitPromise) return redisInitPromise

  redisInitPromise = (async () => {
    const url = (process.env.REDIS_URL || '').trim()
    if (!url) {
      if (isProduction()) {
        throw new Error('REDIS_URL is required in production')
      }
      return null
    }

    redisClient = createRedisClient()
    if (!redisClient) {
      throw new Error('Failed to create Redis client')
    }

    await redisClient.connect()
    const pong = await redisClient.ping()
    if (String(pong).toUpperCase() !== 'PONG') {
      throw new Error(`Unexpected Redis PING response: ${pong}`)
    }
    console.log('✅ Redis connected (rate limiting enabled)')
    return redisClient
  })()

  try {
    return await redisInitPromise
  } catch (err) {
    redisInitPromise = null
    redisClient = null
    if (isProduction()) {
      console.error('❌ Redis connection failed in production. Refusing to start.', err)
      process.exit(1)
    }
    console.error('❌ Redis connection failed — rate limiting will reject requests until Redis is available.', err)
    throw err
  }
}

function isRedisUsable() {
  return Boolean(redisClient?.isOpen)
}

/**
 * Rate limiting middleware using Redis.
 * Never silently disables: when Redis is required/configured but unavailable,
 * requests receive 503 instead of passing through unthrottled.
 */
export const rateLimitMiddleware = (keyPrefix, maxRequests, windowSeconds) => {
  return async (req, res, next) => {
    if (!isRedisUsable()) {
      if (!process.env.REDIS_URL?.trim() && !isProduction()) {
        if (!loggedDevSkip) {
          loggedDevSkip = true
          console.warn('⚠️  Rate limiting skipped (no REDIS_URL in development)')
        }
        return next()
      }
      return redisUnavailableResponse(res)
    }

    try {
      // Use user ID if authenticated, otherwise use IP
      const identifier = req.user?.id || req.ip || 'anonymous'
      const key = `ratelimit:${keyPrefix}:${identifier}`

      // Get current count
      const current = await redisClient.get(key)
      const count = current ? parseInt(current, 10) : 0

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
      // Fail closed — never bypass throttling when Redis errors
      return redisUnavailableResponse(res, 'Rate limiting error')
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
    if (!isRedisUsable()) {
      if (!process.env.REDIS_URL?.trim() && !isProduction()) {
        if (!loggedDevSkip) {
          loggedDevSkip = true
          console.warn('⚠️  Rate limiting skipped (no REDIS_URL in development)')
        }
        return next()
      }
      return redisUnavailableResponse(res)
    }

    try {
      const isAuthed = Boolean(req.user?.id)
      const identifier = isAuthed ? `u:${req.user.id}` : `ip:${req.ip || 'anonymous'}`
      const maxRequests = isAuthed ? authMax : anonMax
      const key = `ratelimit:${keyPrefix}:${identifier}`

      const current = await redisClient.get(key)
      const count = current ? parseInt(current, 10) : 0

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
      return redisUnavailableResponse(res, 'Rate limiting error')
    }
  }
}
