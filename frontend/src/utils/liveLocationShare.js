import { getAppOrigin } from './apiBase'

export const LIVE_SHARE_DURATIONS = [
  { minutes: 15, label: '15 minutes', shortLabel: '15 min' },
  { minutes: 60, label: '1 hour', shortLabel: '1 hr' },
  { minutes: 480, label: '8 hours', shortLabel: '8 hr' },
  { minutes: 1440, label: '24 hours', shortLabel: '24 hr' },
]

const TOKEN_STORAGE_PREFIX = 'umna_live_share_token:'

export const storeLiveShareToken = (shareId, token) => {
  if (!shareId || !token || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(`${TOKEN_STORAGE_PREFIX}${shareId}`, token)
  } catch {
    /* private mode / quota */
  }
}

export const getStoredLiveShareToken = (shareId) => {
  if (!shareId || typeof sessionStorage === 'undefined') return ''
  try {
    return sessionStorage.getItem(`${TOKEN_STORAGE_PREFIX}${shareId}`) || ''
  } catch {
    return ''
  }
}

export const clearStoredLiveShareToken = (shareId) => {
  if (!shareId || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(`${TOKEN_STORAGE_PREFIX}${shareId}`)
  } catch {
    /* ignore */
  }
}

export const buildLiveShareUrl = (token) =>
  token ? `${getAppOrigin()}/live/${encodeURIComponent(token)}` : ''

export const parseLiveShareToken = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null
  const raw = value.trim()
  try {
    const url = new URL(raw, getAppOrigin())
    const queryToken = url.searchParams.get('liveShare')
    if (queryToken) return queryToken
    const match = url.pathname.match(/\/live\/([^/?#]+)/)
    if (match) return decodeURIComponent(match[1])
  } catch {
    // A raw token is handled below.
  }
  return /^[A-Za-z0-9._~-]+$/.test(raw) ? raw : null
}

export const getShareLocation = (share) => {
  const location =
    share?.latestPoint || share?.lastLocation || share?.latestLocation || share?.location || share
  const latitude = Number(location?.latitude ?? location?.lat)
  const longitude = Number(location?.longitude ?? location?.lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return {
    latitude,
    longitude,
    accuracy: Number(location?.accuracy) || null,
    speed: Number.isFinite(Number(location?.speed)) ? Number(location.speed) : null,
    heading: Number.isFinite(Number(location?.heading)) ? Number(location.heading) : null,
    updatedAt:
      location?.updatedAt || location?.timestamp || share?.lastUpdatedAt || share?.updatedAt || null,
  }
}

export const getRemainingSeconds = (expiresAt, now = Date.now()) => {
  const expiry = new Date(expiresAt).getTime()
  if (!Number.isFinite(expiry)) return 0
  return Math.max(0, Math.ceil((expiry - now) / 1000))
}

export const formatCountdown = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}

export const formatRelativeAge = (value, now = Date.now()) => {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'waiting for location'
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export const isShareEnded = (share) =>
  Boolean(
    share &&
      (share.status === 'stopped' ||
        share.status === 'expired' ||
        share.status === 'ended' ||
        share.endedAt)
  )

export const isLocationStale = (share, now = Date.now(), thresholdMs = 20000) => {
  const location = getShareLocation(share)
  if (!location?.updatedAt) return true
  return now - new Date(location.updatedAt).getTime() > thresholdMs
}
