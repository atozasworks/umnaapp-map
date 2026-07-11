import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateLiveLocationToken,
  hashLiveLocationToken,
  LIVE_LOCATION_DURATIONS,
  LIVE_LOCATION_STATUSES,
} from '../services/liveLocationService.js'
import { allowLiveLocationEmit, allowLiveLocationPersist } from '../utils/liveLocationRateLimit.js'
import { NOTIFICATION_TYPES } from '../services/notificationService.js'

test('generateLiveLocationToken returns high-entropy url-safe strings', () => {
  const token = generateLiveLocationToken()
  assert.ok(token.length >= 32)
  assert.match(token, /^[A-Za-z0-9_-]+$/)
  assert.notEqual(token, generateLiveLocationToken())
})

test('hashLiveLocationToken is deterministic', () => {
  const token = 'sample-token-value'
  assert.equal(hashLiveLocationToken(token), hashLiveLocationToken(token))
  assert.notEqual(hashLiveLocationToken(token), hashLiveLocationToken('other-token'))
})

test('live location durations include planned options', () => {
  assert.deepEqual(LIVE_LOCATION_DURATIONS, [15, 60, 480, 1440])
})

test('live location statuses are stable', () => {
  assert.equal(LIVE_LOCATION_STATUSES.ACTIVE, 'active')
  assert.equal(LIVE_LOCATION_STATUSES.STOPPED, 'stopped')
  assert.equal(LIVE_LOCATION_STATUSES.EXPIRED, 'expired')
})

test('allowLiveLocationEmit enforces per-second cap', () => {
  const shareId = `share-emit-${Date.now()}`
  const userId = 'user-1'
  assert.equal(allowLiveLocationEmit(shareId, userId, 1), true)
  assert.equal(allowLiveLocationEmit(shareId, userId, 1), false)
})

test('allowLiveLocationPersist enforces slower persistence cadence', () => {
  const shareId = `share-persist-${Date.now()}`
  const userId = 'user-2'
  assert.equal(allowLiveLocationPersist(shareId, userId, 5000), true)
  assert.equal(allowLiveLocationPersist(shareId, userId, 5000), false)
})

test('live location notification types exist', () => {
  assert.equal(NOTIFICATION_TYPES.LOCATION_SHARE_VIEWED, 'location_share_viewed')
  assert.equal(NOTIFICATION_TYPES.LOCATION_SHARE_ENDED, 'location_share_ended')
})
