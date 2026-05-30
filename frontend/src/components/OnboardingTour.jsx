import { useEffect, useState } from 'react'

const STEPS = [
  {
    id: 'welcome',
    emoji: '🗺️',
    eyebrow: 'Welcome',
    title: 'Welcome to UmnaApp Maps',
    subtitle: "Let's take a quick 30-second tour to show you what's possible.",
    accent: 'from-sky-500 via-cyan-400 to-emerald-400',
    glow: 'shadow-cyan-500/40',
    halo: 'bg-cyan-400/30',
    bullets: [
      {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        text: 'Discover places added by the community',
      },
      {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        ),
        text: 'Explore hidden locations near you',
      },
      {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.464-2.684m5.464 2.684a3 3 0 01-5.464 2.684M9 6a3 3 0 105.464-2.684" />
          </svg>
        ),
        text: 'Get directions and share places',
      },
    ],
    cta: 'Next',
  },
  {
    id: 'contribute',
    emoji: '📍',
    eyebrow: 'Add & Contribute',
    title: 'Add Places & Help Others',
    subtitle: 'Your local knowledge makes the map smarter for everyone.',
    accent: 'from-violet-500 via-fuchsia-500 to-pink-400',
    glow: 'shadow-fuchsia-500/40',
    halo: 'bg-fuchsia-400/30',
    bullets: [
      {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        text: 'Add new places to the map',
      },
      {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        text: 'Upload photos and reviews',
      },
    ],
    cta: 'Next',
  },
  {
    id: 'explore',
    emoji: '🔍',
    eyebrow: 'Explore Smartly',
    title: 'Search, Explore & Extract',
    subtitle: 'Powerful tools that turn the map into your personal explorer.',
    accent: 'from-amber-500 via-orange-400 to-rose-400',
    glow: 'shadow-orange-500/40',
    halo: 'bg-orange-400/30',
    bullets: [
      {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
        ),
        text: 'Search places instantly',
      },
      {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h7" />
          </svg>
        ),
        text: 'Explore by category (Hotels, ATMs, Temples, etc.)',
      },
      {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        ),
        text: 'Extract places from selected areas',
      },
    ],
    cta: 'Get Started',
  },
]

const ONBOARDING_VERSION = 'v1'

const buildStorageKey = (userId) =>
  `umnaapp:onboarding:${ONBOARDING_VERSION}:${userId || 'anon'}`

export const hasSeenOnboarding = (userId) => {
  try {
    return localStorage.getItem(buildStorageKey(userId)) === '1'
  } catch {
    return false
  }
}

export const markOnboardingSeen = (userId) => {
  try {
    localStorage.setItem(buildStorageKey(userId), '1')
  } catch {
    /* storage may be disabled - safe to ignore */
  }
}

const OnboardingTour = ({ isOpen, onComplete, onSkip }) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    if (isOpen) setStepIndex(0)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onSkip?.()
      if (e.key === 'ArrowRight') {
        setDirection(1)
        setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
      }
      if (e.key === 'ArrowLeft') {
        setDirection(-1)
        setStepIndex((i) => Math.max(i - 1, 0))
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onSkip])

  if (!isOpen) return null

  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      onComplete?.()
    } else {
      setDirection(1)
      setStepIndex((i) => i + 1)
    }
  }

  const handleBack = () => {
    if (stepIndex === 0) return
    setDirection(-1)
    setStepIndex((i) => i - 1)
  }

  const handleDot = (i) => {
    if (i === stepIndex) return
    setDirection(i > stepIndex ? 1 : -1)
    setStepIndex(i)
  }

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md animate-fade-in" />

      {/* Card */}
      <div
        key={step.id}
        className={`relative w-full max-w-md sm:max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white shadow-2xl ${step.glow} animate-slide-up`}
      >
        {/* Decorative gradient blob */}
        <div
          className={`pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full bg-gradient-to-br ${step.accent} opacity-30 blur-3xl`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full ${step.halo} blur-3xl`}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        {/* Top bar: progress + skip */}
        <div className="relative flex items-center justify-between px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-center gap-1.5" aria-label="Progress">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleDot(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? `w-8 bg-gradient-to-r ${step.accent}`
                    : i < stepIndex
                      ? 'w-4 bg-white/55 hover:bg-white/70'
                      : 'w-4 bg-white/15 hover:bg-white/30'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Body */}
        <div
          key={`body-${step.id}-${direction}`}
          className="relative px-6 pt-6 pb-2 sm:px-9 sm:pt-7 animate-fade-in"
        >
          {/* Emoji medallion */}
          <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
            <span
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.accent} opacity-30 blur-2xl animate-pulse-glow`}
              aria-hidden
            />
            <span
              className={`absolute inset-2 rounded-full bg-gradient-to-br ${step.accent} opacity-90`}
              aria-hidden
            />
            <span className="absolute inset-[10px] rounded-full bg-slate-950/85 ring-1 ring-white/10" aria-hidden />
            <span className="relative text-4xl sm:text-5xl drop-shadow-lg" aria-hidden>
              {step.emoji}
            </span>
          </div>

          {/* Eyebrow */}
          <p
            className={`text-center text-[11px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r ${step.accent} bg-clip-text text-transparent`}
          >
            {step.eyebrow} · Step {stepIndex + 1} of {STEPS.length}
          </p>

          {/* Title */}
          <h2
            id="onboarding-title"
            className="mt-2 text-center text-2xl font-extrabold tracking-tight sm:text-3xl"
          >
            {step.title}
          </h2>

          {step.subtitle && (
            <p className="mt-2 text-center text-sm text-slate-400 sm:text-[15px]">
              {step.subtitle}
            </p>
          )}

          {/* Bullets */}
          <ul className="mt-6 space-y-2.5">
            {step.bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm transition-colors hover:bg-white/[0.07]"
                style={{ animation: `fadeIn 0.45s ease-out ${0.08 * (i + 1)}s both` }}
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.accent} text-white shadow-md`}
                >
                  {b.icon}
                </span>
                <span className="text-sm font-medium leading-snug text-slate-100 sm:text-[15px]">
                  {b.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer / Actions */}
        <div className="relative mt-6 flex items-center gap-3 border-t border-white/10 bg-slate-950/40 px-5 py-4 sm:px-7 sm:py-5">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors enabled:hover:bg-white/10 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            Back
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleNext}
            className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r ${step.accent} px-7 py-3 text-sm font-bold text-white shadow-lg ${step.glow} transition-all hover:scale-[1.02] active:scale-[0.98]`}
          >
            <span
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              aria-hidden
            />
            <span className="relative">{step.cta}</span>
            <svg
              className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.6}
              viewBox="0 0 24 24"
              aria-hidden
            >
              {isLast ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTour
