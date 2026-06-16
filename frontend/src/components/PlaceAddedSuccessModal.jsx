import { useEffect } from 'react'

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   places?: { id?: string, name?: string, category?: string }[],
 *   count?: number,
 *   skippedCount?: number,
 *   variant?: 'manual' | 'extract' | 'saved',
 *   onViewOnMap?: () => void,
 * }} props
 */
export default function PlaceAddedSuccessModal({
  isOpen,
  onClose,
  places = [],
  count: countProp,
  skippedCount = 0,
  variant = 'manual',
  onViewOnMap,
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const list = Array.isArray(places) ? places.filter((p) => p?.name) : []
  const count = countProp ?? list.length ?? 1
  const isBulk = count > 1
  const isFestival = variant === 'festival'
  const title = isFestival
    ? 'Festival date added!'
    : isBulk
      ? `${count} places added!`
      : 'Place added!'
  const thanksLine = 'Thanks for your contribution!'

  const variantHint =
    variant === 'festival'
      ? 'Festival dates saved. The marker shows on the map during the festival window, and everyone gets a reminder when it starts.'
      : variant === 'extract'
        ? 'Extracted places are saved and visible only to you until approved (auto after 1 day).'
        : variant === 'saved'
          ? 'Saved to your places. Visible to you until approved, then everyone on the map.'
          : 'Your new place is submitted. Only you can see it on the map until it is approved (auto after 5 days).'

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="place-added-title"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" aria-hidden="true" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-200/90 bg-white shadow-2xl shadow-emerald-900/10 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500" />

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 ring-1 ring-emerald-200/80 shadow-inner">
              <svg
                className="h-8 w-8 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Success</p>
              <h2 id="place-added-title" className="mt-1 text-xl font-bold text-slate-900">
                {title}
              </h2>
              <p className="mt-1 text-base font-semibold text-emerald-700">{thanksLine}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-600">{variantHint}</p>

          {skippedCount > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {skippedCount} duplicate {skippedCount === 1 ? 'place was' : 'places were'} skipped.
            </p>
          )}

          {list.length > 0 && (
            <ul
              className={`mt-4 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 ${
                isBulk ? 'max-h-36 overflow-y-auto' : ''
              }`}
            >
              {(isBulk ? list.slice(0, 10) : list).map((p, i) => (
                <li key={p.id || `${p.name}-${i}`} className="flex items-center gap-2 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-800">{p.name}</span>
                    {p.category && (
                      <span className="block truncate text-xs text-slate-500">{p.category}</span>
                    )}
                  </span>
                </li>
              ))}
              {isBulk && list.length > 10 && (
                <li className="pl-8 text-xs text-slate-500">+ {list.length - 10} more</li>
              )}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {onViewOnMap && (
              <button
                type="button"
                onClick={() => {
                  onViewOnMap()
                  onClose()
                }}
                className="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700 active:scale-[0.98]"
              >
                View on map
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98] ${
                onViewOnMap
                  ? 'flex-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  : 'w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md hover:from-emerald-600 hover:to-green-700'
              }`}
            >
              Great!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function buildPlaceAddedPayload(places, { variant = 'manual', skippedCount = 0 } = {}) {
  const arr = (Array.isArray(places) ? places : [places]).filter(Boolean)
  if (!arr.length) return null
  return {
    places: arr.map((p) => ({
      id: p.id,
      name: p.place_name_en || p.name || 'Place',
      category: p.category,
    })),
    count: arr.length,
    skippedCount,
    variant,
  }
}


