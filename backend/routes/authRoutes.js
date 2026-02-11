import express from 'express'
import { body } from 'express-validator'
import {
  register,
  verifyOTP,
  loginWithOTP,
  getCurrentUser,
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

// Logout
router.post('/logout', authenticateToken, logout)

// Google OAuth routes (only if configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  )

  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed` }),
    async (req, res) => {
      try {
        const token = req.user.token
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/home?token=${token}`)
      } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`)
      }
    }
  )
}

export default router

