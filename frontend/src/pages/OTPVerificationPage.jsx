import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AuthLayout, { AuthError } from '../components/auth/AuthLayout'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const OTPVerificationPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(600)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const inputRefs = useRef([])

  const email = location.state?.email
  const type = location.state?.type || 'register'

  useEffect(() => {
    if (!email) {
      navigate(type === 'register' ? '/register' : '/login')
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [email, type, navigate])

  const handleChange = (index, value) => {
    if (value.length > 1) return
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp]
      pastedData.split('').forEach((digit, index) => {
        if (index < 6) newOtp[index] = digit
      })
      setOtp(newOtp)
      inputRefs.current[Math.min(pastedData.length - 1, 5)]?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const otpString = otp.join('')

    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/verify-otp', {
        email,
        otp: otpString,
        type,
      })

      login(response.data.user, response.data.token)
      navigate('/home')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setLoading(true)
    setTimeLeft(600)

    try {
      await api.post('/auth/resend-otp', { email, type })
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!email) {
    return null
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={
        <>
          Enter the 6-digit code sent to{' '}
          <span className="text-sky-300 font-medium break-all">{email}</span>
        </>
      }
    >
      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="auth-form-fields">
        <div className="auth-otp-grid" role="group" aria-label="One-time password digits">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="auth-otp-input"
              aria-label={`Digit ${index + 1} of 6`}
              autoFocus={index === 0}
            />
          ))}
        </div>

        <div className="auth-otp-timer">
          <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Code expires in{' '}
            <strong className="text-sky-300">{formatTime(timeLeft)}</strong>
          </span>
        </div>

        <button
          type="submit"
          disabled={loading || otp.join('').length !== 6}
          className="auth-submit-btn"
        >
          {loading ? (
            <>
              <span className="auth-spinner" aria-hidden />
              Verifying…
            </>
          ) : (
            'Verify & continue'
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || timeLeft > 540}
            className="auth-resend-btn"
          >
            Didn&apos;t receive the code? Resend
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}

export default OTPVerificationPage
