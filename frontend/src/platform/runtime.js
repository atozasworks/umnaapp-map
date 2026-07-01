/**
 * Platform runtime detection (ADDITIVE — web behavior is unchanged).
 *
 * UMNAAPP ships from ONE React build to three targets:
 *   - Web / PWA  → behaves exactly as before (relative '/api', dev proxy, SW on)
 *   - Android    → Capacitor WebView (no same-origin server → absolute API/socket/tiles)
 *   - Windows    → Electron (file:// shell → absolute API/socket/tiles, SW off)
 *
 * All detection is defensive: if none of the native globals exist we are on the
 * web and every helper returns the "web" answer, so the PWA is untouched.
 */

/** True when running inside a Capacitor native WebView (Android). */
export function isCapacitor() {
  if (typeof window === 'undefined') return false
  const cap = window.Capacitor
  // isNativePlatform() is the authoritative check; guard for older shims.
  if (cap && typeof cap.isNativePlatform === 'function') {
    return cap.isNativePlatform()
  }
  return Boolean(cap?.isNative)
}

/** True when running inside the Electron desktop shell. */
export function isElectron() {
  if (typeof window === 'undefined') return false
  // Preload exposes a namespaced bridge; also sniff the UA as a fallback.
  if (window.umnaDesktop?.isElectron) return true
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  return / electron\//i.test(` ${ua.toLowerCase()}`)
}

/** True for ANY packaged native target (Android or Windows). */
export function isNative() {
  return isCapacitor() || isElectron()
}

/** True only on the plain web/PWA (the original, unchanged experience). */
export function isWeb() {
  return !isNative()
}

/** 'capacitor' | 'electron' | 'web' */
export function getPlatform() {
  if (isCapacitor()) return 'capacitor'
  if (isElectron()) return 'electron'
  return 'web'
}
