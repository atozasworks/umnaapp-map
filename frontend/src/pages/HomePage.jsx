import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslate } from '../lib/i18n'
import LanguagePickerModal from '../lib/i18n/LanguagePickerModal'
import { useAuth } from '../contexts/AuthContext'
import MapComponent from '../components/MapComponent'
import MapContextMenu from '../components/MapContextMenu'
import MeasureDistancePanel from '../components/MeasureDistancePanel'
import AskMapsPanel from '../components/AskMapsPanel'
import SearchBar from '../components/SearchBar'
import RoutePanel from '../components/RoutePanel'
import AddPlaceModal, { PLACE_CATEGORIES } from '../components/AddPlaceModal'
import AddPlaceMethodModal from '../components/AddPlaceMethodModal'
import PlaceDetailPanel from '../components/PlaceDetailPanel'
import PlaceExtractPanel from '../components/PlaceExtractPanel'
import DuplicatePlaceModal, { buildDuplicatePopupPayload } from '../components/DuplicatePlaceModal'
import PlaceAddedSuccessModal, { buildPlaceAddedPayload } from '../components/PlaceAddedSuccessModal'
import PolygonExplorePanel from '../components/PolygonExplorePanel'
import TranslatedLabel from '../components/TranslatedLabel'
import AppLogo from '../components/AppLogo'
import NotificationBell from '../components/NotificationBell'
import FeedbackModal from '../components/FeedbackModal'
import OnboardingTour, { hasSeenOnboarding, markOnboardingSeen } from '../components/OnboardingTour'
import api from '../services/api'
import {
  extractMapRenderingConfig,
  withMapRenderingConfig,
} from '../utils/mapRenderingConfig'
import { canDeletePlace, isPlaceOwner } from '../utils/placeOwnership'
import { getAppOrigin } from '../utils/apiBase'
import { extractPlaceNameFromDisplay } from '../utils/formatAddress'

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
  return placesList.filter((p) => isPlaceOwner(p, currentUser))
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


const HomePage = () => {
  const { user, logout, updateProfilePicture, isAuthenticated } = useAuth()
  const navigateTo = useNavigate()
  const mapRef = useRef(null)
  const [showRoutePanel, setShowRoutePanel] = useState(false)
  const [showAskMapsPanel, setShowAskMapsPanel] = useState(false)
  const [askMapsPlaces, setAskMapsPlaces] = useState([])
  const [currentLocation, setCurrentLocation] = useState(null)
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false)
  const [addPlaceExcludeId, setAddPlaceExcludeId] = useState(null)
  const [showAddPlaceMethodModal, setShowAddPlaceMethodModal] = useState(false)
  const [addPlaceLocationMethod, setAddPlaceLocationMethod] = useState(null)
  const [mapLocation, setMapLocation] = useState(null)
  const [allPlaces, setAllPlaces] = useState([])
  const [visiblePlaces, setVisiblePlaces] = useState([])
  const [favorites, setFavorites] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [loadingCategoryPlaces, setLoadingCategoryPlaces] = useState(false)
  const [routeStartPlace, setRouteStartPlace] = useState(null)
  const [routeEndPlace, setRouteEndPlace] = useState(null)
  const [routeStops, setRouteStops] = useState([])
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
  const [routePanelStartPlace, setRoutePanelStartPlace] = useState(null)
  const [mapContextMenu, setMapContextMenu] = useState(null)
  const [measureDistanceActive, setMeasureDistanceActive] = useState(false)
  const [measureStats, setMeasureStats] = useState({ totalMeters: 0, pointCount: 0 })
  const profileFileInputRef = useRef(null)
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [duplicatePopup, setDuplicatePopup] = useState(null)
  const [successPopup, setSuccessPopup] = useState(null)
  const [shareModal, setShareModal] = useState(null)
  const [showExtractPanel, setShowExtractPanel] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mapReadyTick, setMapReadyTick] = useState(0)
  const hasInitialAutoCenterRef = useRef(false)
  const [polygonOverlayPlaces, setPolygonOverlayPlaces] = useState([])
  const [polygonMapInteraction, setPolygonMapInteraction] = useState(false)

  const menuShowSidebar = useTranslate('Show side bar')
  const menuSaved = useTranslate('Saved')
  const menuRecents = useTranslate('Recents')
  const menuYourContributions = useTranslate('Your contributions')
  const menuLocationSharing = useTranslate('Location sharing')
  const menuPrint = useTranslate('Print')
  const menuAddMissingPlace = useTranslate('Add a missing place')
  const menuExtractPlaces = useTranslate('Extract Places')
  const menuLanguage = useTranslate('Language')
  const menuFeedback = useTranslate('Feedback')
  const menuLogout = useTranslate('Logout')
  const menuSettings = useTranslate('Settings')
  const menuTapPhotoHint = useTranslate('Tap photo to change')
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
  const menuAreaExplore = useTranslate('Area explore (draw)')
  const menuAskMaps = useTranslate('Ask Maps')

  const closeMapContextMenu = useCallback(() => {
    setMapContextMenu(null)
  }, [])

  // First-time onboarding: show the 3-step tour once per user (after register or Google sign-in).
  useEffect(() => {
    if (!isAuthenticated || !user) return
    const userKey = user.id || user.email
    if (!userKey) return
    if (hasSeenOnboarding(userKey)) return
    const timer = setTimeout(() => setShowOnboarding(true), 350)
    return () => clearTimeout(timer)
  }, [isAuthenticated, user])

  const handleOnboardingClose = useCallback(() => {
    const userKey = user?.id || user?.email
    if (userKey) markOnboardingSeen(userKey)
    setShowOnboarding(false)
  }, [user])

  useEffect(() => {
    if (!measureDistanceActive) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMeasureDistanceActive(false)
        mapRef.current?.clearMeasureDistance?.()
        setMeasureStats({ totalMeters: 0, pointCount: 0 })
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [measureDistanceActive])

  const handleMeasureClear = () => {
    mapRef.current?.clearMeasureDistance?.()
    setMeasureStats({ totalMeters: 0, pointCount: 0 })
  }

  const handleMeasureClose = () => {
    setMeasureDistanceActive(false)
    mapRef.current?.clearMeasureDistance?.()
    setMeasureStats({ totalMeters: 0, pointCount: 0 })
  }

  useEffect(() => {
    const map = mapRef.current?.getMap?.()
    if (!map || !mapContextMenu) return undefined
    const close = () => closeMapContextMenu()
    map.on('movestart', close)
    map.on('zoomstart', close)
    return () => {
      map.off('movestart', close)
      map.off('zoomstart', close)
    }
  }, [mapContextMenu, closeMapContextMenu, mapReadyTick])

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

  const showDuplicatePopup = useCallback((dup, placeName = '') => {
    const payload = buildDuplicatePopupPayload(dup, placeName)
    if (payload) setDuplicatePopup(payload)
  }, [])

  const showPlaceAddedPopup = useCallback((places, opts = {}) => {
    const payload = buildPlaceAddedPayload(places, opts)
    if (payload) setSuccessPopup(payload)
  }, [])

  const flyToExistingPlace = useCallback(
    (placeId) => {
      if (!placeId) return
      const existing = allPlaces.find((p) => String(p.id) === String(placeId))
      if (existing && mapRef.current?.flyTo) {
        mapRef.current.flyTo({
          center: [existing.longitude, existing.latitude],
          zoom: existing.zoomLevel || 15,
          duration: 800,
        })
      }
    },
    [allPlaces]
  )

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

  const refreshFavoritesFromDb = useCallback(async () => {
    try {
      const { data } = await api.get('/map/favorites')
      setFavorites(Array.isArray(data.favorites) ? data.favorites : [])
    } catch (err) {
      // 503 means migration not run yet — keep favorites empty, log once.
      if (err.response?.status !== 503) {
        console.error('Failed to fetch favorites:', err)
      } else {
        console.warn('Favorites endpoint unavailable (run add-favorites.sql + prisma generate)')
      }
      setFavorites([])
    }
  }, [])

  // Load saved places + favorites from DB when session is valid; clear when logged out
  useEffect(() => {
    if (!isAuthenticated) {
      setAllPlaces([])
      setFavorites([])
      return
    }
    refreshPlacesFromDb()
    refreshFavoritesFromDb()
  }, [isAuthenticated, refreshPlacesFromDb, refreshFavoritesFromDb])

  const handleMapReady = useCallback(() => {
    setMapReadyTick((t) => t + 1)
    if (isAuthenticated) {
      refreshPlacesFromDb()
      refreshFavoritesFromDb()
    }
  }, [isAuthenticated, refreshPlacesFromDb, refreshFavoritesFromDb])

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

  const openPlaceDetail = useCallback(
    async (place, { fly = true } = {}) => {
      if (!place) return
      closeMapContextMenu()
      const isDb = (id) => id && /^[0-9a-f-]{36}$/.test(String(id))
      const apply = (p) => {
        const id = p?.id ?? p?.placeId
        setSelectedPlace({
          ...p,
          id: id ?? p?.id,
          _isDbPlace: isDb(id),
        })
        if (fly && mapRef.current?.flyTo && p?.latitude != null && p?.longitude != null) {
          mapRef.current.flyTo({
            center: [p.longitude, p.latitude],
            zoom: Math.max(14, p.zoomLevel || 14),
            duration: 600,
          })
        }
      }
      apply(place)
      const placeId = place.id ?? place.placeId
      if (!isDb(placeId)) return
      const cached = allPlaces.find((p) => String(p.id) === String(placeId))
      if (cached) apply(cached)
      try {
        const { data } = await api.get(`/map/places/${placeId}`)
        apply(data)
      } catch {
        /* keep cached / marker data */
      }
    },
    [allPlaces, closeMapContextMenu]
  )

  const focusPlaceFromResults = (place) => {
    openPlaceDetail(place, { fly: true })
  }

  const handleNotificationPlaceFocus = useCallback(
    (data) => {
      if (!data) return
      if (data.placeId) {
        const existing = allPlaces.find((p) => String(p.id) === String(data.placeId))
        if (existing) {
          openPlaceDetail(existing, { fly: true })
          return
        }
      }
      if (data.latitude != null && data.longitude != null) {
        openPlaceDetail(
          {
            id: data.placeId,
            placeNameEn: data.placeName,
            name: data.placeName,
            latitude: data.latitude,
            longitude: data.longitude,
            category: data.category,
          },
          { fly: true }
        )
      }
    },
    [allPlaces, openPlaceDetail]
  )

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

  const shareLocationAt = (lat, lng, zoomOverride) => {
    const map = mapRef.current?.getMap?.()
    const zoom = zoomOverride ?? (map ? Math.round(map.getZoom()) : 15)
    const latStr = Number(lat).toFixed(6)
    const lngStr = Number(lng).toFixed(6)
    const appUrl = `${getAppOrigin()}/?lat=${latStr}&lng=${lngStr}&z=${zoom}`
    const text = `Check out this location on UMNAAPP`
    const shareText = `${text}\n${appUrl}`

    if (navigator.share) {
      navigator.share({ title: 'UMNAAPP - Shared Location', text: shareText, url: appUrl })
        .catch(() => {})
    } else {
      setShareModal({ lat: latStr, lng: lngStr, zoom, appUrl, text, shareText })
    }
  }

  const handleLocationSharing = () => {
    setShowMenu(false)
    const map = mapRef.current?.getMap?.()
    const center = map?.getCenter()
    const lat = center ? center.lat : currentLocation?.lat
    const lng = center ? center.lng : currentLocation?.lng
    if (lat == null || lng == null) {
      showToast('Location not available', 'error')
      return
    }
    shareLocationAt(lat, lng)
  }

  const findPlaceNearCoordinates = (lat, lng, thresholdDeg = 0.00045) => {
    return allPlaces.find(
      (p) =>
        Math.abs(p.latitude - lat) < thresholdDeg &&
        Math.abs(p.longitude - lng) < thresholdDeg
    )
  }

  const openAddPlaceAt = async (lat, lng, { category } = {}) => {
    const map = mapRef.current?.getMap?.()
    const zoom = map ? Math.round(map.getZoom()) : 15
    // Open modal immediately so the user sees feedback; enrich location in the background.
    setMapLocation({
      latitude: lat,
      longitude: lng,
      zoomLevel: zoom,
      ...(category ? { category } : {}),
    })
    setAddPlaceLocationMethod('map-or-current')
    setShowAddPlaceModal(true)

    try {
      const details = await fetchPlaceDetails({
        latitude: lat,
        longitude: lng,
        zoomLevel: zoom,
      })
      if (category) {
        details.category = category
      }
      setMapLocation(details)
    } catch (err) {
      console.warn('openAddPlaceAt: failed to load place details', err)
    }
  }

  const handleWhatsHere = async (lat, lng) => {
    try {
      const { data } = await api.get('/map/reverse', { params: { lat, lng } })
      const name = data.displayName || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      const nearbyDb = findPlaceNearCoordinates(lat, lng)
      if (nearbyDb) {
        openPlaceDetail(nearbyDb, { fly: false })
        return
      }
      if (mapRef.current?.showSearchedLocation) {
        mapRef.current.showSearchedLocation({
          lat,
          lng,
          name,
          displayName: name,
        })
      }
    } catch {
      if (mapRef.current?.showSearchedLocation) {
        mapRef.current.showSearchedLocation({
          lat,
          lng,
          name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        })
      }
    }
  }

  const handleSearchNearby = async (lat, lng) => {
    const map = mapRef.current?.getMap?.()
    if (!map) return
    const bounds = map.getBounds()
    const q = `places near ${lat.toFixed(4)},${lng.toFixed(4)}`
    try {
      const { data } = await api.get('/map/search-simple', { params: { q } })
      const raw = Array.isArray(data.results) ? data.results : []
      const valid = raw.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
      const inView = valid.filter((r) => bounds.contains([r.lng, r.lat]))
      const pool = inView.length > 0 ? inView : valid
      setAskMapsPlaces(
        pool.slice(0, 50).map((r) => ({
          ...r,
          markerColor: '#4285F4',
        }))
      )
      if (pool.length === 0) {
        showToast('No nearby places found', 'info')
      } else {
        showToast(`Found ${pool.length} nearby place(s)`, 'success')
      }
    } catch {
      showToast('Search failed. Try again.', 'error')
    }
  }

  const handleMapContextMenuAction = async (actionId) => {
    if (!mapContextMenu) return
    const { lat, lng } = mapContextMenu
    closeMapContextMenu()

    switch (actionId) {
      case 'share':
        shareLocationAt(lat, lng)
        break
      case 'directionsFrom': {
        const start = { lat, lng, name: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
        setRoutePanelStartPlace(start)
        setRoutePanelEndPlace(null)
        setShowRoutePanel(true)
        api.get('/map/reverse', { params: { lat, lng } }).then(({ data }) => {
          if (data?.displayName) {
            setRoutePanelStartPlace({ lat, lng, name: data.displayName })
          }
        }).catch(() => {})
        break
      }
      case 'directionsTo': {
        const end = { lat, lng, name: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
        setRoutePanelEndPlace(end)
        setRoutePanelStartPlace(null)
        setShowRoutePanel(true)
        api.get('/map/reverse', { params: { lat, lng } }).then(({ data }) => {
          if (data?.displayName) {
            setRoutePanelEndPlace({ lat, lng, name: data.displayName })
          }
        }).catch(() => {})
        break
      }
      case 'whatsHere':
        await handleWhatsHere(lat, lng)
        break
      case 'searchNearby':
        await handleSearchNearby(lat, lng)
        break
      case 'print':
        handlePrint()
        break
      case 'addPlace':
        try {
          await openAddPlaceAt(lat, lng)
        } catch (err) {
          console.error('Add place from context menu failed:', err)
          showToast('Could not open Add Place. Try again.', 'error')
        }
        break
      case 'report': {
        const existing = findPlaceNearCoordinates(lat, lng)
        if (existing) {
          handlePlaceEdit(existing)
          showToast('Edit the place to report a data problem', 'info')
        } else {
          await openAddPlaceAt(lat, lng)
          showToast('Add or correct place details to report a problem', 'info')
        }
        break
      }
      case 'measure':
        setMeasureDistanceActive(true)
        if (mapRef.current?.flyTo) {
          mapRef.current.flyTo({ center: [lng, lat], duration: 400 })
        }
        window.setTimeout(() => {
          mapRef.current?.addMeasurePoint?.(lat, lng)
        }, 50)
        break
      default:
        break
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

  // Build a Favorite payload from anything that has a name + coords.
  // Accepts both search-result shape (displayName/lat/lng) and Place shape
  // (place_name_en/latitude/longitude).
  const formatApiError = (err, fallback = 'Something went wrong') => {
    const data = err.response?.data
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors.map((e) => e.msg || e.message).filter(Boolean).join('. ')
    }
    return data?.message ?? data?.error ?? fallback
  }

  const buildFavoritePayload = (input) => {
    const lat = parseFloat(input.lat ?? input.latitude)
    const lng = parseFloat(input.lng ?? input.longitude)
    const name =
      String(input.displayName ?? input.place_name_en ?? input.name ?? '').trim() || 'Unnamed place'
    const placeIdRaw = input.placeId ?? input.id ?? null
    const placeId =
      placeIdRaw && /^[0-9a-f-]{36}$/.test(String(placeIdRaw)) ? String(placeIdRaw) : null
    let category = input.category ?? input.address?.amenity ?? input.address?.type ?? input.address?.county ?? null
    if (category != null && typeof category === 'object') {
      category = category.county ?? category.amenity ?? category.type ?? null
    }
    if (category != null) {
      category = String(category).trim().slice(0, 100)
      if (!category) category = null
    }
    const address =
      input.address && typeof input.address === 'object' && !Array.isArray(input.address)
        ? input.address
        : null
    return { name, latitude: lat, longitude: lng, placeId, category, address }
  }

  const applyFavoriteResponse = (data, { quietIfExists = false } = {}) => {
    const fav = data?.favorite
    if (fav) {
      setFavorites((prev) => [fav, ...prev.filter((f) => f.id !== fav.id)])
    }
    if (!data?.alreadyExists && !quietIfExists) {
      showToast('Added to your saved places.', 'success')
    }
  }

  const handleSavePlaceFromSearch = async (result) => {
    const lat = parseFloat(result.lat ?? result.latitude)
    const lng = parseFloat(result.lng ?? result.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      showToast('This place has no valid location to save.', 'error')
      return
    }
    const placeKey = `${lat}-${lng}`
    if (savingPlaceId === placeKey) return
    setSavingPlaceId(placeKey)
    try {
      const payload = buildFavoritePayload({ ...result, lat, lng })
      const { data } = await api.post('/map/favorites', payload)
      applyFavoriteResponse(data)
    } catch (err) {
      if (err.response?.status === 409) {
        await refreshFavoritesFromDb()
        showToast('Already in your saved places.', 'info')
        return
      }
      const msg =
        err.response?.status === 503
          ? 'Favorites are not available. Run: npm run migrate:favorites in backend.'
          : formatApiError(err, 'Failed to save')
      showToast(msg, 'error')
    } finally {
      setSavingPlaceId(null)
    }
  }

  const handleUnsavePlaceFromSearch = async (result) => {
    const placeKey = `${result.lat}-${result.lng}`
    if (savingPlaceId === placeKey) return

    setSavingPlaceId(placeKey)
    try {
      const placeId =
        result.placeId && /^[0-9a-f-]{36}$/.test(String(result.placeId))
          ? String(result.placeId)
          : null
      const params = { lat: result.lat, lng: result.lng }
      if (placeId) params.placeId = placeId

      const { data } = await api.delete('/map/favorites', { params })
      const removedId = data?.id
      if (removedId) {
        setFavorites((prev) => prev.filter((f) => f.id !== removedId))
      } else {
        // Fallback: drop any matching favorite locally by coord/placeId
        const tol = 0.0001
        setFavorites((prev) =>
          prev.filter(
            (f) =>
              !(
                (placeId && f.placeId === placeId) ||
                (Math.abs(f.latitude - result.lat) < tol &&
                  Math.abs(f.longitude - result.lng) < tol)
              )
          )
        )
      }
      showToast('Removed from saved.', 'success')
    } catch (err) {
      if (err.response?.status === 404) {
        // Already removed somewhere else — sync local state and surface a gentle note.
        const tol = 0.0001
        setFavorites((prev) =>
          prev.filter(
            (f) =>
              !(
                Math.abs(f.latitude - result.lat) < tol &&
                Math.abs(f.longitude - result.lng) < tol
              )
          )
        )
        showToast('This place is not in your saved list.', 'info')
      } else {
        console.error('Unsave error:', err)
        const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Failed to remove from saved.'
        showToast(msg, 'error')
      }
    } finally {
      setSavingPlaceId(null)
    }
  }

  const handleUnsavePlaceFromPanel = async (place) => {
    if (place?.latitude == null || place?.longitude == null) {
      showToast('Cannot remove this place from saved.', 'info')
      return
    }
    const placeKey = `${place.latitude}-${place.longitude}`
    setSavingPlaceId(placeKey)
    try {
      const placeId =
        place.id && /^[0-9a-f-]{36}$/.test(String(place.id)) ? String(place.id) : null
      const params = { lat: place.latitude, lng: place.longitude }
      if (placeId) params.placeId = placeId
      const { data } = await api.delete('/map/favorites', { params })
      const removedId = data?.id
      if (removedId) {
        setFavorites((prev) => prev.filter((f) => f.id !== removedId))
      }
      showToast('Removed from saved.', 'success')
    } catch (err) {
      if (err.response?.status === 404) {
        showToast('This place is not in your saved list.', 'info')
      } else {
        console.error('Unsave error:', err)
        const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Failed to remove from saved.'
        showToast(msg, 'error')
      }
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
      const map = mapRef.current?.getMap?.()
      // Use only the specific place name (e.g. "Navyasuresh house") as the
      // pre-filled name, never the full comma-separated address. The remaining
      // address parts are populated separately into village/taluk/district/etc.
      const placeOnlyName = extractPlaceNameFromDisplay(data.displayName, data.address)
      const base = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        zoomLevel: loc.zoomLevel,
        name: placeOnlyName,
        address: data.address || {},
        targetLang: data.targetLang || 'hi',
      }
      return withMapRenderingConfig(base, { map, place: base })
    } catch (err) {
      const map = mapRef.current?.getMap?.()
      const base = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        zoomLevel: loc.zoomLevel,
        name: '',
        targetLang: 'hi',
      }
      return withMapRenderingConfig(base, { map, place: base })
    } finally {
      setFetchingPlaceDetails(false)
    }
  }

  const handleMapClickForPlace = useCallback(async (loc) => {
    if (!addPlacePickMode) return
    setAddPlaceLocationMethod('map-or-current')
    setMapLocation({
      latitude: loc.latitude,
      longitude: loc.longitude,
      zoomLevel: loc.zoomLevel,
    })
    setShowAddPlaceModal(true)
    setAddPlacePickMode(false)
    try {
      const details = await fetchPlaceDetails(loc)
      setMapLocation(details)
    } catch (err) {
      console.warn('handleMapClickForPlace: failed to load place details', err)
    }
  }, [addPlacePickMode])

  const handlePlaceSaved = (place) => {
    setAllPlaces((prev) => [place, ...prev.filter((item) => item.id !== place.id)])
    if (placeMatchesCategories(place, selectedCategories)) {
      setVisiblePlaces((prev) => [place, ...prev.filter((item) => item.id !== place.id)])
    }
    showPlaceAddedPopup([place], { variant: 'manual' })
    if (mapRef.current?.flyTo) {
      mapRef.current.flyTo({
        center: [place.longitude, place.latitude],
        zoom: place.zoomLevel || 15,
        duration: 1000,
      })
    }
  }

  const handleSearchSelect = async (location) => {
    if (location.placeId && /^[0-9a-f-]{36}$/.test(String(location.placeId))) {
      const cached = allPlaces.find((p) => String(p.id) === String(location.placeId))
      if (cached) {
        await openPlaceDetail(cached)
        return
      }
      try {
        await openPlaceDetail({
          id: location.placeId,
          place_name_en: location.name,
          name: location.name,
          latitude: location.lat,
          longitude: location.lng,
          category: location.category || 'Other',
        })
        return
      } catch {
        /* fall through */
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

  const handleAskMapsOpen = () => {
    setAskMapsPlaces([])
    setShowAskMapsPanel(true)
  }

  const handleAskMapsClose = () => {
    setShowAskMapsPanel(false)
    setAskMapsPlaces([])
  }

  const handleAskMapsResults = useCallback((markers, center) => {
    setAskMapsPlaces(markers)
    if (center?.lat != null && center?.lng != null && mapRef.current?.flyTo) {
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: markers.length === 1 ? 15 : 13,
        duration: 800,
      })
    }
  }, [])

  const handleAskMapsPlaceSelect = (place) => {
    openPlaceDetail(place)
  }

  const handleAskMapsDirections = (place) => {
    setShowAskMapsPanel(false)
    handlePlaceDirections(place)
  }

  const mapSearchResultPlaces = askMapsPlaces

  const handlePlaceEdit = (place) => {
    setSelectedPlace(null)
    setAddPlaceExcludeId(place?.id != null ? place.id : null)
    setMapLocation({
      name: place.place_name_en || place.name,
      category: place.category,
      latitude: place.latitude,
      longitude: place.longitude,
      zoomLevel: place.zoomLevel || 15,
      mapRenderingConfig: place.mapRenderingConfig || place.map_rendering_config,
    })
    setShowAddPlaceModal(true)
  }

  const handlePlaceSaveFromPanel = async (place) => {
    const placeKey = `${place.latitude}-${place.longitude}`
    if (savingPlaceId === placeKey) return
    setSavingPlaceId(placeKey)
    try {
      const payload = buildFavoritePayload(place)
      const { data } = await api.post('/map/favorites', payload)
      applyFavoriteResponse(data)
    } catch (err) {
      if (err.response?.status === 409) {
        await refreshFavoritesFromDb()
        showToast('Already in your saved places.', 'info')
        return
      }
      const msg =
        err.response?.status === 503
          ? 'Favorites are not available. Run: npm run migrate:favorites in backend.'
          : formatApiError(err, 'Failed to save')
      showToast(msg, 'error')
    } finally {
      setSavingPlaceId(null)
    }
  }

  const handleCalculateRoute = async (start, end, waypoints = [], profile = 'driving') => {
    if (mapRef.current?.calculateRoute) {
      return mapRef.current.calculateRoute(start, end, waypoints, profile)
    }
    throw new Error('Map not ready')
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
    const dupSkipped = (data.skippedDetails || []).filter((s) => s.reason && s.reason !== 'invalid')
    if (data.added === 0 && dupSkipped.length > 0) {
      setDuplicatePopup({
        message: 'No new places were added — they already exist on the map.',
        reason: dupSkipped[0]?.reason || 'coordinates',
        skippedList: dupSkipped,
      })
    } else if (dupSkipped.length > 0) {
      setDuplicatePopup({
        message: `${dupSkipped.length} place(s) were skipped because they already exist.`,
        reason: 'duplicate_in_batch',
        skippedList: dupSkipped,
      })
      showPlaceAddedPopup(data.places, { variant: 'extract', skippedCount: dupSkipped.length })
    } else if (data.added > 0) {
      showPlaceAddedPopup(data.places, { variant: 'extract' })
    }
    return data
  }

  const handleLogout = async () => {
    logout()
    window.location.href = '/'
  }

  const confirmLogout = () => {
    setShowMenu(false)
    setConfirmModal({
      title: 'Are you sure logout?',
      message: 'You will be signed out of your account on this device. Saved places stay safe and will be there when you sign back in.',
      confirmText: 'Logout',
      cancelText: 'No',
      confirmClass: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-md shadow-red-500/30',
      iconBg: 'bg-red-100',
      icon: (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      onConfirm: () => { setConfirmModal(null); handleLogout() },
      onCancel: () => setConfirmModal(null),
    })
  }

  const handleDeletePlace = async (placeId) => {
    const place =
      allPlaces.find((p) => p.id === placeId) ||
      (selectedPlace?.id === placeId ? selectedPlace : null)
    if (!canDeletePlace(place, user)) {
      showToast('You can only delete places you added.', 'error')
      return
    }

    setDeletingPlaceId(placeId)
    try {
      await api.delete(`/map/places/${placeId}`)
      setAllPlaces((prev) => prev.filter((p) => p.id !== placeId))
      setVisiblePlaces((prev) => prev.filter((p) => p.id !== placeId))
      setSelectedPlace((prev) => (prev?.id === placeId ? null : prev))
      showToast('Place deleted successfully.', 'success')
    } catch (err) {
      console.error('Delete place error:', err)
      const msg =
        err.response?.status === 403
          ? 'You are not allowed to delete this place.'
          : 'Failed to delete place. Please try again.'
      showToast(msg, 'error')
    } finally {
      setDeletingPlaceId(null)
    }
  }

  const confirmDeletePlace = (placeId, placeName) => {
    const place =
      allPlaces.find((p) => p.id === placeId) ||
      (selectedPlace?.id === placeId ? selectedPlace : null)
    if (!canDeletePlace(place, user)) {
      showToast('You can only delete places you added.', 'error')
      return
    }
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

      <PlaceAddedSuccessModal
        isOpen={!!successPopup}
        onClose={() => setSuccessPopup(null)}
        places={successPopup?.places}
        count={successPopup?.count}
        skippedCount={successPopup?.skippedCount}
        variant={successPopup?.variant}
        onViewOnMap={
          successPopup?.places?.[0]?.id
            ? () => flyToExistingPlace(successPopup.places[0].id)
            : undefined
        }
      />

      <DuplicatePlaceModal
        isOpen={!!duplicatePopup}
        onClose={() => setDuplicatePopup(null)}
        message={duplicatePopup?.message}
        reason={duplicatePopup?.reason}
        placeName={duplicatePopup?.placeName}
        existingPlaceName={duplicatePopup?.existingPlaceName}
        skippedList={duplicatePopup?.skippedList}
        onViewOnMap={
          duplicatePopup?.existingPlaceId
            ? () => flyToExistingPlace(duplicatePopup.existingPlaceId)
            : undefined
        }
      />

      {/* ── Confirm modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={confirmModal.onCancel}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                confirmModal.iconBg || 'bg-red-100'
              }`}>
                {confirmModal.icon || (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{confirmModal.title}</h3>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={confirmModal.onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                  confirmModal.confirmClass || 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmModal.confirmText || 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Navbar - Logo, Menu icon, Add Place (My Places & Logout in menu) */}
      <nav
        data-map-ui-chrome
        className="absolute top-0 left-0 right-0 z-30 glass border-b border-white/30 pt-[env(safe-area-inset-top)] shadow-lg"
      >
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

          {/* Right side: Notifications + Extract Places + Add Place */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 justify-end">
            <NotificationBell onPlaceFocus={handleNotificationPlaceFocus} />
            {/* Extract Places button */}
            <button
              onClick={() => setShowExtractPanel(true)}
              className="flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-2.5 font-medium text-sm transition-all duration-200 shrink-0 min-h-[44px] sm:min-h-0 bg-white/80 hover:bg-white border border-slate-200 hover:border-primary-300 text-slate-700 hover:text-primary-700 shadow-sm hover:shadow-md"
              title={menuExtractPlaces}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="hidden sm:inline">{menuExtractPlaces}</span>
            </button>
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
      <div
        data-map-ui-chrome
        className={`absolute left-2 right-14 sm:right-auto sm:left-4 sm:right-4 z-20 sm:max-w-xl ${
          showRoutePanel || showAskMapsPanel ? 'hidden sm:block' : ''
        }`}
        style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }}
      >
        <SearchBar
          userPlaces={favorites.map((f) => ({
            id: f.placeId || f.id,
            name: f.name,
            latitude: f.latitude,
            longitude: f.longitude,
            category: f.category || null,
          }))}
          onSelect={handleSearchSelect}
          onRoute={() => setShowRoutePanel(!showRoutePanel)}
          onAskMaps={handleAskMapsOpen}
          onResultsChange={() => {}}
          onSavePlace={handleSavePlaceFromSearch}
          onUnsavePlace={handleUnsavePlaceFromSearch}
          savingPlaceId={savingPlaceId}
        />
        <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={clearCategoryFilters}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
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
          <div className="mt-1.5 px-2 py-1.5 text-xs text-slate-500 glass rounded-xl border border-white/30">
            {loadingCategoryPlaces ? filterLoading : filterEmpty}
          </div>
        )}

        {selectedCategories.length > 0 && visiblePlaces.length > 0 && (
          <div className="mt-1.5 glass rounded-xl border border-white/30 shadow-lg px-2 py-2">
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
        onShowDuplicate={showDuplicatePopup}
        onRequestMapPick={() => {
          setShowAddPlaceModal(false)
          setAddPlacePickMode(true)
        }}
        onSaved={handlePlaceSaved}
      />

      {/* Ask Maps — AI natural-language search */}
      {showAskMapsPanel && (
        <div className="absolute inset-0 z-[45] flex pointer-events-none" style={{ top: 0 }}>
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto sm:hidden"
            onClick={handleAskMapsClose}
          />
          <div
            className="relative pointer-events-auto w-full max-w-[min(100vw,24rem)] sm:max-w-sm h-full bg-white shadow-2xl flex flex-col animate-fade-in pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            style={{ marginTop: 'calc(env(safe-area-inset-top) + 3.5rem)' }}
          >
            <AskMapsPanel
              mapRef={mapRef}
              currentLocation={currentLocation}
              onClose={handleAskMapsClose}
              onResults={handleAskMapsResults}
              onPlaceSelect={handleAskMapsPlaceSelect}
              onDirections={handleAskMapsDirections}
            />
          </div>
        </div>
      )}

      {/* Route Panel — mobile: bottom sheet; desktop: left panel */}
      {showRoutePanel && (
        <div className="absolute inset-0 z-[45] flex pointer-events-none items-end sm:items-start justify-center sm:justify-start">
          <div
            className="absolute inset-0 pointer-events-auto bg-black/25 sm:hidden"
            aria-hidden
            onClick={() => {
              setShowRoutePanel(false)
              setRouteStartPlace(null)
              setRouteEndPlace(null)
              setRouteStops([])
              setRoutePanelEndPlace(null)
              setRoutePanelStartPlace(null)
              mapRef.current?.clearRoute?.()
            }}
          />
          <div
            className="relative z-10 pointer-events-auto w-full sm:max-w-[400px] sm:h-full flex flex-col animate-sheet-up sm:animate-fade-in sm:pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="sm:h-full sm:mt-[calc(env(safe-area-inset-top)+3.5rem)] sm:flex sm:flex-col">
              <RoutePanel
                mapRef={mapRef}
                currentLocation={currentLocation}
                onCalculateRoute={handleCalculateRoute}
                initialEndPlace={routePanelEndPlace}
                initialStartPlace={routePanelStartPlace}
                onClose={() => {
                  setShowRoutePanel(false)
                  setRouteStartPlace(null)
                  setRouteEndPlace(null)
                  setRouteStops([])
                  setRoutePanelEndPlace(null)
                  setRoutePanelStartPlace(null)
                  mapRef.current?.clearRoute?.()
                }}
                onSearchResultsChange={() => {}}
                onRoutePlacesChange={(start, end, stops) => {
                  setRouteStartPlace(start)
                  setRouteEndPlace(end)
                  setRouteStops(stops || [])
                }}
              />
            </div>
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

      {/* Map tools sidebar — draw area & explore by category */}
      <PolygonExplorePanel
        mapRef={mapRef}
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onInteractionChange={setPolygonMapInteraction}
        onPlacesFound={(places) => {
          setPolygonOverlayPlaces(places)
        }}
        onClearPlaces={() => {
          setPolygonOverlayPlaces([])
        }}
      />

      {/* Map Container — min-h-0 lets flex child shrink; avoids partial white canvas on zoom */}
      <div className="flex-1 min-h-0 w-full relative">
        <MapComponent
          ref={mapRef}
          onLocationUpdate={handleLocationUpdate}
          onMapClick={handleMapClickForPlace}
          onMapContextMenu={setMapContextMenu}
          onMapReady={handleMapReady}
          onPlaceClick={openPlaceDetail}
          selectedPlaceId={selectedPlace?.id ?? null}
          addPlaceMode={addPlacePickMode}
          blockAddPlaceMapClick={polygonMapInteraction}
          blockContextMenu={polygonMapInteraction || addPlacePickMode}
          measureDistanceActive={measureDistanceActive}
          onMeasureDistanceChange={setMeasureStats}
          places={allPlaces}
          searchResultPlaces={mapSearchResultPlaces}
          polygonOverlayPlaces={polygonOverlayPlaces}
          autoFitSearchResults={askMapsPlaces.length > 1}
          routeStartPlace={routeStartPlace}
          routeEndPlace={routeEndPlace}
          routeStops={routeStops}
        />
      </div>

      {mapContextMenu && (
        <MapContextMenu
          position={{ x: mapContextMenu.x, y: mapContextMenu.y }}
          coordinates={{ lat: mapContextMenu.lat, lng: mapContextMenu.lng }}
          onAction={handleMapContextMenuAction}
          onClose={closeMapContextMenu}
        />
      )}

      {measureDistanceActive && (
        <MeasureDistancePanel
          totalMeters={measureStats.totalMeters}
          pointCount={measureStats.pointCount}
          onClear={handleMeasureClear}
          onClose={handleMeasureClose}
        />
      )}

      {/* Place detail panel — map labels, search, Ask Maps, filters */}
      {selectedPlace && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <PlaceDetailPanel
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onDirections={handlePlaceDirections}
            onSave={handlePlaceSaveFromPanel}
            onUnsave={handleUnsavePlaceFromPanel}
            onEdit={handlePlaceEdit}
            onDelete={
              canDeletePlace(selectedPlace, user)
                ? (placeId) =>
                    confirmDeletePlace(
                      placeId,
                      selectedPlace?.place_name_en || selectedPlace?.name || 'this place'
                    )
                : undefined
            }
            currentUser={user}
            deletingId={deletingPlaceId}
            isSaved={favorites.some(
              (f) =>
                (selectedPlace.id && f.placeId && String(f.placeId) === String(selectedPlace.id)) ||
                (Math.abs(f.latitude - selectedPlace.latitude) < 0.0001 &&
                  Math.abs(f.longitude - selectedPlace.longitude) < 0.0001)
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
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    setShowSidebar(true)
                  }}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">{menuAreaExplore}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    handleAskMapsOpen()
                  }}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-violet-50 active:bg-violet-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">{menuAskMaps}</span>
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
                    {favorites.length}
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
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); setShowFeedbackModal(true) }}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">{menuFeedback}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); navigateTo('/settings') }}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 min-h-[48px] sm:min-h-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left touch-manipulation"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-800">{menuSettings}</span>
                </button>
              </div>

              {/* Logout */}
              <div className="py-2">
                <button
                  onClick={confirmLogout}
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

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        user={user}
      />

      <OnboardingTour
        isOpen={showOnboarding}
        onComplete={handleOnboardingClose}
        onSkip={handleOnboardingClose}
      />

      <LanguagePickerModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />


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
        mapPlaces={allPlaces}
        onShowDuplicate={showDuplicatePopup}
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
                    : favorites.length}
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
                // Contributions tab: show the user's own Place rows (real map adds).
                // Saved tab: show Favorites (lightweight bookmarks; never deletes
                // the underlying Place when removed).
                if (showContributionsOnly) {
                  const displayPlaces = filterPlacesByUser(
                    allPlaces.filter((p) => (p.source || 'contribution') === 'contribution'),
                    user
                  )
                  return displayPlaces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 px-6 text-center">
                      <svg className="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm font-medium">No contributions yet</p>
                      <p className="text-xs text-slate-400">
                        Use &quot;Add a missing place&quot; in the menu to contribute.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {displayPlaces.map((place) => (
                        <li key={place.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                          <div className="mt-1 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{place.place_name_en || place.name}</p>
                            {place.place_name_local && place.place_name_local !== place.place_name_en && (
                              <p className="text-xs text-slate-500 truncate">{place.place_name_local}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-primary-600 bg-primary-50 rounded px-1.5 py-0.5 font-medium">
                                <TranslatedLabel text={place.category} />
                              </span>
                              {place.approvalStatus === 'pending' && (
                                <span className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 font-medium">
                                  Pending
                                  {place.pendingDaysRemaining != null
                                    ? ` · ${place.pendingDaysRemaining}d`
                                    : ''}
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setShowMyPlaces(false)
                                  openPlaceDetail(place)
                                }}
                                className="text-xs text-slate-400 hover:text-primary-600 transition-colors"
                              >
                                {myPlacesViewOnMap}
                              </button>
                            </div>
                          </div>
                          {canDeletePlace(place, user) && (
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
                }

                // Saved tab — favorites
                return favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 px-6 text-center">
                    <svg className="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3-7 3V5z" />
                    </svg>
                    <p className="text-sm font-medium">No saved places yet</p>
                    <p className="text-xs text-slate-400">
                      Save places from search results using the bookmark icon.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {favorites.map((fav) => {
                      const removing = savingPlaceId === `${fav.latitude}-${fav.longitude}`
                      return (
                        <li key={fav.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                          <div className="mt-1 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{fav.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {fav.category && (
                                <span className="text-xs text-primary-600 bg-primary-50 rounded px-1.5 py-0.5 font-medium">
                                  <TranslatedLabel text={fav.category} />
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setShowMyPlaces(false)
                                  const cached = allPlaces.find((p) => String(p.id) === String(fav.placeId))
                                  if (cached) {
                                    openPlaceDetail(cached)
                                  } else {
                                    // Favorite of an external location not in our DB —
                                    // just fly the map to it.
                                    if (mapRef.current?.flyTo) {
                                      mapRef.current.flyTo({
                                        center: [fav.longitude, fav.latitude],
                                        zoom: 15,
                                        duration: 800,
                                      })
                                    }
                                    if (mapRef.current?.showSearchedLocation) {
                                      mapRef.current.showSearchedLocation({
                                        lat: fav.latitude,
                                        lng: fav.longitude,
                                        name: fav.name,
                                        displayName: fav.name,
                                      })
                                    }
                                  }
                                }}
                                className="text-xs text-slate-400 hover:text-primary-600 transition-colors"
                              >
                                {myPlacesViewOnMap}
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              const placeKey = `${fav.latitude}-${fav.longitude}`
                              if (savingPlaceId === placeKey) return
                              setSavingPlaceId(placeKey)
                              try {
                                await api.delete(`/map/favorites/${fav.id}`)
                                setFavorites((prev) => prev.filter((f) => f.id !== fav.id))
                                showToast('Removed from saved.', 'success')
                              } catch (err) {
                                console.error('Remove favorite error:', err)
                                showToast('Failed to remove from saved.', 'error')
                              } finally {
                                setSavingPlaceId(null)
                              }
                            }}
                            disabled={removing}
                            className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0 disabled:opacity-40"
                            title="Remove from saved"
                            aria-label="Remove from saved"
                          >
                            {removing ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </button>
                        </li>
                      )
                    })}
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
