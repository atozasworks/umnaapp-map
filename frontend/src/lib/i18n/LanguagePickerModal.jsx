import { useEffect, useMemo, useState } from 'react'
import { useLanguage, getAllLanguages } from 'atozas-traslate'
import { FIRST_CLASS_LANGUAGES, buildFontStack, getLanguageMeta } from './indicLanguages'
import useDeepTranslate from './useDeepTranslate'

const SCRIPT_LABEL = {
  latin: 'Latin',
  kannada: 'ಕನ್ನಡ ಲಿಪಿ',
  tamil: 'தமிழ் எழுத்து',
  devanagari: 'देवनागरी',
}

const Section = ({ title, children }) => (
  <div className="mb-4">
    <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
      {title}
    </p>
    {children}
  </div>
)

const CuratedRow = ({ lang, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(lang.code)}
    className={`group w-full rounded-xl border px-4 py-3 text-left transition-all ${
      selected
        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
        : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/40'
    }`}
    aria-pressed={selected}
  >
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg font-bold text-sm ${
          selected
            ? 'bg-primary-600 text-white'
            : 'bg-slate-100 text-slate-700 group-hover:bg-primary-100 group-hover:text-primary-700'
        }`}
        style={{ fontFamily: buildFontStack(lang.code) }}
        aria-hidden
      >
        {lang.native.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className="truncate text-sm font-semibold text-slate-900"
            style={{ fontFamily: buildFontStack(lang.code) }}
          >
            {lang.native}
          </p>
          {lang.code === 'tcy' || lang.code === 'kok' ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
              Curated
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {lang.english}
          {lang.region ? ` · ${lang.region}` : ''}
        </p>
      </div>
      {selected ? (
        <svg
          className="h-5 w-5 flex-shrink-0 text-primary-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : null}
    </div>
    {lang.note ? (
      <p className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-[11px] leading-snug text-slate-500">
        {lang.note}
      </p>
    ) : null}
  </button>
)

export default function LanguagePickerModal({ isOpen, onClose }) {
  const { language, setLanguage } = useLanguage()
  const [pending, setPending] = useState(language)
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const tTitle = useDeepTranslate('App language')
  const tHint = useDeepTranslate(
    'Pick a language, then tap Apply. Menu and labels update after a short load.',
  )
  const tApply = useDeepTranslate('Apply')
  const tClose = useDeepTranslate('Close')
  const tFirstClass = useDeepTranslate('First-class regional languages')
  const tMore = useDeepTranslate('More languages')
  const tSearch = useDeepTranslate('Search languages...')
  const tEmpty = useDeepTranslate('No languages match your search.')
  const tCuratedNote = useDeepTranslate(
    'Hand-translated categories, navigation, and place actions in these languages.',
  )

  useEffect(() => {
    if (isOpen) {
      setPending(language)
      setQuery('')
    }
  }, [isOpen, language])

  const curatedCodes = useMemo(
    () => new Set(FIRST_CLASS_LANGUAGES.map((l) => l.code)),
    [],
  )

  const extras = useMemo(() => {
    const all = getAllLanguages()
    const q = query.trim().toLowerCase()
    return all
      .filter((lang) => !curatedCodes.has(lang.code))
      .filter((lang) => {
        if (!q) return true
        return (
          lang.name.toLowerCase().includes(q) ||
          lang.code.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [curatedCodes, query])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[460] flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-picker-title"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h3
              id="language-picker-title"
              className="text-base font-bold text-slate-900"
            >
              {tTitle}
            </h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">{tHint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 ml-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={tClose}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Section title={tFirstClass}>
            <p className="mb-2 px-1 text-[11px] leading-snug text-slate-500">
              {tCuratedNote}
            </p>
            <div className="space-y-2">
              {FIRST_CLASS_LANGUAGES.map((lang) => (
                <CuratedRow
                  key={lang.code}
                  lang={lang}
                  selected={pending === lang.code}
                  onSelect={setPending}
                />
              ))}
            </div>
          </Section>

          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              aria-expanded={showAll}
            >
              <span>{tMore}</span>
              <svg
                className={`h-4 w-4 text-slate-500 transition-transform ${showAll ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showAll ? (
              <div className="mt-3 space-y-3">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tSearch}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/40">
                  {extras.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-slate-500">
                      {tEmpty}
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {extras.map((lang) => {
                        const selected = pending === lang.code
                        const meta = getLanguageMeta(lang.code)
                        return (
                          <li key={lang.code}>
                            <button
                              type="button"
                              onClick={() => setPending(lang.code)}
                              className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                                selected
                                  ? 'bg-primary-50 text-primary-900'
                                  : 'text-slate-700 hover:bg-white'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">{lang.name}</p>
                                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                  {lang.code}
                                  {meta.dir === 'rtl' ? ' · RTL' : ''}
                                </p>
                              </div>
                              {selected ? (
                                <svg
                                  className="h-4 w-4 flex-shrink-0 text-primary-600"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  viewBox="0 0 24 24"
                                  aria-hidden
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="truncate text-xs text-slate-500">
              {(() => {
                const meta = getLanguageMeta(pending)
                const scriptName = SCRIPT_LABEL[meta.script] || meta.script
                return `${meta.native} · ${scriptName}`
              })()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLanguage(pending)
              onClose()
            }}
            className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-700 active:bg-primary-800"
          >
            {tApply}
          </button>
        </div>
      </div>
    </div>
  )
}
