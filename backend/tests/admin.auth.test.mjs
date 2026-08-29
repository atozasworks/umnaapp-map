/**
 * Admin OTP + allowlist auth tests.
 * Run: node --test tests/admin.auth.test.mjs
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateOtp, hashOtp } from '../config/atozasAuth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')

const TEST_JWT = 'test-jwt-secret-for-admin-otp-auth-32'
const TEST_EMAIL = 'umnaapp.admin.test@gmail.com'

describe('admin allowlist helpers', () => {
  test('normalizeAdminGmail accepts gmail and rejects others', async () => {
    const { normalizeAdminGmail } = await import('../services/adminAllowlistService.js')
    assert.equal(normalizeAdminGmail('  Foo.Bar@Gmail.com '), 'foo.bar@gmail.com')
    assert.equal(normalizeAdminGmail('user@googlemail.com'), 'user@gmail.com')
    assert.equal(normalizeAdminGmail('user@yahoo.com'), null)
    assert.equal(normalizeAdminGmail('not-an-email'), null)
  })
})

describe('admin session helpers (JWT_SECRET)', () => {
  let adminAuth

  before(async () => {
    process.env.JWT_SECRET = TEST_JWT
    process.env.ADMIN_SESSION_TTL = '1h'
    process.env.NODE_ENV = 'development'
    delete process.env.ADMIN_SECRET
    adminAuth = await import(`../middleware/adminAuth.js?jwt=${Date.now()}`)
  })

  test('create + verify session includes email', () => {
    const token = adminAuth.createAdminSessionToken(TEST_EMAIL)
    const payload = adminAuth.verifyAdminSessionToken(token)
    assert.ok(payload)
    assert.equal(payload.email, TEST_EMAIL)
    assert.equal(payload.role, 'admin')
  })

  test('revoked jti is rejected', () => {
    const token = adminAuth.createAdminSessionToken(TEST_EMAIL)
    const payload = adminAuth.verifyAdminSessionToken(token)
    adminAuth.revokeAdminSessionJti(payload.jti, payload.exp)
    assert.equal(adminAuth.verifyAdminSessionToken(token), null)
  })

  test('session cookie options are httpOnly and path-scoped', () => {
    const opts = adminAuth.adminSessionCookieOptions()
    assert.equal(opts.httpOnly, true)
    assert.equal(opts.path, '/api/admin')
  })
})

describe('admin OTP HTTP flow', () => {
  let server
  let base
  let cookieJar = ''
  let prisma

  before(async () => {
    process.env.JWT_SECRET = TEST_JWT
    process.env.ADMIN_SESSION_TTL = '1h'
    process.env.NODE_ENV = 'development'
    process.env.ADMIN_BOOTSTRAP_EMAILS = TEST_EMAIL

    prisma = (await import('../config/database.js')).default
    if (!prisma.adminAllowedEmail || !prisma.adminOtp) {
      throw new Error(
        'AdminAllowedEmail/AdminOtp models missing — run prisma generate and add-admin-otp-auth.sql'
      )
    }

    const { seedAdminBootstrapEmails } = await import('../services/adminAllowlistService.js')
    await seedAdminBootstrapEmails()

    const adminRoutes = (await import(`../routes/adminRoutes.js?otp=${Date.now()}`)).default
    const app = express()
    app.use(express.json())
    app.use('/api/admin', adminRoutes)
    server = createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    base = `http://127.0.0.1:${port}`
  })

  after(async () => {
    if (prisma?.adminOtp) {
      await prisma.adminOtp.deleteMany({ where: { email: TEST_EMAIL } }).catch(() => {})
    }
    if (server) await new Promise((resolve) => server.close(resolve))
  })

  function storeCookies(res) {
    const list = res.headers.getSetCookie?.() || []
    const header = res.headers.get('set-cookie')
    const cookies = list.length ? list : header ? [header] : []
    for (const c of cookies) {
      const pair = c.split(';')[0]
      if (pair.startsWith('umnaapp_admin_session=')) cookieJar = pair
    }
  }

  test('protected route without session returns 401', async () => {
    const res = await fetch(`${base}/api/admin/overview`)
    assert.equal(res.status, 401)
  })

  test('request-otp rejects non-gmail', async () => {
    const res = await fetch(`${base}/api/admin/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'someone@yahoo.com' }),
    })
    assert.equal(res.status, 400)
  })

  test('request-otp rejects email not on allowlist', async () => {
    const res = await fetch(`${base}/api/admin/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not.on.list@gmail.com' }),
    })
    assert.equal(res.status, 403)
  })

  test('verify-otp with planted challenge creates session cookie', async () => {
    const otp = generateOtp(6)
    const otpHash = await hashOtp(otp)
    await prisma.adminOtp.deleteMany({ where: { email: TEST_EMAIL } })
    await prisma.adminOtp.create({
      data: {
        email: TEST_EMAIL,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    const res = await fetch(`${base}/api/admin/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, otp }),
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.success, true)
    assert.equal(body.email, TEST_EMAIL)
    assert.equal(body.otp, undefined)
    storeCookies(res)
    assert.ok(cookieJar.startsWith('umnaapp_admin_session='))
    const setCookie = (res.headers.getSetCookie?.() || [res.headers.get('set-cookie')]).join(';')
    assert.match(setCookie, /HttpOnly/i)
  })

  test('session cookie grants access to protected admin API', async () => {
    const res = await fetch(`${base}/api/admin/models`, {
      headers: { Cookie: cookieJar },
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.models))
  })

  test('session endpoint reports authenticated email', async () => {
    const res = await fetch(`${base}/api/admin/session`, {
      headers: { Cookie: cookieJar },
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.authenticated, true)
    assert.equal(body.email, TEST_EMAIL)
  })

  test('settings allowlist list works when authenticated', async () => {
    const res = await fetch(`${base}/api/admin/settings/allowed-emails`, {
      headers: { Cookie: cookieJar },
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.emails))
    assert.ok(body.emails.some((e) => e.email === TEST_EMAIL))
  })

  test('settings can add and remove an extra gmail', async () => {
    const extra = 'umnaapp.admin.extra@gmail.com'
    const add = await fetch(`${base}/api/admin/settings/allowed-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
      body: JSON.stringify({ email: extra }),
    })
    assert.equal(add.status, 201)
    const added = await add.json()
    assert.equal(added.email.email, extra)

    const del = await fetch(
      `${base}/api/admin/settings/allowed-emails/${encodeURIComponent(added.email.id)}`,
      { method: 'DELETE', headers: { Cookie: cookieJar } }
    )
    assert.equal(del.status, 200)
  })

  test('ADMIN_SECRET login endpoint is gone', async () => {
    const res = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'anything' }),
    })
    // Unmatched route under adminAuth → 401 (no session)
    assert.equal(res.status, 401)
  })

  test('logout clears session', async () => {
    const res = await fetch(`${base}/api/admin/logout`, {
      method: 'POST',
      headers: { Cookie: cookieJar },
    })
    assert.equal(res.status, 200)
    const api = await fetch(`${base}/api/admin/models`, {
      headers: { Cookie: cookieJar },
    })
    assert.equal(api.status, 401)
  })
})

describe('source guards', () => {
  test('admin SPA uses OTP endpoints and not ADMIN_SECRET localStorage', () => {
    const apiSrc = fs.readFileSync(path.join(backendRoot, '../admin/src/lib/api.js'), 'utf8')
    const loginSrc = fs.readFileSync(path.join(backendRoot, '../admin/src/pages/Login.jsx'), 'utf8')
    assert.match(apiSrc, /auth\/request-otp/)
    assert.match(apiSrc, /auth\/verify-otp/)
    assert.match(apiSrc, /settings\/allowed-emails/)
    assert.doesNotMatch(apiSrc, /localStorage\.setItem/)
    assert.match(loginSrc, /Gmail|verification code/i)
    assert.doesNotMatch(loginSrc, /ADMIN_SECRET/)
  })

  test('adminAuth no longer depends on ADMIN_SECRET for sessions', () => {
    const source = fs.readFileSync(path.join(backendRoot, 'middleware/adminAuth.js'), 'utf8')
    assert.match(source, /JWT_SECRET/)
    assert.match(source, /isAllowedAdminEmail/)
    assert.doesNotMatch(source, /getAdminSecret\s*\(/)
  })
})
