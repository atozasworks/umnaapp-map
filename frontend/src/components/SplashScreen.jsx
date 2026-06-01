import { useState, useEffect, useRef } from 'react'
import logoUrl from '../../umnaapplogo.png'

const TOTAL_DURATION = 8000
const SCREEN_DURATION = 2000

const SEARCH_TEXTS = [
  'Hidden waterfalls near me',
  'Best temples nearby',
  'Top-rated hotels',
]

function AnimatedMarkers() {
  const markers = [
    { top: '25%', left: '20%', delay: 0 },
    { top: '40%', left: '65%', delay: 300 },
    { top: '60%', left: '35%', delay: 600 },
    { top: '30%', left: '80%', delay: 900 },
    { top: '70%', left: '50%', delay: 1200 },
    { top: '50%', left: '15%', delay: 400 },
    { top: '35%', left: '45%', delay: 800 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden">
      {markers.map((m, i) => (
        <div
          key={i}
          className="absolute animate-marker-drop"
          style={{
            top: m.top,
            left: m.left,
            animationDelay: `${m.delay}ms`,
          }}
        >
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-full shadow-lg flex items-center justify-center animate-pulse-marker">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500/30 rounded-full animate-ping" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TypewriterSearch() {
  const [textIndex, setTextIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const current = SEARCH_TEXTS[textIndex]
    let timeout

    if (!isDeleting && charIndex < current.length) {
      timeout = setTimeout(() => setCharIndex(c => c + 1), 60)
    } else if (!isDeleting && charIndex === current.length) {
      timeout = setTimeout(() => setIsDeleting(true), 800)
    } else if (isDeleting && charIndex > 0) {
      timeout = setTimeout(() => setCharIndex(c => c - 1), 30)
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false)
      setTextIndex(i => (i + 1) % SEARCH_TEXTS.length)
    }

    return () => clearTimeout(timeout)
  }, [charIndex, isDeleting, textIndex])

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/95 backdrop-blur-sm rounded-full px-5 py-3 shadow-2xl border border-gray-200 flex items-center gap-3">
        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-gray-700 text-sm font-medium truncate">
          {SEARCH_TEXTS[textIndex].slice(0, charIndex)}
          <span className="animate-blink text-blue-500">|</span>
        </span>
      </div>
    </div>
  )
}

function CommunityPlaces() {
  const places = [
    { name: 'Secret Beach', img: 'from-cyan-400 to-blue-500', top: '20%', left: '15%', delay: 0 },
    { name: 'Mountain Temple', img: 'from-orange-400 to-red-500', top: '35%', left: '60%', delay: 400 },
    { name: 'Hidden Garden', img: 'from-green-400 to-emerald-500', top: '55%', left: '30%', delay: 800 },
    { name: 'Sunset Point', img: 'from-pink-400 to-purple-500', top: '45%', left: '75%', delay: 1200 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden">
      {places.map((p, i) => (
        <div
          key={i}
          className="absolute animate-place-appear"
          style={{ top: p.top, left: p.left, animationDelay: `${p.delay}ms` }}
        >
          <div className="relative group">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.img} shadow-lg flex items-center justify-center`}>
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/40 rounded-full animate-ping" />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900/80 text-white text-[10px] px-2 py-0.5 rounded-full opacity-0 animate-fade-in-delayed" style={{ animationDelay: `${p.delay + 600}ms` }}>
              {p.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SplashScreen({ onComplete }) {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    const screenTimers = [
      setTimeout(() => setCurrentScreen(1), SCREEN_DURATION),
      setTimeout(() => setCurrentScreen(2), SCREEN_DURATION * 2),
      setTimeout(() => setCurrentScreen(3), SCREEN_DURATION * 3),
    ]
    return () => screenTimers.forEach(clearTimeout)
  }, [])

  const handleSkip = () => {
    setIsExiting(true)
    setTimeout(onComplete, 500)
  }

  const handleStart = () => {
    setIsExiting(true)
    setTimeout(onComplete, 500)
  }

  return (
    <div className={`fixed inset-0 z-[9999] transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Map-like background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Grid pattern to simulate map */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }} />
        </div>
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      {/* Skip button */}
      {currentScreen < 3 && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-50 text-white/60 hover:text-white text-sm font-medium px-3 py-1.5 rounded-full border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all"
        >
          Skip
        </button>
      )}

      {/* Screen indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-50">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === currentScreen ? 'w-8 bg-white' : 'w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Screen 1: Welcome with animated markers */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${
        currentScreen === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}>
        <AnimatedMarkers />
        <div className="relative z-10 text-center px-6">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 animate-fade-in-up">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">UmnaApp Maps</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-200/80 animate-fade-in-up-delayed">
            Explore places beyond the ordinary
          </p>
        </div>
      </div>

      {/* Screen 2: Search animation */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${
        currentScreen === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}>
        <div className="relative z-10 text-center px-6 w-full">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-8 animate-fade-in-up">
            Search Anything. <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">Discover Everything.</span>
          </h2>
          <TypewriterSearch />
        </div>
      </div>

      {/* Screen 3: Community places */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${
        currentScreen === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}>
        <CommunityPlaces />
        <div className="relative z-10 text-center px-6">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 animate-fade-in-up">
            Built by the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Community</span>
          </h2>
          <p className="text-lg text-blue-200/80 animate-fade-in-up-delayed">
            Discover places shared by real people
          </p>
        </div>
      </div>

      {/* Final Screen: Logo + CTA */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${
        currentScreen === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}>
        <div className="relative z-10 text-center px-6">
          <div className="mb-6 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl mb-4">
              <img src={logoUrl} alt="UmnaApp" className="w-16 h-16 object-contain" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3 animate-fade-in-up">
            <span className="text-2xl">📍</span>
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              UmnaApp Maps
            </h2>
          </div>
          <p className="text-lg text-blue-200/70 mb-10 animate-fade-in-up-delayed tracking-wider">
            Explore &bull; Discover &bull; Contribute
          </p>
          <button
            onClick={handleStart}
            className="animate-fade-in-up-delayed-2 group relative inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-full shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
          >
            Start Exploring
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-100" />
          </button>
        </div>
      </div>
    </div>
  )
}
