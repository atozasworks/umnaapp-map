import { useCallback, useEffect, useState } from 'react'
import { fetchBusinessClaims, approveBusinessClaim, rejectBusinessClaim } from '../lib/api'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function StatusBadge({ status }) {
  const cls =
    status === 'approved'
      ? 'bg-emerald-500/15 text-emerald-300'
      : status === 'rejected'
        ? 'bg-red-500/15 text-red-300'
        : 'bg-amber-500/15 text-amber-300'
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>
}

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

export default function BusinessClaims() {
  const [tab, setTab] = useState('pending')
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setErr('')
    setLoading(true)
    try {
      const data = await fetchBusinessClaims(tab)
      setClaims(data.claims || [])
    } catch (e) {
      setClaims([])
      setErr(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  async function onApprove(id) {
    setBusyId(id)
    setErr('')
    try {
      await approveBusinessClaim(id)
      await load()
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function onReject(id) {
    const note = window.prompt('Optional reason for rejecting this claim:') ?? undefined
    setBusyId(id)
    setErr('')
    try {
      await rejectBusinessClaim(id, note)
      await load()
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Business claims</h1>
        <p className="mt-2 max-w-3xl text-sm text-admin-muted">
          Users request ownership of a place. Approving a claim stamps the place as{' '}
          <span className="font-semibold text-slate-300">verified</span> and notifies the user. Approving one
          claim auto-rejects other pending claims on the same place.
        </p>
      </header>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-admin-border bg-admin-850 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.key ? 'bg-admin-accent/20 text-admin-accent' : 'text-admin-muted hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-xl border border-admin-border bg-admin-850 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-admin-800 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-admin-border bg-admin-900/50">
        {loading ? (
          <p className="p-8 text-sm text-admin-muted">Loading…</p>
        ) : claims.length === 0 ? (
          <p className="p-8 text-sm text-admin-muted">No {tab === 'all' ? '' : tab} claims.</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-admin-border text-xs uppercase tracking-wider text-admin-muted">
                <th className="px-4 py-3 font-medium">Place</th>
                <th className="px-4 py-3 font-medium">Claimant</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {claims.map((c) => (
                <tr key={c.id} className="text-slate-200 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{c.place?.placeNameEn || c.place?.name || '—'}</div>
                    <div className="text-xs text-admin-muted">{c.place?.category}</div>
                    {c.place?.fullAddress && (
                      <div className="mt-0.5 max-w-[220px] text-xs text-slate-500">{c.place.fullAddress}</div>
                    )}
                    {c.place?.claimVerifiedAt && (
                      <div className="mt-1 text-[11px] text-emerald-300">Already verified</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{c.user?.name || c.userName || '—'}</div>
                    <div className="text-xs text-admin-muted">{c.user?.email || c.contactEmail || ''}</div>
                    {c.contactPhone && <div className="text-xs text-admin-muted">{c.contactPhone}</div>}
                  </td>
                  <td className="px-4 py-3 capitalize text-admin-muted">{c.role}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-[260px] whitespace-pre-wrap text-xs text-slate-300">{c.message || '—'}</div>
                    {c.reviewNote && (
                      <div className="mt-1 max-w-[260px] text-[11px] text-slate-500">Note: {c.reviewNote}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-admin-muted">{fmtDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    {c.status === 'pending' ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => onApprove(c.id)}
                          className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {busyId === c.id ? '…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => onReject(c.id)}
                          className="rounded-lg bg-red-600/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-admin-muted">{fmtDate(c.reviewedAt)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
