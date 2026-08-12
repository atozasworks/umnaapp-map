import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestAdminOtp, verifyAdminOtp } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // email | otp
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRequestOtp(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const data = await requestAdminOtp(email.trim())
      setEmail(data.email || email.trim().toLowerCase())
      setStep('otp')
      setInfo('Verification code sent. Check your Gmail inbox (and spam).')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send verification code.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyAdminOtp(email.trim(), otp.trim())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-admin-border bg-admin-900/90 p-8 shadow-panel backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-500/15 ring-1 ring-admin-accent/35">
            <span className="text-2xl font-bold text-admin-accent">U</span>
          </div>
          <h1 className="text-xl font-semibold text-white">UMNAAPP Admin</h1>
          <p className="mt-2 text-sm text-admin-muted">
            Sign in with a pre-approved Gmail address. A one-time code will be emailed to you.
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                Admin Gmail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-admin-accent/50 focus:ring-2 focus:ring-admin-accent/20"
                placeholder="you@gmail.com"
                required
              />
            </div>
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-admin-950 shadow-lg shadow-emerald-900/30 transition hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send verification code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-medium text-slate-300">
                Verification code
              </label>
              <p className="mb-2 text-xs text-admin-muted">
                Sent to <span className="font-mono text-slate-300">{email}</span>
              </p>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-xl border border-admin-border bg-admin-950 px-4 py-3 font-mono text-lg tracking-[0.35em] text-slate-100 outline-none transition focus:border-admin-accent/50 focus:ring-2 focus:ring-admin-accent/20"
                placeholder="••••••"
                required
              />
            </div>
            {info && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {info}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-admin-950 shadow-lg shadow-emerald-900/30 transition hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify & continue'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setStep('email')
                setOtp('')
                setError('')
                setInfo('')
              }}
              className="w-full text-center text-xs text-admin-muted hover:text-slate-300"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-admin-muted">
          Only Gmail addresses on the admin allowlist can sign in. Session uses a short-lived httpOnly cookie.
        </p>
      </div>
    </div>
  )
}
