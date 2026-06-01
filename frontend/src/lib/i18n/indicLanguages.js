/**
 * Deep regional-language UI — Indic + curated language metadata.
 *
 * "First-class" languages: hand-translated dictionaries, native-name listing,
 * script-aware font stack, surfaced prominently in the picker.
 *
 * Two languages we add that Google Translate's public endpoint does NOT support:
 *   - tcy (Tulu)    → uses the Kannada script; falls back to Kannada for the
 *                     dynamic-translation tail (so long unauthored strings still
 *                     read naturally to a Tulu speaker).
 *   - kok (Konkani) → uses Devanagari; falls back to Marathi for the dynamic tail.
 *
 * `googleFallback` is only consulted when our local dictionary does not contain
 * the key — it is never used to *override* a curated translation.
 */

export const FIRST_CLASS_LANGUAGES = [
  {
    code: 'en',
    native: 'English',
    english: 'English',
    script: 'latin',
    dir: 'ltr',
    region: 'Global',
    font: null,
  },
  {
    code: 'kn',
    native: 'ಕನ್ನಡ',
    english: 'Kannada',
    script: 'kannada',
    dir: 'ltr',
    region: 'Karnataka',
    font: "'Noto Sans Kannada'",
  },
  {
    code: 'ta',
    native: 'தமிழ்',
    english: 'Tamil',
    script: 'tamil',
    dir: 'ltr',
    region: 'Tamil Nadu / Sri Lanka',
    font: "'Noto Sans Tamil'",
  },
  {
    code: 'mr',
    native: 'मराठी',
    english: 'Marathi',
    script: 'devanagari',
    dir: 'ltr',
    region: 'Maharashtra',
    font: "'Noto Sans Devanagari'",
  },
  {
    code: 'hi',
    native: 'हिन्दी',
    english: 'Hindi',
    script: 'devanagari',
    dir: 'ltr',
    region: 'India',
    font: "'Noto Sans Devanagari'",
  },
  {
    code: 'tcy',
    native: 'ತುಳು',
    english: 'Tulu',
    script: 'kannada',
    dir: 'ltr',
    region: 'Coastal Karnataka',
    font: "'Noto Sans Kannada'",
    googleFallback: 'kn',
    note: 'Curated dictionary; longer untranslated strings fall back to Kannada.',
  },
  {
    code: 'kok',
    native: 'कोंकणी',
    english: 'Konkani',
    script: 'devanagari',
    dir: 'ltr',
    region: 'Konkan Coast',
    font: "'Noto Sans Devanagari'",
    googleFallback: 'mr',
    note: 'Curated dictionary; longer untranslated strings fall back to Marathi.',
  },
]

/** RTL languages that the i18n layer should handle correctly when chosen. */
export const RTL_LANGUAGES = new Set(['ar', 'he', 'iw', 'fa', 'ur', 'ps', 'sd', 'yi'])

/** Map of language code → metadata, for quick lookup. */
const FIRST_CLASS_BY_CODE = Object.fromEntries(
  FIRST_CLASS_LANGUAGES.map((lang) => [lang.code, lang]),
)

/** Returns the curated metadata for a code, or a synthesized minimal record. */
export const getLanguageMeta = (code) => {
  const key = String(code || '').trim()
  if (!key) return FIRST_CLASS_BY_CODE.en
  if (FIRST_CLASS_BY_CODE[key]) return FIRST_CLASS_BY_CODE[key]
  return {
    code: key,
    native: key,
    english: key,
    script: 'latin',
    dir: RTL_LANGUAGES.has(key) ? 'rtl' : 'ltr',
    region: '',
    font: null,
  }
}

/** True if we have hand-authored dictionary entries for this language. */
export const isFirstClass = (code) => Boolean(FIRST_CLASS_BY_CODE[code])

/** The Google Translate target to use when our local dictionary is missing. */
export const getTranslationTarget = (code) => {
  const meta = getLanguageMeta(code)
  return meta.googleFallback || code
}

/** Resolved CSS direction for a given language code. */
export const getLanguageDir = (code) => getLanguageMeta(code).dir

/** Font-family string suitable for inline style, prepending the script font. */
export const buildFontStack = (code) => {
  const { font } = getLanguageMeta(code)
  const base =
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
  return font ? `${font}, ${base}` : base
}
