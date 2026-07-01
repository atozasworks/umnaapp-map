import { isNative } from '../platform/runtime'

const DEV_API_ORIGIN = 'http://localhost:5000'

/**
 * Backend origin for socket.io / absolute API base.
 *
 * Resolution order:
 *   1. VITE_API_URL (required for native — Android/Electron have no same-origin server)
 *   2. Native with no env  → DEV_API_ORIGIN (build-time misconfig fallback, logged)
 *   3. Dev (web)           → DEV_API_ORIGIN
 *   4. Prod (web/PWA)      → window.location.origin  ← UNCHANGED web behavior
 */
export function getApiOrigin() {
  const env = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  if (env) return env.replace(/\/api$/, '')
  // Native builds cannot fall back to window.location.origin (capacitor://localhost
  // or file://) — they must use an absolute backend. Warn so misconfig is obvious.
  if (isNative()) {
    if (import.meta.env.DEV) return DEV_API_ORIGIN
    console.error(
      '[apiBase] Native build is missing VITE_API_URL — set it to your hosted backend URL.'
    )
    return DEV_API_ORIGIN
  }
  if (import.meta.env.DEV) return DEV_API_ORIGIN
  if (typeof window !== 'undefined') return window.location.origin
  return DEV_API_ORIGIN
}

/**
 * Base URL for the axios client.
 *   - Web/PWA → '/api' (relative, same-origin / dev proxy) ← UNCHANGED
 *   - Native  → absolute `${origin}/api`
 */
export function getApiBaseUrl() {
  if (isNative()) return getAuthKitApiUrl()
  return '/api'
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
