import { useNavigate } from 'react-router-dom'
import AppLogo from '../components/AppLogo'
import { useAuth } from '../contexts/AuthContext'

const PLANS = [
  {
    id: 'month',
    name: '1 Month',
    tagline: 'Great for quick trips',
    price: '0',
    was: '100',
    period: '/1 month',
    features: [
      'Search places and get directions',
      'Save favorites on your map',
      'Public place details',
      'Email support',
    ],
    featured: false,
  },
  {
    id: 'half',
    name: '6 Months',
    tagline: 'Best value for steady use',
    price: '0',
    was: '450',
    period: '/6 months',
    features: [
      'Everything in 1 Month',
      'Place extract for a region',
      'Live location sharing',
      'Offline map downloads',
    ],
    featured: true,
  },
  {
    id: 'year',
    name: '1 Year',
    tagline: 'Built for long-term savings',
    price: '0',
    was: '800',
    period: '/1 year',
    features: [
      'Everything in 6 Months',
      'Area and polygon tools',
      'Priority map updates',
      'Early access to new features',
    ],
    featured: false,
  },
]

const TRUST = ['Instant access', 'Secure payments', 'Cancel anytime']

function CheckIcon({ featured }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        featured
          ? 'bg-gradient-to-br from-cyan-300 to-emerald-300 text-slate-950'
          : 'bg-white/10 text-cyan-200 ring-1 ring-white/15'
      }`}
      aria-hidden
    >
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.2 4.8 8.5 9.5 3.5" />
      </svg>
    </span>
  )
}

export default function PricingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const claimOffer = () => {
    navigate(isAuthenticated ? '/' : '/register')
  }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#0b1220] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[#0b1220]" />
        <div className="absolute left-1/2 top-[-18%] h-[55%] w-[130%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.32),transparent_62%)]" />
        <div className="absolute right-[-8%] top-[8%] h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-[8%] left-[-12%] h-[360px] w-[360px] rounded-full bg-primary-600/25 blur-[90px] animate-float" />
        <div className="absolute right-[18%] top-[42%] h-[240px] w-[240px] rounded-full bg-violet-600/15 blur-[80px] animate-float-delayed" />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1220]/70 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/' : '/welcome')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label={isAuthenticated ? 'Back to map' : 'Back to home'}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <AppLogo decorative imgClassName="h-8 w-auto max-h-9 object-contain drop-shadow-lg" />
            <span className="truncate bg-gradient-to-r from-sky-300 via-cyan-200 to-primary-300 bg-clip-text text-lg font-bold tracking-tight text-transparent sm:text-xl">
              UMNAAPP
            </span>
          </div>
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 sm:inline-flex">
            Pricing
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-10 sm:px-6 sm:pt-14 lg:pt-16">
        <section className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-200 backdrop-blur-sm sm:text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            Launching offer · 100% off
          </div>

          <h1 className="mt-6 text-balance text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            <span className="text-white">Pick a plan that grows</span>
            <br />
            <span
              className="animate-shimmer bg-gradient-to-r from-sky-300 via-cyan-200 to-emerald-300 bg-clip-text text-transparent"
              style={{ backgroundSize: '200% auto' }}
            >
              with how you use the map
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-lg">
            Simple monthly options, smarter long-term savings. Choose a plan and get instant
            access to search, directions, place tools, and live sharing.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {TRUST.map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 items-stretch gap-5 sm:mt-12 md:grid-cols-3 lg:gap-6">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-3xl p-px ${
                plan.featured
                  ? 'bg-gradient-to-b from-cyan-300 via-sky-400 to-emerald-300 shadow-2xl shadow-sky-500/25 md:-translate-y-3'
                  : 'bg-white/10'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-500 via-sky-400 to-cyan-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-sky-500/30">
                  Best value
                </span>
              )}
              <div
                className={`flex h-full flex-col rounded-[calc(1.5rem-1px)] px-5 py-6 sm:px-6 sm:py-7 ${
                  plan.featured
                    ? 'bg-gradient-to-b from-slate-900 via-[#102033] to-[#0b1220]'
                    : 'bg-[#101827]/90 backdrop-blur-xl'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
                    100% off
                  </span>
                </div>

                <p className="mt-6 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    Rs {plan.price}
                  </span>
                  <span className="pb-1 text-sm text-slate-400">
                    <span className="line-through decoration-slate-500">Rs {plan.was}</span>
                    <span> {plan.period}</span>
                  </span>
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-200">
                      <CheckIcon featured={plan.featured} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={claimOffer}
                  className={`mt-7 min-h-[48px] w-full rounded-2xl px-4 text-sm font-semibold transition active:scale-[0.99] ${
                    plan.featured
                      ? 'bg-gradient-to-r from-primary-500 via-sky-400 to-cyan-400 text-white shadow-lg shadow-sky-500/30 hover:shadow-sky-400/40'
                      : 'bg-white text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Claim Launch Offer
                </button>
              </div>
            </article>
          ))}
        </section>

        <p className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed text-slate-500 sm:mt-10 sm:text-sm">
          Launch pricing is Rs 0 for a limited time. Claiming the offer opens the map
          {isAuthenticated ? '.' : ' after you create an account.'} No charge is taken on this screen.
        </p>
      </main>
    </div>
  )
}
