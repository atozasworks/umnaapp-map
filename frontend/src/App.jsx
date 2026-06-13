import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from 'atozas-traslate'
import { AuthProvider as AtozasAuthProvider } from './lib/atozas-auth-kit'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OTPVerificationPage from './pages/OTPVerificationPage'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'
import NotificationsPage from './pages/NotificationsPage'
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

function App() {
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
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
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

