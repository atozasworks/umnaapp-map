/**
 * Travel-mode routing without Google APIs.
 * Uses OSRM profiles where available and realistic speed models per mode.
 */

import { coordPairDistanceMeters } from './routeHelpers.js'

/** Typical travel speeds (m/s) for mixed urban/suburban India. */
const MODE_SPEED_MPS = {
  walking: 1.25, // ~4.5 km/h
  cycling: 4.17, // ~15 km/h
  two_wheeler: 11.5, // ~41 km/h on open roads
  driving: 8.33, // ~30 km/h urban average
  bus: 4.72, // ~17 km/h incl. stops
  train: 13.89, // ~50 km/h regional incl. stops
}

/**
 * Max average speed (m/s) that is still plausible per mode.
 * Above this, OSRM almost certainly returned the wrong profile (e.g. driving times for walk).
 */
const MAX_PLAUSIBLE_SPEED_MPS = {
  walking: 1.8, // ~6.5 km/h — brisk walk ceiling
  cycling: 8.5, // ~30 km/h — fast cycle ceiling
  two_wheeler: 25,
  bus: 16,
  driving: 45,
  train: 35,
}

const TRAIN_DISTANCE_FACTOR = 1.32
const TRAIN_ACCESS_SECONDS = 14 * 60
const TRAIN_TRANSFER_SECONDS = 6 * 60

const OSRM_PROFILE_ALIASES = {
  walking: ['walking', 'foot'],
  cycling: ['cycling', 'bike'],
  driving: ['driving', 'car'],
  two_wheeler: ['driving', 'car'],
  bus: ['driving', 'car'],
}

export function osrmProfileFor(appProfile) {
  switch (appProfile) {
    case 'walking':
      return 'walking'
    case 'cycling':
      return 'cycling'
    case 'train':
      return null
    case 'two_wheeler':
    case 'bus':
    case 'driving':
    default:
      return 'driving'
  }
}

export function osrmProfileCandidates(appProfile) {
  const base = osrmProfileFor(appProfile)
  if (!base) return []
  return OSRM_PROFILE_ALIASES[appProfile] || OSRM_PROFILE_ALIASES[base] || [base]
}

function impliedSpeedMps(distanceMeters, durationSeconds) {
  if (!distanceMeters || !durationSeconds || durationSeconds <= 0) return Infinity
  return distanceMeters / durationSeconds
}

export function isDurationPlausible(distanceMeters, durationSeconds, profile) {
  const maxSpeed = MAX_PLAUSIBLE_SPEED_MPS[profile]
  if (!maxSpeed || !distanceMeters || !durationSeconds) return false
  return impliedSpeedMps(distanceMeters, durationSeconds) <= maxSpeed
}

function rescaleRouteDuration(route, newDuration) {
  const oldDuration = route.duration || newDuration
  const ratio = oldDuration > 0 ? newDuration / oldDuration : 1
  return {
    ...route,
    duration: newDuration,
    legs: (route.legs || []).map((leg) => ({
      ...leg,
      duration: Math.max(1, Math.round((leg.duration ?? 0) * ratio)),
    })),
  }
}

function busWaitSeconds(distanceMeters) {
  return Math.min(900, Math.round(240 + distanceMeters / 650))
}

function durationFromDistance(distanceMeters, profile) {
  const speed = MODE_SPEED_MPS[profile] ?? MODE_SPEED_MPS.driving
  return Math.max(60, Math.round(distanceMeters / speed))
}

function modelDurationForProfile(route, profile) {
  const distance = route.distance ?? 0
  const drivingDuration = route.duration ?? 0

  switch (profile) {
    case 'walking':
      return durationFromDistance(distance, 'walking')
    case 'cycling':
      return durationFromDistance(distance, 'cycling')
    case 'two_wheeler': {
      const fromSpeed = durationFromDistance(distance, 'two_wheeler')
      if (drivingDuration > 0) {
        const fromDriving = Math.max(60, Math.round(drivingDuration * 0.88))
        return Math.min(fromSpeed, fromDriving)
      }
      return fromSpeed
    }
    case 'bus':
      return durationFromDistance(distance, 'bus') + busWaitSeconds(distance)
    default:
      return drivingDuration
  }
}

export function adjustRouteForTravelMode(route, profile) {
  if (!route || profile === 'driving' || profile === 'train') return route

  const distance = route.distance ?? 0
  const duration = route.duration ?? 0
  if (distance <= 0) return route

  const needsModel =
    profile === 'two_wheeler' ||
    profile === 'bus' ||
    !isDurationPlausible(distance, duration, profile)

  if (!needsModel) {
    return route
  }

  return rescaleRouteDuration(route, modelDurationForProfile(route, profile))
}

export function routeNeedsPedestrianOrCycleRefetch(route, profile) {
  if (!route || (profile !== 'walking' && profile !== 'cycling')) return false
  return !isDurationPlausible(route.distance ?? 0, route.duration ?? 0, profile)
}

export function buildTrainRoute(startLat, startLng, endLat, endLng, waypoints = []) {
  const points = [{ lat: startLat, lng: startLng }, ...waypoints, { lat: endLat, lng: endLng }]
  const coordinates = []
  let totalDistance = 0
  let totalDuration = TRAIN_ACCESS_SECONDS
  const legs = []

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]
    const b = points[i + 1]
    const segmentDist = Math.round(
      coordPairDistanceMeters(a.lat, a.lng, b.lat, b.lng) * TRAIN_DISTANCE_FACTOR
    )
    const segmentDur = Math.round(segmentDist / MODE_SPEED_MPS.train)
    if (i > 0) totalDuration += TRAIN_TRANSFER_SECONDS

    totalDistance += segmentDist
    totalDuration += segmentDur
    legs.push({ distance: segmentDist, duration: segmentDur + (i === 0 ? 0 : TRAIN_TRANSFER_SECONDS) })

    if (i === 0) coordinates.push([a.lng, a.lat])
    coordinates.push([b.lng, b.lat])
  }

  return {
    distance: totalDistance,
    duration: totalDuration,
    geometry: {
      type: 'LineString',
      coordinates,
    },
    legs,
    steps: [],
    estimated: true,
  }
}

export function applyTravelModeToRoutes(routes, profile) {
  if (profile === 'train') return routes
  return routes.map((route) => adjustRouteForTravelMode(route, profile))
}

export function pickPrimaryRoute(routeData) {
  const routes = Array.isArray(routeData) ? routeData : routeData ? [routeData] : []
  return routes[0] ?? null
}
