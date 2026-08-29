import express from 'express'
import crypto from 'crypto'
import { body } from 'express-validator'
import {
  register,
  verifyOTP,
  loginWithOTP,
  resendOTP,
  getCurrentUser,
  updateProfile,
  updateProfilePicture,
  logout,
} from '../controllers/authController.js'
import { authenticateToken } from '../middleware/auth.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import passport from '../config/passport.js'

const router = express.Router()

const sanitizeAuthRedirect = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/'
  try {
    const parsed = new URL(value, 'http://umnaapp.local')
    if (parsed.origin !== 'http://umnaapp.local') return '/'
    const pathname = parsed.pathname === '/home' ? '/' : parsed.pathname
    return `${pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/'
  }
}

const oauthStateSecret = () =>
  process.env.JWT_SECRET || process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET

const createOAuthState = (redirect) => {
  const payload = Buffer.from(
    JSON.stringify({ redirect: sanitizeAuthRedirect(redirect), issuedAt: Date.now() })
  ).toString('base64url')
  const signature = crypto.createHmac('sha256', oauthStateSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

const readOAuthRedirect = (state) => {
  if (typeof state !== 'string') return '/'
  const [payload, signature] = state.split('.')
  if (!payload || !signature) return '/'
  const expected = crypto.createHmac('sha256', oauthStateSecret()).update(payload).digest()
  let received
  try {
    received = Buffer.from(signature, 'base64url')
  } catch {
    return '/'
  }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return '/'
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!Number.isFinite(parsed.issuedAt) || Date.now() - parsed.issuedAt > 15 * 60 * 1000) return '/'
    return sanitizeAuthRedirect(parsed.redirect)
  } catch {
    return '/'
  }
}

// Register
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .optional({ checkFalsy: true })
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters if provided'),
  ],
  register
)

// Verify OTP — tighter limit to slow brute-force guessing of the 6-digit code
router.post(
  '/verify-otp',
  rateLimitMiddleware('auth:verify', 12, 60),
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('type').isIn(['register', 'login']).withMessage('Type must be register or login'),
  ],
  verifyOTP
)

// Login with OTP
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail()],
  loginWithOTP
)

// Resend OTP (register or login) — does not require name
router.post(
  '/resend-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('type').optional().isIn(['register', 'login']),
  ],
  resendOTP
)

// Get current user
router.get('/me', authenticateToken, getCurrentUser)

// Update profile (name etc.)
router.put('/profile', authenticateToken, updateProfile)

// Update profile picture
router.put('/profile-picture', authenticateToken, updateProfilePicture)

// Logout
router.post('/logout', authenticateToken, logout)

// Google OAuth routes
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
const googleConfigured = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL

router.get(
  '/google',
  (req, res, next) => {
    if (!googleConfigured) {
      return res.redirect(`${frontendUrl}/login?error=google_not_configured`)
    }
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account',
      state: createOAuthState(req.query.redirect),
    })(req, res, next)
  }
)

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!googleConfigured) {
      return res.redirect(`${frontendUrl}/login?error=google_not_configured`)
    }
    passport.authenticate('google', { session: false }, (err, user) => {
      if (err) {
        console.error('Google OAuth callback error:', err)
        const code = /database|prisma|Authentication failed/i.test(String(err.message))
          ? 'database_error'
          : 'google_auth_failed'
        return res.redirect(`${frontendUrl}/login?error=${code}`)
      }
      if (!user) return res.redirect(`${frontendUrl}/login?error=google_auth_failed`)
      try {
        const token = user.token
        const redirectUrl = new URL(readOAuthRedirect(req.query.state), frontendUrl)
        redirectUrl.searchParams.set('token', token)
        res.redirect(redirectUrl.toString())
      } catch (error) {
        res.redirect(`${frontendUrl}/login?error=auth_failed`)
      }
    })(req, res, next)
  }
)

export default router

