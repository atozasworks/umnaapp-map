/**
 * Centralized hard-stop guard for all client-side Google Maps / Places API calls.
 * Blocked requests never invoke Google SDK methods (zero billing after limit).
 */

export const QUOTA_EXHAUSTED_MESSAGE_DAILY = 'Daily free quota exhausted. Try again tomorrow.'
export const QUOTA_EXHAUSTED_MESSAGE_SESSION =
  'Session Google API quota exhausted. Try again later or tomorrow.'

const STORAGE_PREFIX = 'umna_google_api_quota:'
const LEGACY_STORAGE_PREFIX = 'umna_places_nearby_quota:'

const _listeners = new Set()
let _guard = null

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function notifyListeners() {
  const snapshot = getGoogleApiQuotaStatus()
  _listeners.forEach((fn) => {
    try {
      fn(snapshot)
    } catch {
      /* ignore */
    }
  })
}

/** @typedef {'nearbySearch'|'getDetails'|'autocomplete'|'geocode'|string} GoogleApiType */

export class GoogleApiQuotaGuard {
  constructor(config, userId = 'anonymous') {
    this.config = config
    this.userId = userId
    this.storageKey = `${STORAGE_PREFIX}${userId}`
    this.sessionCount = 0
    this.dailyCount = 0
    this._date = todayKey()
    this._load()
  }

  _load() {
    const today = todayKey()
    try {
      let raw = sessionStorage.getItem(this.storageKey)
      if (!raw) {
        raw = sessionStorage.getItem(`${LEGACY_STORAGE_PREFIX}${this.userId}`)
      }
      if (!raw) return
      const data = JSON.parse(raw)
      this.sessionCount = data.sessionCount || 0
      if (data.date === today) {
        this.dailyCount = data.dailyCount || 0
        this._date = today
      } else {
        this.dailyCount = 0
        this._date = today
        this._persist()
      }
    } catch {
      /* ignore */
    }
  }

  _persist() {
    try {
      sessionStorage.setItem(
        this.storageKey,
        JSON.stringify({
          date: this._date,
          sessionCount: this.sessionCount,
          dailyCount: this.dailyCount,
        })
      )
    } catch {
      /* ignore */
    }
  }

  /** Calendar-day rollover: reset daily counter. */
  _ensureCurrentDay() {
    const today = todayKey()
    if (this._date !== today) {
      this._date = today
      this.dailyCount = 0
      this._persist()
      notifyListeners()
    }
  }

  get maxSession() {
    return this.config.maxNearbySearchPerSession ?? 120
  }

  get maxDaily() {
    return this.config.maxNearbySearchPerDay ?? 400
  }

  isHardStopEnabled() {
    return this.config.googleApiHardStop !== false
  }

  isDailyExhausted() {
    this._ensureCurrentDay()
    return this.dailyCount >= this.maxDaily
  }

  isSessionExhausted() {
    this._ensureCurrentDay()
    return this.sessionCount >= this.maxSession
  }

  canConsume() {
    this._ensureCurrentDay()
    return !this.isDailyExhausted() && !this.isSessionExhausted()
  }

  /** @deprecated alias */
  remainingSession() {
    return this.remainingSessionQuota()
  }

  remainingSessionQuota() {
    this._ensureCurrentDay()
    return Math.max(0, this.maxSession - this.sessionCount)
  }

  remainingDaily() {
    this._ensureCurrentDay()
    return Math.max(0, this.maxDaily - this.dailyCount)
  }

  getBlockMessage() {
    this._ensureCurrentDay()
    if (this.isDailyExhausted()) return QUOTA_EXHAUSTED_MESSAGE_DAILY
    if (this.isSessionExhausted()) return QUOTA_EXHAUSTED_MESSAGE_SESSION
    return QUOTA_EXHAUSTED_MESSAGE_DAILY
  }

  consume(_apiType) {
    this._ensureCurrentDay()
    this.sessionCount++
    this.dailyCount++
    this._persist()
    notifyListeners()
  }
}

/**
 * Initialize global quota guard (call once per app area with config + user id).
 * @returns {GoogleApiQuotaGuard}
 */
export function initGoogleApiQuota(config, userId = 'anonymous') {
  _guard = new GoogleApiQuotaGuard(config, userId)
  notifyListeners()
  return _guard
}

export function getGoogleApiQuota() {
  return _guard
}

/**
 * Global helper: false when hard-stop is on and session or daily limit exceeded.
 */
export function canUseGoogleApi() {
  if (!_guard) return true
  if (!_guard.isHardStopEnabled()) return true
  return _guard.canConsume()
}

export function getGoogleApiQuotaStatus() {
  if (!_guard) {
    return {
      initialized: false,
      canUse: true,
      hardStop: true,
      exhausted: false,
      message: null,
      remainingSession: null,
      remainingDaily: null,
      sessionUsed: 0,
      dailyUsed: 0,
      maxSession: null,
      maxDaily: null,
    }
  }
  _guard._ensureCurrentDay()
  const exhausted = !_guard.canConsume()
  return {
    initialized: true,
    canUse: canUseGoogleApi(),
    hardStop: _guard.isHardStopEnabled(),
    exhausted: _guard.isHardStopEnabled() && exhausted,
    message: exhausted ? _guard.getBlockMessage() : null,
    remainingSession: _guard.remainingSessionQuota(),
    remainingDaily: _guard.remainingDaily(),
    sessionUsed: _guard.sessionCount,
    dailyUsed: _guard.dailyCount,
    maxSession: _guard.maxSession,
    maxDaily: _guard.maxDaily,
  }
}

/**
 * Check before any Google API call. Returns { ok, message, status }.
 * Does not consume quota (call recordGoogleApiUse immediately before SDK invocation).
 */
export function assertGoogleApiAvailable(apiType = 'unknown') {
  if (!_guard) {
    return { ok: true, apiType }
  }
  _guard._ensureCurrentDay()
  if (!_guard.isHardStopEnabled()) {
    return { ok: true, apiType }
  }
  if (_guard.canConsume()) {
    return { ok: true, apiType }
  }
  return {
    ok: false,
    apiType,
    status: 'QUOTA_EXHAUSTED',
    message: _guard.getBlockMessage(),
  }
}

/** Record one billable Google API request (after assert, before SDK call). */
export function recordGoogleApiUse(apiType = 'unknown') {
  if (!_guard) return
  _guard.consume(apiType)
}

export function subscribeGoogleApiQuota(listener) {
  _listeners.add(listener)
  listener(getGoogleApiQuotaStatus())
  return () => _listeners.delete(listener)
}
