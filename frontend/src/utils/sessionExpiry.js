/**
 * Read the signed JWT `exp` claim. The browser cannot extend a session by
 * editing this value: the backend verifies the signature and the stored
 * session row. A missing or unreadable expiry is treated as already expired.
 */
export function getTokenExpiryMs(token) {
  if (!token || typeof token !== 'string') return null
  const segment = token.split('.')[1]
  if (!segment) return null
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
    const payload = JSON.parse(atob(padded + pad))
    if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null
    return payload.exp * 1000
  } catch {
    return null
  }
}

export function isTokenExpired(token, now = Date.now()) {
  const expiresAt = getTokenExpiryMs(token)
  if (expiresAt == null) return true
  return now >= expiresAt
}
