import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authPageWithRedirect, loginWithSsoHint, sanitizeAuthRedirect } from '../src/utils/authRedirect.js'

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
