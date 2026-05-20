import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppLogo from '../components/AppLogo'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const OTPVerificationPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes
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

    // Auto-focus next input
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
      if (type === 'register') {
        await api.post('/auth/register', { email })
      } else {
        await api.post('/auth/login', { email })
      }
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="flex items-center justify-center gap-3 mb-3">
              <AppLogo decorative imgClassName="h-10 w-auto max-h-12 object-contain flex-shrink-0" />
              <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                UMNAAPP
              </span>
            </h1>
            <h2 className="text-2xl font-semibold text-slate-800">Verify Your Email</h2>
            <p className="text-slate-600 mt-2">
              We've sent a 6-digit code to <br />
              <span className="font-semibold text-slate-800">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-14 h-14 text-center text-2xl font-bold border-2 border-slate-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-600">
                Code expires in: <span className="font-semibold text-primary-600">{formatTime(timeLeft)}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || timeLeft > 540}
                className="text-primary-600 hover:text-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resend OTP
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default OTPVerificationPage

