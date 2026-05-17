import { useEffect } from 'react'
import { DUPLICATE_MESSAGES } from '../utils/placeDuplicate'

const REASON_HINTS = {
  google_place_id: 'This place is already registered on the map (same Google Place).',
  coordinates: 'Another place is already saved at this location.',
  name_address: 'A place with the same name and address already exists.',
  duplicate_in_batch: 'You selected the same place more than once.',
}

function reasonIcon(reason) {
  if (reason === 'coordinates') {
    return (
      <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  return (
    <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   message?: string,
 *   reason?: string,
 *   placeName?: string,
 *   existingPlaceName?: string,
 *   onViewOnMap?: () => void,
 *   skippedList?: { name?: string, message?: string }[],
 * }} props
 */
export default function DuplicatePlaceModal({
  isOpen,
  onClose,
  message,
  reason,
  placeName,
  existingPlaceName,
  onViewOnMap,
  skippedList,
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

  const title =
    reason === 'coordinates'
      ? 'Location already on map'
      : 'Place already added'
  const mainMessage =
    message ||
    DUPLICATE_MESSAGES[reason] ||
    DUPLICATE_MESSAGES.name_address
  const hint = REASON_HINTS[reason] || REASON_HINTS.name_address
  const isBulk = Array.isArray(skippedList) && skippedList.length > 0

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-place-title"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-md" aria-hidden="true" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-200/80 bg-white shadow-2xl shadow-amber-900/10 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 ring-1 ring-amber-200/80 shadow-inner">
              {reasonIcon(reason)}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Duplicate</p>
              <h2 id="duplicate-place-title" className="mt-1 text-xl font-bold text-slate-900">
                {isBulk ? 'Some places already exist' : title}
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

          <p className="mt-4 text-base font-medium leading-snug text-slate-800">{mainMessage}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{hint}</p>

          {placeName && !isBulk && (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">You tried to add</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{placeName}</p>
              {existingPlaceName && existingPlaceName !== placeName && (
                <>
                  <p className="mt-2 text-xs font-medium text-slate-500">Already on map</p>
                  <p className="mt-0.5 truncate text-sm text-slate-700">{existingPlaceName}</p>
                </>
              )}
            </div>
          )}

          {isBulk && (
            <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/90 p-3">
              {skippedList.slice(0, 8).map((item, i) => (
                <li key={`${item.name}-${i}`} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>
                    <span className="font-medium text-slate-800">{item.name || 'Place'}</span>
                    {item.message && (
                      <span className="block text-xs text-slate-500">{item.message}</span>
                    )}
                  </span>
                </li>
              ))}
              {skippedList.length > 8 && (
                <li className="text-xs text-slate-500 pl-3.5">+ {skippedList.length - 8} more</li>
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
                  : 'w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600'
              }`}
            >
              OK, got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Build popup payload from API / client duplicate result */
export function buildDuplicatePopupPayload(dup, placeName = '') {
  if (!dup?.duplicate) return null
  return {
    message: dup.message,
    reason: dup.reason,
    placeName: placeName || dup.placeName || '',
    existingPlaceName: dup.existingPlaceName || null,
    existingPlaceId: dup.existingPlaceId || null,
  }
}

