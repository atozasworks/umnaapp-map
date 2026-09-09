import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseBool,
  isPlaceholder,
  sanitizeReturnTo,
  generatePkceS256,
  generateState,
  safeEqual,
  readOidcConfig,
  publicSsoStatus,
  userRecordFromUserinfo,
  buildAuthorizeUrl,
  buildTokenRequest,
  mergeOidcEndpoints,
  redactSensitive,
  normalizeIssuer,
  resolveFrontendUrl,
  sealOidcState,
  openOidcState,
} from '../utils/atozasOidc.js'

describe('ATOZAS OIDC helpers', () => {
  test('parseBool understands common truthy flags', () => {
    assert.equal(parseBool('true', false), true)
    assert.equal(parseBool('false', true), false)
    assert.equal(parseBool('', false), false)
    assert.equal(parseBool(undefined, true), true)
  })

  test('isPlaceholder rejects empty and template values', () => {
    assert.equal(isPlaceholder(''), true)
    assert.equal(isPlaceholder('paste_from_atozas'), true)
    assert.equal(isPlaceholder('https://your-app-domain.com/auth/atozas/callback'), true)
    assert.equal(isPlaceholder('real-client-id'), false)
  })

  test('sanitizeReturnTo blocks open redirects', () => {
    assert.equal(sanitizeReturnTo('https://evil.example/phish'), '/')
    assert.equal(sanitizeReturnTo('//evil.example'), '/')
    assert.equal(sanitizeReturnTo('\\evil'), '/')
    assert.equal(sanitizeReturnTo('/settings'), '/settings')
    assert.equal(sanitizeReturnTo('/home?x=1'), '/?x=1')
  })

  test('PKCE S256 verifier and challenge are generated', () => {
    const pkce = generatePkceS256()
    assert.equal(pkce.codeChallengeMethod, 'S256')
    assert.ok(pkce.codeVerifier.length >= 32)
    assert.ok(pkce.codeChallenge.length >= 32)
    assert.notEqual(pkce.codeVerifier, pkce.codeChallenge)
    assert.notEqual(generateState(), generateState())
  })

  test('safeEqual is timing-safe and rejects mismatched values', () => {
    assert.equal(safeEqual('abc', 'abc'), true)
    assert.equal(safeEqual('abc', 'abd'), false)
    assert.equal(safeEqual('abc', 'ab'), false)
    assert.equal(safeEqual(null, 'abc'), false)
  })

  test('SSO is disabled unless ATOZAS_SSO_ENABLED is true and secrets are real', () => {
    const disabled = readOidcConfig({ ATOZAS_SSO_ENABLED: 'false', JWT_SECRET: 'jwt' })
    assert.equal(disabled.enabled, false)
    assert.equal(disabled.configured, false)
    assert.deepEqual(publicSsoStatus(disabled), { enabled: false, autoRedirect: false })

    const placeholder = readOidcConfig({
      ATOZAS_SSO_ENABLED: 'true',
      ATOZAS_ISSUER: 'https://testatozas.in/atozaswebsite',
      ATOZAS_CLIENT_ID: 'paste_from_atozas',
      ATOZAS_CLIENT_SECRET: 'paste_from_atozas',
      ATOZAS_REDIRECT_URI: 'https://your-app-domain.com/auth/atozas/callback',
      ATOZAS_SESSION_SECRET: 'long_random_secret',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/umnaapp',
      JWT_SECRET: 'jwt',
    })
    assert.equal(placeholder.enabled, true)
    assert.equal(placeholder.configured, false)

    const ready = readOidcConfig({
      ATOZAS_SSO_ENABLED: 'true',
      ATOZAS_ISSUER: 'https://testatozas.in/atozaswebsite',
      ATOZAS_CLIENT_ID: 'real-client',
      ATOZAS_CLIENT_SECRET: 'real-secret',
      ATOZAS_REDIRECT_URI: 'http://localhost:3000/auth/atozas/callback',
      ATOZAS_SESSION_SECRET: 'a-long-random-session-secret-value',
      ATOZAS_AUTO_REDIRECT: 'true',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/umnaapp',
      JWT_SECRET: 'jwt',
    })
    assert.equal(ready.configured, true)
    assert.equal(ready.redirectUri, 'http://localhost:3000/auth/atozas/callback')
    assert.deepEqual(publicSsoStatus(ready), { enabled: true, autoRedirect: true })

    const readyPg = readOidcConfig({
      ATOZAS_SSO_ENABLED: 'true',
      ATOZAS_ISSUER: 'https://testatozas.in/atozaswebsite/sso',
      ATOZAS_CLIENT_ID: 'real-client',
      ATOZAS_CLIENT_SECRET: 'real-secret',
      ATOZAS_REDIRECT_URI: 'https://umnaapptst.testatozas.in/auth/atozas/callback',
      ATOZAS_SESSION_SECRET: 'a-long-random-session-secret-value',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/umnaapp',
      FRONTEND_URL: 'http://localhost:3000',
      JWT_SECRET: 'jwt',
    })
    assert.equal(readyPg.configured, true)
    assert.equal(readyPg.redirectUri, 'https://umnaapptst.testatozas.in/auth/atozas/callback')
    assert.equal(readyPg.issuer, 'https://testatozas.in/atozaswebsite')
    assert.equal(readyPg.frontendUrl, 'https://umnaapptst.testatozas.in')
    assert.deepEqual(publicSsoStatus(readyPg), { enabled: true, autoRedirect: false })
  })

  test('userinfo must include a valid email', () => {
    assert.throws(() => userRecordFromUserinfo({ name: 'No Email' }), /email_required/)
    const record = userRecordFromUserinfo({
      email: '  User@Example.COM ',
      name: 'Ada Lovelace',
      picture: 'https://cdn.example/a.png',
    })
    assert.equal(record.email, 'user@example.com')
    assert.equal(record.name, 'Ada Lovelace')
    assert.equal(record.picture, 'https://cdn.example/a.png')
  })

  test('authorize URL includes PKCE S256 and never a verifier', () => {
    const url = buildAuthorizeUrl(
      { authorization_endpoint: 'https://idp.test/sso/authorize' },
      {
        response_type: 'code',
        client_id: 'cid',
        redirect_uri: 'http://localhost:3000/auth/atozas/callback',
        scope: 'openid email profile',
        state: 'st',
        code_challenge: 'challenge',
        code_challenge_method: 'S256',
        code_verifier: '',
      }
    )
    const parsed = new URL(url)
    assert.equal(parsed.searchParams.get('code_challenge_method'), 'S256')
    assert.equal(parsed.searchParams.get('code_challenge'), 'challenge')
    assert.equal(parsed.searchParams.get('code_verifier'), null)
  })

  test('token request keeps the client secret in the POST body by default', () => {
    const { body, headers } = buildTokenRequest({
      config: {
        clientId: 'cid',
        clientSecret: 's3cret',
        redirectUri: 'http://localhost:3000/auth/atozas/callback',
        tokenAuthStyle: 'body',
      },
      code: 'auth-code',
      codeVerifier: 'verifier',
    })
    const params = new URLSearchParams(body.toString())
    assert.equal(params.get('grant_type'), 'authorization_code')
    assert.equal(params.get('code_verifier'), 'verifier')
    assert.equal(params.get('client_secret'), 's3cret')
    assert.equal(headers.Authorization, undefined)
  })

  test('redactSensitive never returns provider secrets', () => {
    const redacted = redactSensitive({
      client_secret: 's3cret',
      code: 'auth-code',
      code_verifier: 'verifier',
      access_token: 'tok',
      nested: { refresh_token: 'rt' },
      ok: 'visible',
    })
    assert.equal(redacted.client_secret, '[redacted]')
    assert.equal(redacted.code, '[redacted]')
    assert.equal(redacted.code_verifier, '[redacted]')
    assert.equal(redacted.access_token, '[redacted]')
    assert.equal(redacted.nested.refresh_token, '[redacted]')
    assert.equal(redacted.ok, 'visible')
  })

  test('endpoint merge prefers explicit env URLs', () => {
    const merged = mergeOidcEndpoints(
      {
        issuer: 'https://idp.test',
        authorizeUrl: 'https://custom/authorize',
        tokenUrl: '',
        userinfoUrl: '',
        revokeUrl: '',
      },
      {
        authorization_endpoint: 'https://discovered/authorize',
        token_endpoint: 'https://discovered/token',
        userinfo_endpoint: 'https://discovered/userinfo',
        revocation_endpoint: 'https://discovered/revoke',
      }
    )
    assert.equal(merged.authorization_endpoint, 'https://custom/authorize')
    assert.equal(merged.token_endpoint, 'https://discovered/token')
  })

  test('sealed OIDC state round-trips and rejects tampering', () => {
    const secret = 'a-long-random-session-secret-value'
    const sealed = sealOidcState({ v: 'verifier-value', n: 'nonce', r: '/settings', t: Date.now() }, secret)
    const opened = openOidcState(sealed, secret)
    assert.equal(opened.codeVerifier, 'verifier-value')
    assert.equal(opened.returnTo, '/settings')
    assert.equal(openOidcState(sealed, 'wrong-secret'), null)
    assert.equal(openOidcState('not-valid', secret), null)
    assert.equal(openOidcState(sealed.slice(0, 20), secret), null)
  })

  test('normalizeIssuer strips a trailing /sso suffix', () => {
    assert.equal(normalizeIssuer('https://testatozas.in/atozaswebsite/sso/'), 'https://testatozas.in/atozaswebsite')
  })

  test('resolveFrontendUrl prefers a production redirect origin over localhost FRONTEND_URL', () => {
    assert.equal(
      resolveFrontendUrl({
        FRONTEND_URL: 'http://localhost:3000',
        ATOZAS_REDIRECT_URI: 'https://umnaapptst.testatozas.in/auth/atozas/callback',
      }),
      'https://umnaapptst.testatozas.in'
    )
  })
})
