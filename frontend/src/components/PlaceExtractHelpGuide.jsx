import { useState } from 'react'

/**
 * Collapsible in-panel guide for the Place Extractor feature.
 */
export default function PlaceExtractHelpGuide({
  method = 'grid',
  maxPlaces = 20,
  maxAreaKm2 = 9,
  requiresLogin = false,
}) {
  const [open, setOpen] = useState(true)

  const methodSteps = {
    grid: [
      'Enter location fields from country down to village (country is required). More detail = smaller, more accurate region.',
      'Tap Load region — the map zooms to that area and shows a grid overlay.',
      'Zoom in to level 14 or higher if prompted (required for Google nearby search).',
      'Tap Extract places — the app scans each grid cell via Google Places and lists results below.',
      'Check the places you want, then tap Add to map.',
    ],
    search: [
      'Type a place name, business, or address in the search box (at least 2 characters).',
      'Pick a suggestion from the dropdown — details load and the place appears in the list.',
      'Repeat to collect multiple places. Uncheck any you do not want.',
      'Tap Add to Map — selected places are saved to your map.',
    ],
    area: [
      'Enter location fields and tap Load region so the map centres on your area.',
      'Choose a shape tool (rectangle, polygon, circle, etc.) from the dropdown.',
      'Draw on the map — follow the hint at the bottom of the map. Tap Complete shape when needed.',
      'Tap Extract places — only places inside your shape are scanned (max area shown above).',
      'Select places from the list and tap Add to map.',
    ],
  }

  const methodTips = {
    grid: [
      'Best for discovering many nearby businesses in a town or village at once.',
      'If zero results, try a broader region or zoom in closer before extracting.',
      'Use Export to download JSON/GeoJSON, or Upload to import a previous export.',
    ],
    search: [
      'Best when you already know the exact place name or address.',
      'Does not use your daily extract quota — add places one search at a time.',
      'Remove unwanted results with the × button before adding to the map.',
    ],
    area: [
      'Best for irregular boundaries — a street block, park, market area, or corridor along a road.',
      'Keep the drawn shape under the max area limit shown above.',
      'Uses the same once-per-day extract quota as the Grid method.',
    ],
  }

  const activeSteps = methodSteps[method] || methodSteps.grid
  const activeTips = methodTips[method] || methodTips.grid

  return (
    <div className="shrink-0 border-b border-emerald-100 bg-gradient-to-b from-emerald-50/90 to-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-emerald-50/80 sm:px-4"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-emerald-900 sm:text-[13px]">How to use Extract Places</span>
          <span className="block truncate text-[10px] text-emerald-700/90 sm:text-[11px]">
            Step-by-step guide · {method === 'grid' ? 'Grid' : method === 'search' ? 'Search' : 'Area'} method
          </span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-emerald-600 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="max-h-[min(42vh,320px)] overflow-y-auto overscroll-contain border-t border-emerald-100/80 px-3 pb-3 pt-2 sm:px-4 sm:pb-3.5">
          {/* Overview */}
          <section className="mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">What is this?</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-700 sm:text-xs">
              Extract Places pulls real-world locations from Google into a list so you can add them to the community map
              in bulk. Use <strong className="font-semibold text-slate-800">Grid</strong> to scan a region,{' '}
              <strong className="font-semibold text-slate-800">Search</strong> to find specific names, or{' '}
              <strong className="font-semibold text-slate-800">Area</strong> to extract inside a shape you draw.
            </p>
          </section>

          {/* Requirements */}
          <section className="mb-3 rounded-xl border border-amber-100 bg-amber-50/70 px-2.5 py-2 sm:px-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Before you start</h4>
            <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-amber-950 sm:text-xs">
              {requiresLogin && (
                <li className="flex gap-1.5">
                  <span className="shrink-0 font-bold text-amber-700">•</span>
                  <span>
                    <strong>Log in</strong> — an account is required for Grid and Area extraction.
                  </span>
                </li>
              )}
              <li className="flex gap-1.5">
                <span className="shrink-0 font-bold text-amber-700">•</span>
                <span>
                  <strong>Daily limit:</strong> Grid and Area extraction can be run <strong>once per day</strong> per
                  user (up to <strong>{maxPlaces} places</strong> per run).
                </span>
              </li>
              <li className="flex gap-1.5">
                <span className="shrink-0 font-bold text-amber-700">•</span>
                <span>
                  <strong>Area limit:</strong> drawn shapes must stay within <strong>{maxAreaKm2} km²</strong>.
                </span>
              </li>
              <li className="flex gap-1.5">
                <span className="shrink-0 font-bold text-amber-700">•</span>
                <span>
                  <strong>Search method</strong> does not count against the daily extract quota.
                </span>
              </li>
            </ul>
          </section>

          {/* Method steps */}
          <section className="mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Steps — {method === 'grid' ? 'Grid' : method === 'search' ? 'Search' : 'Area'} method
            </h4>
            <ol className="mt-1.5 space-y-1.5">
              {activeSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-[11px] leading-snug text-slate-700 sm:text-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* After extraction */}
          <section className="mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">After extraction</h4>
            <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-slate-700 sm:text-xs">
              <li className="flex gap-1.5">
                <span className="shrink-0 text-primary-600">✓</span>
                <span>
                  Use checkboxes to select places. Tap <strong>Select all</strong> or <strong>Deselect all</strong> as
                  needed.
                </span>
              </li>
              <li className="flex gap-1.5">
                <span className="shrink-0 text-primary-600">✓</span>
                <span>
                  Tap <strong>Add to map</strong> — full Google details are fetched, then places are saved. Duplicates
                  already on the map are skipped automatically.
                </span>
              </li>
              <li className="flex gap-1.5">
                <span className="shrink-0 text-primary-600">✓</span>
                <span>
                  Extracted places may appear as <strong>pending</strong> until approved by an admin (same as manually
                  added places).
                </span>
              </li>
              <li className="flex gap-1.5">
                <span className="shrink-0 text-primary-600">✓</span>
                <span>
                  Use <strong>Export</strong> (JSON / GeoJSON) to keep a backup, or share with others via{' '}
                  <strong>Upload</strong> (Grid method only).
                </span>
              </li>
            </ul>
          </section>

          {/* Tips */}
          <section className="rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 sm:px-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tips for this method</h4>
            <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-slate-600 sm:text-xs">
              {activeTips.map((tip, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="shrink-0 text-slate-400">→</span>
                  <span>{tip}</span>
                </li>
              ))}
              <li className="flex gap-1.5">
                <span className="shrink-0 text-slate-400">→</span>
                <span>
                  If extraction finds <strong>zero places</strong>, your daily slot is returned so you can try again the
                  same day with a different area or zoom level.
                </span>
              </li>
              <li className="flex gap-1.5">
                <span className="shrink-0 text-slate-400">→</span>
                <span>
                  Tap <strong>Stop</strong> during a long Grid/Area run to keep places found so far.
                </span>
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
