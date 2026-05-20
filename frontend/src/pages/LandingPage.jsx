import { Link } from 'react-router-dom'
import AppLogo from '../components/AppLogo'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const LandingPage = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home')
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2.5 min-w-0" aria-label="UMNAAPP home">
              <AppLogo decorative imgClassName="h-8 w-auto max-h-10 object-contain flex-shrink-0" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent truncate">
                UMNAAPP
              </span>
            </Link>
            <div className="flex gap-4">
              <Link to="/login" className="btn-secondary">
                Login
              </Link>
              <Link to="/register" className="btn-primary">
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 bg-clip-text text-transparent animate-slide-up">
            Welcome to UMNAAPP
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-2xl mx-auto animate-slide-up">
            A modern, professional map-based platform for real-time location tracking and visualization.
            Experience seamless navigation with our intuitive interface.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
            <Link to="/register" className="btn-primary text-lg px-8 py-4">
              Get Started
            </Link>
            <Link to="/login" className="btn-secondary text-lg px-8 py-4">
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-xl font-semibold mb-2">Interactive Maps</h3>
              <p className="text-slate-600">
                Explore real-time maps with smooth navigation and instant updates.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-2">Secure Authentication</h3>
              <p className="text-slate-600">
                Login with email OTP or Google OAuth for a secure experience.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
              <p className="text-slate-600">
                Get instant updates with our Socket.io powered real-time system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass border-t border-white/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600">
          <p>&copy; 2024 UMNAAPP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

