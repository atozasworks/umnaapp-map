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
    return `${normalizeMapPath(url.pathname)}${url.search}${url.hash}`
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
  return `${page}?redirect=${encodeURIComponent(safeRedirect)}`
}

export { DEFAULT_AUTH_REDIRECT }
