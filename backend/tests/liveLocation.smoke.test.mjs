import { test } from 'node:test'
import assert from 'node:assert/strict'

const BASE = (process.env.API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '')

test('GET /api/live-location/shares without a token is rejected', async () => {
  const res = await fetch(`${BASE}/api/live-location/shares`)
  assert.equal(res.status, 401)
})

test('GET /api/live-location/shares/active without a token is rejected', async () => {
  const res = await fetch(`${BASE}/api/live-location/shares/active`)
  assert.equal(res.status, 401)
})

test('POST /api/live-location/exchange without a token is rejected', async () => {
  const res = await fetch(`${BASE}/api/live-location/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'invalid-token-value-1234567890' }),
  })
  assert.equal(res.status, 401)
})
