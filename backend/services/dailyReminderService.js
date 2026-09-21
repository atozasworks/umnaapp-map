/**
 * Daily "Add a Place" reminder emails.
 *
 * Once per day we email every registered user who has a valid email address and
 * has NOT unsubscribed, inviting them to add a missing place to the UMNAAPP map.
 *
 * Design goals (mirrors services/legalService.js so the whole codebase stays
 * consistent):
 *   - Reuse the existing shared SMTP transporter (config/atozasAuth.js).
 *   - Never send the same user more than one reminder on the same calendar day
 *     (tracked via User.lastDailyReminderAt).
 *   - Never email users who opted out (User.dailyReminderOptOut).
 *   - Process users in bounded batches so it scales to a large user base.
 *   - Isolate failures: one bad recipient must not abort the rest.
 *   - Fully additive — does not touch auth, SSO, map, or user functionality.
 */
import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'
import { emailTransporter, smtpConfig } from '../config/atozasAuth.js'

// ---------------------------------------------------------------------------
// Config — drip send (Hostinger-safe): N users every INTERVAL minutes
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

/** How many recipients per wave (default 3). */
const DRIP_SIZE = (() => {
  const n = parseInt(process.env.DAILY_REMINDER_DRIP_SIZE || '', 10)
  return Number.isFinite(n) && n > 0 ? n : 3
})()

/** Minutes between waves (default 15). */
const DRIP_INTERVAL_MS = (() => {
  const mins = parseInt(process.env.DAILY_REMINDER_DRIP_INTERVAL_MINUTES || '', 10)
  if (Number.isFinite(mins) && mins > 0) return mins * 60_000
  const ms = parseInt(process.env.DAILY_REMINDER_DRIP_INTERVAL_MS || '', 10)
  return Number.isFinite(ms) && ms > 0 ? ms : 15 * 60_000
})()

/** Small pause between the few emails inside one wave. */
const WAVE_GAP_MS = (() => {
  const n = parseInt(process.env.DAILY_REMINDER_SEND_GAP_MS || '', 10)
  return Number.isFinite(n) && n >= 0 ? n : 3000
})()

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRateLimitedError(err) {
  const msg = String(err?.message || err?.response || '')
  const code = err?.responseCode
  return code === 451 || /ratelimit|rate.?limit|too many|try again later/i.test(msg)
}

/** One send with a couple of short retries (waves are already spaced 15 min apart). */
async function sendMailWithRetry(mailOptions, { maxAttempts = 3 } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await emailTransporter.sendMail(mailOptions)
      return
    } catch (err) {
      lastErr = err
      if (!isRateLimitedError(err) || attempt === maxAttempts) throw err
      const waitMs = 15_000 * attempt
      console.warn(
        `[dailyReminder] rate-limited (attempt ${attempt}/${maxAttempts}), waiting ${waitMs / 1000}s`
      )
      if (dripCampaign) {
        dripCampaign.waitingUntil = new Date(Date.now() + waitMs).toISOString()
        dripCampaign.firstError = err.message
      }
      await sleep(waitMs)
      if (dripCampaign) dripCampaign.waitingUntil = null
    }
  }
  throw lastErr
}

/** Whether the daily scheduler runs at all. Defaults to enabled. */
export function isDailyReminderEnabled() {
  return String(process.env.DAILY_REMINDER_ENABLED ?? 'true').toLowerCase() !== 'false'
}

/** Local hour of day (0–23) the reminder job fires. Defaults to 09:00. */
export function getDailyReminderHour() {
  const n = parseInt(process.env.DAILY_REMINDER_HOUR ?? '', 10)
  return Number.isFinite(n) && n >= 0 && n <= 23 ? n : 9
}

/** Where the "Add a Place" CTA points — the UMNAAPP map. */
function getMapAddPlaceUrl() {
  const explicit = (process.env.MAP_ADD_PLACE_URL || '').trim().replace(/\/+$/, '')
  if (explicit) return explicit
  const frontend = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '')
  // ?action=add-place is a harmless hint the frontend may use to open the
  // Add-a-Place flow; if unhandled it simply loads the map.
  return frontend ? `${frontend}/?action=add-place` : ''
}

// ---------------------------------------------------------------------------
// Unsubscribe tokens (stateless, signed with the app's JWT secret)
// ---------------------------------------------------------------------------

const UNSUB_PURPOSE = 'daily-reminder-unsub'

export function buildUnsubscribeToken(userId) {
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  // Long-lived on purpose: unsubscribe links must keep working indefinitely.
  return jwt.sign({ uid: userId, purpose: UNSUB_PURPOSE }, secret, { expiresIn: '3650d' })
}

export function verifyUnsubscribeToken(token) {
  const secret = process.env.JWT_SECRET
  if (!secret || !token) return null
  try {
    const decoded = jwt.verify(token, secret)
    if (decoded?.purpose !== UNSUB_PURPOSE || !decoded?.uid) return null
    return decoded.uid
  } catch {
    return null
  }
}

function buildUnsubscribeUrl(userId) {
  const token = buildUnsubscribeToken(userId)
  if (!token) return ''
  const base = (process.env.BACKEND_URL || process.env.FRONTEND_URL || '')
    .trim()
    .replace(/\/+$/, '')
  const path = `/api/reminders/unsubscribe?token=${encodeURIComponent(token)}`
  return base ? `${base}${path}` : path
}

// ---------------------------------------------------------------------------
// Preference updates (used by the unsubscribe/resubscribe routes)
// ---------------------------------------------------------------------------

export async function setDailyReminderOptOut(userId, optOut) {
  if (!userId) return null
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { dailyReminderOptOut: Boolean(optOut) },
      select: { id: true, email: true, dailyReminderOptOut: true },
    })
  } catch (e) {
    console.error('[dailyReminder] failed to update opt-out preference:', e.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// Email content
// ---------------------------------------------------------------------------

/** Escape a value for safe interpolation into HTML. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Friendly first-name-ish greeting; falls back to a warm generic. */
function friendlyName(name) {
  const clean = String(name || '').trim()
  if (!clean) return 'there'
  return clean.split(/\s+/)[0]
}

export function buildDailyReminderEmail({ userName, addPlaceUrl, unsubscribeUrl } = {}) {
  const brand = smtpConfig?.name || 'UMNAAPP'
  const name = friendlyName(userName)
  const safeName = escapeHtml(name)
  const cta = addPlaceUrl || '#'
  const subject = `${name}, your UMNAAPP account reminder`

  const text = [
    `Hi ${name},`,
    ``,
    `This is a short reminder from your UMNAAPP account.`,
    ``,
    `If you notice a hospital, shop, school, or any familiar place that is not on`,
    `your map yet, you can save it from your account when you are free.`,
    ``,
    `No rush — take your time. Your map is always ready when you need it.`,
    ``,
    addPlaceUrl ? `Continue to your account: ${addPlaceUrl}` : `Open UMNAAPP from your account anytime.`,
    ``,
    `Have a good day,`,
    `UMNAAPP`,
    unsubscribeUrl ? `\nIf you do not want account reminders, you can stop them here: ${unsubscribeUrl}` : '',
    ``,
    `Sent from ${brand}`,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Hi ${safeName}, this is a short reminder from your UMNAAPP account.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);padding:34px 32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;letter-spacing:0.5px;">UMNAAPP</h1>
              <p style="color:rgba(255,255,255,0.92);margin:6px 0 0;font-size:13px;">Account reminder</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 8px;">
              <h2 style="color:#0f172a;margin:0 0 4px;font-size:24px;font-weight:800;line-height:1.3;">Your account reminder</h2>
              <p style="color:#0f172a;font-size:16px;margin:20px 0 0;font-weight:600;">Hi ${safeName},</p>
              <p style="color:#475569;font-size:15px;line-height:1.7;margin:12px 0 0;">
                This is a short reminder from your UMNAAPP account.
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.7;margin:14px 0 0;">
                If you notice a hospital, shop, school, or any familiar place that is not on your map yet, you can save it from your account when you are free.
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.7;margin:14px 0 0;">
                No rush — take your time. Your map is always ready when you need it.
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:22px 32px 8px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);box-shadow:0 6px 16px rgba(2,132,199,0.35);">
                    <a href="${escapeHtml(cta)}" target="_blank" style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;border-radius:12px;">Continue to your account</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Closing -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <p style="color:#475569;font-size:14px;line-height:1.7;margin:0;">
                Have a good day,
              </p>
              <p style="color:#0f172a;font-size:14px;font-weight:700;margin:10px 0 0;">UMNAAPP</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:22px 32px 30px;border-top:1px solid #eef2f7;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;text-align:center;">
                Sent to your account email for UMNAAPP.<br>
                ${
                  unsubscribeUrl
                    ? `If you do not want account reminders, <a href="${escapeHtml(unsubscribeUrl)}" target="_blank" style="color:#0ea5e9;text-decoration:underline;font-weight:600;">you can stop them here</a>.`
                    : ''
                }
              </p>
              <p style="color:#cbd5e1;font-size:11px;margin:10px 0 0;text-align:center;">Sent from ${escapeHtml(brand)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Load users eligible for a reminder: has an email, not opted out, and
 * (unless force) not already emailed today. Kept lightweight (id/name/email).
 * Returns null when the feature columns are missing (migration not yet applied).
 */
async function loadCandidates({ force = false } = {}) {
  const since = startOfToday()
  try {
    return await prisma.user.findMany({
      where: {
        dailyReminderOptOut: false,
        email: { not: '' },
        ...(force
          ? {}
          : {
              OR: [{ lastDailyReminderAt: null }, { lastDailyReminderAt: { lt: since } }],
            }),
      },
      select: { id: true, name: true, email: true },
    })
  } catch (e) {
    // P2022 = column does not exist (migration pending). Fail soft with guidance.
    if (e.code === 'P2022' || /column .* does not exist/i.test(e.message || '')) {
      console.warn(
        '[dailyReminder] User reminder columns missing — run `npm run migrate:daily-reminders` and `npx prisma generate`. Skipping this run.'
      )
      return null
    }
    console.error('[dailyReminder] failed to load candidate users:', e.message)
    return null
  }
}

/**
 * Admin dashboard stats for daily reminders. Soft-fails if columns are missing.
 */
export async function getDailyReminderStats() {
  const since = startOfToday()
  const hour = getDailyReminderHour()
  const enabled = isDailyReminderEnabled()
  try {
    const [totalUsers, withEmail, optedOut, sentToday, eligibleToday, recent] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { email: { not: '' } } }),
        prisma.user.count({ where: { dailyReminderOptOut: true } }),
        prisma.user.count({
          where: { lastDailyReminderAt: { gte: since } },
        }),
        prisma.user.count({
          where: {
            dailyReminderOptOut: false,
            email: { not: '' },
            OR: [{ lastDailyReminderAt: null }, { lastDailyReminderAt: { lt: since } }],
          },
        }),
        prisma.user.findMany({
          where: { lastDailyReminderAt: { not: null } },
          orderBy: { lastDailyReminderAt: 'desc' },
          take: 50,
          select: {
            id: true,
            name: true,
            email: true,
            dailyReminderOptOut: true,
            lastDailyReminderAt: true,
          },
        }),
      ])

    return {
      totalUsers,
      withEmail,
      optedOut,
      sentToday,
      eligibleToday,
      schedulerEnabled: enabled,
      schedulerHour: hour,
      recent,
    }
  } catch (e) {
    if (e.code === 'P2022' || /column .* does not exist/i.test(e.message || '')) {
      return {
        error:
          'Reminder columns missing — run `npm run migrate:daily-reminders` and `npx prisma generate`.',
        totalUsers: 0,
        withEmail: 0,
        optedOut: 0,
        sentToday: 0,
        eligibleToday: 0,
        schedulerEnabled: enabled,
        schedulerHour: hour,
        recent: [],
      }
    }
    throw e
  }
}

// ---------------------------------------------------------------------------
// Drip campaign: admin clicks once → send DRIP_SIZE users, then auto every N min
// ---------------------------------------------------------------------------

/**
 * In-memory drip state. Survives for the life of the Node process.
 * queue holds remaining recipients; a timer fires the next wave.
 */
let dripCampaign = null
let dripTimer = null
let waveInFlight = false

function clearDripTimer() {
  if (dripTimer) {
    clearTimeout(dripTimer)
    dripTimer = null
  }
}

function publicDripStatus() {
  if (!dripCampaign) {
    return {
      status: 'idle',
      mode: 'drip',
      sent: 0,
      failed: 0,
      remaining: 0,
      total: 0,
      dripSize: DRIP_SIZE,
      intervalMinutes: Math.round(DRIP_INTERVAL_MS / 60_000),
      startedAt: null,
      finishedAt: null,
      nextBatchAt: null,
      lastBatchAt: null,
      firstError: null,
      waitingUntil: null,
    }
  }
  const { queue, ...rest } = dripCampaign
  return {
    ...rest,
    remaining: Array.isArray(queue) ? queue.length : 0,
    dripSize: DRIP_SIZE,
    intervalMinutes: Math.round(DRIP_INTERVAL_MS / 60_000),
  }
}

/** Snapshot for admin UI (keeps old `run` field name). */
export function getDailyReminderRunStatus() {
  return publicDripStatus()
}

async function sendOneReminder(user, { from, addPlaceUrl }) {
  const unsubscribeUrl = buildUnsubscribeUrl(user.id)
  const { subject, text, html } = buildDailyReminderEmail({
    userName: user.name,
    addPlaceUrl,
    unsubscribeUrl,
  })
  await sendMailWithRetry({
    from,
    to: user.email,
    subject,
    text,
    html,
    replyTo: smtpConfig.email,
    headers: {
      'X-Mailer': 'UMNAAPP',
      ...(unsubscribeUrl ? { 'List-Unsubscribe': `<${unsubscribeUrl}>` } : {}),
    },
  })
}

/**
 * Send the next wave (up to DRIP_SIZE users) from the active campaign queue.
 * Schedules the following wave automatically when recipients remain.
 */
async function processDripWave() {
  if (!dripCampaign || dripCampaign.status !== 'running') return
  if (waveInFlight) return
  waveInFlight = true
  clearDripTimer()

  try {
    if (!emailTransporter || !smtpConfig?.email) {
      dripCampaign.status = 'done'
      dripCampaign.finishedAt = new Date().toISOString()
      dripCampaign.firstError = 'SMTP not configured'
      dripCampaign.nextBatchAt = null
      return
    }

    const wave = dripCampaign.queue.splice(0, DRIP_SIZE)
    if (wave.length === 0) {
      dripCampaign.status = 'done'
      dripCampaign.finishedAt = new Date().toISOString()
      dripCampaign.nextBatchAt = null
      console.log(
        `[dailyReminder] drip complete — sent=${dripCampaign.sent} failed=${dripCampaign.failed} total=${dripCampaign.total}`
      )
      return
    }

    const from = `"UMNAAPP" <${smtpConfig.email}>`
    const addPlaceUrl = getMapAddPlaceUrl()
    const now = new Date()
    const sentIds = []

    console.log(
      `[dailyReminder] drip wave — sending ${wave.length}, remaining after=${dripCampaign.queue.length}`
    )

    for (let i = 0; i < wave.length; i++) {
      const user = wave[i]
      try {
        await sendOneReminder(user, { from, addPlaceUrl })
        dripCampaign.sent += 1
        sentIds.push(user.id)
      } catch (err) {
        dripCampaign.failed += 1
        const msg = err?.message || String(err)
        if (!dripCampaign.firstError) dripCampaign.firstError = msg
        console.warn(`[dailyReminder] send failed for ${user.email}:`, msg)
        // Rate-limited: put this user + rest of wave back for the next interval.
        if (isRateLimitedError(err)) {
          const requeue = [user, ...wave.slice(i + 1)]
          dripCampaign.queue.unshift(...requeue)
          dripCampaign.failed -= 1 // don't count as permanent fail; will retry
          console.warn(
            `[dailyReminder] rate-limited — re-queued ${requeue.length}; next wave in ${Math.round(DRIP_INTERVAL_MS / 60000)} min`
          )
          break
        }
      }
      dripCampaign.lastBatchAt = new Date().toISOString()
      if (WAVE_GAP_MS > 0 && i < wave.length - 1) await sleep(WAVE_GAP_MS)
    }

    if (sentIds.length) {
      try {
        await prisma.user.updateMany({
          where: { id: { in: sentIds } },
          data: { lastDailyReminderAt: now },
        })
      } catch (e) {
        console.error('[dailyReminder] failed to record lastDailyReminderAt:', e.message)
      }
    }

    if (dripCampaign.queue.length === 0) {
      dripCampaign.status = 'done'
      dripCampaign.finishedAt = new Date().toISOString()
      dripCampaign.nextBatchAt = null
      console.log(
        `[dailyReminder] drip complete — sent=${dripCampaign.sent} failed=${dripCampaign.failed} total=${dripCampaign.total}`
      )
      return
    }

    const nextAt = Date.now() + DRIP_INTERVAL_MS
    dripCampaign.nextBatchAt = new Date(nextAt).toISOString()
    console.log(
      `[dailyReminder] next drip wave at ${dripCampaign.nextBatchAt} (${dripCampaign.queue.length} left)`
    )
    dripTimer = setTimeout(() => {
      processDripWave().catch((e) =>
        console.error('[dailyReminder] drip wave error:', e.message)
      )
    }, DRIP_INTERVAL_MS)
  } finally {
    waveInFlight = false
  }
}

/**
 * Start (or reject if already running) a drip campaign.
 * Returns immediately after queueing — first wave runs async (no HTTP timeout).
 */
export async function startReminderDrip({ force = false } = {}) {
  if (dripCampaign?.status === 'running') {
    return {
      skipped: true,
      alreadyRunning: true,
      started: false,
      run: publicDripStatus(),
      error: 'A reminder drip is already running. Wait for it to finish.',
    }
  }

  if (!emailTransporter || !smtpConfig?.email) {
    return { skipped: true, started: false, sent: 0, failed: 0, total: 0, error: 'SMTP not configured' }
  }

  const candidates = await loadCandidates({ force })
  if (candidates == null) {
    return {
      skipped: true,
      started: false,
      error: 'Reminder columns missing — run migrate:daily-reminders',
    }
  }

  const seen = new Set()
  const recipients = candidates.filter((u) => {
    const email = String(u.email || '').trim().toLowerCase()
    if (!email || !email.includes('@') || seen.has(email)) return false
    seen.add(email)
    return true
  })

  if (recipients.length === 0) {
    dripCampaign = {
      status: 'done',
      mode: 'drip',
      queue: [],
      sent: 0,
      failed: 0,
      total: 0,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      nextBatchAt: null,
      lastBatchAt: null,
      firstError: null,
      waitingUntil: null,
    }
    return { started: false, sent: 0, failed: 0, total: 0, message: 'No eligible recipients' }
  }

  clearDripTimer()
  dripCampaign = {
    status: 'running',
    mode: 'drip',
    queue: recipients.map((u) => ({ id: u.id, name: u.name, email: u.email })),
    sent: 0,
    failed: 0,
    total: recipients.length,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    nextBatchAt: new Date().toISOString(),
    lastBatchAt: null,
    firstError: null,
    waitingUntil: null,
  }

  console.log(
    `[dailyReminder] drip started — ${recipients.length} user(s), ${DRIP_SIZE} every ${Math.round(DRIP_INTERVAL_MS / 60000)} min`
  )

  // First wave in background so the admin HTTP request never waits on SMTP.
  setImmediate(() => {
    processDripWave().catch((e) =>
      console.error('[dailyReminder] first drip wave error:', e.message)
    )
  })

  return {
    started: true,
    total: recipients.length,
    dripSize: DRIP_SIZE,
    intervalMinutes: Math.round(DRIP_INTERVAL_MS / 60_000),
    run: publicDripStatus(),
    message: `Started: ${DRIP_SIZE} users now, then ${DRIP_SIZE} every ${Math.round(DRIP_INTERVAL_MS / 60000)} minutes until all ${recipients.length} are done.`,
  }
}

/** @deprecated Prefer startReminderDrip — kept for scripts / daily scheduler. */
export async function sendDailyReminders({ force = false } = {}) {
  return startReminderDrip({ force })
}

// ---------------------------------------------------------------------------
// Reminder scheduling is disabled by requirement: only the admin panel can
// start a reminder drip. Keep this function as a no-op so the app does not
// run any background reminder sends outside that explicit admin action.
// ---------------------------------------------------------------------------

let schedulerStarted = false

export function startDailyReminderScheduler() {
  if (schedulerStarted) {
    return { enabled: false, manualOnly: true, started: false }
  }

  schedulerStarted = true
  console.log('🔒 Daily reminder scheduler disabled — manual sends only from the admin panel.')
  return {
    enabled: false,
    manualOnly: true,
    started: false,
    message: 'Manual reminder sends only — trigger from the admin panel.'
  }
}
