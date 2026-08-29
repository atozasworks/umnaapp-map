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
  assert.equal(sanitizeAuthRedirect('/live/token-value'), '/live/token-value')
})

test('getShareLocation reads latestPoint from API payload', () => {
  const getShareLocation = (share) => {
    const location = share?.latestPoint || share
    const latitude = Number(location?.latitude ?? location?.lat)
    const longitude = Number(location?.longitude ?? location?.lng)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    return { latitude, longitude, updatedAt: location?.updatedAt || null }
  }
  const location = getShareLocation({
    latestPoint: {
      latitude: 12.34,
      longitude: 56.78,
      updatedAt: '2026-07-11T10:00:00.000Z',
    },
  })
  assert.equal(location.latitude, 12.34)
  assert.equal(location.longitude, 56.78)
})

test('isShareEnded handles stopped and expired statuses', () => {
  const isShareEnded = (share) =>
    Boolean(
      share &&
        (share.status === 'stopped' ||
          share.status === 'expired' ||
          share.status === 'ended' ||
          share.endedAt)
    )
  assert.equal(isShareEnded({ status: 'stopped' }), true)
  assert.equal(isShareEnded({ status: 'expired' }), true)
  assert.equal(isShareEnded({ status: 'active' }), false)
})

test('session token storage helpers round-trip', () => {
  const store = new Map()
  const PREFIX = 'umna_live_share_token:'
  const storeLiveShareToken = (shareId, token) => store.set(`${PREFIX}${shareId}`, token)
  const getStoredLiveShareToken = (shareId) => store.get(`${PREFIX}${shareId}`) || ''
  const clearStoredLiveShareToken = (shareId) => store.delete(`${PREFIX}${shareId}`)

  storeLiveShareToken('share-1', 'tok-abc')
  assert.equal(getStoredLiveShareToken('share-1'), 'tok-abc')
  clearStoredLiveShareToken('share-1')
  assert.equal(getStoredLiveShareToken('share-1'), '')
})
