const SSO_PREFIX = '/auth'
const DISABLED = { enabled: false, autoRedirect: false, authenticated: false }

export const ATOZAS_LOGGED_OUT_KEY = 'umna_atozas_logged_out'
export const ATOZAS_SSO_ONCE_KEY = 'umna_atozas_sso_once'
export const ATOZAS_POST_LOGOUT_PATH = '/login?logged_out=1'

function withSessionStorage(fn, fallback) {
  try {
    return fn()
  } catch {
    return fallback
  }
}

// Logout here: no silent sign-in on this device (all tabs) until a login button is pressed.
const OPTOUT_KEY = 'atozas.optout.v1'
const SILENT_KEY = 'atozas.silentcheck.v1'

export function isAtozasLoggedOut() {
  return (
    withSessionStorage(() => sessionStorage.getItem(ATOZAS_LOGGED_OUT_KEY) === '1', false) ||
    withSessionStorage(() => localStorage.getItem(OPTOUT_KEY) === '1', false)
  )
}

export function markAtozasLoggedOut() {
  withSessionStorage(() => {
    sessionStorage.setItem(ATOZAS_LOGGED_OUT_KEY, '1')
    sessionStorage.removeItem(ATOZAS_SSO_ONCE_KEY)
  })
  withSessionStorage(() => localStorage.setItem(OPTOUT_KEY, '1'))
}

export function clearAtozasLoggedOut() {
  withSessionStorage(() => {
    sessionStorage.removeItem(ATOZAS_LOGGED_OUT_KEY)
    sessionStorage.removeItem(ATOZAS_SSO_ONCE_KEY)
  })
  withSessionStorage(() => localStorage.removeItem(OPTOUT_KEY))
}

/** Call before starting a user-initiated ATOZAS login so the next boot can restore. */
export function beginAtozasLogin() {
  clearAtozasLoggedOut()
}

export function shouldAutoStartAtozasSso({
  enabled,
  isAuthenticated,
  hasError,
  loggedOut,
  autoRedirect,
  ssoHint,
} = {}) {
  if (!enabled || isAuthenticated || hasError || loggedOut) return false
  // Only an explicit user intent starts SSO automatically: a one-time ?sso=1
  // hint (set when the user clicks "Continue with ATOZAS"), or the admin-configured
  // server autoRedirect. Merely arriving from an ATOZAS property (e.g. the
  // "Visit AtozMaps" homepage link) must NOT force a bounce to the ATOZAS login
  // page — guests land on the app's own welcome/login screen instead.
  return Boolean(autoRedirect || ssoHint)
}

async function readJson(res) {
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchAtozasMe(timeoutMs = 4000, options = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const restore = options.restore !== false
  const url = restore ? `${SSO_PREFIX}/atozas/me` : `${SSO_PREFIX}/atozas/me?restore=0`
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    })
    const data = await readJson(res)
    if (!data || typeof data !== 'object') return DISABLED
    return {
      enabled: Boolean(data.enabled),
      autoRedirect: Boolean(data.autoRedirect),
      authenticated: Boolean(data.authenticated),
      token: typeof data.token === 'string' ? data.token : null,
      user: data.user || null,
      silent: Boolean(data.silent),
    }
  } catch {
    return DISABLED
  } finally {
    clearTimeout(timer)
  }
}

// One login for every AtoZ app: method = the button pressed here ('google' | 'otp' | 'atozas'),
// loginHint = email to prefill for OTP. ATOZAS then opens that login.
export function atozasStartPath(returnTo = '/', { method = '', loginHint = '' } = {}) {
  const params = new URLSearchParams()
  if (returnTo) params.set('returnTo', returnTo)
  if (method) params.set('method', method)
  if (loginHint) params.set('login_hint', loginHint)
  const query = params.toString()
  return query ? `${SSO_PREFIX}/atozas?${query}` : `${SSO_PREFIX}/atozas`
}

export async function logoutAtozasSession(timeoutMs = 5000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    await fetch(`${SSO_PREFIX}/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
      keepalive: true,
    })
  } catch {
    // Best-effort — local sign-out must still complete.
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Silent check: someone already signed in at ATOZAS (homepage or another AtoZ app) comes back signed
 * in here with no click (/auth/atozas/silent, prompt=none). Once per tab, at most every 5 minutes
 * across tabs, never after Logout here until a login button is pressed. Returns true if it redirected.
 */
export function maybeAtozasSilentCheck(status) {
  if (typeof window === 'undefined') return false
  if (!status?.enabled || status.authenticated || !status.silent || isAtozasLoggedOut()) return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('error') || params.get('logged_out')) return false
  const read = (st) => withSessionStorage(() => Number(st.getItem(SILENT_KEY) || 0), 0)
  if (read(sessionStorage) > 0 || Date.now() - read(localStorage) < 5 * 60 * 1000) return false
  if (/bot|crawl|spider|preview/i.test(navigator.userAgent || '')) return false
  const now = String(Date.now())
  withSessionStorage(() => sessionStorage.setItem(SILENT_KEY, now))
  withSessionStorage(() => localStorage.setItem(SILENT_KEY, now))
  const next = `${window.location.pathname}${window.location.search}` || '/'
  window.location.replace(`${SSO_PREFIX}/atozas/silent?returnTo=${encodeURIComponent(next)}`)
  return true
}
