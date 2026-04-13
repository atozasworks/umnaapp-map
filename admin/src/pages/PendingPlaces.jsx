import { useCallback, useEffect, useState } from 'react'
import { fetchPendingPlaces, approvePlace } from '../lib/api'

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

export default function PendingPlaces() {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setErr('')
    setLoading(true)
    try {
      const data = await fetchPendingPlaces()
      setPayload(data)
    } catch (e) {
      setPayload(null)
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

  const places = payload?.places ?? []
  const days = payload?.autoApproveDays ?? 10

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Pending approval</h1>
        <p className="mt-2 max-w-2xl text-sm text-admin-muted">
          User-added places (<span className="font-mono text-slate-400">contribution</span>) stay private to the
          contributor until approved. They auto-approve after{' '}
          <span className="font-semibold text-slate-300">{days} days</span>, or you can approve them here.
        </p>
      </header>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-xl border border-admin-border bg-admin-850 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-admin-800 disabled:opacity-50"
        >
          Refresh
        </button>
        {!loading && (
          <span className="text-sm text-admin-muted">
            {places.length} pending {places.length === 1 ? 'place' : 'places'}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-admin-border bg-admin-900/50">
        {loading ? (
          <p className="p-8 text-sm text-admin-muted">Loading…</p>
        ) : places.length === 0 ? (
          <p className="p-8 text-sm text-admin-muted">No contributions awaiting approval.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-admin-border text-xs uppercase tracking-wider text-admin-muted">
                <th className="px-4 py-3 font-medium">Place</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Contributor</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3 font-medium">Auto-approve</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {places.map((p) => (
                <tr key={p.id} className="text-slate-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{p.displayName || p.name}</div>
                    {p.placeNameLocal && (
                      <div className="mt-0.5 text-xs text-admin-muted">{p.placeNameLocal}</div>
                    )}
                    <div className="mt-1 font-mono text-[11px] text-admin-muted">
                      {p.latitude?.toFixed(5)}, {p.longitude?.toFixed(5)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-admin-muted">{p.category}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{p.userName || '—'}</div>
                    <div className="text-xs text-admin-muted">{p.userEmail || p.userId?.slice(0, 8)}…</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-admin-muted">{fmtDate(p.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-admin-muted">{fmtDate(p.autoApproveAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => onApprove(p.id)}
                      className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busyId === p.id ? '…' : 'Approve now'}
                    </button>
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
