import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'Access token required' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Check if session exists and is valid
    const session = await prisma.session.findFirst({
      where: {
        token,
        userId: decoded.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    })

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    req.user = session.user
    req.session = session
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    return res.status(500).json({ error: 'Authentication error' })
  }
}

/**
 * Optional authentication: if a valid bearer token + active session is present,
 * attaches req.user / req.session. Otherwise continues anonymously WITHOUT
 * rejecting the request. Used by public endpoints (e.g. the support chatbot)
 * that should still recognize signed-in users for higher rate limits.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) return next()

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const session = await prisma.session.findFirst({
      where: { token, userId: decoded.userId, expiresAt: { gt: new Date() } },
      include: { user: true },
    })
    if (session) {
      req.user = session.user
      req.session = session
    }
  } catch {
    // Ignore invalid/expired tokens for optional auth — treat as anonymous.
  }
  return next()
}

