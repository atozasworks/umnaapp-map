import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import MapComponent from '../components/MapComponent'
import SearchBar from '../components/SearchBar'
import RoutePanel from '../components/RoutePanel'
import AddPlaceModal from '../components/AddPlaceModal'
import api from '../services/api'

const HomePage = () => {
  const { user, logout } = useAuth()
  const mapRef = useRef(null)
  const [showRoutePanel, setShowRoutePanel] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false)
  const [mapLocation, setMapLocation] = useState(null)
  const [places, setPlaces] = useState([])
  const [addPlacePickMode, setAddPlacePickMode] = useState(false)
  const [fetchingPlaceDetails, setFetchingPlaceDetails] = useState(false)

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const { data } = await api.get('/map/places')
        setPlaces(data.places || [])
      } catch (err) {
        console.error('Failed to fetch places:', err)
      }
    }
    fetchPlaces()
  }, [])

  const handleLocationUpdate = (location) => {
    setCurrentLocation({ lat: location.lat, lng: location.lng, name: 'My location' })
  }

  const fetchPlaceDetails = async (loc) => {
    setFetchingPlaceDetails(true)
    try {
      const { data } = await api.get('/map/reverse', {
        params: { lat: loc.latitude, lng: loc.longitude },
      })
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        zoomLevel: loc.zoomLevel,
        name: data.displayName || '',
        address: data.address || {},
      }
    } catch (err) {
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        zoomLevel: loc.zoomLevel,
        name: '',
      }
    } finally {
      setFetchingPlaceDetails(false)
    }
  }

  const handleMapClickForPlace = async (loc) => {
    if (addPlacePickMode || showAddPlaceModal) {
      const details = await fetchPlaceDetails(loc)
      setMapLocation(details)
      if (addPlacePickMode) {
        setShowAddPlaceModal(true)
        setAddPlacePickMode(false)
      }
    }
  }

  const handlePlaceSaved = (place) => {
    setPlaces((prev) => [place, ...prev])
    if (mapRef.current?.flyTo) {
      mapRef.current.flyTo({
        center: [place.longitude, place.latitude],
        zoom: place.zoomLevel || 15,
        duration: 1000,
      })
    }
  }

  const handleSearchSelect = (location) => {
    if (mapRef.current?.showSearchedLocation) {
      mapRef.current.showSearchedLocation(location)
      return
    }
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 15,
        duration: 1000,
      })
    }
  }

  const handleCalculateRoute = async (start, end) => {
    if (mapRef.current?.calculateRoute) {
      try {
        await mapRef.current.calculateRoute(start, end)
      } catch (error) {
        console.error('Route calculation failed:', error)
      }
    }
  }

  const handleLogout = async () => {
    logout()
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Top Bar - compact */}
      <div className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center px-4 py-2">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
          UMNAAPP
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-slate-600 text-sm hidden sm:inline">Welcome, {user?.name}</span>
          <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
            Logout
          </button>
        </div>
      </div>

      {/* Search Bar + Categories - Google Maps style */}
      <div className="absolute top-14 left-4 z-20 w-full max-w-xl">
        <SearchBar onSelect={handleSearchSelect} onRoute={() => setShowRoutePanel(!showRoutePanel)} />
      </div>

      {/* Add Place Modal */}
      <AddPlaceModal
        isOpen={showAddPlaceModal}
        onClose={() => {
          setShowAddPlaceModal(false)
          setMapLocation(null)
          setAddPlacePickMode(false)
        }}
        initialData={null}
        mapLocation={mapLocation}
        onSaved={handlePlaceSaved}
      />

      {/* Right-side toolbar: Add Place + Route Panel */}
      <div className="absolute top-14 right-4 z-20 flex items-start gap-4">
        <button
          onClick={() => {
            if (addPlacePickMode) {
              setAddPlacePickMode(false)
            } else {
              setMapLocation(null)
              setAddPlacePickMode(true)
              setShowAddPlaceModal(false)
            }
          }}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg border transition-colors ${
            addPlacePickMode
              ? 'bg-primary-100 border-primary-300 text-primary-700'
              : 'glass border-white/30 hover:bg-white/90'
          }`}
          title="Add a new place - click map to select location"
        >
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="font-medium text-slate-700 hidden sm:inline">Add Place</span>
        </button>
        {showRoutePanel && (
          <div className="animate-fade-in">
            <RoutePanel
            mapRef={mapRef}
            currentLocation={currentLocation}
            onCalculateRoute={handleCalculateRoute}
            onClose={() => setShowRoutePanel(false)}
          />
          </div>
        )}
      </div>

      {/* Location picker hint */}
      {addPlacePickMode && (
        <div className="absolute bottom-20 left-4 z-20 glass rounded-xl px-4 py-3 shadow-lg animate-fade-in">
          <p className="text-sm font-medium text-slate-700">
            {fetchingPlaceDetails ? 'Fetching place details...' : 'Click on the map to select a place'}
          </p>
          <button
            onClick={() => { setAddPlacePickMode(false); setFetchingPlaceDetails(false) }}
            className="mt-2 text-xs text-primary-600 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 w-full relative">
        <MapComponent
          ref={mapRef}
          onLocationUpdate={handleLocationUpdate}
          onMapClick={handleMapClickForPlace}
          addPlaceMode={addPlacePickMode || showAddPlaceModal}
          places={places}
        />
      </div>
    </div>
  )
}

export default HomePage
