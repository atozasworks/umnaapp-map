import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import session from 'express-session'
import '../loadEnv.js'
import prisma from '../config/database.js'
import { createAtozasSsoRouter, defaultFindOrCreateUser } from '../config/atozasSso.js'
import { readOidcConfig, sealOidcState } from '../utils/atozasOidc.js'

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function cookieJar() {
  const cookies = new Map()
  return {
    store(res) {
      const raw = res.headers.getSetCookie?.() || []
      const fallback = res.headers.get('set-cookie')
      const list = raw.length ? raw : fallback ? [fallback] : []
      for (const item of list) {
        const pair = String(item).split(';')[0]
        const eq = pair.indexOf('=')
        if (eq > 0) cookies.set(pair.slice(0, eq), pair.slice(eq + 1))
      }
    },
    header() {
      return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
    },
    get(name) {
      return cookies.get(name)
    },
  }
}

function testConfig(overrides = {}) {
  return {
    enabled: true,
    configured: true,
    issuer: 'https://idp.test/atozaswebsite',
    clientId: 'test-client',
    clientSecret: 'test-secret',
    redirectUri: 'http://127.0.0.1/auth/atozas/callback',
    scope: 'openid email profile',
    authorizeUrl: 'https://idp.test/sso/authorize',
    tokenUrl: 'https://idp.test/sso/token',
    userinfoUrl: 'https://idp.test/sso/userinfo',
    revokeUrl: 'https://idp.test/sso/revoke',
    discoveryUrl: '',
    homepageKey: 'umnaapp',
    tokenAuthStyle: 'body',
    autoRedirect: false,
    databaseUrl: 'postgresql://u:p@localhost:5432/umnaapp',
    sessionCookieName: 'test_atozas_sid',
    sessionSecret: 'test-session-secret-value-32chars',
    sessionCollection: 'atozas_sessions',
    sessionMaxAgeMs: 30 * 24 * 60 * 60 * 1000,
    cookieSecure: false,
    cookieSameSite: 'lax',
    frontendUrl: 'http://app.test',
    jwtSecret: 'test-jwt',
    ...overrides,
  }
}

async function listen(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const { port } = server.address()
  return { server, base: `http://127.0.0.1:${port}` }
}

describe('ATOZAS SSO disabled', () => {
  let server
  let base

  before(async () => {
    const app = express()
    app.use(
      '/auth',
      createAtozasSsoRouter({
        config: readOidcConfig({ ATOZAS_SSO_ENABLED: 'false', JWT_SECRET: 'jwt' }),
      })
    )
    ;({ server, base } = await listen(app))
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  test('GET /auth/atozas/me reports SSO disabled', async () => {
    const res = await fetch(`${base}/auth/atozas/me`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.enabled, false)
    assert.equal(body.authenticated, false)
  })

  test('GET /auth/atozas is fully disabled', async () => {
    const res = await fetch(`${base}/auth/atozas`, { redirect: 'manual' })
    assert.equal(res.status, 404)
    const body = await res.json()
    assert.equal(body.error, 'atozas_sso_disabled')
  })

  test('POST /auth/logout is fully disabled', async () => {
    const res = await fetch(`${base}/auth/logout`, { method: 'POST' })
    assert.equal(res.status, 404)
  })
})

describe('ATOZAS SSO login → callback → JWT → me → logout', () => {
  let server
  let base
  let users
  let issued
  let revoked
  let fetchLog
  const MemoryStore = session.MemoryStore

  before(async () => {
    users = new Map()
    issued = []
    revoked = []
    fetchLog = []
    const store = new MemoryStore()
    const config = testConfig()

    const fetchImpl = async (url, opts = {}) => {
      const target = String(url)
      fetchLog.push({ url: target, method: opts.method || 'GET', body: opts.body ? String(opts.body) : '' })
      if (target.includes('/sso/token')) {
        const params = new URLSearchParams(String(opts.body || ''))
        assert.equal(params.get('grant_type'), 'authorization_code')
        assert.equal(params.get('code'), 'good-code')
        assert.ok(params.get('code_verifier'))
        assert.equal(params.get('client_secret'), 'test-secret')
        assert.equal(opts.headers?.Authorization, undefined)
        return jsonResponse(200, {
          access_token: 'provider-access',
          refresh_token: 'provider-refresh',
          token_type: 'Bearer',
        })
      }
      if (target.includes('/sso/userinfo')) {
        assert.match(String(opts.headers?.Authorization || ''), /Bearer provider-access/)
        return jsonResponse(200, {
          email: 'sso.user@example.com',
          name: 'SSO User',
          email_verified: true,
        })
      }
      if (target.includes('/sso/revoke')) {
        return jsonResponse(200, {})
      }
      return jsonResponse(200, {
        authorization_endpoint: config.authorizeUrl,
        token_endpoint: config.tokenUrl,
        userinfo_endpoint: config.userinfoUrl,
        revocation_endpoint: config.revokeUrl,
      })
    }

    const app = express()
    app.use(
      '/auth',
      createAtozasSsoRouter({
        config,
        sessionStore: store,
        fetchImpl,
        findOrCreateUser: async (userinfo) => {
          const email = String(userinfo.email).toLowerCase()
          if (!users.has(email)) {
            users.set(email, {
              id: 'user-sso-1',
              name: userinfo.name,
              email,
              emailVerified: true,
              picture: null,
            })
          }
          return users.get(email)
        },
        issueAppSession: async (user) => {
          const token = `app-jwt-${user.id}`
          issued.push(token)
          return { token, user }
        },
        revokeAppSession: async (token) => {
          revoked.push(token)
        },
        getUserById: async (id) => [...users.values()].find((u) => u.id === id) || null,
        isAppTokenValid: async (token) => issued.includes(token) && !revoked.includes(token),
      })
    )
    ;({ server, base } = await listen(app))
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  test('completes OIDC PKCE login, restores JWT, and logs out', async () => {
    const jar = cookieJar()

    const start = await fetch(`${base}/auth/atozas?returnTo=/settings`, { redirect: 'manual' })
    assert.equal(start.status, 302)
    const authorize = new URL(start.headers.get('location'))
    assert.equal(authorize.origin + authorize.pathname, 'https://idp.test/sso/authorize')
    assert.equal(authorize.searchParams.get('response_type'), 'code')
    assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256')
    assert.ok(authorize.searchParams.get('code_challenge'))
    assert.equal(authorize.searchParams.get('code_verifier'), null)
    assert.equal(authorize.searchParams.get('homepage_key'), 'umnaapp')
    assert.equal(authorize.searchParams.get('redirect_uri'), 'http://127.0.0.1/auth/atozas/callback')
    const state = authorize.searchParams.get('state')
    assert.ok(state)
    assert.match(state, /^[0-9a-f]{32}$/)

    const badState = await fetch(`${base}/auth/atozas/callback?code=good-code&state=wrong`, {
      redirect: 'manual',
    })
    assert.equal(badState.status, 302)
    assert.match(badState.headers.get('location'), /atozas_session_expired/)

    const callback = await fetch(`${base}/auth/atozas/callback?code=good-code&state=${encodeURIComponent(state)}`, {
      redirect: 'manual',
    })
    jar.store(callback)
    assert.equal(callback.status, 302)
    const landed = new URL(callback.headers.get('location'))
    assert.equal(landed.origin, 'http://app.test')
    assert.equal(landed.pathname, '/settings')
    assert.equal(landed.searchParams.get('token'), 'app-jwt-user-sso-1')
    assert.equal(users.get('sso.user@example.com').id, 'user-sso-1')
    assert.equal(issued[0], 'app-jwt-user-sso-1')

    const tokenCall = fetchLog.find((e) => e.url.includes('/sso/token'))
    assert.ok(tokenCall)
    assert.match(tokenCall.body, /code_verifier=/)
    assert.doesNotMatch(JSON.stringify(fetchLog), /provider-access/)

    const me = await fetch(`${base}/auth/atozas/me`, {
      headers: { cookie: jar.header(), Accept: 'application/json' },
    })
    assert.equal(me.status, 200)
    const meBody = await me.json()
    assert.equal(meBody.enabled, true)
    assert.equal(meBody.authenticated, true)
    assert.equal(meBody.token, 'app-jwt-user-sso-1')
    assert.equal(meBody.user.email, 'sso.user@example.com')

    const statusOnlyLive = await fetch(`${base}/auth/atozas/me?restore=0`, {
      headers: { cookie: jar.header(), Accept: 'application/json' },
    })
    const statusOnlyLiveBody = await statusOnlyLive.json()
    assert.equal(statusOnlyLiveBody.enabled, true)
    assert.equal(statusOnlyLiveBody.authenticated, false)
    assert.equal(statusOnlyLiveBody.token, undefined)

    const logout = await fetch(`${base}/auth/logout`, {
      method: 'POST',
      headers: { cookie: jar.header(), Accept: 'application/json' },
    })
    const previousCookie = jar.header()
    jar.store(logout)
    assert.equal(logout.status, 200)
    assert.deepEqual(revoked, ['app-jwt-user-sso-1'])
    assert.ok(fetchLog.some((e) => e.url.includes('/sso/revoke')))

    const after = await fetch(`${base}/auth/atozas/me`, {
      headers: { cookie: jar.header(), Accept: 'application/json' },
    })
    const afterBody = await after.json()
    assert.equal(afterBody.authenticated, false)

    const stale = await fetch(`${base}/auth/atozas/me`, {
      headers: { cookie: previousCookie, Accept: 'application/json' },
    })
    const staleBody = await stale.json()
    assert.equal(staleBody.authenticated, false)

    const statusOnly = await fetch(`${base}/auth/atozas/me?restore=0`, {
      headers: { cookie: previousCookie, Accept: 'application/json' },
    })
    const statusBody = await statusOnly.json()
    assert.equal(statusBody.enabled, true)
    assert.equal(statusBody.authenticated, false)
    assert.equal(statusBody.token, undefined)
  })

  test('callback still accepts a legacy sealed state', async () => {
    const sealed = sealOidcState(
      { v: 'legacy-verifier', n: 'nonce', r: '/', t: Date.now() },
      'test-session-secret-value-32chars'
    )
    const callback = await fetch(`${base}/auth/atozas/callback?code=good-code&state=${encodeURIComponent(sealed)}`, {
      redirect: 'manual',
    })
    assert.equal(callback.status, 302)
    assert.match(callback.headers.get('location'), /token=/)
  })

  test('reuses an existing user when the email already exists', async () => {
    const jar = cookieJar()
    users.set('sso.user@example.com', {
      id: 'existing-user',
      name: 'Already Here',
      email: 'sso.user@example.com',
      emailVerified: false,
      picture: null,
    })

    const start = await fetch(`${base}/auth/atozas`, { redirect: 'manual' })
    const state = new URL(start.headers.get('location')).searchParams.get('state')
    const callback = await fetch(`${base}/auth/atozas/callback?code=good-code&state=${encodeURIComponent(state)}`, {
      redirect: 'manual',
    })
    const landed = new URL(callback.headers.get('location'))
    assert.equal(landed.searchParams.get('token'), 'app-jwt-existing-user')
    assert.equal(users.size, 1)
    assert.equal(users.get('sso.user@example.com').id, 'existing-user')
  })
})

describe('ATOZAS SSO find-or-create uses the existing user table', () => {
  test('reuses an existing verified user and creates one when missing', async () => {
    const email = `atozas-sso-test-${Date.now()}@example.com`
    let created
    try {
      created = await defaultFindOrCreateUser({
        email,
        name: 'SSO New User',
      })
      assert.equal(created.email.toLowerCase(), email)
      assert.equal(created.emailVerified, true)
      assert.equal(created.name, 'SSO New User')

      const reused = await defaultFindOrCreateUser({
        email: email.toUpperCase(),
        name: 'Should Not Overwrite',
      })
      assert.equal(reused.id, created.id)
      assert.equal(reused.name, 'SSO New User')
    } finally {
      if (created?.id) {
        await prisma.session.deleteMany({ where: { userId: created.id } }).catch(() => {})
        await prisma.user.delete({ where: { id: created.id } }).catch(() => {})
      }
    }
  })
})
