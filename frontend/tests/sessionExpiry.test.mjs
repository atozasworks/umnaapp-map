import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getTokenExpiryMs, isTokenExpired } from '../src/utils/sessionExpiry.js'

function tokenWithExp(expSeconds) {
  const encode = (value) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ userId: 'user-1', exp: expSeconds })}.sig`
}

test('reads the signed expiry claim', () => {
  const exp = 1_800_000_000
  assert.equal(getTokenExpiryMs(tokenWithExp(exp)), exp * 1000)
})

test('treats a missing or unreadable expiry as expired', () => {
  assert.equal(isTokenExpired(''), true)
  assert.equal(isTokenExpired('not-a-jwt'), true)
  assert.equal(isTokenExpired(tokenWithExp(undefined)), true)
})

test('expires only once the claim time has passed', () => {
  const exp = 1_800_000_000
  const token = tokenWithExp(exp)
  assert.equal(isTokenExpired(token, exp * 1000 - 1), false)
  assert.equal(isTokenExpired(token, exp * 1000), true)
})
