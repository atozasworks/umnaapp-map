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
  const [routeStartPlace, setRouteStartPlace] = useState(null)
  const [routeEndPlace, setRouteEndPlace] = useState(null)
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
        targetLang: data.targetLang || 'hi', // For auto-translation: kn, ta, ml, te, hi
      }
    } catch (err) {
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        zoomLevel: loc.zoomLevel,
        name: '',
        targetLang: 'hi',
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
    <div className="h-screen flex flex-col relative overflow-hidden safe-area-inset">
      {/* Navbar - Beautiful glass design with user, Add Place, Logout */}
      <nav className="absolute top-0 left-0 right-0 z-30 glass border-b border-white/30 pt-[env(safe-area-inset-top)] shadow-lg">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          {/* Logo */}
          <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-600 via-primary-700 to-primary-900 bg-clip-text text-transparent truncate flex-shrink-0">
            UMNAAPP
          </h1>

          {/* Right side: Username, Add Place, Logout */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 justify-end">
            {/* Logged-in username */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/50 border border-white/40 backdrop-blur-sm min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-slate-700 text-sm font-medium truncate hidden sm:inline">
                {user?.name || user?.email || 'User'}
              </span>
            </div>

            {/* Add Place button */}
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
              className={`flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 font-medium text-sm transition-all duration-200 shrink-0 min-h-[44px] sm:min-h-0 ${
                addPlacePickMode
                  ? 'bg-primary-100 border-2 border-primary-400 text-primary-700 shadow-md'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl border border-primary-400/30'
              }`}
              title="Add a new place"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">Add Place</span>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 bg-white/80 hover:bg-white text-slate-600 hover:text-slate-800 font-medium text-sm border border-slate-200/80 hover:border-slate-300 transition-all duration-200 shadow-md hover:shadow-lg shrink-0 min-h-[44px] sm:min-h-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Search Bar + Categories - positioned below navbar (safe-area + ~4.5rem) */}
      <div className="absolute left-2 right-14 sm:right-auto sm:left-4 sm:right-4 z-20 sm:max-w-xl" style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }}>
        <SearchBar
          userPlaces={places}
          onSelect={handleSearchSelect}
          onRoute={() => setShowRoutePanel(!showRoutePanel)}
          onResultsChange={() => {}}
        />
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

      {/* Right-side toolbar: Route Panel - positioned below navbar */}
      <div className="absolute right-2 sm:right-4 z-20 flex flex-col sm:flex-row items-end sm:items-start gap-2 sm:gap-4" style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }}>
        {showRoutePanel && (
          <div className="animate-fade-in w-full sm:w-auto max-w-[calc(100vw-1rem)] sm:max-w-none">
            <RoutePanel
              mapRef={mapRef}
              currentLocation={currentLocation}
              onCalculateRoute={handleCalculateRoute}
              onClose={() => {
                setShowRoutePanel(false)
                setRouteStartPlace(null)
                setRouteEndPlace(null)
              }}
              onSearchResultsChange={() => {}}
              onRoutePlacesChange={(start, end) => {
                setRouteStartPlace(start)
                setRouteEndPlace(end)
              }}
            />
          </div>
        )}
      </div>

      {/* Location picker hint - mobile safe area */}
      {addPlacePickMode && (
        <div className="absolute bottom-20 left-2 right-2 sm:left-4 sm:right-auto z-20 glass rounded-xl px-4 py-3 shadow-lg animate-fade-in max-w-md pb-[env(safe-area-inset-bottom)] sm:pb-3">
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
          searchResultPlaces={[]}
          routeStartPlace={routeStartPlace}
          routeEndPlace={routeEndPlace}
        />
      </div>
    </div>
  )
}

export default HomePage
