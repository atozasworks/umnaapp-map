import { Link } from 'react-router-dom'
import AppLogo from '../AppLogo'

const highlights = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    title: 'Interactive maps',
    text: 'Explore and save places with smooth, real-time rendering.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure sign-in',
    text: 'Email OTP and Google — fast, protected access.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Real-time sync',
    text: 'Your pins and places update instantly everywhere.',
  },
]

export function AuthError({ message }) {
  if (!message) return null
  return (
    <div className="auth-error-banner" role="alert">
      <svg className="w-5 h-5 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  )
}

export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-white/10" />
      </div>
      <div className="relative flex justify-center">
        <span className="auth-divider-label">Or continue with</span>
      </div>
    </div>
  )
}

export function GoogleSignInButton({ onClick, label = 'Continue with Google' }) {
  return (
    <button type="button" onClick={onClick} className="auth-google-btn">
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      <span>{label}</span>
    </button>
  )
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      {/* Aurora background */}
      <div className="auth-page-bg" aria-hidden>
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

      {/* Top nav */}
      <header className="auth-page-header safe-area-inset">
        <Link to="/" className="auth-back-link" aria-label="Back to home">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Home</span>
        </Link>
        <Link to="/" className="auth-header-logo group" aria-label="UMNAAPP home">
          <AppLogo decorative imgClassName="h-7 sm:h-8 w-auto object-contain flex-shrink-0 transition-transform group-hover:scale-105" />
          <span className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-sky-300 via-cyan-200 to-primary-300 bg-clip-text text-transparent">
            UMNAAPP
          </span>
        </Link>
        <div className="w-[72px] sm:w-[88px]" aria-hidden />
      </header>

      <main className="auth-page-main safe-area-inset">
        <div className="auth-page-grid">
          {/* Branding panel — desktop only */}
          <aside className="auth-brand-panel" aria-hidden="true">
            <div className="auth-brand-content">
              <div className="auth-brand-visual">
                <div className="auth-map-preview">
                  <div className="auth-map-pin auth-map-pin--1" />
                  <div className="auth-map-pin auth-map-pin--2" />
                  <div className="auth-map-pin auth-map-pin--3" />
                  <div className="auth-map-center">
                    <div className="auth-map-center-icon">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="auth-brand-title">Your world, mapped beautifully</h2>
              <p className="auth-brand-subtitle">
                Discover places, save favorites, and collaborate in real time — all in one powerful map app.
              </p>

              <ul className="auth-brand-list">
                {highlights.map((item) => (
                  <li key={item.title} className="auth-brand-item">
                    <span className="auth-brand-icon">{item.icon}</span>
                    <div>
                      <p className="auth-brand-item-title">{item.title}</p>
                      <p className="auth-brand-item-text">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Form panel */}
          <section className="auth-form-panel">
            <div className="auth-card animate-slide-up">
              <div className="auth-card-header">
                <h1 className="auth-card-title">{title}</h1>
                {subtitle && <p className="auth-card-subtitle">{subtitle}</p>}
              </div>

              {children}

              {footer && <div className="auth-card-footer">{footer}</div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
