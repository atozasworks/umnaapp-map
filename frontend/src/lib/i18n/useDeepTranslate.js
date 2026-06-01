import { useEffect, useState } from 'react'
import { useLanguage, translateText } from 'atozas-traslate'
import { lookupLocal } from './dictionaries'
import { getTranslationTarget, isFirstClass } from './indicLanguages'

/**
 * Drop-in replacement for `atozas-traslate`'s `useTranslate` with two extras:
 *
 *   1. Local dictionary first. If we have a hand-authored translation for the
 *      current language, it's returned instantly with no network round-trip
 *      and no Google quirks (e.g. "Restaurant" → "ಭೋಜನಾಲಯ", not the
 *      transliterated "ರೆಸ್ಟೋರೆಂಟ್").
 *
 *   2. Fallback target re-routing. For languages Google's public endpoint does
 *      not support (Tulu, Konkani), we send any uncurated strings to the
 *      configured `googleFallback` (Kannada / Marathi respectively). The user
 *      gets a coherent script-correct experience instead of falling back to
 *      raw English.
 *
 * API mirrors `useTranslate(text, sourceLanguage = 'auto')` so existing call
 * sites do not need to change anything other than the import path.
 */
function useDeepTranslate(text, sourceLanguage = 'auto') {
  const { language } = useLanguage()

  const initial = resolveSync(language, text)
  const [output, setOutput] = useState(initial)

  useEffect(() => {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      setOutput(text || '')
      return undefined
    }

    if (language === 'en') {
      setOutput(text)
      return undefined
    }

    const local = lookupLocal(language, text)
    if (local != null) {
      setOutput(local)
      return undefined
    }

    setOutput(text)

    const target = getTranslationTarget(language)
    let cancelled = false
    translateText(text, sourceLanguage, target)
      .then((translated) => {
        if (cancelled) return
        setOutput(translated && translated.trim() ? translated : text)
      })
      .catch(() => {
        if (cancelled) return
        setOutput(text)
      })

    return () => {
      cancelled = true
    }
  }, [text, language, sourceLanguage])

  return output
}

function resolveSync(language, text) {
  if (!text || typeof text !== 'string') return text || ''
  if (language === 'en') return text
  const local = lookupLocal(language, text)
  if (local != null) return local
  return text
}

/**
 * Synchronous, hook-free helper. Useful when you have to translate inside a
 * non-React utility (e.g. an option array passed to a third-party component).
 * Only returns curated values; uncurated strings come back unchanged.
 */
export const translateLocal = (language, text) => {
  if (!language || language === 'en') return text
  return lookupLocal(language, text) ?? text
}

/** True when the language has any curated entries at all. */
export const hasLocalCoverage = (language) => isFirstClass(language)

export default useDeepTranslate
