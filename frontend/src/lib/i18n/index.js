/**
 * Deep regional-language UI — public surface.
 *
 * Import everything you need from one place:
 *
 *   import { useTranslate, useLanguage, getAllLanguages } from '../lib/i18n'
 *
 * `useTranslate` here is our enhanced hook with first-class dictionaries for
 * Kannada, Tamil, Marathi, Hindi, Tulu, and Konkani. All other call sites
 * (`useLanguage`, `getAllLanguages`) are re-exported from atozas-traslate
 * unchanged so the rest of the codebase doesn't need to know which is which.
 */

export { useLanguage, getAllLanguages, translateText } from 'atozas-traslate'

export { default as useTranslate, translateLocal, hasLocalCoverage } from './useDeepTranslate'

export {
  FIRST_CLASS_LANGUAGES,
  RTL_LANGUAGES,
  getLanguageMeta,
  isFirstClass,
  getTranslationTarget,
  getLanguageDir,
  buildFontStack,
} from './indicLanguages'

export {
  LOCAL_DICTIONARIES,
  lookupLocal,
  getDictionaryCoverage,
} from './dictionaries'

export { default as useLanguageDocAttrs } from './useLanguageDocAttrs'

export { default as LanguagePickerModal } from './LanguagePickerModal'
