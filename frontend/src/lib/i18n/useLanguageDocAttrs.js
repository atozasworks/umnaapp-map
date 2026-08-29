import { useEffect } from 'react'
import { useLanguage } from 'atozas-traslate'
import { buildFontStack, getLanguageDir, getLanguageMeta } from './indicLanguages'

/** One Google Fonts stylesheet per Indic script (weights used by the UI). */
const SCRIPT_FONT_HREF = {
  kannada:
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;500;600;700&display=swap',
  tamil:
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap',
  devanagari:
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap',
}

const loadedScripts = new Set()

function ensureScriptFont(script) {
  const href = SCRIPT_FONT_HREF[script]
  if (!href || loadedScripts.has(script) || typeof document === 'undefined') return
  loadedScripts.add(script)

  const id = `umna-font-${script}`
  if (document.getElementById(id)) return

  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = href
  link.media = 'print'
  link.onload = () => {
    link.media = 'all'
  }
  document.head.appendChild(link)
}

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
    ensureScriptFont(meta.script)
  }, [language])
}
