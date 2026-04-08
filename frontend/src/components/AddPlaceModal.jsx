import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'

export const PLACE_CATEGORIES = [
  'Restaurant',
  'Hospital',
  'Hotel',
  'Parking',
  'Shop',
  'Grocery Store',
  'School',
  'Temple',
  'Bank',
  'Post Office',
  'Bus Stop',
  'Police Station',
  'Petrol Pump',
  'Tourist Place',
  'Transit',
  'Museum',
  'Pharmacy',
  'ATM',
  'Cinema',
  'Gym',
  'Salon',
  'Other',
]

const CATEGORY_ICONS = {
  Restaurant: '🍽️',
  Hospital: '🏥',
  Hotel: '🏨',
  Parking: '🅿️',
  Shop: '🛍️',
  'Grocery Store': '🛒',
  School: '🏫',
  Temple: '🛕',
  Bank: '🏦',
  'Post Office': '📮',
  'Bus Stop': '🚏',
  'Police Station': '🚔',
  'Petrol Pump': '⛽',
  'Tourist Place': '🗺️',
  Transit: '🚌',
  Museum: '🏛️',
  Pharmacy: '💊',
  ATM: '🏧',
  Cinema: '🎬',
  Gym: '💪',
  Salon: '💇',
  Other: '📍',
}

/** Parse "lat, lng" or "lat lng" format. Returns { lat, lng } or null if invalid. */
const parseCoordinates = (input) => {
  const str = (input || '').trim()
  if (!str) return null
  const parts = str.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (isNaN(lat) || isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

const EMPTY_ADDRESS_FIELDS = {
  village: '',
  taluk: '',
  district: '',
  state: '',
  pincode: '',
  country: '',
}

const normalizePlaceNameKey = (name) => String(name || '').trim().toLowerCase()

const AddPlaceModal = ({
  isOpen,
  onClose,
  initialData,
  mapLocation,
  currentLocation,
  onRequestMapPick,
  onSaved,
  initialLocationMethod,
  existingPlaces = [],
  excludePlaceId = null,
}) => {
  const [formData, setFormData] = useState({
    placeNameEn: '',
    placeNameLocal: '',
    category: 'Other',
    customCategory: '',
    latitude: '',
    longitude: '',
    zoomLevel: '15',
    ...EMPTY_ADDRESS_FIELDS,
  })
  const [fetchingAddress, setFetchingAddress] = useState(false)
  const [locationMethod, setLocationMethod] = useState(initialLocationMethod || 'map-or-current') // 'map-or-current' | 'manual-coords'
  const [coordInput, setCoordInput] = useState('') // e.g. "12.9716, 77.5946"
  const [coordError, setCoordError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [detectedTargetLang, setDetectedTargetLang] = useState('hi')
  const [localLabelTranslated, setLocalLabelTranslated] = useState('')
  const [duplicateNameMessage, setDuplicateNameMessage] = useState(null)
  const translateTimeoutRef = useRef(null)
  const nameDuplicateTimerRef = useRef(null)
  const addressFetchRef = useRef(null)
  const addressRequestIdRef = useRef(0)
  const addressCacheRef = useRef(new Map())

  /** Extract display address fields from Nominatim address object */
  const extractAddressFields = (addr) => {
    if (!addr || typeof addr !== 'object') return null
    return {
      village: addr.village || addr.town || addr.city || addr.hamlet || '',
      district: addr.county || addr.state_district || addr.district || '',
      state: addr.state || '',
      pincode: addr.postcode || '',
      country: addr.country || '',
      taluk: addr.taluk || addr.tehsil || addr.subdistrict || addr.municipality || '',
    }
  }

  /** Fetch address from lat/lng via reverse geocode API */
  const fetchAddressFromCoords = useCallback(async (lat, lng) => {
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (isNaN(latNum) || isNaN(lngNum)) return null

    const cacheKey = `${latNum.toFixed(6)},${lngNum.toFixed(6)}`
    const cached = addressCacheRef.current.get(cacheKey)
    if (cached) {
      console.log('[AddPlaceModal] Reverse geocode cache hit', { lat: latNum, lng: lngNum, fields: cached })
      setFormData((prev) => ({ ...prev, ...cached }))
      return { address: cached }
    }

    const requestId = ++addressRequestIdRef.current
    setFetchingAddress(true)
    try {
      const { data } = await api.get('/map/reverse', { params: { lat: latNum, lng: lngNum } })
      if (data?.targetLang) {
        setDetectedTargetLang(data.targetLang)
      }
      // data.address is the Nominatim address object
      const addr = data?.address
      const fields = addr && typeof addr === 'object' ? extractAddressFields(addr) : EMPTY_ADDRESS_FIELDS
      console.log('[AddPlaceModal] Reverse geocode API response', { lat: latNum, lng: lngNum, fields, data })
      addressCacheRef.current.set(cacheKey, fields)
      if (requestId === addressRequestIdRef.current) {
        setFormData((prev) => ({ ...prev, ...fields }))
      }
      return data
    } catch (err) {
      console.warn('Address fetch failed:', err?.message)
      if (requestId === addressRequestIdRef.current) {
        setFormData((prev) => ({ ...prev, ...EMPTY_ADDRESS_FIELDS }))
      }
      return null
    } finally {
      if (requestId === addressRequestIdRef.current) {
        setFetchingAddress(false)
      }
    }
  }, [])

  const targetLang = detectedTargetLang || 'hi'

  const LABEL_LOCAL_NAME = 'Local Language Name (auto-translated, editable)'

  const fetchTranslation = useCallback(
    async (text) => {
      const trimmed = (text || '').trim()
      if (!trimmed || targetLang === 'en') return
      setTranslating(true)
      try {
        const { data } = await api.post('/map/translate', {
          text: trimmed,
          targetLang,
        })
        const translated = data?.translatedText
        if (translated?.trim()) {
          setFormData((prev) => ({ ...prev, placeNameLocal: translated.trim() }))
        }
      } catch (err) {
        console.warn('Translation failed:', err.message)
      } finally {
        setTranslating(false)
      }
    },
    [targetLang]
  )

  useEffect(() => {
    if (isOpen) {
      const fromMap = mapLocation ?? initialData
      setDetectedTargetLang(fromMap?.targetLang ?? 'hi')
      const hasMapLocation = fromMap?.latitude != null && fromMap?.longitude != null
      setFormData((prev) => {
        const locChanged =
          String(fromMap?.latitude ?? '') !== String(prev.latitude ?? '') ||
          String(fromMap?.longitude ?? '') !== String(prev.longitude ?? '')
        return {
          ...prev,
          placeNameEn: fromMap?.name ?? initialData?.name ?? prev.placeNameEn,
          placeNameLocal: locChanged ? '' : prev.placeNameLocal,
          category: fromMap?.category ?? initialData?.category ?? prev.category,
          latitude: fromMap?.latitude != null ? String(fromMap.latitude) : initialData?.latitude != null ? String(initialData.latitude) : prev.latitude,
          longitude: fromMap?.longitude != null ? String(fromMap.longitude) : initialData?.longitude != null ? String(initialData.longitude) : prev.longitude,
          zoomLevel: fromMap?.zoomLevel != null ? String(fromMap.zoomLevel) : initialData?.zoomLevel != null ? String(initialData.zoomLevel) : prev.zoomLevel ?? '15',
          village: fromMap?.village ?? initialData?.village ?? prev.village,
          taluk: fromMap?.taluk ?? initialData?.taluk ?? prev.taluk,
          district: fromMap?.district ?? initialData?.district ?? prev.district,
          state: fromMap?.state ?? initialData?.state ?? prev.state,
          pincode: fromMap?.pincode ?? initialData?.pincode ?? prev.pincode,
          country: fromMap?.country ?? initialData?.country ?? prev.country,
        }
      })

      // Always fetch address from coordinates to ensure fields are populated
      if (hasMapLocation) {
        // Try to use pre-fetched address first for instant display
        const addr = fromMap?.address
        if (addr && typeof addr === 'object' && Object.keys(addr).length > 0) {
          const fields = extractAddressFields(addr)
          if (fields && (fields.village || fields.district || fields.state || fields.pincode)) {
            setFormData((prev) => ({ ...prev, ...fields }))
          } else {
            // Pre-fetched address had no useful fields, fetch fresh
            fetchAddressFromCoords(fromMap.latitude, fromMap.longitude)
          }
        } else {
          // No pre-fetched address, fetch from API
          fetchAddressFromCoords(fromMap.latitude, fromMap.longitude)
        }
        setLocationMethod('map-or-current')
      } else {
        setFormData((prev) => ({ ...prev, ...EMPTY_ADDRESS_FIELDS }))
        if (initialLocationMethod) {
          setLocationMethod(initialLocationMethod)
        }
      }
      setCoordInput('')
      setCoordError(null)
      setError(null)
      setSubmitted(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mapLocation, initialData, initialLocationMethod, fetchAddressFromCoords])

  useEffect(() => {
    return () => {
      if (addressFetchRef.current) clearTimeout(addressFetchRef.current)
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current)
      if (nameDuplicateTimerRef.current) clearTimeout(nameDuplicateTimerRef.current)
    }
  }, [])

  // Debounced check: English name already saved for this user (from DB list)
  useEffect(() => {
    if (!isOpen) {
      setDuplicateNameMessage(null)
      return
    }
    const raw = (formData.placeNameEn || '').trim()
    if (raw.length < 2) {
      setDuplicateNameMessage(null)
      return
    }
    if (nameDuplicateTimerRef.current) clearTimeout(nameDuplicateTimerRef.current)
    nameDuplicateTimerRef.current = setTimeout(() => {
      const key = normalizePlaceNameKey(raw)
      const list = Array.isArray(existingPlaces) ? existingPlaces : []
      const taken = list.some((p) => {
        if (excludePlaceId != null && String(p.id) === String(excludePlaceId)) return false
        const existingKey = normalizePlaceNameKey(p.place_name_en || p.name)
        return existingKey.length > 0 && existingKey === key
      })
      setDuplicateNameMessage(
        taken
          ? 'This place name is already saved. Use a different name.'
          : null
      )
    }, 400)
    return () => {
      if (nameDuplicateTimerRef.current) clearTimeout(nameDuplicateTimerRef.current)
    }
  }, [formData.placeNameEn, existingPlaces, excludePlaceId, isOpen])

  // Translate the local label via backend /map/translate endpoint.
  useEffect(() => {
    if (!isOpen || targetLang === 'en') {
      setLocalLabelTranslated('')
      return
    }
    let cancelled = false
    api
      .post('/map/translate', {
        text: LABEL_LOCAL_NAME,
        targetLang,
      })
      .then(({ data }) => {
        const translated = data?.translatedText
        if (!cancelled && translated?.trim()) {
          setLocalLabelTranslated(translated.trim())
        }
      })
      .catch(() => {
        if (!cancelled) setLocalLabelTranslated('')
      })
    return () => { cancelled = true }
  }, [isOpen, targetLang])

  // Debounced translation when English name changes
  useEffect(() => {
    if (!isOpen) return
    const text = formData.placeNameEn?.trim()
    if (!text || targetLang === 'en') return

    if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current)
    translateTimeoutRef.current = setTimeout(() => {
      fetchTranslation(text)
    }, 500)

    return () => {
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current)
    }
  }, [formData.placeNameEn, targetLang, isOpen, fetchTranslation])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleEnglishBlur = () => {
    const text = formData.placeNameEn?.trim()
    if (text && targetLang !== 'en') {
      fetchTranslation(text)
    }
  }

  const handleUseCurrentLocation = () => {
    if (!currentLocation || currentLocation.lat == null || currentLocation.lng == null) {
      setError('Current location unavailable. Please enable GPS or click on the map.')
      return
    }
    const lat = parseFloat(currentLocation.lat)
    const lng = parseFloat(currentLocation.lng)
    if (isNaN(lat) || isNaN(lng)) return
    setFormData((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng), zoomLevel: '15' }))
    setError(null)
    setCoordError(null)
    fetchAddressFromCoords(lat, lng)
  }

  const handleRequestMapPick = () => {
    if (onRequestMapPick) onRequestMapPick()
  }

  const handleCoordInputChange = (e) => {
    const val = e.target.value
    setCoordInput(val)
    setCoordError(null)
    const parsed = parseCoordinates(val)
    if (parsed) {
      setFormData((prev) => ({ ...prev, latitude: String(parsed.lat), longitude: String(parsed.lng) }))
      // Debounced address fetch as user types valid coords
      if (addressFetchRef.current) clearTimeout(addressFetchRef.current)
      addressFetchRef.current = setTimeout(() => {
        fetchAddressFromCoords(parsed.lat, parsed.lng)
      }, 600)
    }
  }

  const handleCoordInputBlur = () => {
    const parsed = parseCoordinates(coordInput)
    if (coordInput.trim() && !parsed) {
      setCoordError('Enter valid coordinates. Example: 12.9716, 77.5946 (Lat: -90 to 90, Lng: -180 to 180)')
    } else {
      setCoordError(null)
      // Fetch address immediately on blur if valid
      if (parsed) {
        if (addressFetchRef.current) clearTimeout(addressFetchRef.current)
        fetchAddressFromCoords(parsed.lat, parsed.lng)
      }
    }
  }

  const hasValidLocation = () => {
    if (locationMethod === 'manual-coords') {
      const parsed = parseCoordinates(coordInput)
      return parsed != null
    }
    return formData.latitude && formData.longitude
  }

  const hasAddressDetails =
    Boolean(formData.village) ||
    Boolean(formData.taluk) ||
    Boolean(formData.district) ||
    Boolean(formData.state) ||
    Boolean(formData.pincode) ||
    Boolean(formData.country)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const placeNameEn = formData.placeNameEn.trim()
    const placeNameLocal = formData.placeNameLocal.trim() || null

    let lat, lng
    if (locationMethod === 'manual-coords') {
      const parsed = parseCoordinates(coordInput)
      if (!parsed) {
        setError('Enter valid coordinates. Example: 12.9716, 77.5946 (Lat: -90 to 90, Lng: -180 to 180)')
        setSaving(false)
        return
      }
      lat = parsed.lat
      lng = parsed.lng
    } else {
      lat = parseFloat(formData.latitude)
      lng = parseFloat(formData.longitude)
    }
    const zoom = parseFloat(formData.zoomLevel) || 15

    if (!placeNameEn) {
      setError('Place name (English) is required.')
      setSaving(false)
      return
    }
    if (duplicateNameMessage) {
      setError(duplicateNameMessage)
      setSaving(false)
      return
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Valid latitude is required (-90 to 90).')
      setSaving(false)
      return
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Valid longitude is required (-180 to 180).')
      setSaving(false)
      return
    }

    const categoryToSave = formData.category === 'Other' && formData.customCategory.trim()
      ? formData.customCategory.trim()
      : formData.category

    try {
      const response = await api.post('/map/places', {
        place_name_en: placeNameEn,
        place_name_local: placeNameLocal,
        category: categoryToSave,
        latitude: lat,
        longitude: lng,
        zoomLevel: zoom,
        village: formData.village.trim(),
        taluk: formData.taluk.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        country: formData.country.trim(),
        source: 'contribution',
      })
      setSubmitted(true)
      if (onSaved) {
        onSaved(response.data)
      }
      onClose()
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message
      setError(msg || 'Failed to save place.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 pb-[env(safe-area-inset-bottom)] sm:pb-4">
      <div
        className="absolute inset-0 bg-black/30 sm:bg-black/50 backdrop-blur-sm pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-md h-auto max-h-[85dvh] sm:max-h-[90vh] glass rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/30 overflow-y-auto animate-slide-up sm:animate-fade-in pointer-events-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/30">
          <h2 className="text-lg font-semibold text-slate-800">Add Place</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 text-slate-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Fill Place Name (English) and Category. Local language name auto-translates from map location.
          </p>

          {/* Location Method Selection */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">How do you want to set the location?</legend>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="locationMethod"
                  value="map-or-current"
                  checked={locationMethod === 'map-or-current'}
                  onChange={() => { setLocationMethod('map-or-current'); setCoordError(null); setCoordInput('') }}
                  className="mt-1 accent-primary-600"
                />
                <span className="text-sm text-slate-700">
                  Choose current location / Select from map
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="locationMethod"
                  value="manual-coords"
                  checked={locationMethod === 'manual-coords'}
                  onChange={() => { setLocationMethod('manual-coords'); setError(null) }}
                  className="mt-1 accent-primary-600"
                />
                <span className="text-sm text-slate-700">
                  Add place using Google Maps latitude & longitude
                </span>
              </label>
            </div>

            {/* Option 1: Map / Current Location */}
            {locationMethod === 'map-or-current' && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRequestMapPick}
                  className="px-3 py-1.5 text-sm rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 border border-primary-200 transition-colors"
                >
                  Pick from map
                </button>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={!currentLocation}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use current location
                </button>
              </div>
            )}

            {/* Option 2: Manual Coordinates */}
            {locationMethod === 'manual-coords' && (
              <div className="pt-1">
                <label htmlFor="coord-input" className="block text-sm font-medium text-slate-600 mb-1">
                  Latitude, Longitude
                </label>
                <input
                  id="coord-input"
                  type="text"
                  value={coordInput}
                  onChange={handleCoordInputChange}
                  onBlur={handleCoordInputBlur}
                  placeholder="e.g. 12.9716, 77.5946"
                  className="input-field font-mono"
                />
                {coordError && (
                  <p className="mt-1 text-xs text-red-600">{coordError}</p>
                )}
              </div>
            )}
          </fieldset>

          <div>
            <label htmlFor="place-name-en" className="block text-sm font-medium text-slate-700 mb-1">
              Place Name (English)
            </label>
            <input
              id="place-name-en"
              name="placeNameEn"
              type="text"
              value={formData.placeNameEn}
              onChange={handleChange}
              onBlur={handleEnglishBlur}
              placeholder="e.g. Kadaba Bus Stand"
              className={`input-field ${duplicateNameMessage ? 'border-amber-500 ring-1 ring-amber-400/80' : ''}`}
              required
              aria-invalid={duplicateNameMessage ? 'true' : undefined}
              aria-describedby={duplicateNameMessage ? 'place-name-en-duplicate' : undefined}
            />
            {duplicateNameMessage && (
              <p id="place-name-en-duplicate" className="mt-1.5 text-xs font-medium text-amber-700" role="alert">
                {duplicateNameMessage}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="place-name-local" className="block text-sm font-medium text-slate-700 mb-1">
              {targetLang !== 'en' && localLabelTranslated
                ? localLabelTranslated
                : LABEL_LOCAL_NAME}
            </label>
            <input
              id="place-name-local"
              name="placeNameLocal"
              type="text"
              value={formData.placeNameLocal}
              onChange={handleChange}
              placeholder={translating ? 'Translating...' : 'Auto-filled from translation'}
              className="input-field"
              readOnly={translating}
            />
            {translating && (
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-primary-500 border-t-transparent" />
                Translating...
              </p>
            )}
          </div>

          <div>
            <label htmlFor="place-category" className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              id="place-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="input-field"
            >
              {PLACE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_ICONS[cat] || '📍'} {cat}
                </option>
              ))}
            </select>
          </div>

          {formData.category === 'Other' && (
            <div>
              <label htmlFor="place-custom-category" className="block text-sm font-medium text-slate-700 mb-1">
                Custom Category (enter your own)
              </label>
              <input
                id="place-custom-category"
                name="customCategory"
                type="text"
                value={formData.customCategory}
                onChange={handleChange}
                placeholder="e.g. Temple, Kirana Store, Clinic"
                className="input-field"
              />
            </div>
          )}

          {/* Address detail fields - show once we have location or data */}
          {(formData.latitude || formData.longitude || fetchingAddress || hasAddressDetails) ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Location Details</p>
                {fetchingAddress && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <span className="animate-spin rounded-full h-3 w-3 border-2 border-primary-500 border-t-transparent" />
                    Fetching address...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Village / Town</label>
                  <input
                    type="text"
                    name="village"
                    value={formData.village}
                    onChange={handleChange}
                    placeholder={fetchingAddress ? 'Loading...' : 'Auto-filled from selected location'}
                    className={`input-field ${fetchingAddress ? 'animate-pulse' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Taluk</label>
                  <input
                    type="text"
                    name="taluk"
                    value={formData.taluk}
                    onChange={handleChange}
                    placeholder={fetchingAddress ? 'Loading...' : 'Auto-filled from selected location'}
                    className={`input-field ${fetchingAddress ? 'animate-pulse' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder={fetchingAddress ? 'Loading...' : 'Auto-filled from selected location'}
                    className={`input-field ${fetchingAddress ? 'animate-pulse' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder={fetchingAddress ? 'Loading...' : 'Auto-filled from selected location'}
                    className={`input-field ${fetchingAddress ? 'animate-pulse' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder={fetchingAddress ? 'Loading...' : 'Auto-filled from selected location'}
                    className={`input-field ${fetchingAddress ? 'animate-pulse' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder={fetchingAddress ? 'Loading...' : 'Auto-filled from selected location'}
                    className={`input-field ${fetchingAddress ? 'animate-pulse' : ''}`}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !hasValidLocation() || !!duplicateNameMessage}
              className="btn-primary flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Saving...
                </span>
              ) : (
                'Add / Save Place'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddPlaceModal
