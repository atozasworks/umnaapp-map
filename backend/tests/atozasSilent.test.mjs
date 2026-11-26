// One login for every AtoZ app: login_method / login_hint, and the silent (prompt=none) check.
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import session from 'express-session'
import { createAtozasSsoRouter } from '../config/atozasSso.js'

function cookieJar() {
  const cookies = new Map()
  return {
    store(res) {
      for (const item of res.headers.getSetCookie?.() || []) {
        const pair = String(item).split(';')[0]
        const eq = pair.indexOf('=')
        if (eq > 0) cookies.set(pair.slice(0, eq), pair.slice(eq + 1))
      }
    },
    header() {
      return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
    },
  }
}

const config = {
  enabled: true,
  configured: true,
  issuer: 'https://idp.test',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  redirectUri: 'http://127.0.0.1/auth/atozas/callback',
  scope: 'openid email profile',
  authorizeUrl: 'https://idp.test/sso/authorize',
  tokenUrl: 'https://idp.test/sso/token',
  userinfoUrl: 'https://idp.test/sso/userinfo',
  revokeUrl: '',
  discoveryUrl: '',
  homepageKey: '',
  tokenAuthStyle: 'body',
  autoRedirect: false,
  databaseUrl: '',
  sessionCookieName: 'test_atozas_sid',
  sessionSecret: 'test-session-secret-value-32chars',
  sessionCollection: 'atozas_sessions',
  sessionMaxAgeMs: 60 * 60 * 1000,
  cookieSecure: false,
  cookieSameSite: 'lax',
  frontendUrl: 'http://app.test',
  jwtSecret: 'test-jwt',
}

async function start(silentEnv) {
  process.env.ATOZAS_SILENT = silentEnv
  const app = express()
  app.use(
    '/auth',
    createAtozasSsoRouter({ config, sessionStore: new session.MemoryStore(), fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) })
  )
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  return { server, base: `http://127.0.0.1:${server.address().port}` }
}

describe('ATOZAS one login', () => {
  let server
  let base
  before(async () => ({ server, base } = await start('1')))
  after(async () => {
    delete process.env.ATOZAS_SILENT
    await new Promise((resolve) => server.close(resolve))
  })

  test('the button pressed here is passed to ATOZAS', async () => {
    const res = await fetch(`${base}/auth/atozas?method=otp&login_hint=A%40Example.com`, { redirect: 'manual' })
    const loc = new URL(res.headers.get('location'))
    assert.equal(loc.searchParams.get('login_method'), 'otp')
    assert.equal(loc.searchParams.get('login_hint'), 'a@example.com')
    assert.equal(loc.searchParams.get('prompt'), null)
    const bad = new URL((await fetch(`${base}/auth/atozas?method=x&login_hint=nope`, { redirect: 'manual' })).headers.get('location'))
    assert.equal(bad.searchParams.get('login_method'), null)
    assert.equal(bad.searchParams.get('login_hint'), null)
  })

  test('silent check: prompt=none, then "not signed in" returns to the page as a guest', async () => {
    const jar = cookieJar()
    const me = await (await fetch(`${base}/auth/atozas/me`)).json()
    assert.equal(me.silent, true)
    const startRes = await fetch(`${base}/auth/atozas/silent?returnTo=${encodeURIComponent('/map?x=1')}`, { redirect: 'manual' })
    jar.store(startRes)
    const loc = new URL(startRes.headers.get('location'))
    assert.equal(loc.searchParams.get('prompt'), 'none')
    assert.equal(loc.searchParams.get('login_method'), null)
    const back = await fetch(`${base}/auth/atozas/callback?error=login_required&state=${loc.searchParams.get('state')}`, {
      redirect: 'manual',
      headers: { cookie: jar.header() },
    })
    assert.equal(back.status, 302)
    assert.equal(back.headers.get('location'), 'http://app.test/map?x=1')
  })

  test('an error on a normal login still shows the login error', async () => {
    const startRes = await fetch(`${base}/auth/atozas`, { redirect: 'manual' })
    const state = new URL(startRes.headers.get('location')).searchParams.get('state')
    const back = await fetch(`${base}/auth/atozas/callback?error=login_required&state=${state}`, { redirect: 'manual' })
    assert.match(back.headers.get('location'), /\/login\?error=atozas_auth_failed/)
  })
})

describe('ATOZAS silent check off', () => {
  let server
  let base
  before(async () => ({ server, base } = await start('0')))
  after(async () => {
    delete process.env.ATOZAS_SILENT
    await new Promise((resolve) => server.close(resolve))
  })

  test('without ATOZAS support it goes straight back', async () => {
    const res = await fetch(`${base}/auth/atozas/silent?returnTo=/map`, { redirect: 'manual' })
    assert.equal(res.headers.get('location'), 'http://app.test/map')
    const me = await (await fetch(`${base}/auth/atozas/me`)).json()
    assert.equal(me.silent, false)
  })
})
