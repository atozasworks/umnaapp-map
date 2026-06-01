import { useState } from 'react'
import AppLogo from './AppLogo'
import { usePwaInstall } from '../hooks/usePwaInstall'

/** Bottom-right install popup for the landing page. */
export default function LandingInstallPopup() {
  const { canInstall, isIos, showPopup, dismiss, promptInstall } = usePwaInstall(
    'landing-pwa-install-dismissed',
  )
  const [hint, setHint] = useState('')
  const [installing, setInstalling] = useState(false)

  if (!showPopup) return null

  const handleInstall = () => {
    setHint('')

    if (isIos && !canInstall) {
      setHint('Safari: Share → Add to Home Screen')
      return
    }

    if (!canInstall) {
      setHint('Install ready in Chrome/Edge. Use HTTPS and refresh if needed.')
      return
    }

    setInstalling(true)
    const result = promptInstall()

    if (!result.ok) {
      setInstalling(false)
      setHint('Install not available. Refresh and try again.')
      return
    }

    result.userChoice
      .then((choice) => {
        if (choice.outcome === 'accepted') dismiss()
      })
      .finally(() => setInstalling(false))
  }

  return (
    <div
      className="fixed z-[60] bottom-4 right-4 w-[min(100vw-2rem,20rem)] animate-slide-up pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]"
      role="dialog"
      aria-labelledby="landing-install-title"
      aria-describedby="landing-install-desc"
    >
      <div className="relative rounded-2xl border border-white/20 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 p-4 ring-1 ring-sky-500/20">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close install popup"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-3 pr-6 mb-3">
          <AppLogo decorative imgClassName="h-9 w-auto object-contain flex-shrink-0" />
          <div className="min-w-0">
            <p id="landing-install-title" className="text-sm font-bold text-white leading-tight">
              Install UMNAAPP
            </p>
            <p id="landing-install-desc" className="text-xs text-slate-400 mt-1 leading-relaxed">
              {canInstall
                ? 'One tap to add UMNAAPP to your device.'
                : isIos
                  ? 'Tap Install for steps to add to Home Screen.'
                  : 'Get the app on your device for faster access and offline support.'}
            </p>
          </div>
        </div>

        {hint ? (
          <p className="text-xs text-amber-300/90 mb-2 leading-relaxed" role="status">
            {hint}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 via-sky-400 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[44px] disabled:opacity-70 disabled:pointer-events-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {installing ? 'Installing…' : 'Install'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={installing}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors min-h-[44px] disabled:opacity-60"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
