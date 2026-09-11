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

test('shouldAutoStartAtozasSso still allows an explicit SSO hint or server autoRedirect', () => {
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

test('arriving from ATOZAS alone never auto-starts SSO (no forced login bounce)', () => {
  // A guest opening the app from the atozasindia.in "Visit AtozMaps" link has an
  // ATOZAS referrer but no explicit ?sso=1 hint and no server autoRedirect →
  // must NOT be redirected to the ATOZAS login page.
  assert.equal(
    shouldAutoStartAtozasSso({
      enabled: true,
      arrivedFromAtozas: true,
    }),
    false
  )
})

test('post-logout path stays on the app login page', () => {
  assert.equal(ATOZAS_POST_LOGOUT_PATH, '/login?logged_out=1')
  assert.match(atozasStartPath('/settings'), /^\/auth\/atozas\?returnTo=/)
})
