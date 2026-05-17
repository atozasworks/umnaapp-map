import { useCallback, useEffect, useState } from 'react'
import { fetchPendingPlaces, fetchApprovedPlaces, approvePlace, rejectPlace } from '../lib/api'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
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

function PlaceTable({ places, tab, busyId, onApprove, onReject }) {
  if (places.length === 0) {
    return (
      <p className="p-8 text-sm text-admin-muted">
        {tab === 'pending' ? 'No places awaiting approval.' : 'No approved places yet.'}
      </p>
    )
  }

  return (
    <table className="w-full min-w-[880px] text-left text-sm">
      <thead>
        <tr className="border-b border-admin-border text-xs uppercase tracking-wider text-admin-muted">
          <th className="px-4 py-3 font-medium">Place</th>
          <th className="px-4 py-3 font-medium">Category</th>
          <th className="px-4 py-3 font-medium">Source</th>
          <th className="px-4 py-3 font-medium">Contributor</th>
          <th className="px-4 py-3 font-medium">Status</th>
          {tab === 'pending' ? (
            <>
              <th className="px-4 py-3 font-medium">Days left</th>
              <th className="px-4 py-3 font-medium">Auto-approve</th>
            </>
          ) : (
            <th className="px-4 py-3 font-medium">Approved</th>
          )}
          {tab === 'pending' && <th className="px-4 py-3 font-medium">Actions</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-admin-border">
        {places.map((p) => (
          <tr key={p.id} className="text-slate-200">
            <td className="px-4 py-3">
              <div className="font-medium text-white">{p.displayName || p.name}</div>
              <div className="mt-1 font-mono text-[11px] text-admin-muted">
                {p.latitude?.toFixed(5)}, {p.longitude?.toFixed(5)}
              </div>
            </td>
            <td className="px-4 py-3 text-admin-muted">{p.category}</td>
            <td className="px-4 py-3 text-admin-muted">{p.source || 'contribution'}</td>
            <td className="px-4 py-3">
              <div className="text-slate-200">{p.user_name || '—'}</div>
              <div className="text-xs text-admin-muted">{p.user_email || ''}</div>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={p.approvalStatus} />
            </td>
            {tab === 'pending' ? (
              <>
                <td className="px-4 py-3 text-admin-muted">
                  {p.pendingDaysRemaining != null ? (
                    <span className={p.pendingDaysRemaining <= 2 ? 'text-amber-300' : ''}>
                      {p.pendingDaysRemaining} {p.pendingDaysRemaining === 1 ? 'day' : 'days'}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-admin-muted">{fmtDate(p.autoApproveAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => onApprove(p.id)}
                      className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busyId === p.id ? '…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => onReject(p.id)}
                      className="rounded-lg bg-red-600/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </>
            ) : (
              <td className="whitespace-nowrap px-4 py-3 text-admin-muted">{fmtDate(p.approvedAt)}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function PendingPlaces() {
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState(null)
  const [approved, setApproved] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setErr('')
    setLoading(true)
    try {
      const [pendingData, approvedData] = await Promise.all([
        fetchPendingPlaces(),
        fetchApprovedPlaces(150),
      ])
      setPending(pendingData)
      setApproved(approvedData)
    } catch (e) {
      setPending(null)
      setApproved(null)
      setErr(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function onApprove(id) {
    setBusyId(id)
    setErr('')
    try {
      await approvePlace(id)
      await load()
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function onReject(id) {
    setBusyId(id)
    setErr('')
    try {
      await rejectPlace(id)
      await load()
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setBusyId(null)
    }
  }

  const days = pending?.autoApproveDays ?? approved?.autoApproveDays ?? 10
  const pendingList = pending?.places ?? []
  const approvedList = approved?.places ?? []

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Place approvals</h1>
        <p className="mt-2 max-w-3xl text-sm text-admin-muted">
          Extracted and user-added places start as <strong className="text-slate-300">pending</strong>. Only the
          contributor and admins see them until approved. Pending places auto-approve after{' '}
          <span className="font-semibold text-slate-300">{days} days</span> (scheduled hourly on the server).
        </p>
      </header>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-admin-border bg-admin-850 p-1">
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === 'pending'
                ? 'bg-admin-accent/20 text-admin-accent'
                : 'text-admin-muted hover:text-slate-200'
            }`}
          >
            Pending ({pendingList.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('approved')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === 'approved'
                ? 'bg-admin-accent/20 text-admin-accent'
                : 'text-admin-muted hover:text-slate-200'
            }`}
          >
            Approved ({approvedList.length})
          </button>
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
        ) : (
          <PlaceTable
            places={tab === 'pending' ? pendingList : approvedList}
            tab={tab}
            busyId={busyId}
            onApprove={onApprove}
            onReject={onReject}
          />
        )}
      </div>
    </div>
  )
}
