import { useState, useEffect, useRef, useCallback } from 'react'
import { translateText } from 'atozas-traslate'
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

const AddPlaceModal = ({ isOpen, onClose, initialData, mapLocation, onSaved }) => {
  const [formData, setFormData] = useState({
    placeNameEn: '',
    placeNameLocal: '',
    category: 'Other',
    customCategory: '',
    latitude: '',
    longitude: '',
    zoomLevel: '15',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [localLabelTranslated, setLocalLabelTranslated] = useState('')
  const translateTimeoutRef = useRef(null)

  const targetLang = mapLocation?.targetLang ?? initialData?.targetLang ?? 'hi'

  const LABEL_LOCAL_NAME = 'Local Language Name (auto-translated, editable)'

  const fetchTranslation = useCallback(
    async (text) => {
      const trimmed = (text || '').trim()
      if (!trimmed || targetLang === 'en') return
      setTranslating(true)
      try {
        const translated = await translateText(trimmed, 'en', targetLang)
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
      setFormData((prev) => {
        const fromMap = mapLocation ?? initialData
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
        }
      })
      setError(null)
      setSubmitted(false)
    }
  }, [isOpen, mapLocation?.latitude, mapLocation?.longitude, mapLocation?.zoomLevel, mapLocation?.name, mapLocation?.targetLang, initialData?.latitude, initialData?.longitude, initialData?.zoomLevel, initialData?.name, initialData?.category])

  // Translate the "Local Language Name" label into detected local language (atozas-traslate)
  useEffect(() => {
    if (!isOpen || targetLang === 'en') {
      setLocalLabelTranslated('')
      return
    }
    let cancelled = false
    translateText(LABEL_LOCAL_NAME, 'en', targetLang)
      .then((translated) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const placeNameEn = formData.placeNameEn.trim()
    const placeNameLocal = formData.placeNameLocal.trim() || null
    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)
    const zoom = parseFloat(formData.zoomLevel) || 15

    if (!placeNameEn) {
      setError('Place name (English) is required.')
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
              className="input-field"
              required
            />
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

          {(formData.latitude || formData.longitude) && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
              <p className="text-xs font-medium text-slate-500">Location (auto-filled from map)</p>
              <div className="flex flex-wrap gap-3 text-sm font-mono text-slate-700">
                <span>Lat: {formData.latitude}</span>
                <span>Lng: {formData.longitude}</span>
                <span>Zoom: {formData.zoomLevel}</span>
              </div>
            </div>
          )}

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
              disabled={saving}
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
