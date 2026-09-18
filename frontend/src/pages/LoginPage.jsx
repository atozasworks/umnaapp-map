import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout, { AuthError, AuthDivider, GoogleSignInButton, AtozasSignInButton } from '../components/auth/AuthLayout'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { authPageWithRedirect, DEFAULT_AUTH_REDIRECT, sanitizeAuthRedirect } from '../utils/authRedirect'
import {
  ATOZAS_SSO_ONCE_KEY,
  atozasStartPath,
  beginAtozasLogin,
  fetchAtozasMe,
  isAtozasLoggedOut,
  markAtozasLoggedOut,
  shouldAutoStartAtozasSso,
} from '../utils/atozasSso'

const errorMessages = {
  google_not_configured: 'Google login is not configured. Please use email OTP instead.',
  google_auth_failed: 'Google sign-in failed. Please try again or use email OTP.',
  database_error: 'Sign-in succeeded but the server could not reach the database. Try again later or use email OTP.',
  auth_failed: 'Authentication failed. Please try again.',
  atozas_not_configured: 'ATOZAS sign-in is not configured. Please use email OTP or Google.',
  atozas_auth_failed: 'ATOZAS sign-in failed. Please try again or use email OTP.',
  atozas_session_expired: 'ATOZAS sign-in expired. Please try again.',
  atozas_email_required: 'ATOZAS did not provide an email address. Use an account with a verified email.',
}

const LoginPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, atozasAutoStart, atozasSsoEnabled } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [atozasSso, setAtozasSso] = useState({ enabled: false, autoRedirect: false })
  const [ssoStarting, setSsoStarting] = useState(false)
  const redirect = sanitizeAuthRedirect(searchParams.get('redirect'))

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) {
      setError(errorMessages[err] || 'Something went wrong. Please try again.')
    }
    const loggedOutParam = searchParams.get('logged_out') === '1'
    if (loggedOutParam) markAtozasLoggedOut()

    const hasDefaultRedirect = searchParams.has('redirect') && redirect === DEFAULT_AUTH_REDIRECT
    const staleSsoHint =
      (loggedOutParam || isAtozasLoggedOut()) && searchParams.get('sso') === '1'
    if (err || hasDefaultRedirect || loggedOutParam || staleSsoHint) {
      const next = new URLSearchParams(searchParams)
      if (err) next.delete('error')
      if (hasDefaultRedirect) next.delete('redirect')
      if (loggedOutParam) next.delete('logged_out')
      if (staleSsoHint) next.delete('sso')
      const qs = next.toString()
      window.history.replaceState({}, '', qs ? `/login?${qs}` : '/login')
    }
  }, [searchParams, redirect])

  useEffect(() => {
    let cancelled = false
    fetchAtozasMe(4000, { restore: false }).then((status) => {
      if (!cancelled) setAtozasSso({ enabled: status.enabled, autoRedirect: status.autoRedirect })
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Already signed in (existing app/JWT session) → skip the login page entirely.
  useEffect(() => {
    if (isAuthenticated) navigate(redirect, { replace: true })
  }, [isAuthenticated, redirect, navigate])

  // Auto-start ATOZAS SSO ONLY on an explicit intent: a one-time ?sso=1 hint
  // (set when the user clicks "Continue with ATOZAS") or the admin-configured
  // server autoRedirect. Simply arriving from ATOZAS (e.g. the "Visit AtozMaps"
  // homepage link) must NOT auto-redirect a guest to the ATOZAS login page.
  // After Logout this must also NOT run — stay on the login page.
  useEffect(() => {
    const hasError = Boolean(searchParams.get('error'))
    const ssoHint = searchParams.get('sso') === '1'
    if (ssoHint && !hasError) {
      sessionStorage.removeItem(ATOZAS_SSO_ONCE_KEY)
    }
    if (
      !shouldAutoStartAtozasSso({
        enabled: atozasSso.enabled || atozasSsoEnabled,
        isAuthenticated,
        hasError,
        loggedOut: isAtozasLoggedOut() || !atozasAutoStart,
        autoRedirect: atozasSso.autoRedirect,
        ssoHint,
      })
    ) {
      return
    }
    if (sessionStorage.getItem(ATOZAS_SSO_ONCE_KEY)) return
    sessionStorage.setItem(ATOZAS_SSO_ONCE_KEY, '1')
    setSsoStarting(true)
    window.location.replace(atozasStartPath(redirect))
  }, [atozasSso, atozasSsoEnabled, atozasAutoStart, isAuthenticated, redirect, searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/login', { email })
      navigate('/verify-otp', { state: { email, type: 'login', redirect } })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleAtozasLogin = () => {
    beginAtozasLogin()
    window.location.href = atozasStartPath(redirect)
  }

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirect)}`
  }

  if (ssoStarting) {
    return (
      <AuthLayout title="Signing you in" subtitle="Connecting to ATOZAS…">
        <div className="flex flex-col items-center justify-center gap-4 py-8" role="status" aria-live="polite">
          <span className="auth-spinner" aria-hidden />
          <p className="text-sm text-slate-300">Redirecting to ATOZAS to complete sign-in…</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue exploring your maps"
      footer={
        <p className="auth-footer-text">
          Don&apos;t have an account?{' '}
          <Link to={authPageWithRedirect('/register', redirect)} className="auth-footer-link">
            Create one free
          </Link>
        </p>
      }
    >
      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="auth-form-fields">
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">
            Email address
          </label>
          <div className="auth-input-wrap">
            <svg className="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? (
            <>
              <span className="auth-spinner" aria-hidden />
              Sending OTP…
            </>
          ) : (
            'Send verification code'
          )}
        </button>
      </form>

      <AuthDivider />
      {atozasSso.enabled && (
        <div className="mb-3">
          <AtozasSignInButton onClick={handleAtozasLogin} />
        </div>
      )}
      <GoogleSignInButton onClick={handleGoogleLogin} />
    </AuthLayout>
  )
}

export default LoginPage
