import { useState, useEffect } from 'react'
import api from '../services/api'
import {
  actionMeta,
  actorTypeLabel,
  changesToRows,
  formatAuditValue,
  formatAuditTimestamp,
  timeAgo,
} from '../utils/placeAudit'

const TONE_BADGE = {
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-violet-100 text-violet-700',
  slate: 'bg-slate-100 text-slate-600',
}

function DiffRows({ rows }) {
  if (!rows.length) return null
  return (
    <div className="mt-2 space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{row.label}</p>
          {row.isDiff ? (
            <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-stretch sm:gap-2">
              <div className="flex-1 rounded-md bg-red-50 border border-red-100 px-2 py-1.5">
                <p className="text-[9px] font-semibold uppercase text-red-400">Before</p>
                <p className="text-xs text-red-700 break-words line-through decoration-red-300">
                  {formatAuditValue(row.key, row.old)}
                </p>
              </div>
              <div className="hidden sm:flex items-center text-slate-300">→</div>
              <div className="flex-1 rounded-md bg-green-50 border border-green-100 px-2 py-1.5">
                <p className="text-[9px] font-semibold uppercase text-green-500">After</p>
                <p className="text-xs text-green-700 break-words">
                  {formatAuditValue(row.key, row.new)}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-700 break-words">
              {formatAuditValue(row.key, row.new)}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function HistoryEntry({ entry, expanded, onToggle }) {
  const meta = actionMeta(entry.action)
  const rows = changesToRows(entry.changes)
  const hasDetails = rows.length > 0
  return (
    <li className="relative pl-9 pb-5 last:pb-0">
      {/* Timeline line + dot */}
      <span className="absolute left-[10px] top-6 bottom-0 w-px bg-slate-200" aria-hidden />
      <span
        className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ring-2 ring-white"
        style={{ background: `${meta.color}1a` }}
      >
        {meta.icon}
      </span>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${TONE_BADGE[meta.tone] || TONE_BADGE.slate}`}>
          {actorTypeLabel(entry.actorType)}
        </span>
      </div>

      <p className="mt-0.5 text-xs text-slate-500">
        <span className="font-medium text-slate-600">{entry.actorName || 'Unknown'}</span>
        {' · '}
        <span title={formatAuditTimestamp(entry.createdAt)}>{timeAgo(entry.createdAt)}</span>
      </p>

      {entry.note && <p className="mt-1 text-xs text-slate-500 italic">{entry.note}</p>}

      {hasDetails && (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="mt-1.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700"
          >
            {expanded
              ? 'Hide details'
              : entry.action === 'updated' || entry.action === 'restored'
              ? `View ${rows.length} change${rows.length !== 1 ? 's' : ''}`
              : 'View details'}
          </button>
          {expanded && <DiffRows rows={rows} />}
        </>
      )}
    </li>
  )
}

export default function PlaceHistoryTab({ placeId, isDbPlace }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!isDbPlace || !placeId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .get(`/map/places/${placeId}/history`)
      .then(({ data }) => {
        if (cancelled) return
        const list = Array.isArray(data.history) ? data.history : []
        setHistory(list)
        // Auto-expand the most recent edit so changes are immediately visible.
        const firstEdit = list.find((e) => e.action === 'updated' || e.action === 'restored')
        if (firstEdit) setExpandedId(firstEdit.id)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load history.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [placeId, isDbPlace])

  if (!isDbPlace) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
        <span className="text-3xl mb-2">🕓</span>
        <p className="text-sm font-medium">History unavailable</p>
        <p className="text-xs mt-1 text-center px-6">
          Edit history is tracked for places saved on the map.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
              <div className="h-2.5 bg-slate-100 rounded animate-pulse w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
        <span className="text-3xl mb-2">⚠️</span>
        <p className="text-sm font-medium">{error}</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
        <span className="text-3xl mb-2">🕓</span>
        <p className="text-sm font-medium">No history yet</p>
        <p className="text-xs mt-1 text-center px-6">
          Changes to this place will appear here for everyone to see.
        </p>
      </div>
    )
  }

  return (
    <div className="px-5 py-4 pb-[env(safe-area-inset-bottom)]">
      <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-base" aria-hidden>🔎</span>
        <p className="text-[11px] text-slate-500 leading-snug">
          A public record of every change to this place — who changed what, and when.
        </p>
      </div>
      <ul className="mt-2">
        {history.map((entry) => (
          <HistoryEntry
            key={entry.id}
            entry={entry}
            expanded={expandedId === entry.id}
            onToggle={() => setExpandedId((cur) => (cur === entry.id ? null : entry.id))}
          />
        ))}
      </ul>
    </div>
  )
}
