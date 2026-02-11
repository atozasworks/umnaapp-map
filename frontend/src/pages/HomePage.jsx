import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import MapComponent from '../components/MapComponent'
import SearchBar from '../components/SearchBar'
import RoutePanel from '../components/RoutePanel'

const HomePage = () => {
  const { user, logout } = useAuth()
  const mapRef = useRef(null)
  const [showRoutePanel, setShowRoutePanel] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)

  const handleLocationUpdate = (location) => {
    // Handle location updates if needed
    console.log('Location updated:', location)
  }

  const handleSearchSelect = (location) => {
    setSelectedLocation(location)
    // Center map on selected location
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 15,
        duration: 1000,
      })
    }
  }

  const handleCalculateRoute = async (start, end) => {
    if (mapRef.current && mapRef.current.calculateRoute) {
      try {
        await mapRef.current.calculateRoute(start, end)
      } catch (error) {
        console.error('Route calculation failed:', error)
      }
    }
  }

  const handleRouteClick = () => {
    setShowRoutePanel(!showRoutePanel)
  }

  const handleLogout = async () => {
    logout()
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex flex-col relative">
      {/* Top Bar */}
      <div className="glass border-b border-white/20 z-10">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              UMNAAPP
            </h1>
            <div className="h-6 w-px bg-slate-300"></div>
            <span className="text-slate-600">Welcome, {user?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRouteClick}
              className="btn-secondary text-sm py-2 px-4"
            >
              {showRoutePanel ? 'Hide Route' : 'Show Route'}
            </button>
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm py-2 px-4"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-2xl px-4">
        <SearchBar onSelect={handleSearchSelect} onRoute={handleRouteClick} />
      </div>

      {/* Route Panel */}
      {showRoutePanel && (
        <div className="absolute top-32 left-4 z-20">
          <RoutePanel mapRef={mapRef} onCalculateRoute={handleCalculateRoute} onClose={() => setShowRoutePanel(false)} />
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 w-full relative">
        <MapComponent ref={mapRef} onLocationUpdate={handleLocationUpdate} />
      </div>
    </div>
  )
}

export default HomePage
