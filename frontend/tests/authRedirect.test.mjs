import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeAuthRedirect } from '../src/utils/authRedirect.js'

test('sanitizeAuthRedirect rejects external URLs', () => {
  assert.equal(sanitizeAuthRedirect('https://evil.example/phish'), '/home')
  assert.equal(sanitizeAuthRedirect('//evil.example'), '/home')
})

test('sanitizeAuthRedirect preserves same-origin paths', () => {
  assert.equal(
    sanitizeAuthRedirect('/home?liveShare=abc123'),
    '/home?liveShare=abc123'
  )
  assert.equal(
    sanitizeAuthRedirect('/live/token-value'),
    '/live/token-value'
  )
})
