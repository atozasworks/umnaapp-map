/**
 * Security regression tests for:
 * 1) /api/test disabled in production + OTP never in API responses
 * 2) Redis mandatory in production + rate limit fail-closed behavior
 *
 * Run: node --test tests/security.hardening.test.mjs
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')
const BASE = (process.env.API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '')

function loadEnvFile() {
  const envPath = path.join(backendRoot, '.env')
  if (!fs.existsSync(envPath)) return {}
  const out = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function runNodeScript(script, env, { timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
      cwd: backendRoot,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({ code: null, stdout, stderr, timedOut: true })
    }, timeoutMs)
    child.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr, timedOut: false })
    })
  })
}

describe('production Redis requirement', () => {
  test('validateRedisOrExit exits when NODE_ENV=production and REDIS_URL is missing', async () => {
    const result = await runNodeScript(
      `
      process.env.NODE_ENV = 'production';
      delete process.env.REDIS_URL;
      const { validateRedisOrExit } = await import('./middleware/rateLimit.js');
      validateRedisOrExit();
      console.log('SHOULD_NOT_REACH');
      `,
      { NODE_ENV: 'production', REDIS_URL: '' },
      { timeoutMs: 5000 }
    )
    assert.equal(result.timedOut, false)
    assert.equal(result.code, 1)
    assert.match(`${result.stdout}${result.stderr}`, /REDIS_URL is required in production/i)
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /SHOULD_NOT_REACH/)
  })

  test('validateRedisOrExit does not exit in development without REDIS_URL', async () => {
    const result = await runNodeScript(
      `
      process.env.NODE_ENV = 'development';
      delete process.env.REDIS_URL;
      const { validateRedisOrExit } = await import('./middleware/rateLimit.js');
      validateRedisOrExit();
      console.log('OK_DEV');
      `,
      { NODE_ENV: 'development', REDIS_URL: '' },
      { timeoutMs: 5000 }
    )
    assert.equal(result.timedOut, false)
    assert.equal(result.code, 0)
    assert.match(result.stdout, /OK_DEV/)
  })
})

describe('rate limit fail-closed behavior', () => {
  test('rateLimitMiddleware returns 503 when Redis URL is set but client is unavailable', async () => {
    const { rateLimitMiddleware } = await import('../middleware/rateLimit.js')
    const prev = process.env.REDIS_URL
    process.env.REDIS_URL = 'redis://127.0.0.1:1'
    const mw = rateLimitMiddleware('security-test', 10, 60)

    const result = await new Promise((resolve) => {
      const res = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code
          return this
        },
        json(payload) {
          this.body = payload
          resolve({ statusCode: this.statusCode, body: payload, nextCalled: false })
          return this
        },
        setHeader() {},
      }
      mw({ ip: '127.0.0.1' }, res, () => {
        resolve({ statusCode: res.statusCode, body: res.body, nextCalled: true })
      })
    })

    if (prev === undefined) delete process.env.REDIS_URL
    else process.env.REDIS_URL = prev

    assert.equal(result.nextCalled, false)
    assert.equal(result.statusCode, 503)
    assert.match(String(result.body?.message || ''), /Redis/i)
  })

  test('rateLimitMiddleware allows next() in development when REDIS_URL is unset', async () => {
    // Isolated subprocess so module-level redis client state is clean
    const result = await runNodeScript(
      `
      process.env.NODE_ENV = 'development';
      delete process.env.REDIS_URL;
      const { rateLimitMiddleware } = await import('./middleware/rateLimit.js');
      const mw = rateLimitMiddleware('dev-skip', 5, 60);
      await new Promise((resolve, reject) => {
        const res = {
          status() { return this },
          json(payload) { reject(new Error('unexpected 503: ' + JSON.stringify(payload))) },
          setHeader() {},
        };
        mw({ ip: '127.0.0.1' }, res, () => resolve());
      });
      console.log('DEV_SKIP_OK');
      `,
      { NODE_ENV: 'development', REDIS_URL: '' },
      { timeoutMs: 5000 }
    )
    assert.equal(result.code, 0)
    assert.match(result.stdout, /DEV_SKIP_OK/)
  })
})

describe('test routes security', () => {
  test('test-email route handler never includes otp in JSON response', async () => {
    const source = fs.readFileSync(path.join(backendRoot, 'routes', 'testRoutes.js'), 'utf8')
    assert.doesNotMatch(source, /\botp\s*:/)
    assert.doesNotMatch(source, /Test OTP:/)
  })

  test('server.js mounts /api/test only outside production', async () => {
    const source = fs.readFileSync(path.join(backendRoot, 'server.js'), 'utf8')
    assert.match(source, /NODE_ENV\s*!==\s*['"]production['"]/)
    assert.match(source, /app\.use\(['"]\/api\/test['"],\s*testRoutes\)/)
    assert.match(source, /\/api\/test disabled/)
  })
})

describe('live server checks (current NODE_ENV)', () => {
  async function serverUp() {
    try {
      const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2000) })
      return res.ok
    } catch {
      return false
    }
  }

  test('GET /api/health still works', async (t) => {
    if (!(await serverUp())) {
      t.skip(`API not reachable at ${BASE} — start backend to run live checks`)
      return
    }
    const res = await fetch(`${BASE}/api/health`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.status, 'ok')
  })

  test('/api/test behavior matches NODE_ENV of running server', async (t) => {
    if (!(await serverUp())) {
      t.skip(`API not reachable at ${BASE}`)
      return
    }
    const fileEnv = loadEnvFile()
    const nodeEnv = process.env.SERVER_NODE_ENV || fileEnv.NODE_ENV || 'development'
    const res = await fetch(`${BASE}/api/test/smtp-config`)
    if (nodeEnv === 'production') {
      // Unmounted routes fall through to SPA/static — must not return SMTP config JSON
      if (res.status === 200) {
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const body = await res.json()
          assert.equal(body?.config, undefined, 'production must not expose /api/test SMTP config')
        }
      }
      assert.notEqual(res.status, 200, 'expected /api/test to be unavailable in production')
    } else {
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.ok(body.config)
      assert.equal(body.config.SMTP_EMAIL_PASSWORD === undefined || typeof body.config.SMTP_EMAIL_PASSWORD === 'string', true)
    }
  })

  test('POST /api/test/test-email never returns otp field when reachable', async (t) => {
    if (!(await serverUp())) {
      t.skip(`API not reachable at ${BASE}`)
      return
    }
    const fileEnv = loadEnvFile()
    const nodeEnv = process.env.SERVER_NODE_ENV || fileEnv.NODE_ENV || 'development'
    if (nodeEnv === 'production') {
      // Skip live OTP check — route should be unavailable (covered above)
      return
    }

    const res = await fetch(`${BASE}/api/test/test-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
    const missing = await res.json()
    assert.equal(Object.prototype.hasOwnProperty.call(missing, 'otp'), false)

    const testEmail = process.env.TEST_EMAIL
    if (!testEmail) return

    const sendRes = await fetch(`${BASE}/api/test/test-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    })
    const body = await sendRes.json()
    assert.equal(Object.prototype.hasOwnProperty.call(body, 'otp'), false)
    assert.equal(body.otp, undefined)
  })

  test('auth rate-limit path does not crash (still serves /api/auth or 503 only if Redis required+down)', async (t) => {
    if (!(await serverUp())) {
      t.skip(`API not reachable at ${BASE}`)
      return
    }
    const res = await fetch(`${BASE}/api/auth/me`)
    // Without token → 401 when rate limit allows; 503 only if Redis required and down
    assert.ok([401, 403, 429, 503].includes(res.status), `unexpected status ${res.status}`)
    if (res.status === 503) {
      const body = await res.json()
      assert.match(String(body.message || body.error || ''), /Redis|unavailable/i)
    }
  })
})

// Optional: ephemeral production-like express mount check without full server boot
describe('production mount isolation', () => {
  test('express app with NODE_ENV=production does not expose /api/test', async () => {
    const result = await runNodeScript(
      `
      process.env.NODE_ENV = 'production';
      const express = (await import('express')).default;
      const testRoutes = (await import('./routes/testRoutes.js')).default;
      const app = express();
      if (process.env.NODE_ENV !== 'production') {
        app.use('/api/test', testRoutes);
      }
      app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
      const server = app.listen(0, async () => {
        try {
          const { port } = server.address();
          const health = await fetch('http://127.0.0.1:' + port + '/api/health');
          const testRes = await fetch('http://127.0.0.1:' + port + '/api/test/smtp-config');
          process.stdout.write('RESULT:' + JSON.stringify({ health: health.status, test: testRes.status }) + '\\n');
        } finally {
          server.close(() => process.exit(0));
        }
      });
      `,
      { NODE_ENV: 'production' },
      { timeoutMs: 8000 }
    )
    assert.equal(result.timedOut, false)
    assert.equal(result.code, 0)
    const marker = result.stdout.split(/\r?\n/).find((l) => l.startsWith('RESULT:'))
    assert.ok(marker, `expected RESULT marker in stdout, got: ${result.stdout}\\n${result.stderr}`)
    const parsed = JSON.parse(marker.slice('RESULT:'.length))
    assert.equal(parsed.health, 200)
    assert.equal(parsed.test, 404)
  })
})
