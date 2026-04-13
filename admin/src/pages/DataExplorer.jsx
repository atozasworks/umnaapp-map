import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchModels, fetchRecords } from '../lib/api'

export default function DataExplorer() {
  const { model: modelParam } = useParams()
  const [models, setModels] = useState([])
  const [activeLabel, setActiveLabel] = useState(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [full, setFull] = useState(false)
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchModels()
      .then((m) => {
        if (!cancelled) setModels(m)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (modelParam) {
      const decoded = decodeURIComponent(modelParam)
      setActiveLabel(decoded)
      setPage(1)
    } else {
      setActiveLabel(null)
      setPayload(null)
    }
  }, [modelParam])

  const load = useCallback(async () => {
    if (!activeLabel) return
    setErr('')
    setLoading(true)
    try {
      const data = await fetchRecords(activeLabel, { page, limit, full })
      setPayload(data)
    } catch (e) {
      setPayload(null)
      setErr(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [activeLabel, page, limit, full])

  useEffect(() => {
    load()
  }, [load])

  const columns =
    payload?.data?.length > 0
      ? Object.keys(payload.data[0])
      : []

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Browse data</h1>
          <p className="mt-2 max-w-2xl text-sm text-admin-muted">
            Paginated rows per model. Large fields (photos, avatars) are truncated unless you enable full payloads.
          </p>
        </div>
        {activeLabel && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-admin-muted">
              <input
                type="checkbox"
                checked={full}
                onChange={(e) => {
                  setFull(e.target.checked)
                  setPage(1)
                }}
                className="rounded border-admin-border bg-admin-950 text-admin-accent focus:ring-admin-accent/30"
              />
              Full blobs
            </label>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <aside className="xl:w-56 shrink-0">
          <div className="rounded-2xl border border-admin-border bg-admin-900/50 p-2">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-admin-muted">Model</p>
            <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto">
              {models.map(({ key, label }) => (
                <li key={key}>
                  <Link
                    to={`/data/${encodeURIComponent(label)}`}
                    className={[
                      'block rounded-xl px-3 py-2 font-mono text-xs transition',
                      activeLabel === label
                        ? 'bg-admin-accent/15 font-medium text-admin-accent'
                        : 'text-slate-300 hover:bg-admin-850',
                    ].join(' ')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {!activeLabel && (
            <div className="rounded-2xl border border-dashed border-admin-border bg-admin-900/30 px-8 py-16 text-center">
              <p className="text-admin-muted">Select a model from the left to load rows.</p>
            </div>
          )}

          {activeLabel && err && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>
          )}

          {activeLabel && payload && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-admin-muted">
                <span>
                  <span className="font-mono text-admin-accent">{payload.model}</span>
                  {' · '}
                  {payload.total.toLocaleString()} rows · page {payload.page} / {payload.totalPages || 1}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-admin-border bg-admin-850 px-3 py-1.5 text-xs font-medium text-slate-200 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= (payload.totalPages || 1) || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-admin-border bg-admin-850 px-3 py-1.5 text-xs font-medium text-slate-200 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="relative overflow-x-auto rounded-2xl border border-admin-border shadow-panel">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-admin-950/60 backdrop-blur-[1px]">
                    <span className="rounded-lg border border-admin-border bg-admin-900 px-4 py-2 text-sm text-slate-200">
                      Loading…
                    </span>
                  </div>
                )}
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-admin-border bg-admin-950/90 text-xs uppercase text-admin-muted">
                      {columns.map((c) => (
                        <th key={c} className="whitespace-nowrap px-3 py-3 font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payload.data.map((row, i) => (
                      <tr key={row.id ?? i} className="border-b border-admin-border/50 hover:bg-admin-850/30">
                        {columns.map((c) => (
                          <td
                            key={c}
                            className="max-w-[280px] truncate px-3 py-2 font-mono text-xs text-slate-300"
                            title={formatCell(row[c])}
                          >
                            {cellPreview(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {payload.data.length === 0 && (
                <p className="mt-4 text-center text-sm text-admin-muted">No rows in this table.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatCell(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function cellPreview(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'object') {
    const s = JSON.stringify(v)
    return s.length > 80 ? `${s.slice(0, 80)}…` : s
  }
  const s = String(v)
  return s.length > 120 ? `${s.slice(0, 120)}…` : s
}
