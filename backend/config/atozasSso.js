import express from 'express'
import session from 'express-session'
import prisma from './database.js'
import { generateToken, createSession, revokeSession } from '../utils/jwt.js'
import { createPgSessionStore } from '../utils/pgSessionStore.js'
import {
  readOidcConfig,
  publicSsoStatus,
  generateNonce,
  generatePkceS256,
  sanitizeReturnTo,
  sealOidcState,
  openOidcState,
  discoverOidcEndpoints,
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  fetchUserinfo,
  revokeProviderToken,
  userRecordFromUserinfo,
} from '../utils/atozasOidc.js'

const OIDC_TTL_MS = 10 * 60 * 1000

function loginErrorRedirect(frontendUrl, code, returnTo) {
  const url = new URL('/login', frontendUrl)
  url.searchParams.set('error', code)
  const safe = sanitizeReturnTo(returnTo, '')
  if (safe) url.searchParams.set('redirect', safe)
  return url.toString()
}

function frontendRedirect(frontendUrl, returnTo, token) {
  const safe = sanitizeReturnTo(returnTo, '/')
  const url = new URL(safe, frontendUrl)
  if (token) url.searchParams.set('token', token)
  if (url.origin !== new URL(frontendUrl).origin) {
    const fallback = new URL('/', frontendUrl)
    if (token) fallback.searchParams.set('token', token)
    return fallback.toString()
  }
  return url.toString()
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()))
  })
}

function destroySession(req) {
  return new Promise((resolve) => {
    if (!req.session) return resolve()
    req.session.destroy(() => resolve())
  })
}

function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture || null,
    emailVerified: Boolean(user.emailVerified),
  }
}

async function defaultFindOrCreateUser(userinfo) {
  const record = userRecordFromUserinfo(userinfo)
  let user = await prisma.user.findFirst({
    where: { email: { equals: record.email, mode: 'insensitive' } },
  })

  if (user) {
    const data = {}
    if (!user.emailVerified) data.emailVerified = true
    if (!user.picture && record.picture) data.picture = record.picture
    if (Object.keys(data).length === 0) return user
    return prisma.user.update({ where: { id: user.id }, data })
  }

  return prisma.user.create({
    data: {
      name: record.name,
      email: record.email,
      picture: record.picture,
      emailVerified: true,
    },
  })
}

async function defaultIssueAppSession(user) {
  const token = generateToken(user.id)
  await createSession(user.id, token)
  return { token, user }
}

async function defaultRevokeAppSession(token) {
  if (!token) return
  await revokeSession(token)
}

function disabledRouter(config) {
  const router = express.Router()
  const status = { ...publicSsoStatus(config), authenticated: false }

  router.get('/atozas/me', (req, res) => {
    res.json(status)
  })

  router.get(['/atozas', '/atozas/callback'], (req, res) => {
    res.status(404).json({ error: 'atozas_sso_disabled' })
  })

  router.post('/logout', (req, res) => {
    res.status(404).json({ error: 'atozas_sso_disabled' })
  })

  router.use((req, res) => {
    res.status(404).json({ error: 'atozas_sso_disabled' })
  })

  return router
}

function createSessionMiddleware(config, sessionStore) {
  const sameSite = config.cookieSameSite
  const secure = sameSite === 'none' ? true : config.cookieSecure
  return session({
    name: config.sessionCookieName,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: config.sessionMaxAgeMs,
      path: '/',
    },
  })
}

function createSessionStore(config) {
  if (config.databaseUrl) {
    return createPgSessionStore(config.databaseUrl, {
      tableName: config.sessionCollection || 'atozas_sso_sessions',
      ttlSeconds: Math.ceil(config.sessionMaxAgeMs / 1000),
    })
  }
  console.warn('⚠️  ATOZAS SSO using MemoryStore; set DATABASE_URL for PostgreSQL sessions')
  return new session.MemoryStore()
}

export function createAtozasSsoRouter(overrides = {}) {
  const config = overrides.config || readOidcConfig()
  if (!config.enabled || !config.configured) {
    return disabledRouter(config)
  }

  const fetchImpl = overrides.fetchImpl || fetch
  const findOrCreateUser = overrides.findOrCreateUser || defaultFindOrCreateUser
  const issueAppSession = overrides.issueAppSession || defaultIssueAppSession
  const revokeAppSession = overrides.revokeAppSession || defaultRevokeAppSession
  const getUserById =
    overrides.getUserById ||
    ((id) =>
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          picture: true,
          emailVerified: true,
        },
      }))
  const isAppTokenValid =
    overrides.isAppTokenValid ||
    (async (token, userId) => {
      if (!token || !userId) return false
      const row = await prisma.session.findFirst({
        where: { token, userId, expiresAt: { gt: new Date() } },
        select: { id: true },
      })
      return Boolean(row)
    })
  const sessionStore = overrides.sessionStore || createSessionStore(config)

  const router = express.Router()
  router.use(createSessionMiddleware(config, sessionStore))

  let endpointsPromise = null
  const getEndpoints = () => {
    if (!endpointsPromise) {
      endpointsPromise = discoverOidcEndpoints(config, fetchImpl).catch((err) => {
        endpointsPromise = null
        throw err
      })
    }
    return endpointsPromise
  }

  router.get('/atozas', async (req, res) => {
    try {
      const returnTo = sanitizeReturnTo(req.query.returnTo || req.query.redirect, '/')
      const nonce = generateNonce()
      const pkce = generatePkceS256()
      const endpoints = await getEndpoints()
      const state = sealOidcState(
        {
          v: pkce.codeVerifier,
          n: nonce,
          r: returnTo,
          t: Date.now(),
        },
        config.sessionSecret
      )

      const authorizeUrl = buildAuthorizeUrl(endpoints, {
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scope,
        state,
        nonce,
        code_challenge: pkce.codeChallenge,
        code_challenge_method: pkce.codeChallengeMethod,
      })
      res.redirect(authorizeUrl)
    } catch (err) {
      console.error('ATOZAS authorize start failed:', err.message)
      res.redirect(loginErrorRedirect(config.frontendUrl, 'atozas_auth_failed', req.query.returnTo))
    }
  })

  router.get('/atozas/callback', async (req, res) => {
    const sealed = typeof req.query.state === 'string' ? req.query.state : ''
    const pending = openOidcState(sealed, config.sessionSecret, OIDC_TTL_MS)
    const returnTo = pending?.returnTo || '/'
    const fail = (code) => res.redirect(loginErrorRedirect(config.frontendUrl, code, returnTo))

    try {
      if (req.query.error) {
        return fail('atozas_auth_failed')
      }

      const code = typeof req.query.code === 'string' ? req.query.code : ''
      if (!code || !pending?.codeVerifier) return fail('atozas_session_expired')

      const endpoints = await getEndpoints()
      const tokens = await exchangeAuthorizationCode({
        config,
        endpoints,
        code,
        codeVerifier: pending.codeVerifier,
        fetchImpl,
      })

      const accessToken = tokens?.access_token
      if (!accessToken || typeof accessToken !== 'string') {
        return fail('atozas_auth_failed')
      }

      const userinfo = await fetchUserinfo({
        endpoints,
        accessToken,
        fetchImpl,
      })

      let record
      try {
        record = userRecordFromUserinfo(userinfo)
      } catch {
        return fail('atozas_email_required')
      }

      const user = await findOrCreateUser(userinfo)
      if (!user?.id) return fail('atozas_auth_failed')

      const { token } = await issueAppSession(user)
      req.session.atozas = {
        userId: user.id,
        email: record.email,
        appToken: token,
        accessToken,
        refreshToken: typeof tokens.refresh_token === 'string' ? tokens.refresh_token : undefined,
        tokenType: typeof tokens.token_type === 'string' ? tokens.token_type : undefined,
      }
      await saveSession(req)
      res.redirect(frontendRedirect(config.frontendUrl, returnTo, token))
    } catch (err) {
      console.error('ATOZAS callback failed:', err.message)
      fail('atozas_auth_failed')
    }
  })

  router.get('/atozas/me', async (req, res) => {
    const status = publicSsoStatus(config)
    if (req.query.restore === '0') {
      return res.json({ ...status, authenticated: false })
    }

    const atozas = req.session?.atozas
    if (!atozas?.userId) {
      return res.json({ ...status, authenticated: false })
    }

    try {
      let token = atozas.appToken
      if (token && !(await isAppTokenValid(token, atozas.userId))) {
        token = null
      }

      const user = await getUserById(atozas.userId)
      if (!user) {
        req.session.atozas = undefined
        await saveSession(req)
        return res.json({ ...status, authenticated: false })
      }

      if (!token) {
        const issued = await issueAppSession(user)
        token = issued.token
        req.session.atozas = { ...atozas, appToken: token }
        await saveSession(req)
      }

      res.json({
        ...status,
        authenticated: true,
        token,
        user: publicUser(user),
      })
    } catch (err) {
      console.error('ATOZAS session restore failed:', err.message)
      res.status(500).json({ ...status, authenticated: false, error: 'session_restore_failed' })
    }
  })

  router.post('/logout', async (req, res) => {
    const atozas = req.session?.atozas
    try {
      if (atozas?.appToken) {
        await revokeAppSession(atozas.appToken)
      }
      if (atozas?.accessToken || atozas?.refreshToken) {
        const endpoints = await getEndpoints().catch(() => null)
        if (endpoints) {
          await revokeProviderToken({
            config,
            endpoints,
            token: atozas.accessToken,
            tokenTypeHint: 'access_token',
            fetchImpl,
          })
          if (atozas.refreshToken) {
            await revokeProviderToken({
              config,
              endpoints,
              token: atozas.refreshToken,
              tokenTypeHint: 'refresh_token',
              fetchImpl,
            })
          }
        }
      }
    } catch {
      // Logout must still succeed if IdP revoke is unreachable.
    }

    // Drop IdP/app tokens from the session first so a failed destroy cannot
    // leave /atozas/me able to remint a JWT.
    if (req.session) {
      req.session.atozas = undefined
      try {
        await saveSession(req)
      } catch {
        /* destroy below still runs */
      }
    }

    const cookieOpts = {
      path: '/',
      httpOnly: true,
      secure: config.cookieSameSite === 'none' ? true : config.cookieSecure,
      sameSite: config.cookieSameSite,
    }
    await destroySession(req)
    res.clearCookie(config.sessionCookieName, cookieOpts)
    res.json({ message: 'Logged out successfully', authenticated: false })
  })

  return router
}

function mountSsoRouter(app, router) {
  // Canonical IdP callback: /auth/atozas/callback
  app.use('/auth', router)
  app.use('/api/sso', router)
}

export function mountAtozasSso(app) {
  const config = readOidcConfig()
  try {
    if (!config.enabled) {
      mountSsoRouter(app, createAtozasSsoRouter({ config }))
      console.log('🔒 ATOZAS SSO disabled (ATOZAS_SSO_ENABLED=false)')
      return { enabled: false, configured: false }
    }
    if (!config.configured) {
      mountSsoRouter(app, createAtozasSsoRouter({ config }))
      console.warn(
        '⚠️  ATOZAS SSO is enabled but not fully configured. Set issuer, client id/secret, redirect URI, session secret, DATABASE_URL, and JWT_SECRET. Existing login methods are unchanged.'
      )
      return { enabled: true, configured: false }
    }
    if (config.cookieSameSite === 'none' && !config.cookieSecure) {
      console.warn('⚠️  ATOZAS_COOKIE_SAMESITE=none requires ATOZAS_COOKIE_SECURE=true')
    }
    mountSsoRouter(app, createAtozasSsoRouter({ config }))
    console.log('🔐 ATOZAS SSO client mounted at /auth/atozas')
    return { enabled: true, configured: true }
  } catch (err) {
    console.warn('⚠️  ATOZAS SSO failed to start; existing authentication is unchanged:', err.message)
    mountSsoRouter(app, createAtozasSsoRouter({ config: { ...config, configured: false } }))
    return { enabled: false, configured: false }
  }
}

export { defaultFindOrCreateUser, defaultIssueAppSession }
