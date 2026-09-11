import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { sanitizeAuthRedirect } from '../utils/authRedirect'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // A token exists (synchronous from localStorage) → render the page immediately
  // so the map starts loading right away. Auth verification (/auth/me) runs in the
  // background; if the token is invalid, the 401 → logout flow clears it and this
  // component re-renders into the redirect below.
  if (isAuthenticated) {
    return children
  }

  // No token yet, but auth state is still resolving (e.g. a token arriving from a
  // Google OAuth redirect, or a silent ATOZAS session restore via /auth/atozas/me)
  // → brief spinner instead of a premature redirect.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Guest (not signed in anywhere) → show the public landing/welcome page with
  // Sign in / Get started actions.
  //
  // We deliberately DO NOT auto-start ATOZAS SSO here. Opening the app from the
  // atozasindia.in "Visit AtozMaps" link (or any ATOZAS referrer) must never
  // force a bounce to the ATOZAS login screen. Users who are already signed in
  // at ATOZAS are still restored silently in AuthContext (no redirect); everyone
  // else lands here and chooses "Continue with ATOZAS" / Google / email OTP on
  // the login page themselves. The originally requested path is preserved so
  // sign-in can return the user there.
  const from = sanitizeAuthRedirect(`${location.pathname}${location.search}`)
  return <Navigate to="/welcome" replace state={{ from }} />
}

export default ProtectedRoute
