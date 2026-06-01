const DEV_API_ORIGIN = 'http://localhost:5000'

/**
 * Backend origin for socket.io (optional VITE_API_URL override).
 * Production/test: same host as the SPA. Dev: localhost:5000 unless overridden.
 */
export function getApiOrigin() {
  const env = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  if (env) return env.replace(/\/api$/, '')
  if (import.meta.env.DEV) return DEV_API_ORIGIN
  if (typeof window !== 'undefined') return window.location.origin
  return DEV_API_ORIGIN
}

/** Full /api base URL for auth kit fetch calls */
export function getAuthKitApiUrl() {
  const origin = getApiOrigin().replace(/\/+$/, '')
  return origin.endsWith('/api') ? origin : `${origin}/api`
}

/** Current app origin for share links (follows test vs prod host automatically) */
export function getAppOrigin() {
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
