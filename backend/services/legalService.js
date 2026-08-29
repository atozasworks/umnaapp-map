import prisma from '../config/database.js'
import { emailTransporter, smtpConfig } from '../config/atozasAuth.js'
import { DEFAULT_LEGAL_DOCS, LEGAL_TYPES, defaultTitleFor } from '../config/legalDefaults.js'

/**
 * Editable legal documents (Privacy Policy, Terms & Conditions).
 *
 * A single row per `type` holds the current content shown to every user. The
 * admin panel edits the content; each save bumps `version` and triggers an
 * email announcing the change to all users. If the table has not been migrated
 * yet (or the Prisma client not regenerated) reads gracefully fall back to the
 * built-in defaults so the app never breaks.
 */

function hasModel() {
  return Boolean(prisma?.legalDocument && typeof prisma.legalDocument.findUnique === 'function')
}

function normalizeType(type) {
  const t = String(type || '').trim().toLowerCase()
  return LEGAL_TYPES.includes(t) ? t : null
}

/** Shape returned to clients (adds a fromDefault flag when not yet persisted). */
function serialize(doc, { fromDefault = false } = {}) {
  return {
    type: doc.type,
    title: doc.title,
    content: doc.content,
    version: doc.version ?? 1,
    updatedAt: doc.updatedAt ?? null,
    updatedBy: doc.updatedBy ?? null,
    fromDefault,
  }
}

/** Get a single legal document, falling back to the seed default. */
export async function getLegalDocument(type) {
  const t = normalizeType(type)
  if (!t) return null

  if (hasModel()) {
    try {
      const existing = await prisma.legalDocument.findUnique({ where: { type: t } })
      if (existing) return serialize(existing)
    } catch (e) {
      // Table missing / not migrated yet — fall through to defaults.
      if (e.code !== 'P2021' && !/does not exist/i.test(e.message || '')) {
        console.warn('[legal] getLegalDocument read error:', e.message)
      }
    }
  }

  const def = DEFAULT_LEGAL_DOCS[t]
  return serialize({ ...def, version: 1, updatedAt: null, updatedBy: null }, { fromDefault: true })
}

/** Get all legal documents (privacy + terms). */
export async function getAllLegalDocuments() {
  const docs = []
  for (const t of LEGAL_TYPES) {
    const d = await getLegalDocument(t)
    if (d) docs.push(d)
  }
  return docs
}

/**
 * Create or update a legal document. Bumps version on every save and stamps
 * updatedAt automatically. Returns the saved (serialized) document.
 */
export async function upsertLegalDocument(type, { title, content }, actor = 'admin') {
  const t = normalizeType(type)
  if (!t) throw new Error('Invalid document type')
  if (!hasModel()) {
    throw new Error(
      'LegalDocument model unavailable. Run backend migration prisma/add-legal-documents.sql and `npx prisma generate`.'
    )
  }

  const cleanContent = String(content ?? '').trim()
  if (!cleanContent) throw new Error('Content is required')
  const cleanTitle = String(title ?? '').trim() || defaultTitleFor(t)

  const existing = await prisma.legalDocument.findUnique({ where: { type: t } })
  const nextVersion = (existing?.version ?? 0) + 1

  const saved = await prisma.legalDocument.upsert({
    where: { type: t },
    update: { title: cleanTitle, content: cleanContent, version: nextVersion, updatedBy: actor },
    create: { type: t, title: cleanTitle, content: cleanContent, version: nextVersion, updatedBy: actor },
  })

  return serialize(saved)
}

function buildLegalEmail(doc) {
  const label = doc.title || defaultTitleFor(doc.type)
  const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '')
  const settingsUrl = frontendUrl ? `${frontendUrl}/settings` : ''
  const brand = smtpConfig?.name || 'UMNAAPP'

  const text = [
    `${label} — Updated`,
    '',
    `We have updated our ${label}. By continuing to use UMNAAPP you agree to the revised ${label}.`,
    settingsUrl ? `\nView the latest version: ${settingsUrl}` : '',
    '',
    `Sent from ${brand}`,
  ].join('\n')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f5f5f5;">
      <div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:bold;">UMNAAPP</h1>
          <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">Policy update</p>
        </div>
        <div style="padding:36px;">
          <h2 style="color:#1e293b;margin-top:0;font-size:22px;">Our ${label} has changed</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;">
            We've made updates to our <strong>${label}</strong>. Please take a moment to review the latest version.
            By continuing to use UMNAAPP, you agree to the revised ${label}.
          </p>
          ${
            settingsUrl
              ? `<div style="text-align:center;margin:28px 0;">
                   <a href="${settingsUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:bold;">View ${label}</a>
                 </div>`
              : ''
          }
          <p style="color:#94a3b8;font-size:12px;margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0;">
            You are receiving this email because you have an account on UMNAAPP.<br>
            This email was sent from <strong>${brand}</strong>.
          </p>
        </div>
      </div>
    </body>
    </html>`

  return { subject: `Important: Our ${label} has been updated`, text, html }
}

/**
 * Email every user that a legal document changed. Runs in batches and never
 * throws — designed to be fired-and-forgotten after the admin save responds.
 * Returns a summary { sent, failed, total, skipped }.
 */
export async function sendLegalUpdateEmails(doc) {
  if (!emailTransporter || !smtpConfig?.email) {
    console.warn('[legal] update email skipped — SMTP not configured')
    return { skipped: true, sent: 0, failed: 0, total: 0 }
  }

  let users = []
  try {
    // Every user with an email address — matches the "notify all users" intent.
    users = await prisma.user.findMany({
      where: { email: { not: '' } },
      select: { email: true },
    })
  } catch (e) {
    console.error('[legal] failed to load users for email:', e.message)
    return { skipped: true, sent: 0, failed: 0, total: 0, error: e.message }
  }

  const recipients = [
    ...new Set(
      users
        .map((u) => String(u.email || '').trim().toLowerCase())
        .filter((e) => e && e.includes('@'))
    ),
  ]

  if (recipients.length === 0) {
    return { skipped: true, sent: 0, failed: 0, total: 0 }
  }

  const { subject, text, html } = buildLegalEmail(doc)
  const from = `"UMNAAPP" <${smtpConfig.email}>`

  let sent = 0
  let failed = 0
  const BATCH_SIZE = 20

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map((to) =>
        emailTransporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
          replyTo: smtpConfig.email,
          headers: { 'X-Mailer': 'UMNAAPP', 'Precedence': 'bulk' },
        })
      )
    )
    for (const r of results) {
      if (r.status === 'fulfilled') sent += 1
      else {
        failed += 1
        console.warn('[legal] email send failed:', r.reason?.message || r.reason)
      }
    }
  }

  console.log(
    `[legal] ${doc.type} update emailed — sent=${sent} failed=${failed} total=${recipients.length}`
  )
  return { sent, failed, total: recipients.length }
}
