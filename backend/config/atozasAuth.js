// Atozas Auth Kit Express Integration
// Uses atozas-auth-kit-express package utilities with Prisma database

import prisma from './database.js'
import nodemailer from 'nodemailer'

// Import OTP utilities directly from atozas-auth-kit-express package
// Using same implementation as package (since TypeScript files can't be imported directly)
import bcrypt from 'bcryptjs'

// OTP utilities (same as atozas-auth-kit-express package)
export function generateOtp(length = 6) {
  const digits = '0123456789'
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)]
  }
  return otp
}

export async function hashOtp(otp) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(otp, salt)
}

export async function compareOtp(plainOtp, hashedOtp) {
  return bcrypt.compare(plainOtp, hashedOtp)
}

console.log('✅ Using Atozas OTP utilities (atozas-auth-kit-express compatible)')

// Email transporter using Atozas SMTP config
// Verify all required SMTP variables
const isSMTPConfigured = process.env.SMTP_SERVER && process.env.SMTP_EMAIL && process.env.SMTP_EMAIL_PASSWORD

if (!isSMTPConfigured) {
  console.warn('⚠️  SMTP not fully configured. Missing:', {
    SMTP_SERVER: !process.env.SMTP_SERVER,
    SMTP_EMAIL: !process.env.SMTP_EMAIL,
    SMTP_EMAIL_PASSWORD: !process.env.SMTP_EMAIL_PASSWORD,
  })
}

// Get SMTP configuration with defaults
const smtpConfig = {
  name: process.env.SMTP_NAME || 'atozas.com',
  server: process.env.SMTP_SERVER || 'mail.atozas.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || (process.env.SMTP_PORT === '465' && process.env.SMTP_SECURE !== 'false'),
  email: process.env.SMTP_EMAIL || 'no-reply@atozas.com',
  password: process.env.SMTP_EMAIL_PASSWORD,
}

// Log SMTP configuration (without password)
if (isSMTPConfigured) {
  console.log('📧 SMTP Configuration:')
  console.log('   Name:', smtpConfig.name)
  console.log('   Server:', smtpConfig.server)
  console.log('   Port:', smtpConfig.port)
  console.log('   Secure:', smtpConfig.secure)
  console.log('   Email:', smtpConfig.email)
  console.log('   Password:', smtpConfig.password ? '✅ Set' : '❌ Missing')
}

const emailTransporter = isSMTPConfigured
  ? nodemailer.createTransport({
      host: smtpConfig.server,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.password,
      },
      tls: {
        rejectUnauthorized: false,
        // Use SMTP server hostname for TLS servername
        servername: smtpConfig.server,
        // Allow legacy TLS versions for compatibility
        minVersion: 'TLSv1',
      },
      debug: true, // Always enable debug for email troubleshooting
      logger: true, // Always enable logger for email troubleshooting
      // Connection pool options for better reliability
      pool: false, // Disable pool to avoid timeout issues
      // Connection timeout settings - increased for slow networks
      connectionTimeout: 30000, // 30 seconds (increased from 10)
      greetingTimeout: 30000, // 30 seconds (increased from 10)
      socketTimeout: 30000, // 30 seconds (increased from 10)
      // Retry settings
      maxRetries: 3,
      retryDelay: 2000, // 2 seconds between retries
      // Additional options for better deliverability
      // Only require TLS if using secure connection (port 465)
      requireTLS: smtpConfig.secure,
      // For port 587 (STARTTLS), don't require TLS initially
      ignoreTLS: false,
    })
  : null

// Verify connection on startup with better error handling
if (emailTransporter) {
  emailTransporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP connection verification failed:')
      console.error('   Error:', error.message)
      console.error('   Code:', error.code)
      console.error('   Command:', error.command)
      console.error('')
      console.error('🔍 Troubleshooting steps:')
      console.error('   1. Check SMTP_SERVER and SMTP_PORT in .env')
      console.error('   2. Verify SMTP_SECURE matches port (465=true, 587=false)')
      console.error('   3. Check network/firewall settings')
      console.error('   4. Test if SMTP server is reachable:')
      console.error(`      telnet ${smtpConfig.server} ${smtpConfig.port}`)
      console.error('   5. For Gmail: Use port 587 with SMTP_SECURE=false')
      console.error('   6. For Gmail: Ensure App Password is used (not regular password)')
    } else {
      console.log('✅ SMTP connection verified successfully')
      console.log('   Server:', smtpConfig.server)
      console.log('   Port:', smtpConfig.port)
      console.log('   Secure:', smtpConfig.secure)
    }
  })
}

// Atozas Auth Kit wrapper compatible with our Prisma setup
const atozasAuth = {
  async generateOTP(email, options = {}) {
    try {
      if (!emailTransporter) {
        console.error('❌ Email transporter not configured')
        return {
          success: false,
          error: 'Email service not configured. Please check SMTP settings in .env',
        }
      }

      // Generate OTP using Atozas utility
      const otp = generateOtp(6)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      
      console.log('📧 Attempting to send OTP email...')
      console.log('To:', email)
      console.log('From:', smtpConfig.email)
      console.log('Server:', smtpConfig.server, 'Port:', smtpConfig.port)
      console.log('Domain:', smtpConfig.name)
      
      // Send email via SMTP with all SMTP variables properly configured
      const mailOptions = {
        from: `"UMNAAPP" <${smtpConfig.email}>`,
        to: email,
        subject: `Your UMNAAPP Verification Code - ${smtpConfig.name}`,
        // Add plain text version for better deliverability
        text: `UMNAAPP Verification Code\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nSent from ${smtpConfig.name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">UMNAAPP</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">${smtpConfig.name}</p>
              </div>
              <div style="padding: 40px;">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 24px;">Verification Code</h2>
                <p style="color: #64748b; font-size: 16px; line-height: 1.6;">Your verification code is:</p>
                <div style="background: #f1f5f9; border: 2px dashed #0ea5e9; border-radius: 8px; padding: 25px; text-align: center; margin: 25px 0;">
                  <h1 style="color: #0ea5e9; font-size: 42px; letter-spacing: 10px; margin: 0; font-family: 'Courier New', monospace; font-weight: bold;">${otp}</h1>
                </div>
                <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">This code will expire in <strong>10 minutes</strong>.</p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                  If you didn't request this code, please ignore this email.<br>
                  This email was sent from <strong>${smtpConfig.name}</strong>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        // Add headers to improve deliverability
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
          'X-Mailer': `UMNAAPP (${smtpConfig.name})`,
          'List-Unsubscribe': `<mailto:${smtpConfig.email}>`,
          'X-Domain': smtpConfig.name,
        },
        // Add reply-to
        replyTo: smtpConfig.email,
      }
      
      const info = await emailTransporter.sendMail(mailOptions)
      
      console.log('✅ OTP email sent successfully!')
      console.log('Message ID:', info.messageId)
      console.log('Response:', info.response)
      console.log('Accepted recipients:', info.accepted)
      console.log('Rejected recipients:', info.rejected)
      console.log('Pending recipients:', info.pending)
      
      if (info.rejected && info.rejected.length > 0) {
        console.error('❌ Email was rejected by server:', info.rejected)
        return {
          success: false,
          error: 'Email was rejected by server',
          rejected: info.rejected,
        }
      }
      
      // Log OTP for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 OTP Code (DEV ONLY - for testing):', otp)
        console.log('⚠️  IMPORTANT: If email not received in Gmail, check:')
        console.log('   1. 📧 Spam/Junk folder in Gmail')
        console.log('   2. ⏱️  Wait 1-2 minutes (delivery can be delayed)')
        console.log('   3. 🔍 Check Gmail filters and blocked senders')
        console.log('   4. 📬 Check "All Mail" folder in Gmail')
        console.log('   5. 🌐 Gmail might be blocking atozas.com domain')
      }
      
      return {
        success: true,
        otp,
        expiresAt,
        messageId: info.messageId,
        response: info.response,
      }
    } catch (error) {
      console.error('❌ Atozas OTP generation error:', error.message)
      console.error('Full error:', error)
      if (error.response) {
        console.error('SMTP Response:', error.response)
      }
      if (error.code) {
        console.error('Error Code:', error.code)
      }
      
      // Provide specific troubleshooting for timeout errors
      if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        console.error('')
        console.error('⏱️  CONNECTION TIMEOUT - Troubleshooting:')
        console.error('   1. Check SMTP server address:', smtpConfig.server)
        console.error('   2. Verify SMTP port:', smtpConfig.port)
        console.error('   3. Check if port is correct for server:')
        console.error('      - Gmail: 587 (SMTP_SECURE=false) or 465 (SMTP_SECURE=true)')
        console.error('      - Atozas: 465 (SMTP_SECURE=true)')
        console.error('   4. Test connection manually:')
        console.error(`      telnet ${smtpConfig.server} ${smtpConfig.port}`)
        console.error('   5. Check firewall/antivirus blocking SMTP ports')
        console.error('   6. Verify network connectivity to SMTP server')
        console.error('   7. Try different SMTP server (e.g., Gmail) to test')
        console.error('')
        console.error('💡 Quick fix - Try Gmail SMTP:')
        console.error('   SMTP_SERVER=smtp.gmail.com')
        console.error('   SMTP_PORT=587')
        console.error('   SMTP_SECURE=false')
        console.error('   SMTP_EMAIL=your-email@gmail.com')
        console.error('   SMTP_EMAIL_PASSWORD=your-app-password')
      } else if (error.code === 'ECONNREFUSED') {
        console.error('')
        console.error('🚫 CONNECTION REFUSED - Troubleshooting:')
        console.error('   1. SMTP server might be down or unreachable')
        console.error('   2. Check if SMTP_SERVER address is correct')
        console.error('   3. Verify SMTP_PORT is correct')
        console.error('   4. Check if server requires VPN or specific network')
      } else if (error.code === 'EAUTH') {
        console.error('')
        console.error('🔐 AUTHENTICATION FAILED - Troubleshooting:')
        console.error('   1. Check SMTP_EMAIL and SMTP_EMAIL_PASSWORD in .env')
        console.error('   2. For Gmail: Use App Password (not regular password)')
        console.error('   3. Generate App Password: https://myaccount.google.com/apppasswords')
        console.error('   4. Ensure 2-Step Verification is enabled on Gmail')
      }
      
      return {
        success: false,
        error: error.message || 'Failed to send OTP email',
        errorCode: error.code,
      }
    }
  },
  
  async verifyOTP(email, otp, options = {}) {
    try {
      // Find OTP in Prisma database
      const otpRecord = await prisma.oTPVerification.findFirst({
        where: {
          email: email.toLowerCase(),
          type: options.type || 'register',
          verified: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      
      if (!otpRecord) {
        return { success: false, error: 'Invalid or expired OTP' }
      }
      
      // Compare OTP (plain text comparison since we store plain OTP in Prisma)
      if (otpRecord.otp !== otp) {
        return { success: false, error: 'Invalid OTP' }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Atozas OTP verification error:', error)
      return { success: false, error: error.message }
    }
  },
}

// Export email sending function for use in routes
export async function sendEmailOtp(email, otp) {
  if (!emailTransporter) {
    console.error('❌ Email transporter not configured')
    throw new Error('Email transporter not configured. Please check SMTP settings in .env')
  }
  
  console.log('📧 Sending OTP email...')
  console.log('   To:', email)
  console.log('   From:', smtpConfig.email)
  console.log('   Server:', smtpConfig.server, 'Port:', smtpConfig.port)
  console.log('   OTP:', otp)
  
  const mailOptions = {
    from: `"UMNAAPP" <${smtpConfig.email}>`,
    to: email,
    subject: `Your UMNAAPP Verification Code`,
    text: `UMNAAPP Verification Code\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nSent from ${smtpConfig.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">UMNAAPP</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Verification Code</p>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #1e293b; margin-top: 0; font-size: 24px;">Your Verification Code</h2>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">Use this code to verify your email:</p>
            <div style="background: #f1f5f9; border: 2px dashed #0ea5e9; border-radius: 8px; padding: 25px; text-align: center; margin: 25px 0;">
              <h1 style="color: #0ea5e9; font-size: 42px; letter-spacing: 10px; margin: 0; font-family: 'Courier New', monospace; font-weight: bold;">${otp}</h1>
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              If you didn't request this code, please ignore this email.<br>
              This email was sent from <strong>${smtpConfig.name}</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'X-Mailer': 'UMNAAPP',
      'List-Unsubscribe': `<mailto:${smtpConfig.email}?subject=unsubscribe>`,
      'Message-ID': `<${Date.now()}-${Math.random().toString(36)}@${smtpConfig.server}>`,
      'Date': new Date().toUTCString(),
      'MIME-Version': '1.0',
      'Content-Type': 'text/html; charset=utf-8',
      'X-Auto-Response-Suppress': 'All',
      'Precedence': 'bulk',
    },
    replyTo: smtpConfig.email,
    // Add envelope for better deliverability
    envelope: {
      from: smtpConfig.email,
      to: email,
    },
  }
  
  try {
    console.log('📤 Attempting to send email via SMTP...')
    console.log('   SMTP Server:', smtpConfig.server)
    console.log('   SMTP Port:', smtpConfig.port)
    console.log('   SMTP Secure:', smtpConfig.secure)
    console.log('   From Address:', smtpConfig.email)
    console.log('   To Address:', email)
    
    // Send email with timeout handling
    const info = await Promise.race([
      emailTransporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP timeout: Email sending took too long')), 30000)
      )
    ])
    
    console.log('✅ SMTP server accepted the email!')
    console.log('   Message ID:', info.messageId)
    console.log('   SMTP Response:', info.response)
    console.log('   Accepted Recipients:', JSON.stringify(info.accepted, null, 2))
    console.log('   Rejected Recipients:', JSON.stringify(info.rejected || [], null, 2))
    console.log('   Pending Recipients:', JSON.stringify(info.pending || [], null, 2))
    
    // Parse SMTP response for more details
    if (info.response) {
      const responseLines = info.response.split('\n')
      console.log('   SMTP Response Details:')
      responseLines.forEach((line, index) => {
        if (line.trim()) {
          console.log(`      [${index + 1}] ${line.trim()}`)
        }
      })
    }
    
    if (info.rejected && info.rejected.length > 0) {
      console.error('❌ Email was rejected by SMTP server:', info.rejected)
      throw new Error(`Email was rejected by server: ${info.rejected.join(', ')}`)
    }
    
    if (!info.accepted || info.accepted.length === 0) {
      console.error('❌ Email was not accepted by SMTP server')
      throw new Error('Email was not accepted by server')
    }
    
    console.log('✅ Email accepted by SMTP server for:', info.accepted.join(', '))
    console.log('')
    console.log('⚠️  IMPORTANT: If email not received in Gmail:')
    console.log('   1. SMTP server accepted the email, but Gmail may not receive it')
    console.log('   2. Check Gmail Spam/Junk folder (most common)')
    console.log('   3. Wait 2-5 minutes (email delivery can be delayed)')
    console.log('   4. Check "All Mail" folder in Gmail')
    console.log('   5. Search Gmail for "UMNAAPP" or sender email')
    console.log('   6. Gmail may block emails from atozas.com if SPF/DKIM not configured')
    console.log('   7. Check Gmail filters and blocked senders list')
    console.log('')
    console.log('🔍 SMTP Server Status:')
    console.log('   - Email was accepted by SMTP server')
    console.log('   - This means SMTP connection and authentication worked')
    console.log('   - The issue is likely Gmail filtering/blocking the email')
    console.log('   - Contact your SMTP provider (atozas.com) to check delivery logs')
    
    // Additional debugging for Gmail delivery
    if (email.includes('@gmail.com')) {
      console.log('')
      console.log('📬 Gmail-Specific Delivery Tips:')
      console.log('   - Gmail filters emails from unknown domains aggressively')
      console.log('   - atozas.com domain may need SPF/DKIM/DMARC records')
      console.log('   - Check Gmail "Security" tab in email settings')
      console.log('   - Try sending to a different email provider to test')
    }
    
    return info
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message)
    console.error('   Error code:', error.code)
    console.error('   Error response:', error.response)
    console.error('   Full error:', error)
    
    // More detailed error information
    if (error.code === 'EAUTH') {
      console.error('   ⚠️  Authentication failed - check SMTP_EMAIL and SMTP_EMAIL_PASSWORD')
    } else if (error.code === 'ECONNECTION') {
      console.error('   ⚠️  Connection failed - check SMTP_SERVER and SMTP_PORT')
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   ⚠️  Connection timeout - check network/firewall settings')
    }
    
    throw error
  }
}

console.log('✅ Atozas Auth Kit wrapper initialized (using Prisma + Atozas utilities)')

export default atozasAuth

