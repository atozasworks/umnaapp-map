import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCumulativeDistances,
  nearestVertexIndex,
  routeBearingAhead,
  snapToRoute,
} from '../utils/navigationGeo'
import {
  buildManeuverShort,
  maneuverIconKey,
} from '../utils/navInstructions'
import {
  buildAnnouncementL,
  buildManeuverTextL,
  navPhrase,
  startingPhrase,
} from '../utils/navI18n'
import { getSpeechController } from '../utils/speech'

/**
 * Per-mode tuning. Announcement phases are distances (meters) before a maneuver
 * at which a spoken prompt fires. The smallest, `immediate`, prompt drops the
 * distance prefix ("Turn right" instead of "In 50 meters, turn right").
 */
const MODE_PROFILES = {
  driving: {
    phases: [800, 400, 150, { dist: 45, immediate: true }],
    offRouteMeters: 50,
    arriveMeters: 30,
  },
  bus: {
    phases: [800, 400, 150, { dist: 45, immediate: true }],
    offRouteMeters: 60,
    arriveMeters: 35,
  },
  two_wheeler: {
    phases: [600, 300, 120, { dist: 40, immediate: true }],
    offRouteMeters: 45,
    arriveMeters: 25,
  },
  cycling: {
    phases: [400, 200, 90, { dist: 35, immediate: true }],
    offRouteMeters: 40,
    arriveMeters: 20,
  },
  walking: {
    phases: [200, 90, { dist: 20, immediate: true }],
    offRouteMeters: 30,
    arriveMeters: 15,
  },
}

const normalizePhases = (phases) =>
  phases
    .map((p) => (typeof p === 'number' ? { dist: p, immediate: false } : p))
    .sort((a, b) => b.dist - a.dist)

const REROUTE_COOLDOWN_MS = 10000
const OFF_ROUTE_HITS_REQUIRED = 4

/**
 * Turn-by-turn voice navigation engine.
 *
 * Consumes a route (OSRM-style `steps` + `geometry`) and a live GPS location,
 * snaps the user to the route, advances through maneuvers, speaks prompts at
 * the right moments, detects arrival, and signals when a reroute is needed.
 *
 * @param {object}   params
 * @param {object}   params.route           route data ({ geometry, steps, distance, duration })
 * @param {object}   params.currentLocation { lat, lng, speed?, heading?, accuracy? }
 * @param {string}   params.travelMode      driving|two_wheeler|cycling|walking|bus
 * @param {string}   params.language        app language code (for voice locale)
 * @param {boolean}  params.enabled         navigation active
 * @param {boolean}  params.muted           suppress speech (UI still updates)
 * @param {Function} params.onReroute       called with currentLocation when off-route
 * @param {Function} params.onArrive        called once when the destination is reached
 */
export default function useVoiceNavigation({
  route,
  currentLocation,
  travelMode = 'driving',
  language = 'en',
  enabled = false,
  muted = false,
  onReroute,
  onArrive,
}) {
  const speech = useMemo(() => getSpeechController(), [])

  const [progress, setProgress] = useState(null)

  // Route-derived data, recomputed whenever the route changes.
  const routeDataRef = useRef(null)
  // Announcement bookkeeping.
  const firedRef = useRef(new Set())
  const startedRef = useRef(false)
  const arrivedRef = useRef(false)
  const offRouteHitsRef = useRef(0)
  const lastRerouteAtRef = useRef(0)
  // Stable refs so the progression effect depends only on GPS + enabled, never
  // on object identities that change across renders (avoids update-depth loops).
  const onRerouteRef = useRef(onReroute)
  const onArriveRef = useRef(onArrive)
  const travelModeRef = useRef(travelMode)
  const langRef = useRef(language)
  const announceRef = useRef(null)
  onRerouteRef.current = onReroute
  onArriveRef.current = onArrive
  travelModeRef.current = travelMode
  langRef.current = language

  // Keep the speech locale in sync with the app language.
  useEffect(() => {
    speech.setLanguage(language)
  }, [speech, language])

  useEffect(() => {
    speech.setMuted(muted)
  }, [speech, muted])

  // (Re)build route-derived structures when the route changes.
  useEffect(() => {
    const coords = route?.geometry?.coordinates
    if (!enabled || !Array.isArray(coords) || coords.length < 2) {
      routeDataRef.current = null
      return
    }

    const cum = buildCumulativeDistances(coords)
    const total = cum[cum.length - 1]

    // Map each maneuver to its along-route distance using the geometry vertices,
    // so the user's snapped progress and maneuver positions share one scale.
    const steps = Array.isArray(route.steps) ? route.steps : []
    const maneuvers = steps
      .map((step) => {
        const loc = step?.maneuver?.location
        if (!Array.isArray(loc) || loc.length < 2) return null
        const idx = nearestVertexIndex(loc, coords)
        return {
          step,
          along: cum[idx],
          text: buildManeuverTextL(step, language),
          short: buildManeuverShort(step),
          iconKey: maneuverIconKey(step),
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.along - b.along)

    routeDataRef.current = {
      coords,
      cum,
      total,
      maneuvers,
      duration: Number.isFinite(route.duration) ? route.duration : null,
    }

    // Fresh route => reset announcement state and re-arm the start prompt.
    firedRef.current = new Set()
    startedRef.current = false
    arrivedRef.current = false
    offRouteHitsRef.current = 0
    speech.reset()
  }, [route, enabled, speech, language])

  // Stop speech and clear progress when navigation turns off.
  useEffect(() => {
    if (!enabled) {
      speech.cancel()
      setProgress(null)
      routeDataRef.current = null
      startedRef.current = false
      arrivedRef.current = false
    }
  }, [enabled, speech])

  announceRef.current = (maneuver, phase, distanceToManeuver) => {
    const text = buildAnnouncementL(
      maneuver.step,
      phase.immediate ? distanceToManeuver : phase.dist,
      phase.immediate,
      langRef.current
    )
    speech.speak(text, { priority: phase.immediate })
  }

  // Main progression: runs on every GPS update while navigating.
  useEffect(() => {
    const data = routeDataRef.current
    if (!enabled || !data || !currentLocation) return
    if (!Number.isFinite(currentLocation.lat) || !Number.isFinite(currentLocation.lng)) return

    const { coords, cum, total, maneuvers, duration } = data
    const loc = [currentLocation.lng, currentLocation.lat]

    const snap = snapToRoute(loc, coords, cum)
    const distanceAlong = snap.distanceAlong
    const distanceRemaining = Math.max(0, total - distanceAlong)

    const profile = MODE_PROFILES[travelModeRef.current] || MODE_PROFILES.driving
    const phases = normalizePhases(profile.phases)

    // Find the upcoming maneuver (first one ahead of our along-route progress).
    let upcomingIndex = maneuvers.findIndex((m) => m.along > distanceAlong + 5)
    if (upcomingIndex === -1) upcomingIndex = maneuvers.length - 1
    const upcoming = maneuvers[upcomingIndex]
    const prevAlong = upcomingIndex > 0 ? maneuvers[upcomingIndex - 1].along : 0

    const distanceToManeuver = upcoming ? Math.max(0, upcoming.along - distanceAlong) : distanceRemaining
    const segLen = upcoming ? upcoming.along - prevAlong : 0

    // Proportional remaining time (no per-segment timing available client-side).
    const durationRemaining =
      total > 0 && Number.isFinite(duration)
        ? Math.round(duration * (distanceRemaining / total))
        : null

    // --- Off-route detection + reroute signal ---
    let isOffRoute = false
    if (snap.distanceToRoute > profile.offRouteMeters) {
      offRouteHitsRef.current += 1
      if (offRouteHitsRef.current >= OFF_ROUTE_HITS_REQUIRED) {
        isOffRoute = true
        const now = Date.now()
        if (now - lastRerouteAtRef.current > REROUTE_COOLDOWN_MS) {
          lastRerouteAtRef.current = now
          speech.speak(navPhrase('rerouting', langRef.current), { priority: true })
          onRerouteRef.current?.(currentLocation)
        }
      }
    } else {
      offRouteHitsRef.current = 0
    }

    // --- Arrival detection ---
    const reachedEnd =
      distanceRemaining <= profile.arriveMeters ||
      (upcoming &&
        upcomingIndex === maneuvers.length - 1 &&
        distanceToManeuver <= profile.arriveMeters)
    if (reachedEnd && !arrivedRef.current) {
      arrivedRef.current = true
      speech.speak(navPhrase('arrived', langRef.current), { priority: true })
      onArriveRef.current?.()
    }

    // --- Spoken guidance ---
    if (!isOffRoute && !arrivedRef.current && upcoming) {
      // Initial prompt right after navigation starts.
      if (!startedRef.current) {
        startedRef.current = true
        const intro = buildAnnouncementL(upcoming.step, distanceToManeuver, false, langRef.current)
        speech.speak(startingPhrase(intro, langRef.current), { priority: true })
        // Mark far phases as fired so we don't immediately repeat them.
        phases.forEach((p) => {
          if (!p.immediate && distanceToManeuver <= p.dist) {
            firedRef.current.add(`${upcomingIndex}:${p.dist}`)
          }
        })
      } else {
        const eligible = phases.filter((p) => p.immediate || p.dist <= segLen - 25)
        for (let k = 0; k < eligible.length; k += 1) {
          const phase = eligible[k]
          if (distanceToManeuver <= phase.dist) {
            const key = `${upcomingIndex}:${phase.dist}`
            if (!firedRef.current.has(key)) {
              announceRef.current?.(upcoming, phase, distanceToManeuver)
              for (let j = 0; j <= k; j += 1) {
                firedRef.current.add(`${upcomingIndex}:${eligible[j].dist}`)
              }
              break
            }
          }
        }
      }
    }

    // --- Camera bearing ---
    const speed = Number.isFinite(currentLocation.speed) ? currentLocation.speed : 0
    const heading =
      speed > 1.2 && Number.isFinite(currentLocation.heading)
        ? currentLocation.heading
        : routeBearingAhead(coords, snap.segmentIndex)

    const nextManeuver = maneuvers[upcomingIndex + 1] || null

    setProgress({
      instruction: upcoming?.text || '',
      shortInstruction: upcoming?.short || '',
      iconKey: upcoming?.iconKey || 'straight',
      roadName: upcoming?.step?.name || '',
      distanceToManeuver,
      distanceRemaining,
      durationRemaining,
      nextInstruction: nextManeuver?.text || '',
      nextIconKey: nextManeuver?.iconKey || null,
      isOffRoute,
      arrived: arrivedRef.current,
      snapped: snap.snapped,
      bearing: heading,
      segmentIndex: snap.segmentIndex,
    })
    // Depend only on GPS + enabled. Everything else is read from refs so this
    // effect can never re-run on a render-only change (prevents update loops).
  }, [currentLocation, enabled, speech])

  const repeatInstruction = useCallback(() => {
    if (progress?.instruction) {
      speech.speak(`${progress.instruction}.`, { priority: true })
    }
  }, [progress, speech])

  return { progress, repeatInstruction }
}
