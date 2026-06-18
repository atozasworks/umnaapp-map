import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE = (__ENV.API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '')

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.99'],
  },
}

export default function () {
  const health = http.get(`${BASE}/api/health`)
  check(health, {
    'health status 200': (r) => r.status === 200,
    'health body ok': (r) => {
      try {
        return JSON.parse(r.body).status === 'ok'
      } catch {
        return false
      }
    },
  })

  const dbHealth = http.get(`${BASE}/api/health/db`)
  check(dbHealth, {
    'db health status 200': (r) => r.status === 200,
  })

  sleep(0.1)
}
