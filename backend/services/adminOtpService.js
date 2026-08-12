import prisma from '../config/database.js'
import { generateOtp, hashOtp, compareOtp, sendEmailOtp } from '../config/atozasAuth.js'
import { isAllowedAdminEmail, normalizeAdminGmail } from './adminAllowlistService.js'

const OTP_TTL_MS = 10 * 60 * 1000

export async function requestAdminOtp(email) {
  const normalized = normalizeAdminGmail(email)
  if (!normalized) {
    const err = new Error('Enter a valid Gmail address (@gmail.com)')
    err.status = 400
    throw err
  }

  const allowed = await isAllowedAdminEmail(normalized)
  if (!allowed) {
    const err = new Error('This email is not authorized for admin access')
    err.status = 403
    throw err
  }

  if (!prisma.adminOtp) {
    const err = new Error('Admin OTP unavailable — apply add-admin-otp-auth.sql migration')
    err.status = 503
    throw err
  }

  const otp = generateOtp(6)
  const otpHash = await hashOtp(otp)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)

  // Invalidate prior unused challenges for this email
  await prisma.adminOtp.deleteMany({
    where: { email: normalized, verified: false },
  })

  await prisma.adminOtp.create({
    data: { email: normalized, otpHash, expiresAt },
  })

  // Prefer dedicated admin subject via sendEmailOtp if available; fall back to generate path
  try {
    await sendEmailOtp(normalized, otp)
  } catch (e) {
    console.error('[admin] OTP email failed:', e.message)
    const err = new Error('Failed to send verification email. Check SMTP configuration.')
    err.status = 502
    throw err
  }

  return {
    success: true,
    email: normalized,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  }
}

export async function verifyAdminOtp(email, otp) {
  const normalized = normalizeAdminGmail(email)
  if (!normalized) {
    const err = new Error('Enter a valid Gmail address (@gmail.com)')
    err.status = 400
    throw err
  }
  const code = String(otp || '').trim()
  if (!/^\d{6}$/.test(code)) {
    const err = new Error('Enter the 6-digit verification code')
    err.status = 400
    throw err
  }

  const allowed = await isAllowedAdminEmail(normalized)
  if (!allowed) {
    const err = new Error('This email is not authorized for admin access')
    err.status = 403
    throw err
  }

  if (!prisma.adminOtp) {
    const err = new Error('Admin OTP unavailable')
    err.status = 503
    throw err
  }

  const challenge = await prisma.adminOtp.findFirst({
    where: {
      email: normalized,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!challenge) {
    const err = new Error('Code expired or not found. Request a new one.')
    err.status = 401
    throw err
  }

  const ok = await compareOtp(code, challenge.otpHash)
  if (!ok) {
    const err = new Error('Invalid verification code')
    err.status = 401
    throw err
  }

  await prisma.adminOtp.update({
    where: { id: challenge.id },
    data: { verified: true },
  })
  // Cleanup old rows for this email
  await prisma.adminOtp.deleteMany({
    where: { email: normalized, id: { not: challenge.id } },
  })

  return { email: normalized }
}
