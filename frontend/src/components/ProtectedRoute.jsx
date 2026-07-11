import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authPageWithRedirect } from '../utils/authRedirect'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const redirect = `${location.pathname}${location.search}`
  return isAuthenticated ? children : <Navigate to={authPageWithRedirect('/login', redirect)} replace />
}

export default ProtectedRoute

