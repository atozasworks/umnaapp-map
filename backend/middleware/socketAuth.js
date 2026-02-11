import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]

    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verify session exists
    const session = await prisma.session.findFirst({
      where: {
        token,
        userId: decoded.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!session) {
      return next(new Error('Authentication error: Invalid session'))
    }

    socket.userId = decoded.userId
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'))
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'))
    }
    return next(new Error('Authentication error'))
  }
}

