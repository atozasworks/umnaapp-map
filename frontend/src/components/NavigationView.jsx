import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage, useTranslate } from '../lib/i18n'
import useVoiceNavigation from '../hooks/useVoiceNavigation'
import { shortDistance } from '../utils/navInstructions'
import { getSpeechController, isSpeechSupported } from '../utils/speech'

/** Direction arrow for the maneuver banner, selected by maneuver icon key. */
const ManeuverIcon = ({ iconKey, className = 'w-9 h-9' }) => {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    viewBox: '0 0 24 24',
  }
  switch (iconKey) {
    case 'left':
      return <svg {...common}><path d="M14 18l-6-6 6-6" /><path d="M8 12h8" /></svg>
    case 'right':
      return <svg {...common}><path d="M10 6l6 6-6 6" /><path d="M16 12H8" /></svg>
    case 'slight-left':
      return <svg {...common}><path d="M9 7H5v4" /><path d="M5 7l9 9v2" /></svg>
    case 'slight-right':
      return <svg {...common}><path d="M15 7h4v4" /><path d="M19 7l-9 9v2" /></svg>
    case 'sharp-left':
      return <svg {...common}><path d="M7 16l-3-3 3-3" /><path d="M4 13h7a4 4 0 004-4V5" /></svg>
    case 'sharp-right':
      return <svg {...common}><path d="M17 16l3-3-3-3" /><path d="M20 13h-7a4 4 0 01-4-4V5" /></svg>
    case 'uturn':
      return <svg {...common}><path d="M4 20V11a5 5 0 0110 0v3" /><path d="M18 14l-4 4-4-4" /></svg>
    case 'roundabout':
      return <svg {...common}><circle cx="12" cy="13" r="4" /><path d="M12 9V3" /><path d="M9 5l3-2 3 2" /></svg>
    case 'merge':
      return <svg {...common}><path d="M12 20v-6" /><path d="M12 14C12 9 8 7 6 5" /><path d="M12 14c0-5 4-7 6-9" /></svg>
    case 'fork':
      return <svg {...common}><path d="M12 20v-7" /><path d="M12 13L7 6" /><path d="M12 13l5-7" /></svg>
    case 'depart':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 9V3m0 0L9 6m3-3l3 3" /></svg>
    case 'arrive':
      return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" /></svg>
    default:
      return <svg {...common}><path d="M12 20V5" /><path d="M6 11l6-6 6 6" /></svg>
  }
}

const formatEtaClock = (durationSeconds) => {
  if (!Number.isFinite(durationSeconds)) return ''
  const arrival = new Date(Date.now() + durationSeconds * 1000)
  return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 60) return '< 1 min'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours} hr ${minutes} min`
  return `${minutes} min`
}

/**
 * Full-screen turn-by-turn navigation overlay.
 *
 * Renders the maneuver banner + trip footer, drives the map camera to follow
 * the user, keeps the screen awake, and exposes mute / recenter / exit. The
 * actual guidance + speech is handled by `useVoiceNavigation`.
 */
export default function NavigationView({
  mapRef,
  route,
  currentLocation,
  travelMode = 'driving',
  destinationName,
  onExit,
  onReroute,
}) {
  const { language } = useLanguage()
  const [muted, setMuted] = useState(false)
  const [following, setFollowing] = useState(true)
  const followingRef = useRef(true)
  const wakeLockRef = useRef(null)

  const tArrive = useTranslate('Arrive')
  const tMute = useTranslate('Mute')
  const tUnmute = useTranslate('Unmute')
  const tRecenter = useTranslate('Recenter')
  const tExit = useTranslate('Exit')
  const tThen = useTranslate('Then')
  const tArrived = useTranslate('You have arrived')
  const tRerouting = useTranslate('Rerouting…')
  const tEnd = useTranslate('End navigation')

  followingRef.current = following

  const { progress, repeatInstruction } = useVoiceNavigation({
    route,
    currentLocation,
    travelMode,
    language,
    enabled: true,
    muted,
    onReroute,
  })

  // Enter tilt/follow camera mode for the lifetime of this overlay.
  useEffect(() => {
    mapRef.current?.enterNavigationMode?.()
    return () => {
      mapRef.current?.exitNavigationMode?.()
    }
  }, [mapRef])

  // Keep the screen awake while navigating (best-effort; unsupported on some browsers).
  useEffect(() => {
    let cancelled = false
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && navigator.wakeLock?.request) {
          const lock = await navigator.wakeLock.request('screen')
          if (cancelled) {
            lock.release?.()
            return
          }
          wakeLockRef.current = lock
        }
      } catch {
        /* wake lock not available — navigation still works */
      }
    }
    requestWakeLock()

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      wakeLockRef.current?.release?.().catch(() => {})
      wakeLockRef.current = null
    }
  }, [])

  // Detect a *manual* pan so we can stop fighting the user and show "Recenter".
  // Only real user gestures carry `originalEvent`; our own easeTo() emits
  // move/rotate events without it, so they must not toggle follow mode
  // (doing so previously caused a setState feedback loop).
  useEffect(() => {
    const map = mapRef.current?.getMap?.()
    if (!map) return undefined
    const onUserGesture = (e) => {
      if (e?.originalEvent && followingRef.current) setFollowing(false)
    }
    map.on('dragstart', onUserGesture)
    map.on('rotatestart', onUserGesture)
    map.on('zoomstart', onUserGesture)
    return () => {
      map.off('dragstart', onUserGesture)
      map.off('rotatestart', onUserGesture)
      map.off('zoomstart', onUserGesture)
    }
  }, [mapRef])

  // Follow the user: recenter the camera as progress advances. Depend on the
  // primitive coordinates (not the progress object) so identical fixes don't
  // re-issue camera moves.
  const snapLng = progress?.snapped?.[0]
  const snapLat = progress?.snapped?.[1]
  const bearing = progress?.bearing
  useEffect(() => {
    if (!following || snapLng == null || snapLat == null) return
    mapRef.current?.updateNavigationCamera?.({
      center: [snapLng, snapLat],
      bearing,
      zoom: travelMode === 'walking' ? 18 : 17,
    })
  }, [snapLng, snapLat, bearing, following, mapRef, travelMode])

  const handleRecenter = useCallback(() => {
    setFollowing(true)
    if (snapLng != null && snapLat != null) {
      mapRef.current?.updateNavigationCamera?.({
        center: [snapLng, snapLat],
        bearing,
        zoom: travelMode === 'walking' ? 18 : 17,
        duration: 600,
      })
    }
  }, [snapLng, snapLat, bearing, mapRef, travelMode])

  const speechOn = isSpeechSupported()
  const arrived = progress?.arrived
  const distanceToManeuver = progress?.distanceToManeuver ?? 0

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] flex flex-col justify-between">
      {/* Top maneuver banner */}
      <div
        className="pointer-events-auto mx-2 mt-2 rounded-2xl bg-[#1a73e8] text-white shadow-2xl sm:mx-3 sm:mt-3"
        style={{ marginTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center">
            {arrived ? (
              <ManeuverIcon iconKey="arrive" className="h-10 w-10 text-white" />
            ) : (
              <ManeuverIcon iconKey={progress?.iconKey} className="h-10 w-10 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {progress?.isOffRoute ? (
              <p className="truncate text-lg font-semibold">{tRerouting}</p>
            ) : arrived ? (
              <p className="truncate text-lg font-semibold">{tArrived}</p>
            ) : (
              <>
                <p className="text-2xl font-bold leading-tight">
                  {shortDistance(distanceToManeuver)}
                </p>
                <p className="truncate text-sm font-medium text-blue-50">
                  {progress?.instruction || '…'}
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={repeatInstruction}
            disabled={!speechOn || muted}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 disabled:opacity-40"
            aria-label="Repeat instruction"
            title="Repeat instruction"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 10a8 8 0 00-14.9-3M4 14a8 8 0 0014.9 3" />
            </svg>
          </button>
        </div>
        {/* "Then" preview of the following maneuver */}
        {!arrived && !progress?.isOffRoute && progress?.nextInstruction && (
          <div className="flex items-center gap-2 border-t border-white/15 px-4 py-1.5 text-blue-50">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{tThen}</span>
            <ManeuverIcon iconKey={progress.nextIconKey} className="h-4 w-4 text-white" />
            <span className="truncate text-sm">{progress.nextInstruction}</span>
          </div>
        )}
      </div>

      {/* Recenter button (only while the user has panned away) */}
      {!following && (
        <div className="pointer-events-none flex justify-center">
          <button
            type="button"
            onClick={handleRecenter}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#1a73e8] shadow-xl ring-1 ring-black/5"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {tRecenter}
          </button>
        </div>
      )}

      {/* Bottom trip footer */}
      <div
        className="pointer-events-auto mx-2 mb-2 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:mx-3 sm:mb-3"
        style={{ marginBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#188038]">
                {formatDuration(progress?.durationRemaining)}
              </span>
              <span className="text-sm text-slate-500">
                {shortDistance(progress?.distanceRemaining ?? 0)}
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">
              {tArrive} {formatEtaClock(progress?.durationRemaining)}
              {destinationName ? ` · ${destinationName}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setMuted((m) => {
                if (m) getSpeechController().unlock()
                return !m
              })
            }
            disabled={!speechOn}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
              muted ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-[#1a73e8]'
            }`}
            aria-label={muted ? tUnmute : tMute}
            title={muted ? tUnmute : tMute}
          >
            {muted ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M23 9l-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={onExit}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[#ea4335] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#d33426]"
            aria-label={tEnd}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {tExit}
          </button>
        </div>
      </div>
    </div>
  )
}
