import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }, [])

  const loadUser = useCallback(async (retryCount = 0) => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
    } catch (error) {
      // Only logout on 401 (invalid/expired token) - user must click Logout otherwise
      if (error.response?.status === 401) {
        logout()
      } else {
        // Network error, timeout, 500, etc. - keep token, retry once
        console.error('Failed to load user:', error?.message || error)
        if (retryCount < 2) {
          setTimeout(() => loadUser(retryCount + 1), 2000)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    // Check for token in URL (from Google OAuth)
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('token')
    
    if (urlToken) {
      setToken(urlToken)
      localStorage.setItem('token', urlToken)
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    // Load user from database when token exists
    if (token) {
      loadUser()
      // Fallback: if loadUser hangs (e.g. API unreachable), stop loading after 20s
      const fallbackTimer = setTimeout(() => setLoading(false), 20000)
      return () => clearTimeout(fallbackTimer)
    } else {
      setLoading(false)
    }
  }, [token, loadUser])

  const login = (userData, authToken) => {
    setToken(authToken)
    setUser(userData)
    localStorage.setItem('token', authToken)
  }

  const updateProfilePicture = useCallback(async (pictureData) => {
    try {
      const { data } = await api.put('/auth/profile-picture', { picture: pictureData })
      setUser(data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to update' }
    }
  }, [])

  // Listen for 401 from /auth/me only - session expired
  useEffect(() => {
    const handleSessionInvalid = () => logout()
    window.addEventListener('auth:sessionExpired', handleSessionInvalid)
    return () => window.removeEventListener('auth:sessionExpired', handleSessionInvalid)
  }, [logout])

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    loadUser,
    updateProfilePicture,
    isAuthenticated: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

