import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../components/AppLogo'
import { useAuth } from '../contexts/AuthContext'

const features = [
  {
    title: 'Interactive maps',
    description: 'Pan, zoom, and explore with buttery-smooth rendering.',
    gradient: 'from-sky-500 to-cyan-400',
    glow: 'group-hover:shadow-sky-500/25',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    title: 'Secure sign-in',
    description: 'Email OTP and Google OAuth — fast and protected.',
    gradient: 'from-violet-500 to-purple-400',
    glow: 'group-hover:shadow-violet-500/25',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Real-time sync',
    description: 'Markers and places update instantly across sessions.',
    gradient: 'from-amber-500 to-orange-400',
    glow: 'group-hover:shadow-amber-500/25',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Save places',
    description: 'Build your personal map library with rich place details.',
    gradient: 'from-emerald-500 to-teal-400',
    glow: 'group-hover:shadow-emerald-500/25',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const stats = [
  { value: 'Real-time', label: 'Live map sync' },
  { value: 'Secure', label: 'OTP & Google' },
  { value: 'Simple', label: 'Minutes to start' },
]

const steps = [
  { num: '01', title: 'Create account', text: 'Register with email or Google in under a minute.' },
  { num: '02', title: 'Explore the map', text: 'Search, navigate, and pin locations that matter.' },
  { num: '03', title: 'Sync & share', text: 'Collaborate with live updates across your team.' },
]

const LandingPage = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home')
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1220] text-white overflow-x-hidden">
      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[#0b1220]" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[140%] h-[70%] bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.35),transparent_60%)]" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/20 blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-[20%] left-[-15%] w-[400px] h-[400px] rounded-full bg-primary-600/25 blur-[90px] animate-float" />
        <div className="absolute top-[40%] right-[20%] w-[280px] h-[280px] rounded-full bg-violet-600/15 blur-[80px] animate-float-delayed" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1220]/60 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-[4.25rem]">
            <Link to="/" className="flex items-center gap-2.5 min-w-0 group" aria-label="UMNAAPP home">
              <AppLogo decorative imgClassName="h-8 w-auto max-h-9 object-contain flex-shrink-0 transition-transform group-hover:scale-110 drop-shadow-lg" />
              <span className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-sky-300 via-cyan-200 to-primary-300 bg-clip-text text-transparent truncate">
                UMNAAPP
              </span>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="hidden sm:inline-flex text-sm font-medium text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 via-sky-400 to-cyan-400 px-5 sm:px-6 py-2.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-sky-500/30 hover:shadow-sky-400/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Get started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 lg:pt-24 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-14 lg:gap-10 items-center">
              <div className="text-center lg:text-left animate-fade-in">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-xs sm:text-sm font-medium text-sky-200 mb-8 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                  </span>
                  Map-first · Real-time · Secure
                </div>

                <h1 className="text-[2.75rem] sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
                  <span className="text-white">Your world,</span>
                  <br />
                  <span
                    className="bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent"
                    style={{ backgroundSize: '200% auto' }}
                  >
                    beautifully mapped
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10">
                  Discover, save, and collaborate on locations with a stunning map experience — built for speed and clarity.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                  <Link
                    to="/register"
                    className="group relative inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 via-sky-400 to-cyan-400 px-8 py-4 text-base font-bold text-white shadow-xl shadow-sky-500/25 hover:shadow-sky-400/40 hover:scale-[1.02] transition-all overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]" aria-hidden />
                    <span className="relative">Get Started</span>
                    <svg className="relative w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all"
                  >
                    Sign in
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
                  {stats.map((s) => (
                    <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-4 text-center">
                      <p className="text-sm sm:text-base font-bold text-cyan-300">{s.value}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero visual */}
              <div className="relative animate-slide-up">
                <div className="absolute -inset-8 bg-gradient-to-br from-sky-500/30 via-cyan-500/10 to-violet-500/20 rounded-[2.5rem] blur-3xl animate-pulse-glow" aria-hidden />

                {/* Floating badges */}
                <div className="absolute -left-2 sm:-left-6 top-1/4 z-20 animate-float hidden sm:block">
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 backdrop-blur-xl px-4 py-3 shadow-lg shadow-emerald-500/10">
                    <p className="text-xs font-bold text-emerald-300">● Live</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">3 users online</p>
                  </div>
                </div>
                <div className="absolute -right-2 sm:-right-4 bottom-1/4 z-20 animate-float-delayed hidden sm:block">
                  <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 backdrop-blur-xl px-4 py-3 shadow-lg shadow-violet-500/10">
                    <p className="text-xs font-bold text-violet-300">12 places</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">saved today</p>
                  </div>
                </div>

                <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-slate-800/90 to-slate-900/95 shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/10">
                  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/10 bg-slate-900/80">
                    <span className="w-3 h-3 rounded-full bg-red-500/90 shadow-sm shadow-red-500/50" />
                    <span className="w-3 h-3 rounded-full bg-amber-400/90" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400/90" />
                    <span className="ml-3 flex-1 max-w-[200px] h-6 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-500 flex items-center px-3">
                      umnaapp.com/map
                    </span>
                  </div>

                  <div className="aspect-[4/3] relative overflow-hidden">
                    {/* Map canvas */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-[#1a2744] to-slate-900">
                      <svg className="absolute inset-0 w-full h-full opacity-60" aria-hidden>
                        <defs>
                          <linearGradient id="road-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        <path d="M0 180 Q120 120 240 160 T480 140" fill="none" stroke="url(#road-grad)" strokeWidth="3" />
                        <path d="M80 0 Q200 80 280 200 T520 320" fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth="2" />
                        <path d="M400 0 L350 320" fill="none" stroke="rgba(56,189,248,0.1)" strokeWidth="2" />
                        <circle cx="55%" cy="48%" r="80" fill="rgba(14,165,233,0.08)" />
                        <circle cx="55%" cy="48%" r="40" fill="rgba(14,165,233,0.05)" />
                      </svg>

                      {/* Animated route */}
                      <svg className="absolute inset-0 w-full h-full" aria-hidden>
                        <path
                          d="M 80 220 Q 180 180 260 200 T 420 170"
                          fill="none"
                          stroke="url(#route-line)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="8 6"
                          className="opacity-90"
                          style={{ animation: 'dash 20s linear infinite' }}
                        />
                        <defs>
                          <linearGradient id="route-line" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="50%" stopColor="#22d3ee" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    {/* Center pin */}
                    <div className="absolute left-[52%] top-[42%] -translate-x-1/2 -translate-y-1/2 z-10">
                      <span className="relative flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
                        <span className="relative flex h-5 w-5 rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 ring-4 ring-slate-900 shadow-lg shadow-cyan-500/50" />
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none">
                      <div className="flex justify-end">
                        <div className="rounded-xl border border-white/15 bg-slate-900/80 backdrop-blur-xl px-3 py-2 flex items-center gap-2 shadow-xl">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-medium text-slate-200">Syncing…</span>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <div className="rounded-xl border border-white/10 bg-slate-900/85 backdrop-blur-xl p-3 flex gap-3 max-w-[78%] shadow-xl animate-float">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">Marina Bay</p>
                            <p className="text-[10px] text-slate-400">Saved · just now</p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-900/85 backdrop-blur-xl p-3 flex gap-3 max-w-[72%] ml-auto shadow-xl animate-float-delayed">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-white">Route · 4.2 km</p>
                            <p className="text-[10px] text-emerald-400">12 min drive</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features — light contrast band */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 rounded-t-[3rem] bg-gradient-to-b from-slate-50 to-white text-slate-900">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-gradient-to-r from-transparent via-primary-400 to-transparent" aria-hidden />
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary-600 mb-3">Features</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                Power tools, zero clutter
              </h2>
              <p className="text-slate-600 text-lg">Everything you need to explore, secure, and sync — in one beautiful app.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className={`group relative rounded-2xl border border-slate-200/80 bg-white p-6 hover:-translate-y-1 hover:shadow-xl ${feature.glow} transition-all duration-300 overflow-hidden`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient}`} aria-hidden />
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-white text-slate-900">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary-600 mb-3">How it works</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">Three steps to your first pin</h2>
              <p className="text-slate-600 text-lg">From signup to saved place — faster than you expect.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {steps.map((step, i) => (
                <div
                  key={step.num}
                  className="relative rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center hover:shadow-lg hover:border-primary-200 transition-all duration-300"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-400 text-white text-xl font-bold shadow-lg shadow-primary-500/25 mb-5">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.text}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-6 text-primary-300" aria-hidden>
                      <svg fill="currentColor" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" /></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="relative overflow-hidden rounded-[2rem] px-8 py-14 sm:px-14 sm:py-20 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-sky-500 to-cyan-400" aria-hidden />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wOCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" aria-hidden />
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/20 blur-3xl" aria-hidden />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-cyan-300/30 blur-3xl" aria-hidden />

              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
                  Ready to map your world?
                </h2>
                <p className="text-white/85 text-lg max-w-lg mx-auto mb-10">
                  Join thousands exploring smarter. Free to start — no credit card needed.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-primary-700 font-bold px-10 py-4 shadow-2xl hover:scale-[1.02] hover:shadow-white/20 transition-all"
                  >
                    Create  account
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-2xl border-2 border-white/50 text-white font-bold px-10 py-4 hover:bg-white/15 transition-all"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 text-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <AppLogo decorative imgClassName="h-8 w-auto object-contain group-hover:scale-105 transition-transform" />
              <span className="font-bold text-lg bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                UMNAAPP
              </span>
            </Link>
            <p className="text-sm text-slate-500 order-3 sm:order-none">
              &copy; {new Date().getFullYear()} UMNAAPP. All rights reserved.
            </p>
            <div className="flex gap-8 text-sm font-medium">
              <Link to="/login" className="text-slate-600 hover:text-primary-600 transition-colors">
                Sign in
              </Link>
              <Link to="/register" className="text-primary-600 hover:text-primary-700 transition-colors">
                Register
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -1000; }
        }
      `}</style>
    </div>
  )
}

export default LandingPage
