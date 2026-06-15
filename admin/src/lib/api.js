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

export async function fetchRecords(model, { page = 1, limit = 50, full = false, q = '' } = {}) {
  const encoded = encodeURIComponent(model)
  const search = String(q || '').trim()
  const { data } = await api.get(`/admin/records/${encoded}`, {
    params: {
      page,
      limit,
      ...(full ? { full: 1 } : {}),
      ...(search ? { q: search } : {}),
    },
  })
  return data
}

export async function fetchPendingPlaces(params = {}) {
  const { data } = await api.get('/admin/places/pending', {
    params: {
      q: params.q?.trim() || undefined,
      category: params.category || undefined,
      source: params.source || undefined,
    },
  })
  return data
}

export async function fetchApprovedPlaces(params = {}) {
  const { data } = await api.get('/admin/places/approved', {
    params: {
      limit: params.limit ?? 150,
      q: params.q?.trim() || undefined,
      category: params.category || undefined,
      source: params.source || undefined,
    },
  })
  return data
}

export async function approvePlace(id) {
  const { data } = await api.patch(`/admin/places/${encodeURIComponent(id)}/approve`)
  return data
}

export async function fetchExtractedPlaces(params = {}) {
  const { data } = await api.get('/admin/places', { params })
  return data
}

export async function fetchPlaceDetail(id) {
  const { data } = await api.get(`/admin/places/${encodeURIComponent(id)}`)
  return data
}

export async function updatePlace(id, body) {
  const { data } = await api.patch(`/admin/places/${encodeURIComponent(id)}`, body)
  return data
}

export async function deletePlace(id) {
  const { data } = await api.delete(`/admin/places/${encodeURIComponent(id)}`)
  return data
}

export async function rejectPlace(id) {
  const { data } = await api.patch(`/admin/places/${encodeURIComponent(id)}/reject`)
  return data
}

export async function bulkPlaceAction(ids, action) {
  const { data } = await api.post('/admin/places/bulk-action', { ids, action })
  return data
}

export async function fetchPlaceHistory(id) {
  const { data } = await api.get(`/admin/places/${encodeURIComponent(id)}/history`)
  return data
}

export async function restorePlaceVersion(id, auditId) {
  const { data } = await api.post(
    `/admin/places/${encodeURIComponent(id)}/restore/${encodeURIComponent(auditId)}`
  )
  return data
}

export async function fetchBusinessClaims(status = 'pending') {
  const { data } = await api.get('/admin/claims', { params: { status } })
  return data
}

export async function approveBusinessClaim(id, note) {
  const { data } = await api.post(`/admin/claims/${encodeURIComponent(id)}/approve`, { note })
  return data
}

export async function rejectBusinessClaim(id, note) {
  const { data } = await api.post(`/admin/claims/${encodeURIComponent(id)}/reject`, { note })
  return data
}
