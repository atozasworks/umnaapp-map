import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'

/** Absolute session lifetime from manual login. Not a sliding window. */
const SESSION_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d'

export const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: SESSION_EXPIRES_IN,
  })
}

export const createSession = async (userId, token) => {
  const decoded = jwt.decode(token)
  const expiresAt = new Date(decoded.exp * 1000)
  const now = new Date()

  const [session] = await prisma.$transaction([
    prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: now },
    }),
  ])

  return session
}

export const revokeSession = async (token) => {
  return await prisma.session.deleteMany({
    where: { token },
  })
}

