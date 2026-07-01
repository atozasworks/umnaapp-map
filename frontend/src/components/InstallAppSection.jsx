import { useState } from 'react'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { isNative } from '../platform/runtime'

/** Detect the browser OS to highlight the most relevant download. */
function detectBrowserOS() {
  if (typeof navigator === 'undefined') return 'other'
  const ua = (navigator.userAgent || '').toLowerCase()
  if (/android/.test(ua)) return 'android'
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/windows|win32|win64/.test(ua)) return 'windows'
  return 'other'
}

// Build outputs are published by the host; override with env if served elsewhere.
const APK_URL = import.meta.env.VITE_APK_URL || '/downloads/app.apk'
const EXE_URL = import.meta.env.VITE_EXE_URL || '/downloads/UmnaAppSetup.exe'

/**
 * "Install App" section: Download APK (Android), Download EXE (Windows),
 * Install PWA (everything else). Always shows all three; the OS-matched option
 * is highlighted. Hidden entirely inside packaged Capacitor/Electron builds.
 */
export default function InstallAppSection() {
  const os = detectBrowserOS()
  const { canInstall, isIos, isStandalone, promptInstall } = usePwaInstall(
    'install-section-dismissed',
  )
  const [hint, setHint] = useState('')

  // Never render the download/install CTAs inside the native apps themselves.
  if (isNative()) return null

  const handlePwaInstall = () => {
    setHint('')
    if (isIos && !canInstall) {
      setHint('On iPhone/iPad: Share → Add to Home Screen')
      return
    }
    if (!canInstall) {
      setHint('Open in Chrome/Edge over HTTPS, then try again.')
      return
    }
    const result = promptInstall()
    if (!result.ok) setHint('Install not available right now. Refresh and retry.')
  }

  const cards = [
    {
      key: 'android',
      title: 'Android',
      desc: 'Download the APK and install on your phone or tablet.',
      cta: 'Download APK',
      href: APK_URL,
      download: 'UMNAAPP.apk',
      accent: 'from-emerald-500 to-teal-400',
      recommended: os === 'android',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10a1 1 0 011 1v14a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1zm5 14h.01" />
      ),
    },
    {
      key: 'windows',
      title: 'Windows',
      desc: 'Download the installer (UmnaAppSetup.exe) for your PC.',
      cta: 'Download EXE',
      href: EXE_URL,
      download: 'UmnaAppSetup.exe',
      accent: 'from-sky-500 to-cyan-400',
      recommended: os === 'windows',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5l8-1v7H3V5zm8 8v7l-8-1v-6h8zm2-9l8-1v9h-8V4zm8 10v8l-8-1v-7h8z" />
      ),
    },
    {
      key: 'pwa',
      title: 'Install as App (PWA)',
      desc: isStandalone
        ? 'Already installed — you can launch UMNAAPP from your home screen.'
        : 'Install directly from your browser. Works on all platforms.',
      cta: isStandalone ? 'Installed' : 'Install PWA',
      onClick: handlePwaInstall,
      accent: 'from-violet-500 to-fuchsia-400',
      recommended: os === 'other' || os === 'ios',
      disabled: isStandalone,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
      ),
    },
  ]

  return (
    <section
      id="install-app"
      className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-[#0b1220] text-white overflow-hidden"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[55%] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.16),transparent_60%)]" aria-hidden />
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-cyan-300 mb-3">
            Get the app
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Install UMNAAPP on any device
          </h2>
          <p className="text-slate-400 text-lg">
            One experience, everywhere — Android, Windows, or straight from your browser.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {cards.map((c) => (
            <article
              key={c.key}
              className={`group relative rounded-3xl border bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-sm p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                c.recommended ? 'border-cyan-400/40 ring-1 ring-cyan-400/20' : 'border-white/10 hover:border-white/25'
              }`}
            >
              {c.recommended && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-900">
                  Recommended for you
                </span>
              )}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.accent} text-white flex items-center justify-center mb-5 shadow-lg`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                  {c.icon}
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">{c.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-5 flex-1">{c.desc}</p>

              {c.href ? (
                <a
                  href={c.href}
                  download={c.download}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${c.accent} px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[44px]`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {c.cta}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={c.onClick}
                  disabled={c.disabled}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${c.accent} px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[44px] disabled:opacity-60 disabled:hover:scale-100`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    {c.icon}
                  </svg>
                  {c.cta}
                </button>
              )}
            </article>
          ))}
        </div>

        {hint && (
          <p className="text-center text-sm text-amber-300/90 mt-6" role="status">
            {hint}
          </p>
        )}
      </div>
    </section>
  )
}
