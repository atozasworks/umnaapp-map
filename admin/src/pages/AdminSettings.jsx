import { useCallback, useEffect, useState } from 'react'
import {
  fetchAllowedAdminEmails,
  addAllowedAdminEmail,
  removeAllowedAdminEmail,
} from '../lib/api'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

export default function AdminSettings() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const data = await fetchAllowedAdminEmails()
      setEmails(data.emails || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load allowed emails')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    setToast('')
    setError('')
    setBusy(true)
    try {
      await addAllowedAdminEmail(newEmail.trim())
      setNewEmail('')
      setToast('Gmail address added to the allowlist.')
      await load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add email')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(id, email) {
    if (!window.confirm(`Remove ${email} from the admin allowlist?`)) return
    setToast('')
    setError('')
    setBusy(true)
    try {
      await removeAllowedAdminEmail(id)
      setToast('Gmail address removed.')
      await load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove email')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Admin settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-admin-muted">
          Manage Gmail addresses allowed to request an OTP and access the admin panel. Only
          @gmail.com addresses can be added.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {toast && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {toast}
        </div>
      )}

      <section className="rounded-2xl border border-admin-border bg-admin-900/50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-admin-muted">
          Allowed admin Gmail
        </h2>

        <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new-admin@gmail.com"
            required
            className="flex-1 rounded-xl border border-admin-border bg-admin-850 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-admin-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-admin-accent px-5 py-2.5 text-sm font-semibold text-admin-900 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Add Gmail'}
          </button>
        </form>

        <div className="mt-6 overflow-x-auto rounded-xl border border-admin-border">
          {loading ? (
            <p className="p-6 text-sm text-admin-muted">Loading…</p>
          ) : emails.length === 0 ? (
            <p className="p-6 text-sm text-admin-muted">
              No addresses yet. Set <code className="text-admin-accent">ADMIN_BOOTSTRAP_EMAILS</code> in
              the server environment, or add one here after bootstrap.
            </p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-admin-border text-xs uppercase tracking-wider text-admin-muted">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3">By</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {emails.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-mono text-slate-200">{row.email}</td>
                    <td className="px-4 py-3 text-admin-muted">{fmtDate(row.createdAt)}</td>
                    <td className="px-4 py-3 text-admin-muted">{row.createdBy || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={busy || emails.length <= 1}
                        onClick={() => handleRemove(row.id, row.email)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                        title={emails.length <= 1 ? 'Cannot remove the last admin email' : 'Remove'}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
