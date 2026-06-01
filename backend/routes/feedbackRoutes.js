import express from 'express'
import nodemailer from 'nodemailer'
import { authenticateToken } from '../middleware/auth.js'
import {
  emailTransporter as fallbackTransporter,
  smtpConfig as fallbackSmtpConfig,
} from '../config/atozasAuth.js'

const router = express.Router()

// --- Dedicated SMTP transporter for the feedback mailbox -------------------
// Hostinger requires the authenticated user to match the From address, so we
// authenticate directly as the feedback mailbox. If FEEDBACK_SMTP_* values are
// missing/blank, we fall back to the global no-reply SMTP transporter.

const FEEDBACK_TO_EMAIL =
  process.env.FEEDBACK_EMAIL || 'feedback.umnaapp@testatozas.in'

const feedbackSmtpUser = (process.env.FEEDBACK_SMTP_EMAIL || '').trim()
const feedbackSmtpPass = (process.env.FEEDBACK_SMTP_PASSWORD || '').trim()
const hasFeedbackSmtp =
  feedbackSmtpUser &&
  feedbackSmtpPass &&
  !/^PUT_/i.test(feedbackSmtpPass) // ignore placeholder

const feedbackSmtpConfig = hasFeedbackSmtp
  ? {
      name: process.env.SMTP_NAME || 'testatozas.in',
      server: process.env.FEEDBACK_SMTP_SERVER || 'smtp.hostinger.com',
      port: parseInt(process.env.FEEDBACK_SMTP_PORT || '465', 10),
      secure:
        process.env.FEEDBACK_SMTP_SECURE === undefined
          ? true
          : process.env.FEEDBACK_SMTP_SECURE === 'true',
      email: feedbackSmtpUser,
      password: feedbackSmtpPass,
    }
  : null

const feedbackTransporter = feedbackSmtpConfig
  ? nodemailer.createTransport({
      host: feedbackSmtpConfig.server,
      port: feedbackSmtpConfig.port,
      secure: feedbackSmtpConfig.secure,
      auth: {
        user: feedbackSmtpConfig.email,
        pass: feedbackSmtpConfig.password,
      },
      tls: {
        rejectUnauthorized: false,
        servername: feedbackSmtpConfig.server,
        minVersion: 'TLSv1',
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      requireTLS: feedbackSmtpConfig.secure,
    })
  : null

if (feedbackTransporter) {
  feedbackTransporter.verify((err) => {
    if (err) {
      console.error(
        '❌ FEEDBACK SMTP verify failed:',
        err.message,
        `(user=${feedbackSmtpConfig.email}, host=${feedbackSmtpConfig.server}:${feedbackSmtpConfig.port})`
      )
    } else {
      console.log(
        `✅ FEEDBACK SMTP ready: ${feedbackSmtpConfig.email} via ${feedbackSmtpConfig.server}:${feedbackSmtpConfig.port}`
      )
    }
  })
} else {
  console.warn(
    '⚠️  FEEDBACK_SMTP_EMAIL / FEEDBACK_SMTP_PASSWORD not configured — falling back to default no-reply SMTP for /api/feedback'
  )
}

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// POST /api/feedback - submit feedback (auth required)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subject, message, category, rating } = req.body || {}

    const cleanMessage = String(message || '').trim()
    if (!cleanMessage || cleanMessage.length < 5) {
      return res.status(400).json({ error: 'Message must be at least 5 characters' })
    }
    if (cleanMessage.length > 5000) {
      return res.status(400).json({ error: 'Message is too long (max 5000 characters)' })
    }

    const cleanSubject = String(subject || '').trim().slice(0, 200) || 'New feedback from UMNAAPP user'
    const cleanCategory = String(category || 'General').trim().slice(0, 60)
    const numericRating = Number(rating)
    const cleanRating = Number.isFinite(numericRating) && numericRating >= 1 && numericRating <= 5
      ? Math.round(numericRating)
      : null

    // Pick the dedicated feedback transporter if configured, else fallback
    const transporter = feedbackTransporter || fallbackTransporter
    const senderConfig = feedbackSmtpConfig || fallbackSmtpConfig

    if (!transporter || !senderConfig) {
      console.error('Feedback: no SMTP transporter available')
      return res.status(503).json({ error: 'Feedback service is not configured' })
    }

    const user = req.user
    const userAgent = req.headers['user-agent'] || 'unknown'
    const submittedAt = new Date().toISOString()
    const toEmail = FEEDBACK_TO_EMAIL

    if (!user?.email) {
      return res.status(400).json({ error: 'User email not found on account' })
    }

    // Display name visible to the recipient in the "From" header.
    // The actual SMTP envelope sender is the authenticated mailbox so Hostinger
    // does not reject the message for spoofing.
    const fromDisplayName = (user.name || 'UMNAAPP User').replace(/"/g, "'")
    const fromHeader = `"${fromDisplayName} (${user.email})" <${senderConfig.email}>`

    const stars = cleanRating ? '★'.repeat(cleanRating) + '☆'.repeat(5 - cleanRating) : 'Not rated'

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
          <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);padding:24px;color:#fff;">
              <h1 style="margin:0;font-size:22px;">UMNAAPP — New Feedback</h1>
              <p style="margin:6px 0 0 0;font-size:13px;opacity:0.9;">${escapeHtml(cleanCategory)}</p>
            </div>
            <div style="padding:24px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b;">
                <tr>
                  <td style="padding:6px 0;color:#64748b;width:120px;">From</td>
                  <td style="padding:6px 0;"><strong>${escapeHtml(user.name || 'Unknown')}</strong></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;">Email</td>
                  <td style="padding:6px 0;"><a href="mailto:${escapeHtml(user.email)}" style="color:#0ea5e9;">${escapeHtml(user.email)}</a></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;">User ID</td>
                  <td style="padding:6px 0;font-family:monospace;font-size:12px;color:#475569;">${escapeHtml(user.id)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;">Category</td>
                  <td style="padding:6px 0;">${escapeHtml(cleanCategory)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;">Rating</td>
                  <td style="padding:6px 0;color:#f59e0b;font-size:16px;">${escapeHtml(stars)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;">Submitted</td>
                  <td style="padding:6px 0;color:#475569;">${escapeHtml(submittedAt)}</td>
                </tr>
              </table>

              <h3 style="margin:20px 0 8px 0;color:#0f172a;font-size:15px;">Subject</h3>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;color:#1e293b;font-size:14px;">
                ${escapeHtml(cleanSubject)}
              </div>

              <h3 style="margin:20px 0 8px 0;color:#0f172a;font-size:15px;">Message</h3>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;color:#1e293b;font-size:14px;line-height:1.6;white-space:pre-wrap;">
${escapeHtml(cleanMessage)}
              </div>

              <p style="margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">
                User-Agent: ${escapeHtml(userAgent)}
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    const text = [
      `UMNAAPP — New Feedback`,
      ``,
      `From: ${user.name || 'Unknown'} <${user.email}>`,
      `User ID: ${user.id}`,
      `Category: ${cleanCategory}`,
      `Rating: ${cleanRating ? `${cleanRating}/5` : 'Not rated'}`,
      `Submitted: ${submittedAt}`,
      ``,
      `Subject: ${cleanSubject}`,
      ``,
      `Message:`,
      cleanMessage,
      ``,
      `User-Agent: ${userAgent}`,
    ].join('\n')

    const info = await transporter.sendMail({
      // What recipient sees as "From" — user's name + email, but routed via
      // the authenticated SMTP mailbox to satisfy Hostinger anti-spoofing rules.
      from: fromHeader,
      sender: senderConfig.email,
      to: toEmail,
      // Clicking "Reply" in the inbox replies directly to the real user.
      replyTo: `"${fromDisplayName}" <${user.email}>`,
      subject: `[Feedback] [${cleanCategory}] ${cleanSubject} — ${user.email}`,
      text,
      html,
      headers: {
        'X-UMNAAPP-Feedback': 'true',
        'X-UMNAAPP-User-Email': user.email,
        'X-UMNAAPP-User-Id': user.id,
        'X-UMNAAPP-Category': cleanCategory,
      },
      // SMTP envelope must use the authenticated sender on Hostinger.
      envelope: {
        from: senderConfig.email,
        to: toEmail,
      },
    })

    console.log(
      `✅ Feedback email sent: ${info.messageId} | from=${user.email} (${user.name}) → ${toEmail}`
    )

    if (info?.rejected?.length) {
      console.error('❌ Feedback recipients rejected by SMTP:', info.rejected)
      return res.status(502).json({
        error: 'Mail server rejected the feedback recipient. Please try again later.',
      })
    }

    return res.json({
      success: true,
      message: 'Feedback received. Thank you!',
    })
  } catch (error) {
    console.error('Feedback submit error:', error)
    return res.status(500).json({ error: 'Failed to send feedback' })
  }
})

export default router
