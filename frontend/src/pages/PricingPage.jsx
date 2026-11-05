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

function CheckIcon() {
  return (
    <span
      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
      aria-hidden
    >
      <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2">
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
    <div className="min-h-[100dvh] bg-[#f7f9fc] text-slate-900">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-indigo-100/70 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/' : '/welcome')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-200"
              aria-label={isAuthenticated ? 'Back to map' : 'Back to home'}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <AppLogo decorative imgClassName="h-7 w-auto object-contain sm:h-8" />
            <span className="truncate text-base font-bold text-slate-900 sm:text-lg">Pricing</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pt-12 lg:pt-16">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600 sm:text-xs">
            Transparent pricing
          </p>

          <div className="mx-auto mt-4 flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-2 py-1.5 text-white shadow-lg shadow-blue-600/25 sm:inline-flex sm:flex-nowrap sm:px-2.5">
            <span className="rounded-full bg-slate-950/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-[11px]">
              Launching offer
            </span>
            <span className="text-sm font-extrabold tracking-tight sm:text-base">100% OFF</span>
            <span className="px-1 text-[11px] font-medium text-white/90 sm:text-xs">
              Limited time access for everyone
            </span>
          </div>

          <h1 className="mt-6 text-balance text-[1.65rem] font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-[2.65rem]">
            Pick a plan that grows with how you use the map
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
            Simple monthly options, smarter long-term savings. Choose a plan and get instant
            access to search, directions, place tools, and live sharing.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {['Instant access', 'Secure payments', 'Cancel anytime'].map((label) => (
              <span
                key={label}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 md:grid-cols-3 md:items-stretch md:gap-5">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-5 shadow-sm sm:p-6 ${
                plan.featured
                  ? 'border-blue-200 bg-gradient-to-b from-sky-50 to-white shadow-md ring-1 ring-blue-100 md:-translate-y-1'
                  : 'border-slate-200/90 bg-white'
              }`}
            >
              <h2 className="text-center text-lg font-bold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-center text-xs text-slate-500 sm:text-sm">{plan.tagline}</p>

              <p className="mt-5 flex flex-wrap items-end justify-center gap-x-2 gap-y-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-[2.6rem]">
                  Rs {plan.price}
                </span>
                <span className="pb-1 text-sm text-slate-400">
                  <span className="line-through">Rs {plan.was}</span>
                  <span className="text-slate-500"> {plan.period}</span>
                </span>
              </p>

              <ul className="mt-5 flex-1 space-y-2.5 text-left">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={claimOffer}
                className={`mt-6 min-h-[46px] w-full rounded-xl px-4 text-sm font-semibold transition active:scale-[0.99] ${
                  plan.featured
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 hover:bg-blue-700'
                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                }`}
              >
                Claim Launch Offer
              </button>
            </article>
          ))}
        </section>

        <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-slate-500 sm:mt-8">
          Launch pricing is Rs 0 for a limited time. Claiming the offer opens your map
          {isAuthenticated ? '' : ' after you create an account'}. No charge is taken on this screen.
        </p>
      </main>
    </div>
  )
}
