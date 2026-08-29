import { useEffect, useRef } from 'react'
import api from '../services/api'

/**
 * During Safe Route navigation: poll for nearby risk warnings and safer alternatives.
 * Does not replace existing off-route rerouting (useVoiceNavigation).
 */
export default function useSafeRouteMonitor({
  enabled,
  currentLocation,
  route,
  avoidOptions,
  onWarning,
  onSaferRoute,
  intervalMs = 20000,
}) {
  const onWarningRef = useRef(onWarning)
  const onSaferRef = useRef(onSaferRoute)
  onWarningRef.current = onWarning
  onSaferRef.current = onSaferRoute

  const lastWarnKeyRef = useRef(null)

  useEffect(() => {
    if (!enabled || !route) return undefined

    let cancelled = false
    let timer = null

    const tick = async () => {
      if (cancelled || !currentLocation) return
      try {
        const { data } = await api.post('/map/safe-route/monitor', {
          location: { lat: currentLocation.lat, lng: currentLocation.lng },
          riskySegments: route.riskySegments || [],
          currentSafetyScore: route.safetyScore,
          avoidOptions,
        })
        if (cancelled) return

        if (data?.warning) {
          const key = `${data.warning.type}:${data.warning.latitude}:${data.warning.longitude}`
          if (key !== lastWarnKeyRef.current) {
            lastWarnKeyRef.current = key
            onWarningRef.current?.(data.warning)
          }
        }

        if (data?.saferRouteAvailable && data.saferRoute) {
          onSaferRef.current?.(data.saferRoute)
        }
      } catch {
        /* monitoring is best-effort */
      }
    }

    tick()
    timer = setInterval(tick, intervalMs)
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [
    enabled,
    route,
    avoidOptions,
    intervalMs,
    currentLocation?.lat,
    currentLocation?.lng,
  ])
}
