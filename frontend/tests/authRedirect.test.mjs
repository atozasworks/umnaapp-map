import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrivedFromAtozas, authPageWithRedirect, loginWithSsoHint, sanitizeAuthRedirect } from '../src/utils/authRedirect.js'

test('sanitizeAuthRedirect rejects external URLs', () => {
  assert.equal(sanitizeAuthRedirect('https://evil.example/phish'), '/')
  assert.equal(sanitizeAuthRedirect('//evil.example'), '/')
})

test('sanitizeAuthRedirect preserves same-origin paths', () => {
  assert.equal(
    sanitizeAuthRedirect('/?liveShare=abc123'),
    '/?liveShare=abc123'
  )
  assert.equal(
    sanitizeAuthRedirect('/live/token-value'),
    '/live/token-value'
  )
})

test('authPageWithRedirect omits default home redirect from the URL', () => {
  assert.equal(authPageWithRedirect('/login', '/'), '/login')
  assert.equal(authPageWithRedirect('/login', '/home'), '/login')
  assert.equal(authPageWithRedirect('/login', null), '/login')
  assert.equal(authPageWithRedirect('/register', '%2F'), '/register')
})

test('authPageWithRedirect keeps non-default return paths', () => {
  assert.equal(
    authPageWithRedirect('/login', '/settings'),
    '/login?redirect=%2Fsettings'
  )
})

test('sanitizeAuthRedirect rejects auth pages so SSO cannot loop', () => {
  assert.equal(sanitizeAuthRedirect('/login'), '/')
  assert.equal(sanitizeAuthRedirect('/auth/atozas?returnTo=%2F'), '/')
})

test('loginWithSsoHint marks login for a single SSO start', () => {
  assert.equal(loginWithSsoHint('/'), '/login?sso=1')
  assert.equal(loginWithSsoHint('/settings'), '/login?redirect=%2Fsettings&sso=1')
})

test('arrivedFromAtozas recognizes production and test homepage referrers', () => {
  const previous = {
    document: globalThis.document,
    window: globalThis.window,
  }
  const run = (referrer, origin) => {
    globalThis.document = { referrer }
    globalThis.window = { location: { origin } }
    return arrivedFromAtozas()
  }
  try {
    assert.equal(run('https://atozasindia.in/', 'https://umnaapp.com'), true)
    assert.equal(run('https://testatozas.in/atozaswebsite', 'https://umnaapptst.testatozas.in'), true)
    assert.equal(run('https://umnaapp.com/login', 'https://umnaapp.com'), false)
    assert.equal(run('', 'https://umnaapp.com'), false)
  } finally {
    globalThis.document = previous.document
    globalThis.window = previous.window
  }
})
