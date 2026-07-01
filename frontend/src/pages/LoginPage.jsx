import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout, { AuthError, AuthDivider, GoogleSignInButton } from '../components/auth/AuthLayout'
import api from '../services/api'
import { isNative } from '../platform/runtime'
import { startNativeGoogleLogin } from '../platform/native'
import { getApiOrigin } from '../utils/apiBase'

const errorMessages = {
  google_not_configured: 'Google login is not configured. Please use email OTP instead.',
  google_auth_failed: 'Google sign-in failed. Please try again or use email OTP.',
  database_error: 'Sign-in succeeded but the server could not reach the database. Try again later or use email OTP.',
  auth_failed: 'Authentication failed. Please try again.',
}

const LoginPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) {
      setError(errorMessages[err] || 'Something went wrong. Please try again.')
      window.history.replaceState({}, '', '/login')
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/login', { email })
      navigate('/verify-otp', { state: { email, type: 'login' } })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // Web/PWA: unchanged same-origin OAuth redirect.
    if (!isNative()) {
      window.location.href = '/api/auth/google'
      return
    }
    // Native (Android WebView): GIS popup/same-origin redirect won't work.
    // Open the hosted OAuth flow in the system browser; the JWT returns via the
    // umnaapp://auth deep link (handled in platform/native.js).
    startNativeGoogleLogin(getApiOrigin()).then((ok) => {
      if (!ok) setError('Google sign-in is unavailable. Please use email OTP.')
    })
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue exploring your maps"
      footer={
        <p className="auth-footer-text">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="auth-footer-link">
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
      <GoogleSignInButton onClick={handleGoogleLogin} />
    </AuthLayout>
  )
}

export default LoginPage
