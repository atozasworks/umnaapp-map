import { useCallback, useEffect, useState } from 'react'
import {
  fetchSafetyHazards,
  approveSafetyHazard,
  rejectSafetyHazard,
} from '../lib/api'

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

const TYPE_LABELS = {
  unsafe_road: 'Unsafe road',
  poor_lighting: 'Poor lighting',
  flood: 'Flood',
  accident: 'Accident',
  road_block: 'Road block',
  harassment: 'Harassment / suspicious',
  construction: 'Construction',
  heavy_traffic: 'Heavy traffic',
  safe_road: 'Safe road',
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

export default function SafetyHazards() {
  const [tab, setTab] = useState('pending')
  const [hazards, setHazards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSafetyHazards(tab)
      setHazards(data.hazards || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load')
      setHazards([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const onApprove = async (id) => {
    setBusyId(id)
    try {
      await approveSafetyHazard(id)
      await load()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setBusyId(null)
    }
  }

  const onReject = async (id) => {
    setBusyId(id)
    try {
      await rejectSafetyHazard(id)
      await load()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Safety hazard reports</h1>
        <p className="mt-1 text-sm text-admin-muted">
          Moderate community reports before they affect Safe Route scoring and map alerts.
        </p>
      </div>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              tab === s
                ? 'bg-admin-accent/20 text-admin-accent ring-1 ring-admin-accent/30'
                : 'text-admin-muted hover:bg-admin-850'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-admin-muted">Loading…</p>
      ) : hazards.length === 0 ? (
        <p className="text-sm text-admin-muted">No {tab} reports.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-900/50">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-admin-border text-xs uppercase text-admin-muted">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Reporter</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                {tab === 'pending' && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {hazards.map((h) => (
                <tr key={h.id} className="border-b border-admin-border/60 last:border-0">
                  <td className="px-4 py-3 text-slate-200">
                    <div className="font-medium">{TYPE_LABELS[h.type] || h.type}</div>
                    {h.description && (
                      <div className="mt-0.5 max-w-xs truncate text-xs text-admin-muted">
                        {h.description}
                      </div>
                    )}
                    {h.roadName && (
                      <div className="mt-0.5 text-xs text-admin-muted">Road: {h.roadName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {Number(h.latitude).toFixed(5)}, {Number(h.longitude).toFixed(5)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{h.severity}/5</td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{h.userName || '—'}</div>
                    <div className="text-xs text-admin-muted">{h.userEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-admin-muted">{fmtDate(h.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={h.status} />
                  </td>
                  {tab === 'pending' && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === h.id}
                          onClick={() => onApprove(h.id)}
                          className="rounded bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === h.id}
                          onClick={() => onReject(h.id)}
                          className="rounded bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
