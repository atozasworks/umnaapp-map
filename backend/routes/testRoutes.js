import express from 'express'
import { sendEmailOtp, generateOtp } from '../config/atozasAuth.js'

const router = express.Router()

// Test email endpoint (for debugging) - Direct email sending
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Generate a test OTP
    const testOtp = generateOtp(6)
    
    console.log('🧪 Test email request received')
    console.log('   Email:', email)
    console.log('   Test OTP:', testOtp)
    
    // Send email directly using sendEmailOtp
    const info = await sendEmailOtp(email, testOtp)
    
    res.json({ 
      success: true, 
      message: 'Test OTP email sent successfully',
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      otp: testOtp, // Include OTP for testing (only in development)
      note: 'Check your email inbox, spam folder, and wait 1-2 minutes for delivery',
    })
  } catch (error) {
    console.error('❌ Test email error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to send test email',
      details: error.message,
      code: error.code,
    })
  }
})

// SMTP configuration check endpoint
router.get('/smtp-config', (req, res) => {
  const config = {
    SMTP_NAME: process.env.SMTP_NAME || 'Not set',
    SMTP_SERVER: process.env.SMTP_SERVER || 'Not set',
    SMTP_PORT: process.env.SMTP_PORT || 'Not set',
    SMTP_SECURE: process.env.SMTP_SECURE || 'Not set',
    SMTP_EMAIL: process.env.SMTP_EMAIL || 'Not set',
    SMTP_EMAIL_PASSWORD: process.env.SMTP_EMAIL_PASSWORD ? '✅ Set' : '❌ Not set',
  }
  
  res.json({
    config,
    note: 'Password is hidden for security',
  })
})

// SMTP connection test endpoint
router.get('/smtp-test', async (req, res) => {
  try {
    const { sendEmailOtp } = await import('../config/atozasAuth.js')
    const nodemailer = (await import('nodemailer')).default
    
    const smtpConfig = {
      server: process.env.SMTP_SERVER || 'mail.atozas.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      email: process.env.SMTP_EMAIL || 'no-reply@atozas.com',
      password: process.env.SMTP_EMAIL_PASSWORD,
    }
    
    if (!smtpConfig.password) {
      return res.status(400).json({
        error: 'SMTP_EMAIL_PASSWORD not configured',
        config: {
          server: smtpConfig.server,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          email: smtpConfig.email,
        },
      })
    }
    
    const transporter = nodemailer.createTransport({
      host: smtpConfig.server,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.password,
      },
      debug: true,
      logger: true,
    })
    
    // Test SMTP connection
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          reject(error)
        } else {
          resolve(success)
        }
      })
    })
    
    res.json({
      success: true,
      message: 'SMTP connection verified successfully',
      config: {
        server: smtpConfig.server,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        email: smtpConfig.email,
      },
      note: 'SMTP server is reachable and authentication works. If emails not received, check Gmail spam folder or contact SMTP provider.',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'SMTP connection failed',
      details: error.message,
      code: error.code,
    })
  }
})

export default router


