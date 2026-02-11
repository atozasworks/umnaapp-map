// Atozas React Auth Kit Integration
import { AuthProvider as AtozasAuthProvider } from 'atozas-react-auth-kit'
import { useNavigate } from 'react-router-dom'

export const AtozasAuthContextProvider = ({ children }) => {
  const navigate = useNavigate()
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  return (
    <AtozasAuthProvider
      apiUrl={apiUrl}
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

