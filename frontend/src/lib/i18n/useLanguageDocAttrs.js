import { useEffect } from 'react'
import { useLanguage } from 'atozas-traslate'
import { buildFontStack, getLanguageDir, getLanguageMeta } from './indicLanguages'

/**
 * Side-effect hook: keeps `<html lang>`, `<html dir>`, and a script class on
 * `<body>` in sync with the active language. Also sets a CSS variable
 * `--app-font-stack` so the rest of the app (and place markers / map labels)
 * can opt into the right script-aware font without duplication.
 *
 * Mount once near the top of the React tree (e.g. just inside <App />).
 */
export default function useLanguageDocAttrs() {
  const { language } = useLanguage()

  useEffect(() => {
    if (typeof document === 'undefined') return

    const meta = getLanguageMeta(language)
    const html = document.documentElement
    html.setAttribute('lang', language || 'en')
    html.setAttribute('dir', getLanguageDir(language))

    const body = document.body
    if (!body) return

    body.classList.forEach((cls) => {
      if (cls.startsWith('script-')) body.classList.remove(cls)
    })
    body.classList.add(`script-${meta.script}`)

    html.style.setProperty('--app-font-stack', buildFontStack(language))
  }, [language])
}
