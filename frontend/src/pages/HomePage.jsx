import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslate, useLanguage, getAllLanguages } from 'atozas-traslate'
import { useAuth } from '../contexts/AuthContext'
import MapComponent from '../components/MapComponent'
import SearchBar from '../components/SearchBar'
import RoutePanel from '../components/RoutePanel'
import AddPlaceModal, { PLACE_CATEGORIES } from '../components/AddPlaceModal'
import AddPlaceMethodModal from '../components/AddPlaceMethodModal'
import PlaceDetailPanel from '../components/PlaceDetailPanel'
import PlaceExtractPanel from '../components/PlaceExtractPanel'
import TranslatedLabel from '../components/TranslatedLabel'
import AppLogo from '../components/AppLogo'
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

const normalizeCategory = (category) => {
  const value = String(category || '').trim()
  return value || 'Other'
}

const categoryKey = (c) => normalizeCategory(c).toLowerCase()

const placeMatchesCategories = (place, selectedCategories) => {
  if (selectedCategories.length === 0) return true
  const cat = categoryKey(place.category)
  return selectedCategories.some((s) => categoryKey(s) === cat)
}

const buildCategoryOptions = (placesList) => {
  const counts = new Map()
  placesList.forEach((place) => {
    const category = normalizeCategory(place.category)
    counts.set(category, (counts.get(category) || 0) + 1)
  })

  const prioritized = PLACE_CATEGORIES
    .filter((category) => counts.has(category))
    .map((category) => ({ category, count: counts.get(category) || 0 }))

  const extras = [...counts.entries()]
    .filter(([category]) => !PLACE_CATEGORIES.includes(category))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, count]) => ({ category, count }))

  return [...prioritized, ...extras]
}

/** Pin colors for SearchBar category chips (hotels, ATM, …) — Google-style hues */
const SEARCH_CHIP_MARKER_COLORS = {
  restaurants: '#EA4335',
  hotels: '#F59E0B',
  museums: '#14B8A6',
  transit: '#2563EB',
  pharmacies: '#10B981',
  atm: '#15803D',
}

const MAX_CATEGORY_EXPLORE_RESULTS = 50

const HomePage = () => {
  const { language, setLanguage } = useLanguage()
  const { user, logout, updateProfilePicture, isAuthenticated } = useAuth()
  const mapRef = useRef(null)
  const [showRoutePanel, setShowRoutePanel] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false)
  const [addPlaceExcludeId, setAddPlaceExcludeId] = useState(null)
  const [showAddPlaceMethodModal, setShowAddPlaceMethodModal] = useState(false)
  const [addPlaceLocationMethod, setAddPlaceLocationMethod] = useState(null)
  const [mapLocation, setMapLocation] = useState(null)
  const [allPlaces, setAllPlaces] = useState([])
  const [visiblePlaces, setVisiblePlaces] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [loadingCategoryPlaces, setLoadingCategoryPlaces] = useState(false)
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
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [routePanelEndPlace, setRoutePanelEndPlace] = useState(null)
  const profileFileInputRef = useRef(null)
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [shareModal, setShareModal] = useState(null)
  const [showExtractPanel, setShowExtractPanel] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [pendingLanguage, setPendingLanguage] = useState('en')
  const [categoryExplorePlaces, setCategoryExplorePlaces] = useState([])
  const [mapReadyTick, setMapReadyTick] = useState(0)
  const exploreCategoryRef = useRef(null)
  const exploreMoveDebounceRef = useRef(null)
  const hasInitialAutoCenterRef = useRef(false)

  const menuShowSidebar = useTranslate('Show side bar')
  const menuSaved = useTranslate('Saved')
  const menuRecents = useTranslate('Recents')
  const menuYourContributions = useTranslate('Your contributions')
  const menuLocationSharing = useTranslate('Location sharing')
  const menuPrint = useTranslate('Print')
  const menuAddMissingPlace = useTranslate('Add a missing place')
  const menuExtractPlaces = useTranslate('Extract Places')
  const menuLanguage = useTranslate('Language')
  const menuLogout = useTranslate('Logout')
  const menuTapPhotoHint = useTranslate('Tap photo to change')
  const languageModalTitle = useTranslate('App language')
  const languageModalHint = useTranslate(
    'Pick a language, then tap Apply. Menu and labels update after a short load.'
  )
  const applyButtonLabel = useTranslate('Apply')
  const navAppTitle = useTranslate('UMNAAPP')
  const navAddPlace = useTranslate('Add Place')
  const navAddPlaceTitle = useTranslate('Add a new place')
  const navMenuAria = useTranslate('Menu')
  const filterAll = useTranslate('All')
  const filterLoading = useTranslate('Loading filtered places...')
  const filterEmpty = useTranslate('No places found for the selected categories.')
  const filterResults = useTranslate('Results')
  const filterPlacesCount = useTranslate('places')
  const ariaClose = useTranslate('Close')
  const myPlacesViewOnMap = useTranslate('View on map')

  const allLanguages = useMemo(() => getAllLanguages(), [])

  useEffect(() => {
    if (showLanguageModal) {
      setPendingLanguage(language)
    }
  }, [showLanguageModal, language])

  const fetchCategoryExplorePlaces = useCallback(async (cat) => {
    if (!cat?.query) {
      setCategoryExplorePlaces([])
      return
    }
    const map = mapRef.current?.getMap?.()
    if (!map) return
    const center = map.getCenter()
    const bounds = map.getBounds()
    const q = `${cat.query} near ${center.lat.toFixed(4)},${center.lng.toFixed(4)}`
    try {
      const { data } = await api.get('/map/search-simple', { params: { q } })
      const raw = Array.isArray(data.results) ? data.results : []
      const valid = raw.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
      const inView = valid.filter((r) => bounds.contains([r.lng, r.lat]))
      const pool = inView.length > 0 ? inView : valid
      const color = SEARCH_CHIP_MARKER_COLORS[cat.id] || '#EA4335'
      setCategoryExplorePlaces(
        pool.slice(0, MAX_CATEGORY_EXPLORE_RESULTS).map((r) => ({ ...r, markerColor: color }))
      )
    } catch (err) {
      console.warn('Category explore search failed:', err)
      setCategoryExplorePlaces([])
    }
  }, [])

  const handleCategoryExploreChange = useCallback(
    (cat) => {
      exploreCategoryRef.current = cat && !cat.isAction ? cat : null
      if (!cat?.query) {
        setCategoryExplorePlaces([])
        return
      }
      fetchCategoryExplorePlaces(cat)
    },
    [fetchCategoryExplorePlaces]
  )

  useEffect(() => {
    if (mapReadyTick === 0) return
    const map = mapRef.current?.getMap?.()
    if (!map) return

    const onMoveEnd = () => {
      const cat = exploreCategoryRef.current
      if (!cat?.query) return
      if (exploreMoveDebounceRef.current) clearTimeout(exploreMoveDebounceRef.current)
      exploreMoveDebounceRef.current = setTimeout(() => {
        fetchCategoryExplorePlaces(cat)
      }, 500)
    }

    map.on('moveend', onMoveEnd)
    return () => {
      map.off('moveend', onMoveEnd)
      if (exploreMoveDebounceRef.current) clearTimeout(exploreMoveDebounceRef.current)
    }
  }, [mapReadyTick, fetchCategoryExplorePlaces])

  // First GPS fix: center on user once — but not if they already have saved places (map fits to those pins).
  useEffect(() => {
    if (mapReadyTick === 0) return
    if (hasInitialAutoCenterRef.current) return
    if (allPlaces.length > 0) {
      hasInitialAutoCenterRef.current = true
      return
    }
    if (!Number.isFinite(currentLocation?.lat) || !Number.isFinite(currentLocation?.lng)) return
    if (!mapRef.current?.flyTo) return
    const map = mapRef.current?.getMap?.()
    const center = map?.getCenter?.()
    if (center) {
      const isAlreadyCentered =
        Math.abs(center.lat - currentLocation.lat) < 0.0002
        && Math.abs(center.lng - currentLocation.lng) < 0.0002
      if (isAlreadyCentered) {
        hasInitialAutoCenterRef.current = true
        return
      }
    }

    hasInitialAutoCenterRef.current = true
    mapRef.current.flyTo({
      center: [currentLocation.lng, currentLocation.lat],
      zoom: 16,
      duration: 900,
    })
  }, [mapReadyTick, currentLocation, allPlaces.length])

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    setAvailableCategories(buildCategoryOptions(allPlaces))
  }, [allPlaces])

  const refreshPlacesFromDb = useCallback(async () => {
    try {
      const { data } = await api.get('/map/places')
      setAllPlaces(Array.isArray(data.places) ? data.places : [])
    } catch (err) {
      console.error('Failed to fetch places:', err)
    }
  }, [])

  // Load saved places from DB when session is valid; clear when logged out
  useEffect(() => {
    if (!isAuthenticated) {
      setAllPlaces([])
      return
    }
    refreshPlacesFromDb()
  }, [isAuthenticated, refreshPlacesFromDb])

  const handleMapReady = useCallback(() => {
    setMapReadyTick((t) => t + 1)
    if (isAuthenticated) refreshPlacesFromDb()
  }, [isAuthenticated, refreshPlacesFromDb])

  // Derive map markers from allPlaces only so newly added places always appear once categories align
  // (avoids overwriting visiblePlaces after bulk add / extract).
  useEffect(() => {
    if (selectedCategories.length === 0) {
      setVisiblePlaces(allPlaces)
    } else {
      setVisiblePlaces(allPlaces.filter((place) => placeMatchesCategories(place, selectedCategories)))
    }
    setLoadingCategoryPlaces(false)
  }, [allPlaces, selectedCategories])

  const toggleCategoryFilter = (category) => {
    const normalized = normalizeCategory(category)
    setSelectedCategories((prev) => (
      prev.includes(normalized)
        ? prev.filter((item) => item !== normalized)
        : [...prev, normalized]
    ))
  }

  const clearCategoryFilters = () => {
    setSelectedCategories([])
  }

  const focusPlaceFromResults = (place) => {
    if (!place) return
    setSelectedPlace({ ...place, _isDbPlace: true })
    if (mapRef.current?.flyTo) {
      mapRef.current.flyTo({
        center: [place.longitude, place.latitude],
        zoom: Math.max(14, place.zoomLevel || 14),
        duration: 700,
      })
    }
  }

  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploadingPicture(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      const result = await updateProfilePicture(dataUrl)
      if (!result.success) showToast(result.error || 'Failed to update photo', 'error')
    } catch {
      showToast('Failed to process image', 'error')
    } finally {
      setUploadingPicture(false)
      e.target.value = ''
    }
  }

  const handlePrint = () => {
    setShowMenu(false)
    const map = mapRef.current?.getMap?.()
    if (!map) {
      showToast('Map not ready', 'error')
      return
    }
    try {
      const canvas = map.getCanvas()
      const dataUrl = canvas.toDataURL('image/png')
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        showToast('Please allow popups to print', 'error')
        return
      }
      printWindow.document.write(`<!DOCTYPE html>
<html><head><title>UMNAAPP - Map Print</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .title { font-size: 20px; font-weight: 700; color: #1e293b; }
  .date { font-size: 12px; color: #64748b; }
  .map-img { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
    .map-img { border-radius: 0; border: none; }
  }
</style></head><body>
<div class="header">
  <span class="title">UMNAAPP</span>
  <span class="date">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
</div>
<img class="map-img" src="${dataUrl}" alt="Map" onload="window.print();" />
</body></html>`)
      printWindow.document.close()
    } catch {
      showToast('Failed to capture map for printing', 'error')
    }
  }

  const handleLocationSharing = () => {
    setShowMenu(false)
    const map = mapRef.current?.getMap?.()
    const center = map?.getCenter()
    const zoom = map ? Math.round(map.getZoom()) : 15
    const lat = center ? center.lat.toFixed(6) : currentLocation?.lat?.toFixed(6)
    const lng = center ? center.lng.toFixed(6) : currentLocation?.lng?.toFixed(6)
    if (!lat || !lng) {
      showToast('Location not available', 'error')
      return
    }
    const appUrl = `https://umnaapptst.testatozas.in/?lat=${lat}&lng=${lng}&z=${zoom}`
    const text = `Check out this location on UMNAAPP`
    const shareText = `${text}\n${appUrl}`

    if (navigator.share) {
      navigator.share({ title: 'UMNAAPP - Shared Location', text: shareText, url: appUrl })
        .catch(() => {})
    } else {
      setShareModal({ lat, lng, zoom, appUrl, text, shareText })
    }
  }

  const copyShareLink = (link) => {
    navigator.clipboard.writeText(link).then(
      () => showToast('Link copied!', 'success'),
      () => showToast('Failed to copy', 'error')
    )
  }

  const openAddPlace = () => {
    setShowMenu(false)
    setMapLocation(null)
    setAddPlacePickMode(false)
    setAddPlaceLocationMethod(null)
    setShowAddPlaceMethodModal(true)
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
      setAllPlaces((prev) => [data, ...prev.filter((place) => place.id !== data.id)])
      if (placeMatchesCategories(data, selectedCategories)) {
        setVisiblePlaces((prev) => [data, ...prev.filter((place) => place.id !== data.id)])
      }
      setShowMenu(false)
      setShowContributionsOnly(false)
      setShowMyPlaces(true)
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Failed to save'
      showToast(msg, 'error')
    } finally {
      setSavingPlaceId(null)
    }
  }

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
    setAllPlaces((prev) => [place, ...prev.filter((item) => item.id !== place.id)])
    if (placeMatchesCategories(place, selectedCategories)) {
      setVisiblePlaces((prev) => [place, ...prev.filter((item) => item.id !== place.id)])
    }
    if (place?.approvalStatus === 'pending') {
      showToast('Place submitted. Only you can see it on the map until it is approved (auto after 10 days).', 'info')
    }
    if (mapRef.current?.flyTo) {
      mapRef.current.flyTo({
        center: [place.longitude, place.latitude],
        zoom: place.zoomLevel || 15,
        duration: 1000,
      })
    }
  }

  const handleSearchSelect = async (location) => {
    // UUID placeId → could be own place or another user's place
    if (location.placeId && /^[0-9a-f-]{36}$/.test(String(location.placeId))) {
      // Try own places cache first (instant)
      const cached = allPlaces.find((p) => String(p.id) === String(location.placeId))
      if (cached) {
        setSelectedPlace({ ...cached, _isDbPlace: true })
        if (mapRef.current?.flyTo) {
          mapRef.current.flyTo({ center: [cached.longitude, cached.latitude], zoom: cached.zoomLevel || 15, duration: 800 })
        }
        return
      }
      // Fetch from server (another user's place)
      try {
        const { data } = await api.get(`/map/places/${location.placeId}`)
        setSelectedPlace({ ...data, _isDbPlace: true })
        if (mapRef.current?.flyTo) {
          mapRef.current.flyTo({ center: [data.longitude, data.latitude], zoom: data.zoomLevel || 15, duration: 800 })
        }
        return
      } catch {
        // Fall through to normal fly-to
      }
    }
    // Regular nominatim/OSM result — just fly to location
    if (mapRef.current?.showSearchedLocation) {
      mapRef.current.showSearchedLocation(location)
      return
    }
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [location.lng, location.lat], zoom: 15, duration: 1000 })
    }
  }

  const handlePlaceDirections = (place) => {
    setSelectedPlace(null)
    setRoutePanelEndPlace({ lat: place.latitude, lng: place.longitude, name: place.place_name_en || place.name })
    setShowRoutePanel(true)
  }

  const handlePlaceEdit = (place) => {
    setSelectedPlace(null)
    setAddPlaceExcludeId(place?.id != null ? place.id : null)
    setMapLocation({
      name: place.place_name_en || place.name,
      category: place.category,
      latitude: place.latitude,
      longitude: place.longitude,
      zoomLevel: place.zoomLevel || 15,
    })
    setShowAddPlaceModal(true)
  }

  const handlePlaceSaveFromPanel = async (place) => {
    const placeKey = `${place.latitude}-${place.longitude}`
    if (savingPlaceId === placeKey) return
    setSavingPlaceId(placeKey)
    try {
      const { data } = await api.post('/map/places', {
        place_name_en: place.place_name_en || place.name,
        place_name_local: place.place_name_local || '',
        category: place.category || 'Other',
        latitude: place.latitude,
        longitude: place.longitude,
        zoomLevel: place.zoomLevel || 15,
        source: 'saved',
      })
      setAllPlaces((prev) => [data, ...prev.filter((item) => item.id !== data.id)])
      if (placeMatchesCategories(data, selectedCategories)) {
        setVisiblePlaces((prev) => [data, ...prev.filter((item) => item.id !== data.id)])
      }
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Failed to save'
      showToast(msg, 'error')
    } finally {
      setSavingPlaceId(null)
    }
  }

  const handleCalculateRoute = async (start, end, waypoints = [], profile = 'driving') => {
    if (mapRef.current?.calculateRoute) {
      try {
        await mapRef.current.calculateRoute(start, end, waypoints, profile)
      } catch (error) {
        console.error('Route calculation failed:', error)
      }
    }
  }

  const handleAddExtractedPlaces = async (selected) => {
    const { data } = await api.post('/map/places/bulk', { places: selected })
    if (data.places?.length > 0) {
      setAllPlaces((prev) => [...data.places, ...prev])
      const matchingPlaces = data.places.filter((place) => placeMatchesCategories(place, selectedCategories))
      if (matchingPlaces.length > 0) {
        setVisiblePlaces((prev) => [...matchingPlaces, ...prev])
      }
    }
    if (data.places?.[0]) {
      mapRef.current?.flyTo?.({
        center: [data.places[0].longitude, data.places[0].latitude],
        zoom: 12,
        duration: 1000,
      })
    }
    showToast(
      data.added > 0
        ? `Added ${data.added} places (${data.skipped} skipped). They stay private until approved.`
        : `Added ${data.added} places (${data.skipped} skipped)`,
      data.added > 0 ? 'success' : 'info'
    )
    return data
  }

  const handleLogout = async () => {
    logout()
    window.location.href = '/'
  }

  const handleDeletePlace = async (placeId) => {
    setDeletingPlaceId(placeId)
    try {
      await api.delete(`/map/places/${placeId}`)
      setAllPlaces((prev) => prev.filter((p) => p.id !== placeId))
      setVisiblePlaces((prev) => prev.filter((p) => p.id !== placeId))
      setSelectedPlace((prev) => (prev?.id === placeId ? null : prev))
      showToast('Place deleted successfully.', 'success')
    } catch (err) {
      console.error('Delete place error:', err)
      showToast('Failed to delete place. Please try again.', 'error')
    } finally {
      setDeletingPlaceId(null)
    }
  }

  const confirmDeletePlace = (placeId, placeName) => {
    setConfirmModal({
      title: 'Delete this place?',
      message: `Are you sure you want to delete "${placeName}" from the map? This cannot be undone.`,
      onConfirm: () => { setConfirmModal(null); handleDeletePlace(placeId) },
      onCancel: () => setConfirmModal(null),
    })
  }

  return (
    <div className="h-screen flex flex-col relative overflow-hidden safe-area-inset">

      {/* ── Toast notification ── */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-white text-sm font-medium transition-all animate-fade-in max-w-xs w-full mx-4
          ${ toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-slate-700' }`}>
          <span className="text-lg flex-shrink-0">
            {toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : 'ℹ️'}
          </span>
          <span className="flex-1 leading-snug">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100 text-lg leading-none">✕</button>
        </div>
      )}

      {/* ── Confirm modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={confirmModal.onCancel}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{confirmModal.title}</h3>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={confirmModal.onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Navbar - Logo, Menu icon, Add Place (My Places & Logout in menu) */}
      <nav className="absolute top-0 left-0 right-0 z-30 glass border-b border-white/30 pt-[env(safe-area-inset-top)] shadow-lg">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          {/* Logo + Hamburger */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Hamburger menu icon */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2.5 sm:p-2 rounded-xl hover:bg-white/60 active:bg-white/80 transition-colors text-slate-600 flex items-center justify-center min-h-[44px] sm:min-h-0"
              aria-label={navMenuAria}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            </button>
            <h1 className="m-0 min-w-0 flex items-center gap-2">
              <AppLogo
                decorative
                imgClassName="h-7 w-auto max-h-8 sm:h-8 sm:max-h-9 object-contain flex-shrink-0"
              />
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-600 via-primary-700 to-primary-900 bg-clip-text text-transparent truncate">
                {navAppTitle}
              </span>
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
                  setAddPlaceLocationMethod(null)
                  setShowAddPlaceMethodModal(true)
                }
              }}
              className={`flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 font-medium text-sm transition-all duration-200 shrink-0 min-h-[44px] sm:min-h-0 ${
                addPlacePickMode
                  ? 'bg-primary-100 border-2 border-primary-400 text-primary-700 shadow-md'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl border border-primary-400/30'
              }`}
              title={navAddPlaceTitle}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">{navAddPlace}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Search Bar + Categories - positioned below navbar (safe-area + ~4.5rem) */}
      <div className="absolute left-2 right-14 sm:right-auto sm:left-4 sm:right-4 z-20 sm:max-w-xl" style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }}>
        <SearchBar
          userPlaces={allPlaces}
          onSelect={handleSearchSelect}
          onRoute={() => setShowRoutePanel(!showRoutePanel)}
          onResultsChange={() => {}}
          onCategoryExploreChange={handleCategoryExploreChange}
          onSavePlace={handleSavePlaceFromSearch}
          savingPlaceId={savingPlaceId}
        />
        <div className="mt-2 glass rounded-2xl border border-white/40 shadow-lg px-2 py-2">
          <div className="flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
            <button
              onClick={clearCategoryFilters}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                selectedCategories.length === 0
                  ? 'border-primary-500 bg-primary-600 text-white shadow-md'
                  : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-white'
              }`}
            >
              {filterAll}
            </button>

            {availableCategories.map(({ category, count }) => {
              const selected = selectedCategories.includes(category)
              return (
                <button
                  key={category}
                  onClick={() => toggleCategoryFilter(category)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                    selected
                      ? 'border-primary-500 bg-primary-600 text-white shadow-md'
                      : 'border-slate-200 bg-white/80 text-slate-700 hover:border-primary-200 hover:bg-primary-50'
                  }`}
                >
                  <TranslatedLabel text={category} />
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                    selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {(loadingCategoryPlaces || (selectedCategories.length > 0 && visiblePlaces.length === 0)) && (
            <div className="px-2 pt-2 text-xs text-slate-500">
              {loadingCategoryPlaces ? filterLoading : filterEmpty}
            </div>
          )}

          {selectedCategories.length > 0 && visiblePlaces.length > 0 && (
            <div className="px-2 pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {filterResults}
                </p>
                <p className="text-[11px] text-slate-500">
                  {visiblePlaces.length} {filterPlacesCount}
                </p>
              </div>
              <div className="max-h-44 overflow-y-auto pr-1 space-y-1.5 scrollbar-hide">
                {visiblePlaces.slice(0, 8).map((place) => (
                  <button
                    key={place.id}
                    onClick={() => focusPlaceFromResults(place)}
                    className="w-full text-left bg-white/85 hover:bg-white rounded-xl border border-slate-200 px-3 py-2 transition-colors"
                  >
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {place.place_name_en || place.name}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full truncate">
                        <TranslatedLabel text={place.category || 'Other'} />
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Place Method Selection Modal */}
      <AddPlaceMethodModal
        isOpen={showAddPlaceMethodModal}
        onClose={() => setShowAddPlaceMethodModal(false)}
        currentLocation={currentLocation}
        onSelectMapPick={() => {
          setShowAddPlaceMethodModal(false)
          setAddPlacePickMode(true)
        }}
        onUseCurrentLocation={async () => {
          setShowAddPlaceMethodModal(false)
          if (currentLocation?.lat != null && currentLocation?.lng != null) {
            const details = await fetchPlaceDetails({
              latitude: currentLocation.lat,
              longitude: currentLocation.lng,
              zoomLevel: 15,
            })
            setMapLocation(details)
            setAddPlaceLocationMethod('map-or-current')
            setShowAddPlaceModal(true)
          }
        }}
        onSelectManualCoords={() => {
          setShowAddPlaceMethodModal(false)
          setAddPlaceLocationMethod('manual-coords')
          setShowAddPlaceModal(true)
        }}
      />

      {/* Add Place Modal */}
      <AddPlaceModal
        isOpen={showAddPlaceModal}
        onClose={() => {
          setShowAddPlaceModal(false)
          setMapLocation(null)
          setAddPlacePickMode(false)
          setAddPlaceLocationMethod(null)
          setAddPlaceExcludeId(null)
        }}
        initialData={null}
        mapLocation={mapLocation}
        currentLocation={currentLocation}
        initialLocationMethod={addPlaceLocationMethod}
        existingPlaces={allPlaces}
        excludePlaceId={addPlaceExcludeId}
        onRequestMapPick={() => {
          setShowAddPlaceModal(false)
          setAddPlacePickMode(true)
        }}
        onSaved={handlePlaceSaved}
      />

      {/* Route Panel - LEFT side popup like Google Maps */}
      {showRoutePanel && (
        <div className="absolute inset-0 z-40 flex pointer-events-none" style={{ top: 0 }}>
          {/* Backdrop - only on mobile */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto sm:hidden"
            onClick={() => {
              setShowRoutePanel(false)
              setRouteStartPlace(null)
              setRouteEndPlace(null)
              setRoutePanelEndPlace(null)
            }}
          />
          {/* Panel - left side */}
          <div className="relative pointer-events-auto w-full max-w-[min(100vw,24rem)] sm:max-w-sm h-full bg-white shadow-2xl flex flex-col animate-fade-in pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" style={{ marginTop: 'calc(env(safe-area-inset-top) + 3.5rem)' }}>
            <RoutePanel
              mapRef={mapRef}
              currentLocation={currentLocation}
              onCalculateRoute={handleCalculateRoute}
              initialEndPlace={routePanelEndPlace}
              onClose={() => {
                setShowRoutePanel(false)
                setRouteStartPlace(null)
                setRouteEndPlace(null)
                setRoutePanelEndPlace(null)
              }}
              onSearchResultsChange={() => {}}
              onRoutePlacesChange={(start, end) => {
                setRouteStartPlace(start)
                setRouteEndPlace(end)
              }}
            />
          </div>
        </div>
      )}

      {/* Location picker crosshair + hint */}
      {addPlacePickMode && (
        <>
          {/* Centered "+" crosshair on the map */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-primary-500/15 flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-primary-600 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom hint bar */}
          <div className="absolute bottom-20 left-2 right-2 sm:left-4 sm:right-auto z-20 glass rounded-xl px-4 py-3 shadow-lg animate-fade-in max-w-md pb-[env(safe-area-inset-bottom)] sm:pb-3">
            <p className="text-sm font-medium text-slate-700">
              {fetchingPlaceDetails ? 'Fetching place details...' : 'Tap on the map to select a place'}
            </p>
            <button
              onClick={() => { setAddPlacePickMode(false); setFetchingPlaceDetails(false) }}
              className="mt-2 text-xs text-primary-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Map Container */}
      <div className="flex-1 w-full relative">
        <MapComponent
          ref={mapRef}
          onLocationUpdate={handleLocationUpdate}
          onMapClick={handleMapClickForPlace}
          onMapReady={handleMapReady}
          addPlaceMode={addPlacePickMode || showAddPlaceModal}
          places={allPlaces}
          searchResultPlaces={categoryExplorePlaces}
          autoFitSearchResults={false}
          routeStartPlace={routeStartPlace}
          routeEndPlace={routeEndPlace}
        />
      </div>

      {/* Place Detail Panel - opens when a contributed/saved place is selected from search */}
      {selectedPlace && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <PlaceDetailPanel
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onDirections={handlePlaceDirections}
            onSave={handlePlaceSaveFromPanel}
            onEdit={handlePlaceEdit}
            onDelete={(placeId) => confirmDeletePlace(placeId, selectedPlace?.place_name_en || selectedPlace?.name || 'this place')}
            currentUser={user}
            deletingId={deletingPlaceId}
            isSaved={allPlaces.some(
              (p) =>
                p.userId === user?.id &&
                (p.id === selectedPlace.id ||
                  (Math.abs(p.latitude - selectedPlace.latitude) < 0.0001 &&
                    Math.abs(p.longitude - selectedPlace.longitude) < 0.0001))
            )}
          />
        </div>
      )}

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
              <h1 className="m-0 flex min-w-0 items-center gap-2.5 pr-2">
                <AppLogo
                  decorative
                  imgClassName="h-8 w-auto max-h-9 object-contain flex-shrink-0"
                />
                <span className="text-lg font-bold bg-gradient-to-r from-primary-600 via-primary-700 to-primary-900 bg-clip-text text-transparent truncate">
                  {navAppTitle}
                </span>
              </h1>
              <button
                onClick={() => setShowMenu(false)}
                className="p-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors touch-manipulation"
                aria-label={ariaClose}
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
                      <p className="text-xs text-primary-600 mt-0.5">{menuTapPhotoHint}</p>
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
                    <span className="text-sm font-medium text-slate-800">{menuShowSidebar}</span>
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
                  <span className="text-sm font-medium text-slate-800">{menuSaved}</span>
                  <span className="text-xs font-medium bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 ml-auto">
                  {allPlaces.filter((p) => (p.source || 'contribution') === 'saved').length}
                </span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation opacity-60">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span className="text-sm text-slate-500">{menuRecents}</span>
                </button>
                <button
                  onClick={() => { setShowMenu(false); setShowContributionsOnly(true); setShowMyPlaces(true); }}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">{menuYourContributions}</span>
                  <span className="text-xs font-medium bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 ml-auto">
                    {filterPlacesByUser(
                      allPlaces.filter((p) => (p.source || 'contribution') === 'contribution'),
                      user
                    ).length}
                  </span>
                </button>
                <button
                  onClick={handleLocationSharing}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">{menuLocationSharing}</span>
                </button>

              </div>

              {/* Section 3: Map actions */}
              <div className="border-b border-slate-200 py-2">
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5M9 21V5a2 2 0 012-2h2a2 2 0 012 2v4m2 4a2 2 0 01-2 2H9" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">{menuPrint}</span>
                </button>
                <button
                  onClick={openAddPlace}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <span className="text-sm font-medium text-slate-800">{menuAddMissingPlace}</span>
                </button>
                <button
                  onClick={() => { setShowMenu(false); setShowExtractPanel(true) }}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">{menuExtractPlaces}</span>
                </button>
              </div>

              {/* Section 4: Settings */}
              <div className="border-b border-slate-200 py-2">
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); setShowLanguageModal(true) }}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">{menuLanguage}</span>
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
                  <span className="text-sm font-medium text-slate-700">{menuLogout}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLanguageModal && (
        <div
          className="fixed inset-0 z-[450] flex items-center justify-center p-4"
          onClick={() => setShowLanguageModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="language-modal-title"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 id="language-modal-title" className="text-base font-bold text-slate-800">
                {languageModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">{languageModalHint}</p>
            <label className="sr-only" htmlFor="atozas-language-selector">
              {menuLanguage}
            </label>
            <select
              id="atozas-language-selector"
              value={pendingLanguage}
              onChange={(e) => setPendingLanguage(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {allLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setLanguage(pendingLanguage)
                setShowLanguageModal(false)
              }}
              className="w-full mt-4 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-700 active:bg-primary-800"
            >
              {applyButtonLabel}
            </button>
          </div>
        </div>
      )}

      {/* Share Location fallback modal (desktop / unsupported browsers) */}
      {shareModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={() => setShareModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">Share Location</h3>
              <button onClick={() => setShareModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-1">Coordinates: {shareModal.lat}, {shareModal.lng}</p>
            {/* Copy link */}
            <button
              onClick={() => { copyShareLink(shareModal.appUrl); setShareModal(null) }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left mb-1"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              </div>
              <span className="text-sm font-medium text-slate-700">Copy link</span>
            </button>
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareModal.shareText)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => setShareModal(null)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left mb-1"
            >
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <span className="text-sm font-medium text-slate-700">WhatsApp</span>
            </a>
            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareModal.appUrl)}&text=${encodeURIComponent(shareModal.text)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => setShareModal(null)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left mb-1"
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </div>
              <span className="text-sm font-medium text-slate-700">Telegram</span>
            </a>
            {/* Email */}
            <a
              href={`mailto:?subject=${encodeURIComponent('UMNAAPP - Shared Location')}&body=${encodeURIComponent(shareModal.shareText)}`}
              onClick={() => setShareModal(null)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left mb-1"
            >
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <span className="text-sm font-medium text-slate-700">Email</span>
            </a>
            {/* SMS */}
            <a
              href={`sms:?body=${encodeURIComponent(shareModal.shareText)}`}
              onClick={() => setShareModal(null)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <span className="text-sm font-medium text-slate-700">SMS</span>
            </a>
          </div>
        </div>
      )}

      {/* Place Extract Panel */}
      <PlaceExtractPanel
        isOpen={showExtractPanel}
        onClose={() => setShowExtractPanel(false)}
        onAddToMap={handleAddExtractedPlaces}
      />

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
                        allPlaces.filter((p) => (p.source || 'contribution') === 'contribution'),
                        user
                      ).length
                    : filterPlacesByUser(
                        allPlaces.filter((p) => (p.source || 'contribution') === 'saved'),
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
                      allPlaces.filter((p) => (p.source || 'contribution') === 'contribution'),
                      user
                    )
                  : filterPlacesByUser(
                      allPlaces.filter((p) => (p.source || 'contribution') === 'saved'),
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
                          <span className="text-xs text-primary-600 bg-primary-50 rounded px-1.5 py-0.5 font-medium">
                            <TranslatedLabel text={place.category} />
                          </span>
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
                            {myPlacesViewOnMap}
                          </button>
                        </div>
                      </div>
                      {/* Delete button - only in Your contributions */}
                      {showContributionsOnly && (
                        <button
                          onClick={() => confirmDeletePlace(place.id, place.place_name_en || place.name || 'this place')}
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
