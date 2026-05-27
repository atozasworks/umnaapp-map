// Atozas React Auth Kit Integration
import { AuthProvider as AtozasAuthProvider } from 'atozas-react-auth-kit'
import { useNavigate } from 'react-router-dom'
import { getAuthKitApiUrl } from '../utils/apiBase'

export const AtozasAuthContextProvider = ({ children }) => {
  const navigate = useNavigate()
  const authKitApiUrl = getAuthKitApiUrl()

  return (
    <AtozasAuthProvider
      apiUrl={authKitApiUrl}
      googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}
      enableLocalStorage={true}
      onAuthError={(error) => {
        console.error('Auth error:', error)
        navigate('/login')
      }}
    >
      {children}
    </AtozasAuthProvider>
  )
}

