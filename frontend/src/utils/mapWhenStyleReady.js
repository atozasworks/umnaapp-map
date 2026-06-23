/**
 * Run fn once the map style is ready to accept addSource/addLayer/setData.
 *
 * maplibre's `isStyleLoaded()` can transiently return false while tiles or
 * sources are still loading — NOT only during a style swap. The old approach
 * of waiting for a single `style.load` event was brittle: that event only
 * fires on setStyle, so a draw deferred during tile loading could hang
 * forever and the route polyline would silently never appear.
 *
 * This implementation polls on a short interval (and also listens for
 * `style.load`/`idle` as fast-paths) until the style is ready, then runs fn.
 * If fn throws the "style not done loading" error it is retried the same way.
 *
 * @returns {() => void} dispose — call on unmount to cancel pending retries
 */
export function whenStyleReady(map, fn, { interval = 60, maxWaitMs = 10000 } = {}) {
  if (!map || typeof map.isStyleLoaded !== 'function') return () => {}

  let disposed = false
  let timer = null
  const startedAt = Date.now()

  const cleanup = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    map.off('style.load', attempt)
    map.off('idle', attempt)
  }

  const scheduleRetry = () => {
    if (disposed) return
    // Fast-paths: react immediately when these fire…
    map.once('style.load', attempt)
    map.once('idle', attempt)
    // …but never rely on them alone — poll as a guaranteed fallback.
    timer = setTimeout(attempt, interval)
  }

  function attempt() {
    if (disposed) return

    if (!map.isStyleLoaded() && Date.now() - startedAt <= maxWaitMs) {
      scheduleRetry()
      return
    }

    cleanup()
    try {
      fn()
    } catch (err) {
      if (disposed) return
      const msg = String(err?.message || err)
      if (
        (msg.includes('not done loading') || msg.includes('Style is not done')) &&
        Date.now() - startedAt <= maxWaitMs
      ) {
        scheduleRetry()
        return
      }
      console.error(err)
    }
  }

  attempt()

  return () => {
    disposed = true
    cleanup()
  }
}
