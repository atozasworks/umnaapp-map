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

// --- Public Map Platform (API key required) ---

test('GET /api/public/config without an API key is rejected', async () => {
  const res = await fetch(`${BASE}/api/public/config`)
  assert.equal(res.status, 401)
  const body = await res.json()
  assert.equal(body.code, 'API_KEY_REQUIRED')
})

test('GET /api/public/categories without an API key is rejected', async () => {
  const res = await fetch(`${BASE}/api/public/categories`)
  assert.equal(res.status, 401)
})

test('GET /api/public/places without an API key is rejected', async () => {
  const res = await fetch(`${BASE}/api/public/places?limit=1`)
  assert.equal(res.status, 401)
})

test('GET /api/public/place/:id without an API key is rejected', async () => {
  const res = await fetch(`${BASE}/api/public/place/does-not-exist`)
  assert.equal(res.status, 401)
})

test('GET /api/public/search without an API key is rejected', async () => {
  const res = await fetch(`${BASE}/api/public/search?q=ab`)
  assert.equal(res.status, 401)
})

test('GET /api/public/route without an API key is rejected', async () => {
  const res = await fetch(`${BASE}/api/public/route?start=12.97,77.59&end=12.93,77.62`)
  assert.equal(res.status, 401)
})

test('public API sends permissive CORS headers', async () => {
  const res = await fetch(`${BASE}/api/public/config`, {
    headers: { Origin: 'https://example.com' },
  })
  // publicRoutes uses cors({ origin: true }) — reflects any requesting Origin.
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://example.com')
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

test('GET /api/admin/places without admin session is rejected', async () => {
  const res = await fetch(`${BASE}/api/admin/places`)
  assert.ok(res.status === 401 || res.status === 403)
})

test('GET /api/live-location/shares without a token is rejected', async () => {
  const res = await fetch(`${BASE}/api/live-location/shares`)
  assert.equal(res.status, 401)
})
