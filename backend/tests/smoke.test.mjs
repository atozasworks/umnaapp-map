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

// --- Public Map Platform (no auth) ---

test('GET /api/public/config returns viewer config (no auth)', async () => {
  const res = await fetch(`${BASE}/api/public/config`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.ok(body.endpoints && body.endpoints.places)
  assert.ok(body.realtime && body.realtime.namespace === '/public-maps')
})

test('GET /api/public/categories returns approved categories (no auth)', async () => {
  const res = await fetch(`${BASE}/api/public/categories`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.ok(Array.isArray(body.categories))
})

test('GET /api/public/places returns a paginated list (no auth)', async () => {
  const res = await fetch(`${BASE}/api/public/places?limit=1`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.ok(Array.isArray(body.places))
  assert.equal(typeof body.total, 'number')
})

test('GET /api/public/place/:id returns 404 for unknown id', async () => {
  const res = await fetch(`${BASE}/api/public/place/does-not-exist`)
  assert.equal(res.status, 404)
})

test('GET /api/public/search validates the query', async () => {
  const res = await fetch(`${BASE}/api/public/search?q=a`)
  assert.equal(res.status, 400) // q must be >= 2 chars
})

test('public API sends permissive CORS headers', async () => {
  const res = await fetch(`${BASE}/api/public/config`, {
    headers: { Origin: 'https://example.com' },
  })
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
})

test('GET /sdk.js is served as JavaScript', async () => {
  const res = await fetch(`${BASE}/sdk.js`)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type') || '', /javascript/)
})

// --- Private routes stay protected (regression guard) ---

test('GET /api/map/places without a token is rejected', async () => {
  const res = await fetch(`${BASE}/api/map/places`)
  assert.equal(res.status, 401)
})

test('GET /api/admin/places without admin secret is rejected', async () => {
  const res = await fetch(`${BASE}/api/admin/places`)
  assert.ok(res.status === 401 || res.status === 403)
})
