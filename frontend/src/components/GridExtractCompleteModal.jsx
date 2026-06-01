import { useEffect } from 'react'

/**
 * Shown after a successful grid extraction run (once per day).
 */
export default function GridExtractCompleteModal({ isOpen, onClose, placeCount = 0, maxPlaces = 20 }) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const count = Math.min(placeCount, maxPlaces)

  return (
    <div
      className="fixed inset-0 z-[520] flex items-center justify-center p-4 sm:p-6 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grid-extract-complete-title"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" aria-hidden="true" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-blue-200/90 bg-white shadow-2xl shadow-blue-900/10 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 via-primary-500 to-indigo-500" />

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 ring-1 ring-blue-200/80 shadow-inner">
              <svg
                className="h-8 w-8 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Grid extract</p>
              <h2 id="grid-extract-complete-title" className="mt-1 text-xl font-bold text-slate-900">
                {count > 0 ? `${count} place${count === 1 ? '' : 's'} extracted` : 'Extraction finished'}
              </h2>
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

          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            {count > 0
              ? `Up to ${maxPlaces} places can be extracted per run. Review the list, then add selected places to your map.`
              : 'No new places were found in this region. You can try a different area tomorrow.'}
          </p>
          <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5 text-sm font-medium text-amber-900">
            You have used today&apos;s grid extract. Come back tomorrow to extract again.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-md transition hover:from-primary-700 hover:to-blue-700 active:scale-[0.98]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
