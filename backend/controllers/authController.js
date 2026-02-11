import prisma from '../config/database.js'
import atozasAuth from '../config/atozasAuth.js'
import { generateToken, createSession } from '../utils/jwt.js'
import bcrypt from 'bcryptjs'
import { validationResult } from 'express-validator'

export const register = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, email, password } = req.body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({ error: 'User already exists with this email' })
    }

    // Create or update user (if exists but not verified)
    let user
    if (existingUser) {
      user = await prisma.user.update({
        where: { email },
        data: {
          name,
          password: password ? await bcrypt.hash(password, 10) : null,
        },
      })
    } else {
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: password ? await bcrypt.hash(password, 10) : null,
        },
      })
    }

    // Use Atozas Auth Kit to generate and send OTP via Gmail
    try {
      const otpResult = await atozasAuth.generateOTP(email, {
        type: 'register',
        userId: user.id,
      })

      if (!otpResult.success) {
        console.error('Failed to generate/send OTP:', otpResult.error)
        return res.status(500).json({ 
          error: 'Failed to send OTP email',
          details: process.env.NODE_ENV === 'development' ? otpResult.error : undefined
        })
      }

      // Store OTP in database for verification
      await prisma.oTPVerification.create({
        data: {
          email,
          otp: otpResult.otp,
          type: 'register',
          expiresAt: otpResult.expiresAt,
          userId: user.id,
        },
      })
    } catch (error) {
      console.error('Atozas OTP generation error:', error)
      return res.status(500).json({ 
        error: 'Failed to send OTP email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    res.json({
      message: 'OTP sent to your email',
      email,
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
}

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp, type } = req.body

    // Use Atozas Auth Kit to verify OTP
    const verifyResult = await atozasAuth.verifyOTP(email, otp, {
      type: type || 'register',
    })

    if (!verifyResult.success) {
      return res.status(400).json({ error: verifyResult.error || 'Invalid or expired OTP' })
    }

    // Find OTP record in database
    const otpRecord = await prisma.oTPVerification.findFirst({
      where: {
        email,
        otp,
        type: type || 'register',
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (otpRecord) {
      // Mark OTP as verified
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { verified: true },
      })
    }

    // Update user email verification status
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    })

    // Generate JWT token
    const token = generateToken(user.id)
    await createSession(user.id, token)

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('OTP verification error:', error)
    res.status(500).json({ error: 'OTP verification failed' })
  }
}

export const loginWithOTP = async (req, res) => {
  try {
    const { email } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' })
    }

    // Use Atozas Auth Kit to generate and send OTP via Gmail
    try {
      const otpResult = await atozasAuth.generateOTP(email, {
        type: 'login',
        userId: user.id,
      })

      if (!otpResult.success) {
        console.error('Failed to generate/send OTP:', otpResult.error)
        return res.status(500).json({ 
          error: 'Failed to send OTP email',
          details: process.env.NODE_ENV === 'development' ? otpResult.error : undefined
        })
      }

      // Store OTP in database for verification
      await prisma.oTPVerification.create({
        data: {
          email,
          otp: otpResult.otp,
          type: 'login',
          expiresAt: otpResult.expiresAt,
          userId: user.id,
        },
      })
    } catch (error) {
      console.error('Atozas OTP generation error:', error)
      return res.status(500).json({ 
        error: 'Failed to send OTP email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    res.json({
      message: 'OTP sent to your email',
      email,
    })
  } catch (error) {
    console.error('Login OTP error:', error)
    res.status(500).json({ error: 'Failed to send OTP' })
  }
}

export const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    })

    res.json({ user })
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({ error: 'Failed to get user' })
  }
}

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      })
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
}

