import { Suspense, lazy, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LanguageProvider } from 'atozas-traslate'
import { AuthProvider as AtozasAuthProvider } from './lib/atozas-auth-kit'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import LiveLocationTokenRedirect from './components/LiveLocationTokenRedirect'
import PwaShell from './components/PwaShell'
import SplashScreen from './components/SplashScreen'
import { getAuthKitApiUrl } from './utils/apiBase'
import { useLanguageDocAttrs } from './lib/i18n'
import './lib/i18n/fonts.css'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const OTPVerificationPage = lazy(() => import('./pages/OTPVerificationPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const OpenSourcePage = lazy(() => import('./pages/OpenSourcePage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const MyContributionsPage = lazy(() => import('./pages/MyContributionsPage'))
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'))

function LanguageDocSync({ children }) {
  useLanguageDocAttrs()
  return children
}

/** Old /home bookmarks & share links → map at /. */
function HomeLegacyRedirect() {
  const location = useLocation()
  return (
    <Navigate
      to={{ pathname: '/', search: location.search, hash: location.hash, state: location.state }}
      replace
    />
  )
}

function RouteFallback() {
  return (
    <div
      className="min-h-[100dvh] w-full bg-slate-50"
      aria-busy="true"
      aria-label="Loading"
    />
  )
}

/**
 * Authenticated app shell (landing, auth, map, settings, etc.).
 * Lazy-loaded from App.jsx so the public map platform never downloads this graph.
 */
export default function MainApp() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false
    return !sessionStorage.getItem('umna_splash_seen')
  })

  const authKitApiUrl = getAuthKitApiUrl()
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

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
            <AuthProvider>
              <SocketProvider>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <HomePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/welcome" element={<LandingPage />} />
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
                      path="/live/:token"
                      element={
                        <ProtectedRoute>
                          <LiveLocationTokenRedirect />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/home" element={<HomeLegacyRedirect />} />
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
                </Suspense>
              </SocketProvider>
            </AuthProvider>
          </LanguageDocSync>
        </LanguageProvider>
      </Router>
    </PwaShell>
  )
}
