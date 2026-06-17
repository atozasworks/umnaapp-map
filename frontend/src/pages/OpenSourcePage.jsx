import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../components/AppLogo'
import {
  GITHUB_REPO_URL,
  GITHUB_CLONE_URL,
  devSetupSteps,
  prerequisites,
  techStack,
} from '../constants/openSource'

const GitHubIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
)

const ExternalLinkIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
)

const OpenSourcePage = () => {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const handleCopyClone = async () => {
    try {
      await navigator.clipboard.writeText(`git clone ${GITHUB_CLONE_URL}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1220] text-white overflow-x-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[#0b1220]" />
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[140%] h-[60%] bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.28),transparent_60%)]" />
        <div className="absolute top-[8%] right-[-8%] w-[420px] h-[420px] rounded-full bg-cyan-500/15 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[360px] h-[360px] rounded-full bg-violet-600/15 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1220]/75 backdrop-blur-2xl pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-14 sm:h-16">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="p-2 -ml-2 rounded-xl hover:bg-white/10 active:bg-white/15 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Back to map"
              >
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <AppLogo decorative imgClassName="h-7 sm:h-8 w-auto object-contain flex-shrink-0" />
                <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-sky-300 via-cyan-200 to-primary-300 bg-clip-text text-transparent truncate">
                  Open Source
                </span>
              </div>
            </div>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 font-semibold text-sm px-3 sm:px-5 py-2.5 min-h-[44px] shadow-lg hover:scale-[1.02] transition-all shrink-0"
            >
              <GitHubIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Go to GitHub</span>
              <span className="sm:hidden">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero + setup — dark section */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
              {/* Left column */}
              <div className="text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-emerald-300 mb-5 sm:mb-6">
                  <GitHubIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Open source · MIT License
                </span>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[2.75rem] font-extrabold tracking-tight leading-tight mb-4 sm:mb-5">
                  Run UMNAAPP on{' '}
                  <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-emerald-300 bg-clip-text text-transparent">
                    your own machine
                  </span>
                </h1>

                <p className="text-slate-400 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-8">
                  UMNAAPP (Universal Map &amp; Navigation Advisory App) is free and open source.
                  Clone from GitHub, configure your environment, and run the full stack locally —
                  React frontend, Node.js backend, PostgreSQL, and real-time map sync.
                </p>

                {/* Quick clone — mobile prominent */}
                <div className="rounded-2xl border border-white/10 bg-slate-800/60 backdrop-blur-sm p-4 sm:p-5 mb-6 sm:mb-8 text-left">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                    Quick clone
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3">
                    <code className="flex-1 text-xs sm:text-sm text-cyan-200 font-mono break-all leading-relaxed bg-slate-900/50 rounded-xl px-3 py-3 sm:py-2.5">
                      git clone {GITHUB_CLONE_URL}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyClone}
                      className={`shrink-0 rounded-xl px-4 py-3 sm:py-2.5 text-sm font-semibold transition-all min-h-[44px] ${
                        copied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-3 break-all">{GITHUB_REPO_URL}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-8">
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white text-slate-900 font-bold px-6 sm:px-8 py-3.5 sm:py-4 shadow-xl hover:scale-[1.02] hover:shadow-white/20 transition-all min-h-[48px]"
                  >
                    <GitHubIcon />
                    Go to GitHub
                    <ExternalLinkIcon className="opacity-60" />
                  </a>
                  <button
                    type="button"
                    onClick={() => navigate('/home')}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-white hover:bg-white/10 transition-all min-h-[48px]"
                  >
                    Back to map
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 sm:p-5 text-left">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                    Prerequisites
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-300">
                    {prerequisites.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-white/10">
                    Prefer Docker? Run{' '}
                    <code className="text-cyan-300 bg-slate-800/80 px-1.5 py-0.5 rounded text-[11px] sm:text-xs">
                      docker-compose up -d
                    </code>{' '}
                    after cloning.
                  </p>
                </div>
              </div>

              {/* Right column — setup steps */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between mb-1 sm:mb-2 px-1">
                  <h2 className="text-sm sm:text-base font-bold text-white">How to run locally</h2>
                  <span className="text-xs text-slate-500">{devSetupSteps.length} steps</span>
                </div>
                {devSetupSteps.map((step, i) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-white/10 bg-slate-800/60 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-white/10 bg-slate-800/80">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-400 text-xs font-bold text-white shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    </div>
                    <pre className="px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-cyan-200 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                      {step.code}
                    </pre>
                    {step.note && (
                      <p className="px-4 sm:px-5 pb-3 sm:pb-4 text-xs text-slate-400">{step.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tech stack + contribute — light section */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-slate-50 to-white text-slate-900 rounded-t-[2rem] sm:rounded-t-[3rem]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 sm:w-24 h-1 rounded-full bg-gradient-to-r from-transparent via-primary-400 to-transparent" aria-hidden />
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary-600 mb-3">
                Built with
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3 sm:mb-4">
                Modern full-stack mapping
              </h2>
              <p className="text-slate-600 text-sm sm:text-base lg:text-lg">
                Everything you need for real-time maps, place search, routing, and collaboration.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10 sm:mb-14">
              {techStack.map((item, i) => (
                <article
                  key={item}
                  className="group relative rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 overflow-hidden"
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                      ['from-sky-500 to-cyan-400', 'from-violet-500 to-purple-400', 'from-emerald-500 to-teal-400', 'from-amber-500 to-orange-400'][i]
                    }`}
                    aria-hidden
                  />
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4 text-primary-600 font-bold text-sm">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed">{item}</p>
                </article>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-5 sm:gap-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">Contribute</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-5">
                  Fork the repository, create a branch for your feature or fix, and open a pull request.
                  Bug reports and feature ideas are welcome on GitHub Issues.
                </p>
                <a
                  href={`${GITHUB_REPO_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-800 transition-colors"
                >
                  View issues on GitHub
                  <ExternalLinkIcon />
                </a>
              </div>

              <div className="relative overflow-hidden rounded-3xl px-6 sm:px-8 py-8 sm:py-10 text-center lg:text-left">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-sky-500 to-cyan-400" aria-hidden />
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/20 blur-3xl" aria-hidden />
                <div className="relative">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-3">
                    Star us on GitHub
                  </h3>
                  <p className="text-white/85 text-sm sm:text-base mb-6 max-w-sm mx-auto lg:mx-0">
                    Support the project by starring the repo and sharing it with others who love maps.
                  </p>
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-primary-700 font-bold px-6 sm:px-8 py-3.5 min-h-[48px] shadow-2xl hover:scale-[1.02] transition-all"
                  >
                    <GitHubIcon />
                    Go to GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white text-slate-900 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AppLogo decorative imgClassName="h-7 w-auto object-contain" />
              <span className="font-bold text-slate-800">UMNAAPP</span>
              <span className="text-slate-400 text-sm hidden sm:inline">· Open Source</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm font-medium">
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="text-slate-600 hover:text-primary-600 transition-colors min-h-[44px] px-2"
              >
                Back to map
              </button>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 transition-colors min-h-[44px] px-2"
              >
                <GitHubIcon className="w-4 h-4" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default OpenSourcePage
