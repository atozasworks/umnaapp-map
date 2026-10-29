import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15s - avoid infinite hang on /auth/me when API unreachable
})

// Add token to requests + longer timeout for OTP send (SMTP can take 20-30s)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // OTP send endpoints - SMTP can be slow, allow 45s
    const otpUrls = ['/auth/login', '/auth/register', '/auth/resend-otp', '/email/send-otp']
    if (otpUrls.some((u) => (config.url || '').includes(u))) {
      config.timeout = 45000
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

const SESSION_ENDED_ERRORS = new Set([
  'Token expired',
  'Invalid or expired session',
  'Invalid token',
])

// End the local session only when the server rejects the signed session itself.
// Other 401s (missing rights, admin-only routes) must not sign the user out.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const message = error.response?.data?.error
    const sessionEnded =
      error.response?.status === 401 &&
      (url.includes('/auth/me') || SESSION_ENDED_ERRORS.has(message))
    if (sessionEnded) {
      window.dispatchEvent(new CustomEvent('auth:sessionExpired'))
    }
    return Promise.reject(error)
  }
)

export default api

