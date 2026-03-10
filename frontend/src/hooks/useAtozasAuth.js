// Atozas React Auth Kit Hook Wrapper
import { useAtozasAuthKit } from 'atozas-react-auth-kit'

export const useAtozasAuth = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const normalizedApiUrl = apiUrl.replace(/\/+$/, '')
  const authKitApiUrl = normalizedApiUrl.endsWith('/api')
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api`

  const authKit = useAtozasAuthKit({
    apiUrl: authKitApiUrl,
  })

  return {
    // Send OTP
    sendOTP: async (email, type = 'register') => {
      try {
        const endpoint = type === 'register' ? '/auth/register' : '/auth/login'
        const response = await fetch(`${authKit.apiUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, ...(type === 'register' ? { name: '' } : {}) }),
        })
        const data = await response.json()
        return { success: response.ok, data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    // Verify OTP
    verifyOTP: async (email, otp, type = 'register') => {
      try {
        const response = await fetch(`${authKit.apiUrl}/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, type }),
        })
        const data = await response.json()
        return { success: response.ok, data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    // Resend OTP
    resendOTP: async (email, type = 'register') => {
      return await authKit.sendOTP(email, type)
    },
  }
}

