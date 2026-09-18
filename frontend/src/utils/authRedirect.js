const DEFAULT_AUTH_REDIRECT = '/'

/** Map used to live at /home; keep old redirects working. */
const normalizeMapPath = (pathname) => (pathname === '/home' ? '/' : pathname)

export const sanitizeAuthRedirect = (value, fallback = DEFAULT_AUTH_REDIRECT) => {
  if (typeof value !== 'string' || !value.trim()) return fallback

  try {
    const decoded = decodeURIComponent(value.trim())
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\')) {
      return fallback
    }

    const base = typeof window !== 'undefined' ? window.location.origin : 'https://umnaapp.local'
    const url = new URL(decoded, base)
    if (url.origin !== base) return fallback
    const pathname = normalizeMapPath(url.pathname)
    if (
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/verify-otp' ||
      pathname.startsWith('/auth')
    ) {
      return fallback
    }
    return `${pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export const currentPathWithSearch = () => {
  if (typeof window === 'undefined') return DEFAULT_AUTH_REDIRECT
  return sanitizeAuthRedirect(`${window.location.pathname}${window.location.search}`)
}

export const authPageWithRedirect = (page, redirect) => {
  const safeRedirect = sanitizeAuthRedirect(redirect)
  if (safeRedirect === DEFAULT_AUTH_REDIRECT) return page
  return `${page}?redirect=${encodeURIComponent(safeRedirect)}`
}

/** Protected-route guests: open login and auto-start ATOZAS SSO once. */
export const loginWithSsoHint = (redirect) => {
  const page = authPageWithRedirect('/login', redirect)
  return page.includes('?') ? `${page}&sso=1` : `${page}?sso=1`
}

const ATOZAS_REFERRER_HOST =
  /(^|\.)((test)?atozas\.in|atozasindia\.in|atozas\.com)$/i

/**
 * True when this navigation originated from an ATOZAS property (e.g. the
 * "Visit AtozMaps" link on https://atozasindia.in or https://testatozas.in).
 * Used to auto-start SSO so a user already signed in at ATOZAS lands in the
 * app without an extra click. A direct visit has no ATOZAS referrer.
 */
export const arrivedFromAtozas = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false
  try {
    const ref = document.referrer
    if (!ref) return false
    const refUrl = new URL(ref)
    if (refUrl.origin === window.location.origin) return false
    return ATOZAS_REFERRER_HOST.test(refUrl.hostname)
  } catch {
    return false
  }
}

export { DEFAULT_AUTH_REDIRECT }
