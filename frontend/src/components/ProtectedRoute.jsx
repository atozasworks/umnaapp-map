import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authPageWithRedirect } from '../utils/authRedirect'

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

  // No token yet, but auth state is still resolving (e.g. token arriving from a
  // Google OAuth redirect) → brief spinner instead of a premature redirect.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const redirect = `${location.pathname}${location.search}`
  return <Navigate to={authPageWithRedirect('/login', redirect)} replace />
}

export default ProtectedRoute

