/**
 * Resolve the user's current GPS coordinates.
 * Tries a fresh high-accuracy read first, then a relaxed cached read, then optional fallback.
 *
 * @param {{ fallback?: { lat: number, lng: number } | null, timeout?: number }} [options]
 * @returns {Promise<{ lat: number, lng: number, accuracy?: number, fromFallback?: boolean }>}
 */
export function getCurrentPositionAsync(options = {}) {
  const { fallback = null, timeout = 25000 } = options

  return new Promise((resolve, reject) => {
    const useFallback = () => {
      if (
        fallback &&
        Number.isFinite(fallback.lat) &&
        Number.isFinite(fallback.lng)
      ) {
        resolve({
          lat: fallback.lat,
          lng: fallback.lng,
          fromFallback: true,
        })
        return true
      }
      return false
    }

    if (!navigator.geolocation) {
      if (useFallback()) return
      reject(
        new Error(
          'Location is not supported in this browser. Pick a spot on the map or enter coordinates instead.'
        )
      )
      return
    }

    const onSuccess = (position) => {
      const { latitude, longitude, accuracy } = position.coords
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        resolve({
          lat: latitude,
          lng: longitude,
          accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
        })
        return
      }
      if (!useFallback()) {
        reject(new Error('Could not read a valid GPS position. Please try again.'))
      }
    }

    const onFinalError = (error) => {
      if (useFallback()) return
      let message =
        'Could not get your location. Enable location access in your browser or device settings.'
      if (error?.code === error.PERMISSION_DENIED) {
        message =
          'Location access was denied. Allow location for this site, or pick a spot on the map.'
      } else if (error?.code === error.POSITION_UNAVAILABLE) {
        message =
          'Location is unavailable. Check that GPS is on, or pick a spot on the map.'
      } else if (error?.code === error.TIMEOUT) {
        message =
          'Finding your location took too long. Try again near a window or pick on the map.'
      }
      reject(new Error(message))
    }

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          onFinalError,
          {
            enableHighAccuracy: false,
            maximumAge: 60000,
            timeout: 60000,
          }
        )
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout,
      }
    )
  })
}
