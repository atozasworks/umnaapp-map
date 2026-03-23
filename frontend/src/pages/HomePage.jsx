import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import MapComponent from '../components/MapComponent'
import SearchBar from '../components/SearchBar'
import RoutePanel from '../components/RoutePanel'
import AddPlaceModal from '../components/AddPlaceModal'
import api from '../services/api'

const MAX_AVATAR_SIZE = 200

const resizeImageToDataUrl = (file, maxSize = MAX_AVATAR_SIZE) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize
          width = maxSize
        } else {
          width = (width / height) * maxSize
          height = maxSize
        }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })

// Filter places to only those owned by the current user (by userId; each user sees only their own)
const filterPlacesByUser = (placesList, currentUser) => {
  if (!currentUser) return []
  return placesList.filter((p) => p.userId === currentUser.id)
}

const HomePage = () => {
  const { user, logout, updateProfilePicture } = useAuth()
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
  const [showMyPlaces, setShowMyPlaces] = useState(false)
  const [showContributionsOnly, setShowContributionsOnly] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [deletingPlaceId, setDeletingPlaceId] = useState(null)
  const [savingPlaceId, setSavingPlaceId] = useState(null)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const profileFileInputRef = useRef(null)

  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploadingPicture(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      const result = await updateProfilePicture(dataUrl)
      if (!result.success) alert(result.error || 'Failed to update photo')
    } catch {
      alert('Failed to process image')
    } finally {
      setUploadingPicture(false)
      e.target.value = ''
    }
  }

  const openAddPlace = () => {
    setShowMenu(false)
    setMapLocation(null)
    setAddPlacePickMode(false)
    setShowAddPlaceModal(true)
  }

  const handleSavePlaceFromSearch = async (result) => {
    const placeKey = `${result.lat}-${result.lng}`
    if (savingPlaceId === placeKey) return
    setSavingPlaceId(placeKey)
    const category = result.address?.amenity || result.address?.type || result.address?.county || 'Other'
    try {
      const { data } = await api.post('/map/places', {
        place_name_en: result.displayName,
        place_name_local: '',
        category: typeof category === 'string' ? category : 'Other',
        latitude: result.lat,
        longitude: result.lng,
        zoomLevel: 15,
        source: 'saved',
      })
      setPlaces((prev) => [data, ...prev])
      setShowMenu(false)
      setShowContributionsOnly(false)
      setShowMyPlaces(true)
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Failed to save'
      alert(msg)
    } finally {
      setSavingPlaceId(null)
    }
  }

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
    if (addPlacePickMode) {
      const details = await fetchPlaceDetails(loc)
      setMapLocation(details)
      setShowAddPlaceModal(true)
      setAddPlacePickMode(false)
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

  const handleDeletePlace = async (placeId) => {
    if (!window.confirm('Are you sure you want to delete this place?')) return
    setDeletingPlaceId(placeId)
    try {
      await api.delete(`/map/places/${placeId}`)
      setPlaces((prev) => prev.filter((p) => p.id !== placeId))
    } catch (err) {
      console.error('Delete place error:', err)
      alert('Failed to delete place. Please try again.')
    } finally {
      setDeletingPlaceId(null)
    }
  }

  return (
    <div className="h-screen flex flex-col relative overflow-hidden safe-area-inset">
      {/* Navbar - Logo, Menu icon, Add Place (My Places & Logout in menu) */}
      <nav className="absolute top-0 left-0 right-0 z-30 glass border-b border-white/30 pt-[env(safe-area-inset-top)] shadow-lg">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          {/* Logo + Hamburger */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Hamburger menu icon */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2.5 sm:p-2 rounded-xl hover:bg-white/60 active:bg-white/80 transition-colors text-slate-600 flex items-center justify-center min-h-[44px] sm:min-h-0"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-600 via-primary-700 to-primary-900 bg-clip-text text-transparent truncate">
              UMNAAPP
            </h1>
          </div>

          {/* Right side: Add Place only (My Places & Logout in menu) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-end">
            {/* Add Place button */}
            <button
              onClick={() => {
                if (addPlacePickMode) {
                  setAddPlacePickMode(false)
                } else {
                  setMapLocation(null)
                  setShowAddPlaceModal(true)
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
          onSavePlace={handleSavePlaceFromSearch}
          savingPlaceId={savingPlaceId}
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
        currentLocation={currentLocation}
        onRequestMapPick={() => {
          setShowAddPlaceModal(false)
          setAddPlacePickMode(true)
        }}
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

      {/* Menu panel - Google Maps style, slide in from left */}
      {showMenu && (
        <div className="absolute inset-0 z-40 flex pointer-events-none" style={{ top: 0 }}>
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowMenu(false)}
          />
          <div className="relative pointer-events-auto w-full max-w-[min(100vw,24rem)] sm:max-w-sm h-full bg-white shadow-2xl flex flex-col animate-fade-in pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-200">
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 via-primary-700 to-primary-900 bg-clip-text text-transparent">
                UMNAAPP
              </h1>
              <button
                onClick={() => setShowMenu(false)}
                className="p-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors touch-manipulation"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu content - scrollable */}
            <div className="flex-1 overflow-y-auto">
              {/* Logged-in user - top of menu */}
              {user && (
                <div className="border-b border-slate-200 px-4 sm:px-5 py-4 bg-gradient-to-r from-primary-50/80 to-primary-100/50">
                  <div className="flex items-center gap-3">
                    <input
                      ref={profileFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfileImageChange}
                    />
                    <button
                      type="button"
                      onClick={() => profileFileInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="relative w-11 h-11 rounded-full flex-shrink-0 overflow-hidden bg-primary-200 flex items-center justify-center group ring-2 ring-transparent hover:ring-primary-400 transition-all disabled:opacity-60"
                    >
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-primary-700">
                          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {uploadingPicture ? (
                          <svg className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          </svg>
                        )}
                      </div>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {user.name || 'User'}
                      </p>
                      <p className="text-xs text-slate-600 truncate">{user.email}</p>
                      <p className="text-xs text-primary-600 mt-0.5">Tap photo to change</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1: Toggle */}
              <div className="border-b border-slate-200">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="text-sm font-medium text-slate-800">Show side bar</span>
                  </div>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${showSidebar ? 'bg-primary-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${showSidebar ? 'left-6' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>

              {/* Section 2: Personal */}
              <div className="border-b border-slate-200 py-2">
                <button
                  onClick={() => { setShowMenu(false); setShowContributionsOnly(false); setShowMyPlaces(true); }}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">Saved</span>
                  <span className="text-xs font-medium bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 ml-auto">
                  {places.filter((p) => (p.source || 'contribution') === 'saved').length}
                </span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation opacity-60">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span className="text-sm text-slate-500">Recents</span>
                </button>
                <button
                  onClick={() => { setShowMenu(false); setShowContributionsOnly(true); setShowMyPlaces(true); }}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">Your contributions</span>
                  <span className="text-xs font-medium bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 ml-auto">
                    {filterPlacesByUser(
                      places.filter((p) => (p.source || 'contribution') === 'contribution'),
                      user
                    ).length}
                  </span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">Location sharing</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">Your timeline</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">Your data in Maps</span>
                </button>
              </div>

              {/* Section 3: Map actions */}
              <div className="border-b border-slate-200 py-2">
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">Share or embed map</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5M9 21V5a2 2 0 012-2h2a2 2 0 012 2v4m2 4a2 2 0 01-2 2H9" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">Print</span>
                </button>
                <button
                  onClick={openAddPlace}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <span className="text-sm font-medium text-slate-800">Add a missing place</span>
                </button>
                <button
                  onClick={openAddPlace}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <span className="text-sm font-medium text-slate-800">Add your business</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <span className="text-sm font-medium text-slate-800">Edit the map</span>
                </button>
              </div>

              {/* Section 4: Support */}
              <div className="border-b border-slate-200 py-2">
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <span className="text-sm font-medium text-slate-800">Tips and tricks</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <span className="text-sm font-medium text-slate-800">Get help</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <span className="text-sm font-medium text-slate-800">Consumer information</span>
                </button>
              </div>

              {/* Section 5: Settings */}
              <div className="border-b border-slate-200 py-2">
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">Language</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <span className="text-sm font-medium text-slate-800">Search settings</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation">
                  <span className="text-sm font-medium text-slate-800">Maps history</span>
                </button>
              </div>

              {/* Logout */}
              <div className="py-2">
                <button
                  onClick={() => { setShowMenu(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Places panel - slide in from left */}
      {showMyPlaces && (
        <div className="absolute inset-0 z-40 flex pointer-events-none" style={{ top: 0 }}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowMyPlaces(false)}
          />
          {/* Panel */}
          <div className="relative pointer-events-auto w-full max-w-sm h-full bg-white/95 backdrop-blur-md shadow-2xl flex flex-col animate-fade-in pt-[env(safe-area-inset-top)]">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white/80">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-base font-semibold text-slate-800">
                  {showContributionsOnly ? 'Your contributions' : 'Saved'}
                </h2>
                <span className="text-xs font-medium bg-primary-100 text-primary-700 rounded-full px-2 py-0.5">
                  {showContributionsOnly
                    ? filterPlacesByUser(
                        places.filter((p) => (p.source || 'contribution') === 'contribution'),
                        user
                      ).length
                    : filterPlacesByUser(
                        places.filter((p) => (p.source || 'contribution') === 'saved'),
                        user
                      ).length}
                </span>
              </div>
              <button
                onClick={() => setShowMyPlaces(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Places list */}
            <div className="flex-1 overflow-y-auto py-2">
              {(() => {
                const displayPlaces = showContributionsOnly
                  ? filterPlacesByUser(
                      places.filter((p) => (p.source || 'contribution') === 'contribution'),
                      user
                    )
                  : filterPlacesByUser(
                      places.filter((p) => (p.source || 'contribution') === 'saved'),
                      user
                    )
                return displayPlaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 px-6 text-center">
                  <svg className="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm font-medium">
                    {showContributionsOnly ? 'No contributions yet' : 'No saved places yet'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {showContributionsOnly
                      ? 'Use "Add a missing place" in the menu to contribute.'
                      : 'Save places from search results using the bookmark icon.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {displayPlaces.map((place) => (
                    <li key={place.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                      {/* Category icon dot */}
                      <div className="mt-1 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{place.place_name_en || place.name}</p>
                        {place.place_name_local && place.place_name_local !== place.place_name_en && (
                          <p className="text-xs text-slate-500 truncate">{place.place_name_local}</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-primary-600 bg-primary-50 rounded px-1.5 py-0.5 font-medium">{place.category}</span>
                          <button
                            onClick={() => {
                              setShowMyPlaces(false)
                              if (mapRef.current?.flyTo) {
                                mapRef.current.flyTo({
                                  center: [place.longitude, place.latitude],
                                  zoom: place.zoomLevel || 15,
                                  duration: 800,
                                })
                              }
                            }}
                            className="text-xs text-slate-400 hover:text-primary-600 transition-colors"
                          >
                            View on map
                          </button>
                        </div>
                      </div>
                      {/* Delete button - only in Your contributions */}
                      {showContributionsOnly && (
                        <button
                          onClick={() => handleDeletePlace(place.id)}
                          disabled={deletingPlaceId === place.id}
                          className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-40"
                          title="Delete place"
                          aria-label="Delete place"
                        >
                          {deletingPlaceId === place.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
