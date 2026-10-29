import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import api from '../services/api'
import {
  ATOZAS_POST_LOGOUT_PATH,
  beginAtozasLogin,
  fetchAtozasMe,
  isAtozasLoggedOut,
  logoutAtozasSession,
  markAtozasLoggedOut,
} from '../utils/atozasSso'
import { isTokenExpired } from '../utils/sessionExpiry'

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
  const [atozasSsoEnabled, setAtozasSsoEnabled] = useState(false)
  const [atozasAutoStart, setAtozasAutoStart] = useState(() => !isAtozasLoggedOut())
  const skipAtozasRestoreRef = useRef(false)
  const expiryHandledRef = useRef(false)

  const logout = useCallback(async () => {
    skipAtozasRestoreRef.current = true
    setAtozasAutoStart(false)
    markAtozasLoggedOut()

    // Kick off server-side teardown: revoke the app JWT session AND destroy the
    // ATOZAS SSO session cookie. Both must be awaited — callers usually do a
    // full-page redirect right after, which would otherwise cancel these
    // requests and leave the SSO cookie alive (→ /auth/atozas/me re-mints a
    // token → the user is silently signed back in).
    const tasks = []
    if (localStorage.getItem('token')) {
      tasks.push(api.post('/auth/logout').catch(() => {}))
    }
    tasks.push(logoutAtozasSession())

    // Clear local state immediately so the UI reflects sign-out right away.
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')

    await Promise.allSettled(tasks)
  }, [])

  const expireSession = useCallback(async () => {
    if (expiryHandledRef.current) return
    expiryHandledRef.current = true
    await logout()
    const path = window.location.pathname
    if (path !== '/login' && path !== '/register' && path !== '/verify-otp') {
      window.location.replace(ATOZAS_POST_LOGOUT_PATH)
      return
    }
    expiryHandledRef.current = false
  }, [logout])

  const loadUser = useCallback(async (retryCount = 0) => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
    } catch (error) {
      // Only logout on 401 (invalid/expired token) - user must click Logout otherwise
      if (error.response?.status === 401) {
        expireSession()
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
  }, [expireSession])

  useEffect(() => {
    let cancelled = false
    // Check for token in URL (from Google OAuth or ATOZAS callback)
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('token')
    
    if (urlParams.get('logged_out') === '1') {
      markAtozasLoggedOut()
      setAtozasAutoStart(false)
    }

    if (urlToken) {
      expiryHandledRef.current = false
      beginAtozasLogin()
      skipAtozasRestoreRef.current = false
      setAtozasAutoStart(true)
      setToken(urlToken)
      localStorage.setItem('token', urlToken)
      urlParams.delete('token')
      urlParams.delete('logged_out')
      const remainingSearch = urlParams.toString()
      const cleanUrl = `${window.location.pathname}${remainingSearch ? `?${remainingSearch}` : ''}${window.location.hash}`
      window.history.replaceState({}, document.title, cleanUrl)
    }

    const existingToken = urlToken || token || localStorage.getItem('token')

    if (existingToken && isTokenExpired(existingToken)) {
      expireSession()
      return () => {
        cancelled = true
      }
    }

    // Load user from database when token exists
    if (existingToken) {
      loadUser()
      // Fallback: if loadUser hangs (e.g. API unreachable), stop loading after 20s
      const fallbackTimer = setTimeout(() => setLoading(false), 20000)
      return () => {
        cancelled = true
        clearTimeout(fallbackTimer)
      }
    }

    ;(async () => {
      // Keep the logout flag until the user explicitly signs in again. Clearing
      // it here used to let a full-page redirect after Logout silently restore
      // the ATOZAS SSO cookie / auto-start OIDC.
      const loggedOut = skipAtozasRestoreRef.current || isAtozasLoggedOut()
      if (loggedOut) {
        setAtozasAutoStart(false)
        setLoading(false)
        return
      }

      const restored = await fetchAtozasMe()
      if (cancelled) return
      setAtozasSsoEnabled(Boolean(restored.enabled))
      if (restored.enabled && restored.authenticated && restored.token) {
        skipAtozasRestoreRef.current = false
        setToken(restored.token)
        localStorage.setItem('token', restored.token)
        return
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [token, loadUser, expireSession])

  useEffect(() => {
    if (!token) return undefined
    const check = () => {
      const current = localStorage.getItem('token')
      if (current && isTokenExpired(current)) expireSession()
    }
    check()
    // 30 days is longer than the maximum setTimeout delay, so poll instead.
    const id = window.setInterval(check, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [token, expireSession])

  const login = useCallback((userData, authToken) => {
    expiryHandledRef.current = false
    beginAtozasLogin()
    skipAtozasRestoreRef.current = false
    setAtozasAutoStart(true)
    setToken(authToken)
    setUser(userData)
    localStorage.setItem('token', authToken)
  }, [])

  const updateProfile = useCallback(async (profileData) => {
    try {
      const { data } = await api.put('/auth/profile', profileData)
      setUser(data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to update' }
    }
  }, [])

  const updateProfilePicture = useCallback(async (pictureData) => {
    try {
      const { data } = await api.put('/auth/profile-picture', { picture: pictureData })
      setUser(data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to update' }
    }
  }, [])

  // Server rejected the signed session (expired, revoked, or invalid).
  useEffect(() => {
    const handleSessionInvalid = () => expireSession()
    window.addEventListener('auth:sessionExpired', handleSessionInvalid)
    return () => window.removeEventListener('auth:sessionExpired', handleSessionInvalid)
  }, [expireSession])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      loadUser,
      updateProfile,
      updateProfilePicture,
      isAuthenticated: !!token,
      atozasSsoEnabled,
      atozasAutoStart,
    }),
    [user, token, loading, login, logout, loadUser, updateProfile, updateProfilePicture, atozasSsoEnabled, atozasAutoStart]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

