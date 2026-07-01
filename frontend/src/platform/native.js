/**
 * Capacitor native bootstrap (ADDITIVE — only ever runs inside the Android app).
 *
 * Everything here is dynamically imported and guarded by `isCapacitor()`, so the
 * web/PWA bundle never loads or executes any of it. The plugins are bundled as
 * lazy chunks that are fetched only inside the native WebView.
 */
import { isCapacitor } from './runtime'

let initialized = false

/** Request foreground location permission (maps require it on Android). */
async function ensureLocationPermission() {
  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const status = await Geolocation.checkPermissions()
    if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
      await Geolocation.requestPermissions({ permissions: ['location'] })
    }
  } catch (err) {
    console.warn('[native] location permission request failed:', err?.message || err)
  }
}

/**
 * Extract a JWT from a returning auth deep link, store it, and reload so the
 * existing AuthContext (which reads localStorage on mount) signs the user in.
 * Accepts both `umnaapp://auth?token=...` and `https://<host>/home?token=...`.
 */
function handleAuthDeepLink(url) {
  if (!url) return false
  let token = null
  try {
    const parsed = new URL(url)
    token = parsed.searchParams.get('token')
  } catch {
    const m = /[?&]token=([^&]+)/.exec(url)
    if (m) token = decodeURIComponent(m[1])
  }
  if (!token) return false
  try {
    localStorage.setItem('token', token)
  } catch {
    /* ignore storage errors */
  }
  // Reload the bundled SPA; AuthContext picks up the token from localStorage.
  window.location.assign('/')
  return true
}

/** Register App plugin listeners: deep links + Android hardware back button. */
async function setupAppListeners() {
  try {
    const { App } = await import('@capacitor/app')

    App.addListener('appUrlOpen', ({ url }) => {
      if (handleAuthDeepLink(url)) return
      // Other deep links: route into the SPA by path when possible.
      try {
        const parsed = new URL(url)
        if (parsed.pathname && parsed.pathname !== '/') {
          window.location.assign(parsed.pathname + parsed.search)
        }
      } catch {
        /* ignore non-URL deep links */
      }
    })

    // Cold-start deep link (app launched from a link).
    const launch = await App.getLaunchUrl()
    if (launch?.url) handleAuthDeepLink(launch.url)

    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else App.exitApp()
    })
  } catch (err) {
    console.warn('[native] App listeners failed:', err?.message || err)
  }
}

/** Hide the native splash once the WebView has booted. */
async function hideSplash() {
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* splash plugin optional */
  }
}

/** Call once at startup. No-op on web. */
export async function initNative() {
  if (initialized || !isCapacitor()) return
  initialized = true
  await Promise.allSettled([
    ensureLocationPermission(),
    setupAppListeners(),
  ])
  hideSplash()
}

/**
 * Native Google sign-in: opens the hosted OAuth flow in the system browser.
 * The hosted backend must return the JWT to the app via the `umnaapp://auth`
 * deep link (or an https App Link to the hosted domain), which `appUrlOpen`
 * above captures. Returns false if not native so callers fall back to web.
 */
export async function startNativeGoogleLogin(apiOrigin) {
  if (!isCapacitor()) return false
  try {
    const { Browser } = await import('@capacitor/browser')
    const base = String(apiOrigin || '').replace(/\/+$/, '')
    await Browser.open({ url: `${base}/api/auth/google?native=umnaapp` })
    return true
  } catch (err) {
    console.error('[native] Google sign-in failed:', err?.message || err)
    return false
  }
}
