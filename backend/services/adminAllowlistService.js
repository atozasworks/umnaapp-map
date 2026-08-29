import prisma from '../config/database.js'

/** Normalize and validate a Gmail address for admin access. */
export function normalizeAdminGmail(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase()
  if (!normalized) return null
  // Gmail only (including googlemail.com aliases used by some accounts).
  if (!/^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(normalized)) return null
  // Canonicalize googlemail.com → gmail.com
  return normalized.replace(/@googlemail\.com$/i, '@gmail.com')
}

export function isAdminAllowlistAvailable() {
  return Boolean(prisma.adminAllowedEmail)
}

export async function isAllowedAdminEmail(email) {
  const normalized = normalizeAdminGmail(email)
  if (!normalized || !prisma.adminAllowedEmail) return false
  try {
    const row = await prisma.adminAllowedEmail.findUnique({ where: { email: normalized } })
    return Boolean(row)
  } catch (e) {
    console.warn('[admin] allowlist lookup failed:', e.message)
    return false
  }
}

export async function listAllowedAdminEmails() {
  if (!prisma.adminAllowedEmail) return []
  return prisma.adminAllowedEmail.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, createdAt: true, createdBy: true },
  })
}

export async function addAllowedAdminEmail(email, createdBy = null) {
  const normalized = normalizeAdminGmail(email)
  if (!normalized) {
    const err = new Error('Only Gmail addresses (@gmail.com) are allowed')
    err.status = 400
    throw err
  }
  if (!prisma.adminAllowedEmail) {
    const err = new Error('Admin allowlist unavailable — apply add-admin-otp-auth.sql migration')
    err.status = 503
    throw err
  }
  try {
    return await prisma.adminAllowedEmail.create({
      data: {
        email: normalized,
        createdBy: createdBy ? normalizeAdminGmail(createdBy) || createdBy : null,
      },
      select: { id: true, email: true, createdAt: true, createdBy: true },
    })
  } catch (e) {
    if (e?.code === 'P2002') {
      const err = new Error('This Gmail address is already on the allowlist')
      err.status = 409
      throw err
    }
    throw e
  }
}

export async function removeAllowedAdminEmail(id) {
  if (!prisma.adminAllowedEmail) {
    const err = new Error('Admin allowlist unavailable')
    err.status = 503
    throw err
  }
  const count = await prisma.adminAllowedEmail.count()
  if (count <= 1) {
    const err = new Error('Cannot remove the last allowed admin Gmail address')
    err.status = 400
    throw err
  }
  try {
    await prisma.adminAllowedEmail.delete({ where: { id } })
    return { success: true }
  } catch (e) {
    if (e?.code === 'P2025') {
      const err = new Error('Allowed email not found')
      err.status = 404
      throw err
    }
    throw e
  }
}

/**
 * Seed allowlist from ADMIN_BOOTSTRAP_EMAILS (comma-separated Gmail addresses).
 * Safe to call on every boot — only inserts missing emails.
 */
export async function seedAdminBootstrapEmails() {
  if (!prisma.adminAllowedEmail) {
    console.warn(
      '⚠️  AdminAllowedEmail model unavailable — run: psql "$DATABASE_URL" -f backend/prisma/add-admin-otp-auth.sql'
    )
    return { inserted: 0 }
  }

  const raw = process.env.ADMIN_BOOTSTRAP_EMAILS || process.env.ADMIN_BOOTSTRAP_EMAIL || ''
  const emails = raw
    .split(/[,;\s]+/)
    .map((e) => normalizeAdminGmail(e))
    .filter(Boolean)

  if (!emails.length) {
    const count = await prisma.adminAllowedEmail.count().catch(() => 0)
    if (count === 0) {
      console.warn(
        '⚠️  No admin Gmail addresses configured. Set ADMIN_BOOTSTRAP_EMAILS (comma-separated @gmail.com) or add one after first login once seeded.'
      )
    }
    return { inserted: 0 }
  }

  let inserted = 0
  for (const email of emails) {
    try {
      await prisma.adminAllowedEmail.upsert({
        where: { email },
        create: { email, createdBy: 'bootstrap' },
        update: {},
      })
      inserted += 1
    } catch (e) {
      console.warn(`[admin] bootstrap seed failed for ${email}:`, e.message)
    }
  }
  if (inserted > 0) {
    console.log(`✅ Admin allowlist: ensured ${inserted} bootstrap Gmail address(es)`)
  }
  return { inserted }
}
