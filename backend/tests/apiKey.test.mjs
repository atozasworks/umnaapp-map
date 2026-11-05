import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  decryptApiKey,
  encryptApiKey,
  generateRawApiKey,
  hashApiKey,
  isWellFormedApiKey,
  keyAllowsFeature,
  normalizeFeatures,
} from '../utils/apiKeyCrypto.js'

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

test('generated keys are well formed and hash stably', () => {
  const raw = generateRawApiKey()
  assert.equal(isWellFormedApiKey(raw), true)
  assert.equal(hashApiKey(raw), hashApiKey(raw))
  assert.notEqual(hashApiKey(raw), hashApiKey(generateRawApiKey()))
})

test('encrypted keys round-trip', () => {
  const raw = generateRawApiKey()
  assert.equal(decryptApiKey(encryptApiKey(raw)), raw)
})

test('features stay independent', () => {
  const mapOnly = { active: true, scopes: ['map'] }
  const placesOnly = { active: true, scopes: ['places'] }
  const directionsOnly = { active: true, scopes: ['directions'] }

  assert.equal(keyAllowsFeature(mapOnly, 'map').ok, true)
  assert.equal(keyAllowsFeature(mapOnly, 'directions').status, 403)
  assert.equal(keyAllowsFeature(mapOnly, 'places', false).status, 403)
  assert.equal(keyAllowsFeature(mapOnly, 'places', true).ok, true)

  assert.equal(keyAllowsFeature(placesOnly, 'places').ok, true)
  assert.equal(keyAllowsFeature(placesOnly, 'map').status, 403)
  assert.equal(keyAllowsFeature(directionsOnly, 'directions').ok, true)
  assert.equal(keyAllowsFeature(directionsOnly, 'places', true).status, 403)
  assert.equal(keyAllowsFeature({ ...mapOnly, active: false }, 'map').status, 401)
})

test('normalizeFeatures ignores unknown names', () => {
  assert.deepEqual(normalizeFeatures(['Map', 'nope', 'directions']), {
    map: true,
    places: false,
    directions: true,
  })
})
