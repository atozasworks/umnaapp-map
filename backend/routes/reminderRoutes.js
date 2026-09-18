/**
 * Daily-reminder preference routes (public, no login required).
 *
 * These are reachable directly from an email link, so they must work without a
 * session. Security comes from a signed, single-purpose JWT token embedded in
 * the link (see services/dailyReminderService.js). They return a small, styled
 * HTML confirmation page. Nothing here touches auth, SSO, map, or user APIs.
 */
import express from 'express'
import {
  verifyUnsubscribeToken,
  setDailyReminderOptOut,
  buildUnsubscribeToken,
} from '../services/dailyReminderService.js'

const router = express.Router()

function page({ title, heading, message, accent = '#0ea5e9', action }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);padding:28px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">UMNAAPP</h1>
        </td></tr>
        <tr><td style="padding:36px 32px;text-align:center;">
          <h2 style="color:${accent};margin:0 0 12px;font-size:22px;">${heading}</h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">${message}</p>
          ${action || ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * GET /api/reminders/unsubscribe?token=...
 * One-click unsubscribe from daily reminder emails.
 */
router.get('/unsubscribe', async (req, res) => {
  const userId = verifyUnsubscribeToken(req.query.token)
  if (!userId) {
    return res.status(400).send(
      page({
        title: 'Invalid link',
        heading: 'Link not valid',
        message: 'This unsubscribe link is invalid or has expired. Please use the link from a recent email.',
        accent: '#dc2626',
      })
    )
  }

  const updated = await setDailyReminderOptOut(userId, true)
  if (!updated) {
    return res.status(500).send(
      page({
        title: 'Something went wrong',
        heading: 'Please try again',
        message: "We couldn't update your preference right now. Please try again in a little while.",
        accent: '#dc2626',
      })
    )
  }

  const resubToken = buildUnsubscribeToken(userId)
  const resubAction = resubToken
    ? `<div style="margin-top:24px;"><a href="/api/reminders/resubscribe?token=${encodeURIComponent(
        resubToken
      )}" style="display:inline-block;padding:12px 28px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Resubscribe</a></div>`
    : ''

  return res.status(200).send(
    page({
      title: 'Unsubscribed',
      heading: "You're unsubscribed ✅",
      message:
        "You won't receive daily reminder emails from UMNAAPP anymore. We're sorry to see you go — changed your mind?",
      action: resubAction,
    })
  )
})

/**
 * GET /api/reminders/resubscribe?token=...
 * Re-enable daily reminder emails (uses the same signed token).
 */
router.get('/resubscribe', async (req, res) => {
  const userId = verifyUnsubscribeToken(req.query.token)
  if (!userId) {
    return res.status(400).send(
      page({
        title: 'Invalid link',
        heading: 'Link not valid',
        message: 'This link is invalid or has expired.',
        accent: '#dc2626',
      })
    )
  }

  const updated = await setDailyReminderOptOut(userId, false)
  if (!updated) {
    return res.status(500).send(
      page({
        title: 'Something went wrong',
        heading: 'Please try again',
        message: "We couldn't update your preference right now. Please try again in a little while.",
        accent: '#dc2626',
      })
    )
  }

  return res.status(200).send(
    page({
      title: 'Resubscribed',
      heading: 'Welcome back! 🎉',
      message: "You'll receive our friendly daily reminders again. Thank you for helping build a better map!",
    })
  )
})

export default router
