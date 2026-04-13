import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOverview, fetchModels, fetchOverviewGrowth } from '../lib/api'
import OverviewViz3D from '../components/OverviewViz3D'
import OverviewGrowthChart from '../components/OverviewGrowthChart'

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [models, setModels] = useState([])
  const [growth, setGrowth] = useState(null)
  const [growthErr, setGrowthErr] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [ov, m] = await Promise.all([fetchOverview(), fetchModels()])
        if (!cancelled) {
          setOverview(ov)
          setModels(m)
          setErr('')
        }
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.error || e.message)
      }
      try {
        const gr = await fetchOverviewGrowth()
        if (!cancelled) {
          setGrowth(gr)
          setGrowthErr('')
        }
      } catch (e) {
        if (!cancelled) setGrowthErr(e.response?.data?.error || e.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const analysis = useMemo(() => {
    if (!overview?.counts) return null
    const rows = models.map(({ key, label }) => ({
      key,
      label,
      count: typeof overview.counts[label] === 'number' ? overview.counts[label] : null,
      error: overview.errors?.[label],
    }))
    const numeric = rows.filter((r) => r.count !== null)
    const total = numeric.reduce((a, r) => a + r.count, 0)
    const withBars = rows.map((r) => ({
      ...r,
      pct: total > 0 && r.count !== null ? (r.count / total) * 100 : 0,
    }))
    const sortedByVolume = [...numeric].sort((a, b) => b.count - a.count)
    const empty = numeric.filter((r) => r.count === 0)
    const withErrors = rows.filter((r) => r.error)
    const ok = numeric.filter((r) => !r.error && r.count > 0)
    return {
      rows: withBars,
      total,
      topThree: sortedByVolume.slice(0, 3),
      emptyCount: empty.length,
      emptyLabels: empty.map((r) => r.label),
      errorCount: withErrors.length,
      errorLabels: withErrors.map((r) => r.label),
      healthyTables: ok.length,
      concentration: sortedByVolume[0]
        ? ((sortedByVolume[0].count / total) * 100).toFixed(1)
        : null,
      topModel: sortedByVolume[0]?.label ?? null,
    }
  }, [overview, models])

  const vizSegments = useMemo(() => {
    if (!analysis) return []
    return analysis.rows
      .filter((r) => !r.error && r.count !== null && r.count > 0)
      .map((r) => ({ label: r.label, count: r.count }))
  }, [analysis])

  const hasCountErrors = overview?.errors && Object.keys(overview.errors).length > 0

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Overview</h1>
        <p className="mt-2 max-w-2xl text-sm text-admin-muted">
          Row counts and analysis across Prisma models. Drill into any table below or open the schema
          viewer for columns and constraints.
        </p>
        {overview?.generatedAt && (
          <p className="mt-2 text-xs text-slate-500">Snapshot: {new Date(overview.generatedAt).toLocaleString()}</p>
        )}
      </header>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      {hasCountErrors && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Some tables are missing or unreachable</p>
          <p className="mt-1 text-xs text-amber-200/90">
            Create missing tables with{' '}
            <code className="rounded bg-black/20 px-1 font-mono">npx prisma db push</code> (from{' '}
            <code className="font-mono">backend/</code>) or run{' '}
            <code className="font-mono">backend/prisma/add-location-table.sql</code> in PostgreSQL.
          </p>
        </div>
      )}

      {analysis && (
        <section className="rounded-2xl border border-admin-border bg-admin-900/35 p-6 shadow-panel md:p-8">
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-admin-muted">Live from database</h2>
            <p className="mt-1 text-xs text-slate-400">
              3D: <code className="rounded bg-black/25 px-1 font-mono text-[11px]">GET /api/admin/overview</code> · Chart:{' '}
              <code className="rounded bg-black/25 px-1 font-mono text-[11px]">GET /api/admin/overview/growth</code>
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
              <div className="order-1 min-h-0 lg:col-span-8">
                <OverviewViz3D segments={vizSegments} />
              </div>

              <aside className="order-2 lg:col-span-4">
                {growthErr ? (
                  <div className="flex min-h-[280px] flex-col rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900">
                    <p className="font-medium">Growth chart unavailable</p>
                    <p className="mt-2 text-amber-800/90">{growthErr}</p>
                  </div>
                ) : (
                  <OverviewGrowthChart rows={growth?.rows} errors={growth?.errors} />
                )}
              </aside>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">Analysis</h2>
            <Link
              to="/schema"
              className="text-sm font-medium text-admin-accent hover:text-emerald-300"
            >
              View schema (columns & constraints) →
            </Link>
          </div>

          <p className="mb-6 text-sm leading-relaxed text-slate-300">
            <span className="font-semibold text-white">{analysis.total.toLocaleString()}</span> rows across{' '}
            <span className="text-admin-accent">{analysis.rows.filter((r) => r.count !== null).length}</span> reachable
            tables ({models.length} models tracked).
            {analysis.topModel && analysis.total > 0 && (
              <>
                {' '}
                The largest share is{' '}
                <span className="font-mono text-admin-accent">{analysis.topModel}</span> at{' '}
                <span className="tabular-nums text-slate-200">{analysis.concentration}%</span> of all rows.
              </>
            )}
            {analysis.emptyCount > 0 && (
              <>
                {' '}
                <span className="text-amber-200/90">{analysis.emptyCount} table(s)</span> are empty.
              </>
            )}
            {analysis.errorCount > 0 && (
              <>
                {' '}
                <span className="text-amber-300">{analysis.errorCount} model(s)</span> could not be counted (sync DB).
              </>
            )}
          </p>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-admin-border/80 bg-admin-950/40 p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-admin-muted">
                Distribution by model
              </h3>
              <ul className="space-y-3">
                {analysis.rows.map(({ label, count, pct, error }) => (
                  <li key={label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-mono text-slate-300">{label}</span>
                      <span className="tabular-nums text-slate-400">
                        {error ? '—' : count?.toLocaleString() ?? '—'}
                        {!error && count !== null && analysis.total > 0 && (
                          <span className="ml-2 text-admin-muted">({pct.toFixed(1)}%)</span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-admin-850">
                      <div
                        className={[
                          'h-full min-h-full rounded-full transition-all',
                          error ? 'bg-amber-500/50' : 'bg-gradient-to-r from-emerald-600 to-emerald-400',
                        ].join(' ')}
                        style={{
                          width: error
                            ? '6px'
                            : `${Math.max(pct, count !== null && count > 0 && pct < 0.25 ? 0.35 : 0)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-admin-border/80 bg-admin-950/40 p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-admin-muted">
                  Highlights
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  {analysis.topThree.length > 0 && (
                    <li>
                      <span className="text-admin-muted">Top by volume: </span>
                      {analysis.topThree.map((r, i) => (
                        <span key={r.label}>
                          {i > 0 && ', '}
                          <span className="font-mono text-admin-accent">{r.label}</span>
                          <span className="tabular-nums text-slate-400"> ({r.count.toLocaleString()})</span>
                        </span>
                      ))}
                    </li>
                  )}
                  <li>
                    <span className="text-admin-muted">Tables with data: </span>
                    <span className="tabular-nums text-white">{analysis.healthyTables}</span>
                    <span className="text-slate-500"> / {models.length}</span>
                  </li>
                  {analysis.emptyCount > 0 && (
                    <li>
                      <span className="text-admin-muted">Empty: </span>
                      <span className="font-mono text-xs text-amber-200/90">{analysis.emptyLabels.join(', ')}</span>
                    </li>
                  )}
                  {analysis.errorCount > 0 && (
                    <li>
                      <span className="text-admin-muted">Count errors: </span>
                      <span className="font-mono text-xs text-amber-300">{analysis.errorLabels.join(', ')}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-200">Models</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {models.map(({ key, label }) => {
            const count = overview?.counts?.[label]
            const rowErr = overview?.errors?.[label]
            return (
              <Link
                key={key}
                to={`/data/${encodeURIComponent(label)}`}
                className={[
                  'flex items-center justify-between rounded-2xl border px-5 py-4 transition hover:bg-admin-850/80',
                  rowErr
                    ? 'border-amber-500/30 bg-amber-950/20 hover:border-amber-500/40'
                    : 'border-admin-border bg-admin-900/40 hover:border-admin-accent/25',
                ].join(' ')}
              >
                <div className="min-w-0 pr-2">
                  <p className="font-mono text-sm font-medium text-admin-accent">{label}</p>
                  <p className="text-xs text-admin-muted">Prisma: {key}</p>
                  {rowErr && (
                    <p className="mt-1 truncate text-xs text-amber-300/90" title={rowErr}>
                      Table issue — sync DB
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-semibold tabular-nums text-white">
                    {count == null ? '—' : count.toLocaleString()}
                  </p>
                  <p className="text-xs text-admin-muted">rows</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
