import { useState } from 'react'
import AppLogo from './AppLogo'
import { usePwaInstall } from '../hooks/usePwaInstall'

export default function PwaInstallModal({ isOpen, onClose }) {
  const { canInstall, isIos, isStandalone, promptInstall } = usePwaInstall(
    'pwa-install-modal-dismissed',
  )
  const [installing, setInstalling] = useState(false)
  const [hint, setHint] = useState('')

  if (!isOpen) return null

  const handleInstall = () => {
    setHint('')

    if (isStandalone) {
      setHint('UMNAAPP is already installed on this device.')
      return
    }

    if (isIos && !canInstall) {
      setHint('In Safari, tap Share and choose “Add to Home Screen”.')
      return
    }

    if (!canInstall) {
      setHint('Chrome has not enabled one-tap install yet. Use the browser menu and choose “Install UMNAAPP” or “Add to Home screen”.')
      return
    }

    setInstalling(true)
    const result = promptInstall()
    if (!result.ok) {
      setInstalling(false)
      setHint('Install is not available right now. Please refresh and try again.')
      return
    }

    result.userChoice.finally(() => {
      setInstalling(false)
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl shadow-slate-900/30 animate-slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-sky-600 to-cyan-500 px-6 pb-8 pt-7 text-white">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/15" />
          <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-cyan-300/20" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
            aria-label="Close install dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-lg">
              <AppLogo decorative imgClassName="h-10 w-auto object-contain" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">UMNAAPP</p>
              <h2 id="pwa-install-title" className="mt-1 text-2xl font-black tracking-tight">Your map, everywhere</h2>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-5">
          <p className="text-sm leading-relaxed text-slate-600">
            Install UMNAAPP for a faster, full-screen experience with quick access to your maps and offline features.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-600">
            {[
              ['⚡', 'Faster access'],
              ['🗺️', 'Offline maps'],
              ['🔔', 'Useful alerts'],
            ].map(([icon, label]) => (
              <div key={label} className="rounded-2xl bg-slate-50 px-2 py-3">
                <span className="block text-lg" aria-hidden>{icon}</span>
                <span className="mt-1 block">{label}</span>
              </div>
            ))}
          </div>

          {hint ? <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800" role="status">{hint}</p> : null}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 rounded-xl bg-gradient-to-r from-primary-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-wait disabled:opacity-70"
            >
              {installing ? 'Opening install…' : isStandalone ? 'Installed' : 'Install app'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={installing}
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
