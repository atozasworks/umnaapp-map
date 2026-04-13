import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      setToken(secret.trim())
      await api.get('/admin/overview')
      navigate('/', { replace: true })
    } catch (err) {
      setToken('')
      let msg = err.response?.data?.error
      if (!msg) {
        msg =
          err.response?.status === 503
            ? 'Admin API unavailable or ADMIN_SECRET not configured on server.'
            : 'Invalid secret or server error.'
      }
      setError(msg)
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
            Enter the backend <code className="rounded bg-admin-850 px-1.5 py-0.5 font-mono text-xs">ADMIN_SECRET</code>{' '}
            to view schema and data.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="secret" className="mb-2 block text-sm font-medium text-slate-300">
              Admin secret
            </label>
            <input
              id="secret"
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full rounded-xl border border-admin-border bg-admin-950 px-4 py-3 font-mono text-sm text-slate-100 outline-none ring-admin-accent/0 transition focus:border-admin-accent/50 focus:ring-2 focus:ring-admin-accent/20"
              placeholder="Paste ADMIN_SECRET from .env"
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
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-admin-muted">
          Stored only in this browser (localStorage). Use HTTPS in production.
        </p>
      </div>
    </div>
  )
}
