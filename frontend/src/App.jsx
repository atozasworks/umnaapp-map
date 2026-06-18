import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from 'atozas-traslate'
import { AuthProvider as AtozasAuthProvider } from './lib/atozas-auth-kit'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import LandingPage from './pages/LandingPage'
import PublicMapPage from './pages/PublicMapPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OTPVerificationPage from './pages/OTPVerificationPage'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'
import OpenSourcePage from './pages/OpenSourcePage'
import NotificationsPage from './pages/NotificationsPage'
import MyContributionsPage from './pages/MyContributionsPage'
import PublicProfilePage from './pages/PublicProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import PwaShell from './components/PwaShell'
import SplashScreen from './components/SplashScreen'
import { getAuthKitApiUrl } from './utils/apiBase'
import { useLanguageDocAttrs } from './lib/i18n'
import './lib/i18n/fonts.css'

function LanguageDocSync({ children }) {
  useLanguageDocAttrs()
  return children
}

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

function App() {
  if (isPublicMapRequest()) {
    return <PublicMapPage />
  }

  const authKitApiUrl = getAuthKitApiUrl()
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('umna_splash_seen')
  })

  const handleSplashComplete = () => {
    sessionStorage.setItem('umna_splash_seen', '1')
    setShowSplash(false)
  }

  const atozasAuthProps = {
    apiUrl: authKitApiUrl,
    googleClientId,
    enableLocalStorage: true,
    onAuthError: (error) => console.error('Atozas Auth error:', error),
  }

  return (
    <PwaShell>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <LanguageDocSync>
          {/* AuthProvider & SocketProvider wrap all routes */}
          <AuthProvider>
            <SocketProvider>
              <Routes>
              <Route path="/" element={<LandingPage />} />
              {/* Atozas only wraps login/register - avoids blocking /home render */}
              <Route
                path="/login"
                element={
                  <AtozasAuthProvider {...atozasAuthProps}>
                    <LoginPage />
                  </AtozasAuthProvider>
                }
              />
              <Route
                path="/register"
                element={
                  <AtozasAuthProvider {...atozasAuthProps}>
                    <RegisterPage />
                  </AtozasAuthProvider>
                }
              />
              <Route path="/verify-otp" element={<OTPVerificationPage />} />
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/open-source"
                element={
                  <ProtectedRoute>
                    <OpenSourcePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-contributions"
                element={
                  <ProtectedRoute>
                    <MyContributionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/:id"
                element={
                  <ProtectedRoute>
                    <PublicProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </SocketProvider>
          </AuthProvider>
          </LanguageDocSync>
        </LanguageProvider>
      </Router>
    </PwaShell>
  )
}

export default App

