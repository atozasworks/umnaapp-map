import express from 'express'
import { body } from 'express-validator'
import {
  register,
  verifyOTP,
  loginWithOTP,
  getCurrentUser,
  updateProfilePicture,
  logout,
} from '../controllers/authController.js'
import { authenticateToken } from '../middleware/auth.js'
import passport from '../config/passport.js'

const router = express.Router()

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

// Verify OTP
router.post(
  '/verify-otp',
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

// Get current user
router.get('/me', authenticateToken, getCurrentUser)

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
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
  }
)

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!googleConfigured) {
      return res.redirect(`${frontendUrl}/login?error=google_not_configured`)
    }
    passport.authenticate('google', { session: false }, (err, user) => {
      if (err) return next(err)
      if (!user) return res.redirect(`${frontendUrl}/login?error=google_auth_failed`)
      try {
        const token = user.token
        res.redirect(`${frontendUrl}/home?token=${token}`)
      } catch (error) {
        res.redirect(`${frontendUrl}/login?error=auth_failed`)
      }
    })(req, res, next)
  }
)

export default router

