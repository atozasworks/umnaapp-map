import crypto from 'crypto'

const PENDING_TTL_MS = 10 * 60 * 1000
const SENSITIVE_KEY = /^(client_secret|code|code_verifier|access_token|refresh_token|id_token|password|authorization)$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PLACEHOLDER_RE =
  /^(paste_from_atozas|your-app-domain|long_random_secret|yourapp_atozas_sid)$/i

export function parseBool(value, fallback = false) {
  if (value == null || value === '') return fallback
  return /^(1|true|yes|on)$/i.test(String(value).trim())
}

export function isPlaceholder(value) {
  const text = String(value || '').trim()
  if (!text) return true
  if (PLACEHOLDER_RE.test(text)) return true
  return /your-app-domain\.com/i.test(text)
}

export function normalizeIssuer(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/sso$/i, '')
}

function isLocalhostUrl(value) {
  try {
    const hostname = new URL(value).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export function resolveFrontendUrl(env = process.env) {
  const explicit = String(env.FRONTEND_URL || '').trim()
  let redirectOrigin = ''
  try {
    redirectOrigin = new URL(String(env.ATOZAS_REDIRECT_URI || '').trim()).origin
  } catch {
    redirectOrigin = ''
  }
  if (redirectOrigin && (!explicit || (isLocalhostUrl(explicit) && !isLocalhostUrl(redirectOrigin)))) {
    return redirectOrigin
  }
  return explicit || 'http://localhost:3000'
}

export function sanitizeReturnTo(value, fallback = '/') {
  if (typeof value !== 'string' || !value.trim()) return fallback
  let decoded = value.trim()
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    return fallback
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\')) return fallback
  try {
    const parsed = new URL(decoded, 'http://umnaapp.local')
    if (parsed.origin !== 'http://umnaapp.local') return fallback
    const pathname = parsed.pathname === '/home' ? '/' : parsed.pathname
    return `${pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

export function generateState() {
  return crypto.randomBytes(32).toString('base64url')
}

/** Short hex state the ATOZAS IdP will echo; PKCE lives in the pending store. */
export function generateOpaqueState() {
  return crypto.randomBytes(16).toString('hex')
}

export function pendingFromRecord(record) {
  if (!record || typeof record.v !== 'string' || !record.v) return null
  return {
    codeVerifier: record.v,
    nonce: typeof record.n === 'string' ? record.n : '',
    returnTo: sanitizeReturnTo(record.r, '/'),
    createdAt: Number.isFinite(record.t) ? record.t : Date.now(),
  }
}

export function generateNonce() {
  return crypto.randomBytes(32).toString('base64url')
}

function oidcStateKey(secret) {
  return crypto.createHash('sha256').update(String(secret || '')).digest()
}

/** Cookie-less OIDC pending state so Chrome bounce-tracking cannot drop the PKCE verifier. */
export function sealOidcState(payload, secret) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', oidcStateKey(secret), iv)
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64url')
}

export function openOidcState(token, secret, ttlMs = PENDING_TTL_MS) {
  try {
    const buf = Buffer.from(String(token || ''), 'base64url')
    if (buf.length < 29) return null
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', oidcStateKey(secret), iv)
    decipher.setAuthTag(tag)
    const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
    const payload = JSON.parse(json)
    if (typeof payload?.v !== 'string' || !payload.v || !Number.isFinite(payload.t)) return null
    if (Date.now() - payload.t > ttlMs) return null
    return {
      codeVerifier: payload.v,
      nonce: typeof payload.n === 'string' ? payload.n : '',
      returnTo: sanitizeReturnTo(payload.r, '/'),
      createdAt: payload.t,
    }
  } catch {
    return null
  }
}

export function generatePkceS256() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge, codeChallengeMethod: 'S256' }
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

export function isValidEmail(value) {
  return EMAIL_RE.test(normalizeEmail(value))
}

export function displayNameFromUserinfo(userinfo, email) {
  const name = String(userinfo?.name || '').trim()
  if (name) return name
  const combined = [userinfo?.given_name, userinfo?.family_name].filter(Boolean).join(' ').trim()
  if (combined) return combined
  return String(email).split('@')[0] || 'User'
}

export function redactSensitive(value) {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(redactSensitive)
  if (typeof value === 'object') {
    const out = {}
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redactSensitive(val)
    }
    return out
  }
  return value
}

export function joinUrl(base, path) {
  const root = String(base || '').replace(/\/+$/, '')
  const suffix = String(path || '').replace(/^\/+/, '')
  return suffix ? `${root}/${suffix}` : root
}

export function readOidcConfig(env = process.env) {
  const enabled = parseBool(env.ATOZAS_SSO_ENABLED, false)
  const issuer = normalizeIssuer(env.ATOZAS_ISSUER)
  const clientId = String(env.ATOZAS_CLIENT_ID || '').trim()
  const clientSecret = String(env.ATOZAS_CLIENT_SECRET || '').trim()
  const redirectUri = String(env.ATOZAS_REDIRECT_URI || '').trim()
  const sessionSecret = String(env.ATOZAS_SESSION_SECRET || '').trim()
  const databaseUrl = String(env.DATABASE_URL || '').trim()
  const jwtSecret = String(env.JWT_SECRET || '').trim()
  const configured =
    enabled &&
    Boolean(
      issuer &&
        !isPlaceholder(issuer) &&
        clientId &&
        !isPlaceholder(clientId) &&
        clientSecret &&
        !isPlaceholder(clientSecret) &&
        redirectUri &&
        !isPlaceholder(redirectUri) &&
        sessionSecret &&
        !isPlaceholder(sessionSecret) &&
        databaseUrl &&
        jwtSecret
    )

  const maxAgeDays = Math.max(1, parseInt(env.ATOZAS_SESSION_MAX_AGE_DAYS || '30', 10) || 30)
  const sameSiteRaw = String(env.ATOZAS_COOKIE_SAMESITE || 'lax').trim().toLowerCase()
  const sameSite = ['lax', 'strict', 'none'].includes(sameSiteRaw) ? sameSiteRaw : 'lax'
  const redirectIsHttps = /^https:/i.test(redirectUri)
  const secure = redirectIsHttps
    ? true
    : env.ATOZAS_COOKIE_SECURE != null && env.ATOZAS_COOKIE_SECURE !== ''
      ? parseBool(env.ATOZAS_COOKIE_SECURE, false)
      : String(env.NODE_ENV || '').toLowerCase() === 'production'
  const tokenAuthStyle = String(env.ATOZAS_TOKEN_AUTH_STYLE || 'body').trim().toLowerCase() === 'basic'
    ? 'basic'
    : 'body'
  const frontendUrl = resolveFrontendUrl(env)

  return {
    enabled,
    configured,
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    scope: String(env.ATOZAS_SCOPE || 'openid email profile').trim() || 'openid email profile',
    authorizeUrl: String(env.ATOZAS_AUTHORIZE_URL || '').trim(),
    tokenUrl: String(env.ATOZAS_TOKEN_URL || '').trim(),
    userinfoUrl: String(env.ATOZAS_USERINFO_URL || '').trim(),
    revokeUrl: String(env.ATOZAS_REVOKE_URL || '').trim(),
    discoveryUrl: String(env.ATOZAS_DISCOVERY_URL || '').trim() || (issuer ? `${issuer}/sso/` : ''),
    homepageKey: String(env.ATOZAS_HOMEPAGE_KEY || '').trim(),
    tokenAuthStyle,
    autoRedirect: parseBool(env.ATOZAS_AUTO_REDIRECT, false),
    databaseUrl,
    sessionCookieName: String(env.ATOZAS_SESSION_COOKIE_NAME || 'umnaapp_atozas_sid').trim() || 'umnaapp_atozas_sid',
    sessionSecret,
    sessionCollection: String(env.ATOZAS_SESSION_COLLECTION || 'atozas_sso_sessions').trim() || 'atozas_sso_sessions',
    sessionMaxAgeMs: maxAgeDays * 24 * 60 * 60 * 1000,
    cookieSecure: secure,
    cookieSameSite: sameSite,
    frontendUrl,
    jwtSecret,
  }
}

export function defaultOidcEndpoints(issuer) {
  const base = joinUrl(issuer, 'sso')
  return {
    issuer,
    authorization_endpoint: joinUrl(base, 'authorize'),
    token_endpoint: joinUrl(base, 'token'),
    userinfo_endpoint: joinUrl(base, 'userinfo'),
    revocation_endpoint: joinUrl(base, 'revoke'),
  }
}

export function mergeOidcEndpoints(config, discovered = {}) {
  const fallback = defaultOidcEndpoints(config.issuer)
  return {
    issuer: discovered.issuer || fallback.issuer,
    authorization_endpoint:
      config.authorizeUrl || discovered.authorization_endpoint || fallback.authorization_endpoint,
    token_endpoint: config.tokenUrl || discovered.token_endpoint || fallback.token_endpoint,
    userinfo_endpoint: config.userinfoUrl || discovered.userinfo_endpoint || fallback.userinfo_endpoint,
    revocation_endpoint: config.revokeUrl || discovered.revocation_endpoint || fallback.revocation_endpoint,
  }
}

export function publicSsoStatus(config) {
  const ready = Boolean(config?.enabled && config?.configured)
  return {
    enabled: ready,
    autoRedirect: Boolean(ready && config?.autoRedirect),
  }
}

export function userRecordFromUserinfo(userinfo) {
  const email = normalizeEmail(userinfo?.email)
  if (!isValidEmail(email)) {
    const err = new Error('email_required')
    err.code = 'email_required'
    throw err
  }
  const pictureRaw = String(userinfo?.picture || '').trim()
  const picture = /^https?:\/\//i.test(pictureRaw) ? pictureRaw : undefined
  return {
    email,
    name: displayNameFromUserinfo(userinfo, email),
    picture,
  }
}

export function buildAuthorizeUrl(endpoints, params) {
  const url = new URL(endpoints.authorization_endpoint)
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }
  return url.toString()
}

export function buildTokenRequest({ config, code, codeVerifier, redirectUri }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri || config.redirectUri,
    code_verifier: codeVerifier,
  })
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (config.tokenAuthStyle === 'basic') {
    headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
    body.set('client_id', config.clientId)
  } else {
    body.set('client_id', config.clientId)
    body.set('client_secret', config.clientSecret)
  }
  return { body, headers }
}

export async function discoverOidcEndpoints(config, fetchImpl = fetch) {
  const urls = [
    config.discoveryUrl,
    config.issuer ? `${config.issuer}/sso/` : '',
    config.issuer ? `${config.issuer}/.well-known/openid-configuration` : '',
  ].filter(Boolean)

  let lastError = null
  for (const url of urls) {
    try {
      const res = await fetchImpl(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) {
        lastError = new Error(`discovery ${res.status}`)
        continue
      }
      const data = await res.json()
      if (data?.authorization_endpoint && data?.token_endpoint && data?.userinfo_endpoint) {
        return mergeOidcEndpoints(config, data)
      }
    } catch (err) {
      lastError = err
    }
  }

  if (config.authorizeUrl && config.tokenUrl && config.userinfoUrl) {
    return mergeOidcEndpoints(config, {})
  }
  if (lastError) {
    console.warn('ATOZAS OIDC discovery failed; using issuer /sso defaults')
  }
  return mergeOidcEndpoints(config, {})
}

export async function exchangeAuthorizationCode({ config, endpoints, code, codeVerifier, fetchImpl = fetch }) {
  const { body, headers } = buildTokenRequest({ config, code, codeVerifier })
  const res = await fetchImpl(endpoints.token_endpoint, {
    method: 'POST',
    headers,
    body,
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(payload.error || 'token_exchange_failed')
    err.status = res.status
    err.code = payload.error
    throw err
  }
  return payload
}

export async function fetchUserinfo({ endpoints, accessToken, fetchImpl = fetch }) {
  const res = await fetchImpl(endpoints.userinfo_endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(payload.error || 'userinfo_failed')
    err.status = res.status
    throw err
  }
  return payload
}

export async function revokeProviderToken({ config, endpoints, token, tokenTypeHint, fetchImpl = fetch }) {
  if (!token || !endpoints.revocation_endpoint) return
  const body = new URLSearchParams({ token })
  if (tokenTypeHint) body.set('token_type_hint', tokenTypeHint)
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (config.tokenAuthStyle === 'basic') {
    headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
    body.set('client_id', config.clientId)
  } else {
    body.set('client_id', config.clientId)
    body.set('client_secret', config.clientSecret)
  }
  try {
    await fetchImpl(endpoints.revocation_endpoint, { method: 'POST', headers, body })
  } catch {
    // Logout must still succeed if the IdP revoke endpoint is unreachable.
  }
}
