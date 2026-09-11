import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ATOZAS_LOGGED_OUT_KEY,
  ATOZAS_POST_LOGOUT_PATH,
  ATOZAS_SSO_ONCE_KEY,
  atozasStartPath,
  beginAtozasLogin,
  clearAtozasLoggedOut,
  isAtozasLoggedOut,
  markAtozasLoggedOut,
  shouldAutoStartAtozasSso,
  shouldStartSsoFromProtectedRoute,
} from '../src/utils/atozasSso.js'

const memory = new Map()
globalThis.sessionStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
}

afterEach(() => memory.clear())

test('logout intent stays set until the user starts ATOZAS again', () => {
  assert.equal(isAtozasLoggedOut(), false)
  markAtozasLoggedOut()
  assert.equal(isAtozasLoggedOut(), true)
  assert.equal(sessionStorage.getItem(ATOZAS_LOGGED_OUT_KEY), '1')
  sessionStorage.setItem(ATOZAS_SSO_ONCE_KEY, '1')
  markAtozasLoggedOut()
  assert.equal(sessionStorage.getItem(ATOZAS_SSO_ONCE_KEY), null)
  beginAtozasLogin()
  assert.equal(isAtozasLoggedOut(), false)
})

test('clearAtozasLoggedOut removes both SSO guards', () => {
  markAtozasLoggedOut()
  sessionStorage.setItem(ATOZAS_SSO_ONCE_KEY, '1')
  clearAtozasLoggedOut()
  assert.equal(isAtozasLoggedOut(), false)
  assert.equal(sessionStorage.getItem(ATOZAS_SSO_ONCE_KEY), null)
})

test('shouldAutoStartAtozasSso never fires after logout', () => {
  assert.equal(
    shouldAutoStartAtozasSso({
      enabled: true,
      loggedOut: true,
      autoRedirect: true,
      ssoHint: true,
      arrivedFromAtozas: true,
    }),
    false
  )
  assert.equal(
    shouldAutoStartAtozasSso({
      enabled: true,
      isAuthenticated: true,
      ssoHint: true,
    }),
    false
  )
  assert.equal(
    shouldAutoStartAtozasSso({
      enabled: true,
      hasError: true,
      ssoHint: true,
    }),
    false
  )
})

test('shouldAutoStartAtozasSso still allows a first-visit SSO hint', () => {
  assert.equal(
    shouldAutoStartAtozasSso({
      enabled: true,
      ssoHint: true,
    }),
    true
  )
  assert.equal(
    shouldAutoStartAtozasSso({
      enabled: true,
      arrivedFromAtozas: true,
    }),
    true
  )
  assert.equal(
    shouldAutoStartAtozasSso({
      enabled: true,
      autoRedirect: true,
    }),
    true
  )
  assert.equal(
    shouldAutoStartAtozasSso({
      enabled: true,
    }),
    false
  )
})

test('protected / starts SSO for guests unless they logged out', () => {
  assert.equal(
    shouldStartSsoFromProtectedRoute({
      ssoEnabled: true,
      autoStart: true,
    }),
    true
  )
  assert.equal(
    shouldStartSsoFromProtectedRoute({
      ssoEnabled: true,
      autoStart: true,
      loggedOut: true,
    }),
    false
  )
  assert.equal(
    shouldStartSsoFromProtectedRoute({
      ssoEnabled: true,
      autoStart: true,
      loading: true,
    }),
    false
  )
  assert.equal(
    shouldStartSsoFromProtectedRoute({
      ssoEnabled: false,
      autoStart: true,
    }),
    false
  )
})

test('post-logout path stays on the app login page', () => {
  assert.equal(ATOZAS_POST_LOGOUT_PATH, '/login?logged_out=1')
  assert.match(atozasStartPath('/settings'), /^\/auth\/atozas\?returnTo=/)
})
