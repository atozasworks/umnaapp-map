import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from '../lib/i18n'
import api from '../services/api'
import { HAZARD_REPORT_TYPES } from '../utils/safeRoute'

/**
 * Sheet for submitting a community road-safety / hazard report.
 * Reports are pending until admin moderation.
 */
export default function HazardReportSheet({
  isOpen,
  onClose,
  coordinates,
  onSubmitted,
}) {
  const tTitle = useTranslate('Report road hazard')
  const tSubtitle = useTranslate('Reports are reviewed before appearing on the map')
  const tClose = useTranslate('Close')
  const tSubmit = useTranslate('Submit report')
  const tSubmitting = useTranslate('Submitting…')
  const tDescription = useTranslate('Description (optional)')
  const tRoadName = useTranslate('Road name (optional)')
  const tSeverity = useTranslate('Severity')
  const tSuccess = useTranslate('Report submitted for moderation')
  const tPickType = useTranslate('What are you reporting?')

  const [type, setType] = useState('unsafe_road')
  const [severity, setSeverity] = useState(3)
  const [description, setDescription] = useState('')
  const [roadName, setRoadName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setType('unsafe_road')
    setSeverity(3)
    setDescription('')
    setRoadName('')
    setBusy(false)
    setError(null)
    setDone(false)
  }, [isOpen, coordinates?.lat, coordinates?.lng])

  const handleSubmit = useCallback(async () => {
    if (!coordinates || coordinates.lat == null || coordinates.lng == null) {
      setError('Location required')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.post('/map/safe-route/hazards', {
        type,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        severity,
        description: description.trim() || undefined,
        roadName: roadName.trim() || undefined,
      })
      setDone(true)
      onSubmitted?.()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit')
    } finally {
      setBusy(false)
    }
  }, [coordinates, type, severity, description, roadName, onSubmitted])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-x-0 bottom-0 z-[71] mx-auto flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl animate-sheet-up sm:bottom-4 sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={tTitle}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{tTitle}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{tSubtitle}</p>
            {coordinates && (
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                {Number(coordinates.lat).toFixed(5)}, {Number(coordinates.lng).toFixed(5)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            aria-label={tClose}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {done ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
              {tSuccess}
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {tPickType}
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {HAZARD_REPORT_TYPES.map((item) => {
                  const active = type === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                        active
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <label className="mt-4 block text-xs font-semibold text-slate-500">{tSeverity}</label>
              <div className="mt-1.5 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSeverity(n)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${
                      severity === n
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <label className="mt-4 block text-xs font-semibold text-slate-500">{tRoadName}</label>
              <input
                type="text"
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                maxLength={200}
              />

              <label className="mt-3 block text-xs font-semibold text-slate-500">{tDescription}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                maxLength={2000}
              />

              {error && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
              )}
            </>
          )}
        </div>

        <div
          className="flex gap-2 border-t border-slate-100 px-4 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {done ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white"
            >
              {tClose}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                {tClose}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSubmit}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? tSubmitting : tSubmit}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
