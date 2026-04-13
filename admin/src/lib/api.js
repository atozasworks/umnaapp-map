import axios from 'axios'

const TOKEN_KEY = 'umnaapp_admin_secret'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(secret) {
  if (secret) localStorage.setItem(TOKEN_KEY, secret)
  else localStorage.removeItem(TOKEN_KEY)
}

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const t = getToken()
  if (t) {
    config.headers.Authorization = `Bearer ${t}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      const base = import.meta.env.BASE_URL || '/'
      const loginHref = base.endsWith('/') ? `${base}login` : `${base}/login`
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = loginHref
      }
    }
    return Promise.reject(err)
  }
)

export async function fetchModels() {
  const { data } = await api.get('/admin/models')
  return data.models
}

export async function fetchOverview() {
  const { data } = await api.get('/admin/overview')
  return data
}

export async function fetchOverviewGrowth() {
  const { data } = await api.get('/admin/overview/growth')
  return data
}

export async function fetchSchema() {
  const { data } = await api.get('/admin/schema')
  return data
}

export async function fetchConstraints() {
  const { data } = await api.get('/admin/schema/constraints')
  return data
}

export async function fetchRecords(model, { page = 1, limit = 50, full = false } = {}) {
  const encoded = encodeURIComponent(model)
  const { data } = await api.get(`/admin/records/${encoded}`, {
    params: { page, limit, ...(full ? { full: 1 } : {}) },
  })
  return data
}

export async function fetchPendingPlaces() {
  const { data } = await api.get('/admin/places/pending')
  return data
}

export async function approvePlace(id) {
  const { data } = await api.patch(`/admin/places/${encodeURIComponent(id)}/approve`)
  return data
}
