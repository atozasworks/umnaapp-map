import axios from 'axios'

const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const api = axios.create({
  baseURL: `${base}/api`,
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
    const otpUrls = ['/auth/login', '/auth/register', '/email/send-otp']
    if (otpUrls.some((u) => (config.url || '').includes(u))) {
      config.timeout = 45000
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

