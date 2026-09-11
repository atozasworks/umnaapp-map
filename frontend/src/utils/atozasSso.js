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

export function isAtozasLoggedOut() {
  return withSessionStorage(() => sessionStorage.getItem(ATOZAS_LOGGED_OUT_KEY) === '1', false)
}

export function markAtozasLoggedOut() {
  withSessionStorage(() => {
    sessionStorage.setItem(ATOZAS_LOGGED_OUT_KEY, '1')
    sessionStorage.removeItem(ATOZAS_SSO_ONCE_KEY)
  })
}

export function clearAtozasLoggedOut() {
  withSessionStorage(() => {
    sessionStorage.removeItem(ATOZAS_LOGGED_OUT_KEY)
    sessionStorage.removeItem(ATOZAS_SSO_ONCE_KEY)
  })
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
  arrivedFromAtozas: fromAtozas,
} = {}) {
  if (!enabled || isAuthenticated || hasError || loggedOut) return false
  return Boolean(autoRedirect || ssoHint || fromAtozas)
}

/** Guest on a protected route: start OIDC now (homepage Visit AtozMaps → /). */
export function shouldStartSsoFromProtectedRoute({
  isAuthenticated,
  loading,
  ssoEnabled,
  autoStart,
  loggedOut,
} = {}) {
  return Boolean(!isAuthenticated && !loading && ssoEnabled && autoStart && !loggedOut)
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
    }
  } catch {
    return DISABLED
  } finally {
    clearTimeout(timer)
  }
}

export function atozasStartPath(returnTo = '/') {
  const params = new URLSearchParams()
  if (returnTo) params.set('returnTo', returnTo)
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
