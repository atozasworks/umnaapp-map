// Login Page using Atozas React Auth Kit
import { Link, useNavigate } from 'react-router-dom'
import { EmailOtpLogin, GoogleLoginButton } from 'atozas-react-auth-kit'
import { useAuth } from 'atozas-react-auth-kit'

const LoginPageAtozas = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    navigate('/home')
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
              UMNAAPP
            </h1>
            <h2 className="text-2xl font-semibold text-slate-800">Welcome Back</h2>
            <p className="text-slate-600 mt-2">Sign in to your account</p>
          </div>

          {/* Atozas Email OTP Login Component */}
          <EmailOtpLogin
            onSuccess={() => {
              navigate('/home')
            }}
            onError={(error) => {
              console.error('Login error:', error)
            }}
            className="space-y-6"
          />

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or continue with</span>
              </div>
            </div>

            {/* Atozas Google Login Button */}
            <div className="mt-4">
              <GoogleLoginButton
                onSuccess={() => {
                  navigate('/home')
                }}
                onError={(error) => {
                  console.error('Google login error:', error)
                }}
              />
            </div>
          </div>

          <p className="mt-6 text-center text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPageAtozas

