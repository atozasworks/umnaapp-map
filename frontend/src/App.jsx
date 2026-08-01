import { Suspense, lazy } from 'react'

/**
 * Public Map Platform detection.
 *
 * The login-free map viewer is served when EITHER:
 *   - the host is the dedicated maps subdomain (e.g. maps.umnaapp.com), or
 *   - the path is /embedded-map (iframe/SDK target) or /map.
 *
 * In these cases we render ONLY the map — completely outside AuthProvider,
 * SocketProvider, the splash screen, and the app router — so the UMNAAPP login,
 * register, landing, and home pages are never reachable from the map platform.
 *
 * Both branches are lazy so each platform only downloads its own JS graph.
 */
function isPublicMapRequest() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname || ''
  const path = window.location.pathname || ''
  const forcedMapsHost =
    host.startsWith('maps.') || host === (import.meta.env.VITE_MAPS_HOST || '').toLowerCase()
  const mapsPath =
    path === '/embedded-map' ||
    path.startsWith('/embedded-map') ||
    path === '/map' ||
    path.startsWith('/map/')
  return forcedMapsHost || mapsPath
}

const PublicMapPage = lazy(() => import('./pages/PublicMapPage'))
const MainApp = lazy(() => import('./MainApp'))

function BootFallback() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: '#f8fafc',
      }}
      aria-busy="true"
      aria-label="Loading"
    />
  )
}

function App() {
  if (isPublicMapRequest()) {
    return (
      <Suspense fallback={<BootFallback />}>
        <PublicMapPage />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<BootFallback />}>
      <MainApp />
    </Suspense>
  )
}

export default App
