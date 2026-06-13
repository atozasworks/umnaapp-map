import { useCallback, useEffect, useMemo, useState } from 'react'
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

function placeAddKindLabel(kind) {
  if (kind === 'extracted') return 'Extracted'
  if (kind === 'manual') return 'Manual'
  return '—'
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

function PlaceTable({ places, tab, busyId, onApprove, onReject, hasFilters }) {
  if (places.length === 0) {
    return (
      <p className="p-8 text-sm text-admin-muted">
        {hasFilters
          ? 'No places match your search or filters.'
          : tab === 'pending'
            ? 'No places awaiting approval.'
            : 'No approved places yet.'}
      </p>
    )
  }

  return (
    <table className="w-full min-w-[880px] text-left text-sm">
      <thead>
        <tr className="border-b border-admin-border text-xs uppercase tracking-wider text-admin-muted">
          <th className="px-4 py-3 font-medium">Place</th>
          <th className="px-4 py-3 font-medium">Category</th>
          <th className="px-4 py-3 font-medium">Add type</th>
          <th className="px-4 py-3 font-medium">Contributor</th>
          <th className="px-4 py-3 font-medium">Status</th>
          {tab === 'pending' ? (
            <>
              <th className="px-4 py-3 font-medium">Days left</th>
              <th className="px-4 py-3 font-medium">Auto-approve at</th>
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
              {p.village || p.district ? (
                <div className="mt-0.5 text-xs text-admin-muted">
                  {[p.village, p.district, p.state].filter(Boolean).join(', ')}
                </div>
              ) : null}
            </td>
            <td className="px-4 py-3 text-admin-muted">{p.category}</td>
            <td className="px-4 py-3 text-admin-muted">
              <div>{placeAddKindLabel(p.placeAddKind)}</div>
              {tab === 'pending' && p.autoApproveDays != null ? (
                <div className="mt-0.5 text-[11px] text-slate-500">{p.autoApproveDays}-day period</div>
              ) : null}
            </td>
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

const filterParams = (q, category, source) => ({
  q: q.trim() || undefined,
  category: category || undefined,
  source: source || undefined,
})

export default function PendingPlaces() {
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState(null)
  const [approved, setApproved] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')

  const hasFilters = Boolean(q.trim() || category || source)

  const load = useCallback(async () => {
    setErr('')
    setLoading(true)
    const params = filterParams(q, category, source)
    try {
      const [pendingData, approvedData] = await Promise.all([
        fetchPendingPlaces(params),
        fetchApprovedPlaces({ ...params, limit: 150 }),
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
  }, [q, category, source])

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

  const periods = pending?.autoApprovePeriods ?? approved?.autoApprovePeriods ?? {
    extracted: 1,
    manual: 5,
  }
  const active = tab === 'pending' ? pending : approved
  const places = active?.places ?? []
  const resultCount = active?.count ?? places.length
  const totalCount = active?.total ?? resultCount

  const categories = useMemo(() => {
    const fromPending = pending?.categories ?? []
    const fromApproved = approved?.categories ?? []
    const map = new Map()
    for (const c of [...fromPending, ...fromApproved]) {
      if (!c?.category) continue
      map.set(c.category, (map.get(c.category) || 0) + (c.count || 0))
    }
    return [...map.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category))
  }, [pending?.categories, approved?.categories])

  const pendingTotal = pending?.total ?? pending?.count ?? 0
  const approvedTotal = approved?.total ?? approved?.count ?? 0

  function clearFilters() {
    setQ('')
    setCategory('')
    setSource('')
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Place approvals</h1>
        <p className="mt-2 max-w-3xl text-sm text-admin-muted">
          Extracted and user-added places start as <strong className="text-slate-300">pending</strong>. Only the
          contributor and admins see them until approved. Extracted places auto-approve after{' '}
          <span className="font-semibold text-slate-300">{periods.extracted} day</span>
          {periods.extracted === 1 ? '' : 's'}; manually added places after{' '}
          <span className="font-semibold text-slate-300">{periods.manual} days</span> (checked hourly on the
          server).
        </p>
      </header>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-admin-border bg-admin-900/50 p-4">
        <label className="min-w-[200px] flex-1 text-xs text-admin-muted">
          Search
          <input
            type="search"
            className="mt-1 w-full rounded-lg border border-admin-border bg-admin-850 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            placeholder="Name, address, village, contributor, place ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="text-xs text-admin-muted">
          Category
          <select
            className="mt-1 block max-w-[180px] rounded-lg border border-admin-border bg-admin-850 px-3 py-2 text-sm text-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category} ({c.count})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-admin-muted">
          Source
          <select
            className="mt-1 block rounded-lg border border-admin-border bg-admin-850 px-3 py-2 text-sm text-white"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">All</option>
            <option value="contribution">Contribution</option>
            <option value="saved">Saved</option>
          </select>
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-admin-border bg-admin-850 px-3 py-2 text-sm text-slate-300 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

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
            Pending ({pendingTotal})
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
            Approved ({approvedTotal})
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
        {!loading && hasFilters && (
          <p className="text-sm text-admin-muted">
            Showing {resultCount} of {totalCount} {tab === 'pending' ? 'pending' : 'approved'} place
            {totalCount === 1 ? '' : 's'}
          </p>
        )}
        {!loading && !hasFilters && places.length > 0 && (
          <p className="text-sm text-admin-muted">
            {resultCount} {tab === 'pending' ? 'pending' : 'approved'} place{resultCount === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-admin-border bg-admin-900/50">
        {loading ? (
          <p className="p-8 text-sm text-admin-muted">Loading…</p>
        ) : (
          <PlaceTable
            places={places}
            tab={tab}
            busyId={busyId}
            onApprove={onApprove}
            onReject={onReject}
            hasFilters={hasFilters}
          />
        )}
      </div>
    </div>
  )
}
