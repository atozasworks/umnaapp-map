import { useEffect, useState, useMemo } from 'react'
import { fetchSchema, fetchConstraints } from '../lib/api'

export default function Schema() {
  const [schema, setSchema] = useState(null)
  const [constraints, setConstraints] = useState(null)
  const [err, setErr] = useState('')
  const [openTable, setOpenTable] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [s, c] = await Promise.all([fetchSchema(), fetchConstraints()])
        if (!cancelled) {
          setSchema(s)
          setConstraints(c)
          const first = s?.tables && Object.keys(s.tables).sort()[0]
          if (first) setOpenTable(first)
        }
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.error || e.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const tableNames = useMemo(() => (schema?.tables ? Object.keys(schema.tables).sort() : []), [schema])

  const pkByTable = useMemo(() => {
    const m = {}
    if (!constraints?.primaryKeysAndUnique) return m
    for (const row of constraints.primaryKeysAndUnique) {
      const t = row.tableName
      if (!m[t]) m[t] = { pk: [], unique: [] }
      if (row.constraintType === 'PRIMARY KEY') m[t].pk.push(row.columnName)
      else m[t].unique.push(row.columnName)
    }
    return m
  }, [constraints])

  const fkByTable = useMemo(() => {
    const m = {}
    if (!constraints?.foreignKeys) return m
    for (const row of constraints.foreignKeys) {
      const t = row.fromTable
      if (!m[t]) m[t] = []
      m[t].push(row)
    }
    return m
  }, [constraints])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Database schema</h1>
        <p className="mt-2 max-w-3xl text-sm text-admin-muted">
          Columns from <code className="rounded bg-admin-850 px-1 font-mono text-xs">information_schema</code> (public)
          plus primary keys, unique constraints, and foreign keys.
        </p>
      </header>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      {schema && (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="lg:w-72 shrink-0">
            <div className="rounded-2xl border border-admin-border bg-admin-900/50 p-2">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-admin-muted">Tables</p>
              <ul className="max-h-[70vh] space-y-0.5 overflow-y-auto">
                {tableNames.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => setOpenTable(name)}
                      className={[
                        'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition',
                        openTable === name
                          ? 'bg-admin-accent/15 font-medium text-admin-accent'
                          : 'text-slate-300 hover:bg-admin-850',
                      ].join(' ')}
                    >
                      <span className="font-mono text-xs">{name}</span>
                      <span className="text-xs text-admin-muted">{schema.tables[name]?.length ?? 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-6">
            {openTable && schema.tables[openTable] && (
              <>
                <div className="rounded-2xl border border-admin-border bg-admin-900/40 p-6 shadow-panel">
                  <div className="mb-4 flex flex-wrap items-baseline gap-3">
                    <h2 className="font-mono text-lg font-semibold text-white">{openTable}</h2>
                    <span className="rounded-full bg-admin-850 px-2.5 py-0.5 text-xs text-admin-muted">
                      {schema.tables[openTable].length} columns
                    </span>
                  </div>
                  {(pkByTable[openTable]?.pk?.length > 0 || pkByTable[openTable]?.unique?.length > 0) && (
                    <div className="mb-4 flex flex-wrap gap-2 text-xs">
                      {pkByTable[openTable]?.pk?.length > 0 && (
                        <span className="rounded-lg bg-emerald-500/15 px-2 py-1 font-mono text-emerald-300">
                          PK: {pkByTable[openTable].pk.join(', ')}
                        </span>
                      )}
                      {pkByTable[openTable]?.unique?.length > 0 && (
                        <span className="rounded-lg bg-cyan-500/15 px-2 py-1 font-mono text-cyan-200">
                          Unique: {pkByTable[openTable].unique.join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                  {fkByTable[openTable]?.length > 0 && (
                    <div className="mb-4 rounded-xl border border-admin-border bg-admin-950/50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase text-admin-muted">Foreign keys</p>
                      <ul className="space-y-1 font-mono text-xs text-slate-300">
                        {fkByTable[openTable].map((fk) => (
                          <li key={fk.constraintName}>
                            {fk.fromColumn} → {fk.toTable}.{fk.toColumn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-admin-border">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-admin-border bg-admin-950/80 text-xs uppercase text-admin-muted">
                          <th className="px-4 py-3 font-medium">Column</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Nullable</th>
                          <th className="px-4 py-3 font-medium">Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schema.tables[openTable].map((col) => (
                          <tr key={col.columnName} className="border-b border-admin-border/60 hover:bg-admin-850/40">
                            <td className="px-4 py-2.5 font-mono text-xs text-admin-accent">{col.columnName}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-300">
                              {formatType(col)}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-400">{col.isNullable}</td>
                            <td className="max-w-xs truncate px-4 py-2.5 font-mono text-xs text-slate-500" title={col.columnDefault || ''}>
                              {col.columnDefault || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatType(col) {
  const base = col.dataType || col.udtName
  if (col.charMaxLength) return `${base}(${col.charMaxLength})`
  if (col.numericPrecision) return `${base}(${col.numericPrecision})`
  return base
}
