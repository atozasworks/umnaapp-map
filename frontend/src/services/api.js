import axios from 'axios'

const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const api = axios.create({
  baseURL: `${base}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle 401 - only logout when /auth/me fails (actual session invalid). Other 401s don't auto-logout.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && url.includes('/auth/me')) {
      window.dispatchEvent(new CustomEvent('auth:sessionExpired'))
    }
    return Promise.reject(error)
  }
)

export default api

