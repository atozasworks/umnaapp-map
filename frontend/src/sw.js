/// <reference lib="webworker" />
/* eslint-disable no-undef */

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/api/sso') || url.pathname.startsWith('/auth')),
  new NetworkOnly()
)

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api/, /^\/auth/, /^\/socket\.io/, /^\/admin/, /^\/sdk\.js/],
  })
)

registerRoute(
  /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

/** Dedicated offline-region tile pack (no eviction — managed by Offline Maps UI). */
const OFFLINE_MAP_TILE_CACHE = 'offline-map-tiles'

const offlineTileFirst = async ({ request, event }) => {
  try {
    const offlineCache = await caches.open(OFFLINE_MAP_TILE_CACHE)
    const offlineHit = await offlineCache.match(request, { ignoreSearch: true })
    if (offlineHit) return offlineHit

    // MapLibre may request umnaapp.in while packs were stored under the proxy path.
    const url = new URL(request.url)
    const proxyMatch = url.pathname.match(/\/tiles\/(\d+)\/(\d+)\/(\d+)\.png$/i)
      || url.pathname.match(/\/api\/map\/tiles\/(\d+)\/(\d+)\/(\d+)\.png$/i)
    if (proxyMatch) {
      const [, z, x, y] = proxyMatch
      const proxyUrl = `${self.location.origin}/api/map/tiles/${z}/${x}/${y}.png`
      const byProxy = await offlineCache.match(proxyUrl)
      if (byProxy) return byProxy
    }
  } catch {
    /* fall through to opportunistic caches */
  }

  return undefined
}

const withOfflineTileFallback = (strategy) => {
  return async (args) => {
    const offline = await offlineTileFirst(args)
    if (offline) return offline
    return strategy.handle(args)
  }
}

registerRoute(
  /\/map-tiles\//i,
  withOfflineTileFallback(
    new CacheFirst({
      cacheName: 'map-tiles',
      plugins: [
        new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  )
)

registerRoute(
  /\/api\/map\/tiles\//i,
  withOfflineTileFallback(
    new CacheFirst({
      cacheName: 'map-tiles-api',
      plugins: [
        new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  )
)

registerRoute(
  /^https:\/\/umnaapp\.in\/tiles\//i,
  withOfflineTileFallback(
    new CacheFirst({
      cacheName: 'umnaapp-tiles',
      plugins: [
        new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  )
)

// Keep Offline Maps downloads alive briefly when the tab is backgrounded.
self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'OFFLINE_MAP_DOWNLOAD_META') return
  event.waitUntil(
    (async () => {
      // Touch the offline cache so the SW stays active during pack downloads.
      await caches.open(OFFLINE_MAP_TILE_CACHE)
    })()
  )
})

self.addEventListener('backgroundfetchsuccess', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const bg = event.registration
        const records = await bg.matchAll()
        const cache = await caches.open(OFFLINE_MAP_TILE_CACHE)
        await Promise.all(
          records.map(async (record) => {
            const response = await record.responseReady
            if (response && response.ok) {
              await cache.put(record.request, response.clone())
            }
          })
        )
      } catch {
        /* best-effort */
      }
    })()
  )
})

// Sensitive / user-specific endpoints must NEVER be cached.
registerRoute(
  /\/api\/(auth|admin|users|user|me|email|notifications|feedback|live-location|vehicles)(\/|$)/i,
  new NetworkOnly()
)

// Only cache known public/read-mostly GET map endpoints (allowlist).
registerRoute(
  ({ url, request }) => {
    if (request.method !== 'GET') return false
    const path = url.pathname
    return (
      path.startsWith('/api/public/') ||
      path.startsWith('/api/map/search') ||
      path.startsWith('/api/map/reverse') ||
      path.startsWith('/api/map/route') ||
      path === '/api/health'
    )
  },
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 5 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// All other API traffic — network only (no stale private data).
registerRoute(/\/api\//i, new NetworkOnly())

registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 14 })],
  })
)

self.addEventListener('push', (event) => {
  let payload = {
    title: 'UMNAAPP',
    body: 'You have a new notification',
    data: { url: '/' },
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        data: parsed.data || payload.data,
      }
    }
  } catch {
    /* fallthrough to defaults */
  }

  const options = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/favicon.png',
    data: payload.data,
    tag: payload.data?.notificationId || 'umnaapp-notification',
    renotify: true,
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(payload.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  const target = new URL(url, self.location.origin).href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(target).catch(() => {})
            return client.focus()
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target)
        return null
      })
  )
})
