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
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      // Only logout on 401 (invalid/expired token) - user must click Logout otherwise
      if (error.response?.status === 401) {
        logout()
      } else {
        // Network error, 500, etc. - keep login, retry once
        console.error('Failed to load user:', error)
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
    } else {
      setLoading(false)
    }
  }, [token, loadUser])

  const login = (userData, authToken) => {
    setToken(authToken)
    setUser(userData)
    localStorage.setItem('token', authToken)
  }

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
    isAuthenticated: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

