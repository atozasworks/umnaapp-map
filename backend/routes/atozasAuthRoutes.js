// Atozas Auth Kit Routes
// Implements the API endpoints expected by atozas-react-auth-kit

import express from 'express'
import prisma from '../config/database.js'
import atozasAuth, { generateOtp, hashOtp, compareOtp, sendEmailOtp } from '../config/atozasAuth.js'
import { generateToken, createSession } from '../utils/jwt.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Rate limiting storage (in-memory, can be replaced with Redis)
const rateLimitStore = new Map()

const checkRateLimit = (key, maxAttempts, windowMs) => {
  const now = Date.now()
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      attempts: 1,
      resetAt: now + windowMs,
    })
    return { allowed: true }
  }
  
  if (record.attempts >= maxAttempts) {
    return { allowed: false, resetAt: record.resetAt }
  }
  
  record.attempts++
  return { allowed: true }
}

// POST /email/send-otp - Send OTP to email (Atozas Auth Kit compatible)
router.post('/email/send-otp', async (req, res) => {
  try {
    const { email } = req.body
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' })
    }
    
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown'
    const rateLimitKey = `otp:${email.toLowerCase()}:${ipAddress}`
    
    // Check rate limit (3 attempts per 15 minutes)
    const rateLimitResult = checkRateLimit(rateLimitKey, 3, 15 * 60 * 1000)
    
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Too many OTP requests',
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
      })
    }
    
    // Generate OTP using Atozas package utility
    const otp = generateOtp(6)
    const hashedOtp = await hashOtp(otp)
    
    // Save OTP to Prisma database
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    
    // Delete old OTPs for this email
    await prisma.oTPVerification.deleteMany({
      where: {
        email: email.toLowerCase(),
        verified: false,
      },
    })
    
    // Create new OTP record (store hashed OTP)
    await prisma.oTPVerification.create({
      data: {
        email: email.toLowerCase(),
        otp: hashedOtp, // Store hashed OTP
        type: 'login', // Default type
        expiresAt,
        verified: false,
      },
    })
    
    // Send OTP via email using Atozas email function
    try {
      console.log('📧 Sending OTP email to:', email)
      const emailInfo = await sendEmailOtp(email, otp)
      
      console.log('✅ OTP email sent successfully')
      console.log('   Message ID:', emailInfo.messageId)
      console.log('   Accepted recipients:', emailInfo.accepted)
      
      if (emailInfo.rejected && emailInfo.rejected.length > 0) {
        console.error('❌ Email rejected for:', emailInfo.rejected)
        return res.status(500).json({ 
          error: 'Email was rejected by server',
          rejected: emailInfo.rejected,
        })
      }
      
      res.json({
        success: true,
        message: 'OTP sent to email',
        expiresIn: 600, // 10 minutes in seconds
        messageId: emailInfo.messageId,
        note: email.includes('@gmail.com') 
          ? 'Check your Gmail inbox, spam folder, and wait 1-2 minutes for delivery'
          : 'Check your email inbox and spam folder',
      })
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error.message)
      console.error('   Error code:', error.code)
      console.error('   Error response:', error.response)
      
      return res.status(500).json({ 
        error: 'Failed to send OTP email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  } catch (error) {
    console.error('Send OTP error:', error)
    res.status(500).json({ error: 'Failed to send OTP' })
  }
})

// POST /email/verify-otp - Verify OTP and login (Atozas Auth Kit compatible)
router.post('/email/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' })
    }
    
    // Find valid OTP in Prisma database
    const otpRecords = await prisma.oTPVerification.findMany({
      where: {
        email: email.toLowerCase(),
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // Check last 5 OTPs
    })
    
    if (otpRecords.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' })
    }
    
    // Verify OTP against all recent OTPs (in case of timing issues)
    let isValid = false
    let validOtpRecord = null
    
    for (const otpRecord of otpRecords) {
      const isMatch = await compareOtp(otp, otpRecord.otp)
      if (isMatch) {
        isValid = true
        validOtpRecord = otpRecord
        break
      }
    }
    
    if (!isValid || !validOtpRecord) {
      return res.status(400).json({ error: 'Invalid OTP' })
    }
    
    // Mark OTP as verified
    await prisma.oTPVerification.update({
      where: { id: validOtpRecord.id },
      data: { verified: true },
    })
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    
    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: email.split('@')[0], // Use email prefix as name
          emailVerified: true,
        },
      })
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: { emailVerified: true },
      })
    }
    
    // Generate JWT token
    const token = generateToken(user.id)
    await createSession(user.id, token)
    
    res.json({
      success: true,
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: 'email',
      },
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    res.status(500).json({ error: 'Failed to verify OTP' })
  }
})

// POST /google - Google OAuth login (Atozas Auth Kit compatible)
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body
    
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required' })
    }
    
    // Verify Google token (simplified - you may want to use google-auth-library)
    // For now, we'll use the existing Google OAuth flow
    // This endpoint can be enhanced to use google-auth-library directly
    
    res.status(501).json({ 
      error: 'Google OAuth via credential not yet implemented. Use /api/auth/google endpoint.' 
    })
  } catch (error) {
    console.error('Google auth error:', error)
    res.status(500).json({ error: 'Google authentication failed' })
  }
})

// GET /me - Get current user (Atozas Auth Kit compatible)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    })
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: 'email',
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to get user' })
  }
})

export default router

