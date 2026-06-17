import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout, { AuthError, AuthDivider, GoogleSignInButton } from '../components/auth/AuthLayout'
import api from '../services/api'

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = { ...formData }
      if (!payload.password || payload.password.trim() === '') {
        delete payload.password
      }

      await api.post('/auth/register', payload)
      navigate('/verify-otp', { state: { email: formData.email, type: 'register' } })
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google'
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join UMNAAPP and start mapping in minutes"
      footer={
        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-footer-link">
            Sign in
          </Link>
        </p>
      }
    >
      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="auth-form-fields">
        <div className="auth-field">
          <label htmlFor="name" className="auth-label">
            Full name
          </label>
          <div className="auth-input-wrap">
            <svg className="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="auth-input"
              placeholder="John Doe"
              autoComplete="name"
              required
              minLength={2}
            />
          </div>
        </div>

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
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="auth-input"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="password" className="auth-label">
            Password <span className="auth-label-optional">(optional)</span>
          </label>
          <div className="auth-input-wrap">
            <svg className="auth-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="auth-input"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <p className="auth-field-hint">Password is optional — you can sign in with email OTP only.</p>
        </div>

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? (
            <>
              <span className="auth-spinner" aria-hidden />
              Creating account…
            </>
          ) : (
            'Continue with email OTP'
          )}
        </button>
      </form>

      <AuthDivider />
      <GoogleSignInButton onClick={handleGoogleLogin} />
    </AuthLayout>
  )
}

export default RegisterPage
