import { test } from 'node:test'
import assert from 'node:assert/strict'

const BASE = (process.env.API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '')

test('GET /api/health returns 200', async () => {
  const res = await fetch(`${BASE}/api/health`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.status, 'ok')
})

test('GET /api/health/db returns 200 when database is reachable', async () => {
  const res = await fetch(`${BASE}/api/health/db`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.status, 'ok')
  assert.equal(body.database, 'connected')
})
