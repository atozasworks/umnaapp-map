import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../services/api'
import { PLACE_CATEGORIES } from '../constants/placeCategories'
import { extractMapRenderingConfig } from '../utils/mapRenderingConfig'
import {
  pointViewport,
  placeTypeSlug,
  composeFullAddress,
  composeVicinity,
  staticMapContext,
} from '../utils/placeAddParams'

/**
 * Quick Survey — walk a street and add places fast:
 * take a photo of the signboard → GPS position is captured, the name and
 * category are read from the photo → one tap saves the place (with the photo)
 * and the camera is ready for the next one.
 *
 * Places go through the normal Add Place flow on the server (duplicate check,
 * pending approval, history).
 */

const PHOTO_MAX_KB = 400
const WEAK_GPS_METERS = 35
/** Stored zoom follows the main map but stays in the range where a single shop is visible. */
const SURVEY_ZOOM_DEFAULT = 17
const SURVEY_ZOOM_MIN = 16
const SURVEY_ZOOM_MAX = 19

const EMPTY_ADDRESS = { village: '', taluk: '', district: '', state: '', pincode: '', country: '' }

function compressImage(file, maxSizeKB = PHOTO_MAX_KB) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const MAX = 1000
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = (height / width) * MAX
          width = MAX
        } else {
          width = (width / height) * MAX
          height = MAX
        }
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      for (let q = 0.85; q >= 0.3; q -= 0.1) {
        const dataUrl = canvas.toDataURL('image/jpeg', q)
        if (dataUrl.length < maxSizeKB * 1024 * 1.37) {
          resolve(dataUrl)
          return
        }
      }
      resolve(canvas.toDataURL('image/jpeg', 0.3))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}

const QuickSurveySheet = ({ isOpen, onClose, onPlaceSaved, getMapZoom }) => {
  const fileInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const watchIdRef = useRef(null)
  const captureSeqRef = useRef(0)
  const nameEditedRef = useRef(false)
  const categoryEditedRef = useRef(false)

  const [gps, setGps] = useState(null) // { lat, lng, accuracy }
  const [gpsError, setGpsError] = useState(null)

  // Current capture (null = camera step)
  const [photo, setPhoto] = useState(null)
  const [position, setPosition] = useState(null)
  const [name, setName] = useState('')
  const [nameLocal, setNameLocal] = useState('')
  const [category, setCategory] = useState('Shop')
  const [phone, setPhone] = useState('')
  const [kind, setKind] = useState('')
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const [targetLang, setTargetLang] = useState(null)
  const [reading, setReading] = useState(false)
  const [aiNote, setAiNote] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [added, setAdded] = useState([])
  const [lastMessage, setLastMessage] = useState(null)

  // Live GPS while the sheet is open, so the position is ready the moment a photo is taken.
  useEffect(() => {
    if (!isOpen) return undefined
    if (!navigator.geolocation) {
      setGpsError('Location is not supported on this device.')
      return undefined
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null)
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Allow location for this site to use Quick Survey.'
            : 'Waiting for a GPS signal…'
        )
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [isOpen])

  const resetCapture = useCallback(() => {
    captureSeqRef.current += 1
    nameEditedRef.current = false
    categoryEditedRef.current = false
    setPhoto(null)
    setPosition(null)
    setName('')
    setNameLocal('')
    setCategory('Shop')
    setPhone('')
    setKind('')
    setAddress(EMPTY_ADDRESS)
    setTargetLang(null)
    setReading(false)
    setAiNote(null)
    setError(null)
  }, [])

  const loadAddress = useCallback(async (pos, seq) => {
    try {
      const { data } = await api.get('/map/reverse', { params: { lat: pos.lat, lng: pos.lng } })
      if (seq !== captureSeqRef.current) return
      const f = data?.addressFields
      if (f && typeof f === 'object') {
        setAddress({
          village: f.village || '',
          taluk: f.taluk || '',
          district: f.district || '',
          state: f.state || '',
          pincode: f.pincode || '',
          country: f.country || '',
        })
      }
      if (data?.targetLang) setTargetLang(data.targetLang)
    } catch {
      /* address is optional — the place still saves with coordinates */
    }
  }, [])

  const readSignboard = useCallback(async (dataUrl, seq) => {
    setReading(true)
    setAiNote(null)
    try {
      const { data } = await api.post('/map/survey/read-signboard', { imageDataUrl: dataUrl })
      if (seq !== captureSeqRef.current) return
      if (!data?.aiEnabled) {
        setAiNote('Auto-read is unavailable right now — type the name.')
        return
      }
      if (data.name && !nameEditedRef.current) setName(data.name)
      if (data.nameLocal) setNameLocal(data.nameLocal)
      if (data.category && !categoryEditedRef.current && PLACE_CATEGORIES.includes(data.category)) {
        setCategory(data.category)
      }
      if (data.phone) setPhone(data.phone)
      if (data.kind) setKind(data.kind)
      setAiNote(data.name ? 'Read from the photo — check it, then save.' : 'Could not read a name — type it below.')
    } catch {
      if (seq === captureSeqRef.current) setAiNote('Auto-read failed — type the name.')
    } finally {
      if (seq === captureSeqRef.current) {
        setReading(false)
        if (!nameEditedRef.current) setTimeout(() => nameInputRef.current?.focus(), 0)
      }
    }
  }, [])

  const handleFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      if (!gps) {
        setError('No GPS position yet. Wait for the location to appear, then take the photo again.')
        return
      }
      resetCapture()
      const seq = captureSeqRef.current
      const pos = { ...gps }
      setLastMessage(null)
      try {
        const dataUrl = await compressImage(file)
        if (seq !== captureSeqRef.current) return
        setPosition(pos)
        setPhoto(dataUrl)
        loadAddress(pos, seq)
        readSignboard(dataUrl, seq)
      } catch (err) {
        setError(err.message || 'Could not use that photo.')
      }
    },
    [gps, resetCapture, loadAddress, readSignboard]
  )

  const openCamera = () => fileInputRef.current?.click()

  const handleSave = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter the place name.')
      nameInputRef.current?.focus()
      return
    }
    if (!position || saving) return
    setSaving(true)
    setError(null)
    try {
      // Local-language name: keep what was read off the board, else translate like Add Place does.
      let local = nameLocal.trim()
      if (!local && targetLang && targetLang !== 'en') {
        try {
          const { data } = await api.post('/map/translate', { text: trimmed, targetLang })
          local = data?.translatedText?.trim() || ''
          // A translator that fails just echoes the input — that is not a local name.
          if (local.toLowerCase() === trimmed.toLowerCase()) local = ''
        } catch {
          local = ''
        }
      }

      // Same parameter set as other places: zoom level, viewport/bounds, type, vicinity, address, status.
      const mapZoom = Number(getMapZoom?.())
      const zoomLevel = Number.isFinite(mapZoom)
        ? Math.round(Math.min(Math.max(mapZoom, SURVEY_ZOOM_MIN), SURVEY_ZOOM_MAX) * 10) / 10
        : SURVEY_ZOOM_DEFAULT
      const viewport = pointViewport(position.lat, position.lng, zoomLevel)
      const type = placeTypeSlug(kind) || placeTypeSlug(category)

      const { data: place } = await api.post('/map/places', {
        place_name_en: trimmed,
        place_name_local: local || null,
        category,
        latitude: position.lat,
        longitude: position.lng,
        zoomLevel,
        mapRenderingConfig: extractMapRenderingConfig({
          map: staticMapContext(zoomLevel, viewport),
          place: { latitude: position.lat, longitude: position.lng, zoomLevel, category, type },
          category,
        }),
        ...address,
        type,
        types: type ? [type] : undefined,
        vicinity: composeVicinity(address) || undefined,
        address: composeFullAddress(address) || undefined,
        business_status: 'OPERATIONAL',
        extracted_at: new Date().toISOString(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        source: 'contribution',
        // Neighbouring shops share almost the same GPS point: only a same-name place there is a duplicate.
        survey: true,
      })

      let photoSaved = true
      try {
        await api.post(`/map/places/${place.id}/photos`, { dataUrl: photo, caption: 'Quick Survey' })
      } catch {
        photoSaved = false
      }

      onPlaceSaved?.(place)
      setAdded((prev) => [{ id: place.id, name: trimmed, category }, ...prev])
      setLastMessage(photoSaved ? `Saved: ${trimmed}` : `Saved: ${trimmed} (photo could not be attached)`)
      resetCapture()
    } catch (err) {
      if (err.response?.status === 409) {
        const existing = err.response?.data?.existingPlaceName
        setError(
          existing
            ? `Already on the map as "${existing}". Tap Skip and move to the next place.`
            : err.response?.data?.message || 'This place is already on the map.'
        )
      } else if (err.response?.status === 429) {
        setError('Too many places in a short time. Wait a minute and tap Save again.')
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Could not save the place.')
      }
    } finally {
      setSaving(false)
    }
  }, [name, nameLocal, category, phone, kind, address, targetLang, position, photo, saving, onPlaceSaved, resetCapture, getMapZoom])

  if (!isOpen) return null

  const accuracy = gps?.accuracy
  const gpsWeak = accuracy != null && accuracy > WEAK_GPS_METERS
  const gpsLabel = gpsError
    ? gpsError
    : !gps
      ? 'Getting your location…'
      : `GPS ±${Math.round(accuracy ?? 0)} m${gpsWeak ? ' — weak, wait a moment for a better fix' : ''}`
  const areaLabel = [address.village, address.taluk, address.district].filter(Boolean).join(', ')

  return (
    // Above the install prompt and chat bubble (z-70): the Save bar must never be covered mid-survey.
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-survey-title"
        className="relative flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.35rem] bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl animate-sheet-up sm:animate-fade-in"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-r from-primary-600 to-cyan-600 px-4 py-3.5 text-white">
          <div className="min-w-0">
            <h2 id="quick-survey-title" className="truncate text-base font-bold tracking-tight">
              Quick Survey
            </h2>
            <p className="truncate text-xs text-white/80">Photo → name and location fill in → save</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {added.length > 0 && (
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-white/25">
                {added.length} added
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 transition-colors hover:bg-white/20"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* GPS status */}
        <div
          className={`shrink-0 border-b px-4 py-2 text-xs font-medium ${
            gpsError
              ? 'border-red-200 bg-red-50 text-red-800'
              : !gps || gpsWeak
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
          role="status"
        >
          {gpsLabel}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {!photo ? (
            /* ---------- Camera step ---------- */
            <div className="p-4">
              {lastMessage && (
                <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                  ✓ {lastMessage}
                </p>
              )}
              {error && (
                <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={openCamera}
                disabled={!gps}
                className="flex min-h-[132px] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-cyan-600 px-4 text-white shadow-lg transition hover:from-primary-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-base font-bold">{added.length > 0 ? 'Next place — take photo' : 'Take photo of the signboard'}</span>
              </button>
              <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-slate-600">
                <li>• Stand at the entrance of the place — your GPS position becomes its map location.</li>
                <li>• Keep the whole signboard in the photo so the name can be read.</li>
                <li>• New places are visible only to you until approved.</li>
              </ul>

              {added.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Added this session</h3>
                  <ul className="mt-1.5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {added.slice(0, 30).map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0 truncate text-sm font-medium text-slate-900">{p.name}</span>
                        <span className="shrink-0 text-xs text-slate-500">{p.category}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            /* ---------- Review step ---------- */
            <div className="p-4">
              <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                <img src={photo} alt="Signboard" className="max-h-52 w-full object-cover" />
                {reading && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-slate-900/70 px-3 py-2 text-xs font-medium text-white">
                    <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reading the signboard…
                  </div>
                )}
              </div>
              {aiNote && !reading && <p className="mt-2 text-xs text-slate-500">{aiNote}</p>}

              <label htmlFor="survey-name" className="mt-3 block text-xs font-semibold text-slate-700">
                Place name (English)
              </label>
              <input
                id="survey-name"
                ref={nameInputRef}
                type="text"
                value={name}
                maxLength={200}
                onChange={(e) => {
                  nameEditedRef.current = true
                  setName(e.target.value)
                }}
                placeholder={reading ? 'Reading…' : 'e.g. Sri Durga Bakery'}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
              />

              {nameLocal && (
                <>
                  <label htmlFor="survey-name-local" className="mt-3 block text-xs font-semibold text-slate-700">
                    Local-language name
                  </label>
                  <input
                    id="survey-name-local"
                    type="text"
                    value={nameLocal}
                    maxLength={200}
                    onChange={(e) => setNameLocal(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                  />
                </>
              )}

              <p className="mt-3 text-xs font-semibold text-slate-700">Category</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PLACE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      categoryEditedRef.current = true
                      setCategory(c)
                    }}
                    aria-pressed={category === c}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      category === c
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                <span className="font-mono">
                  {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                </span>
                {position.accuracy != null ? ` · ±${Math.round(position.accuracy)} m` : ''}
                {areaLabel ? ` · ${areaLabel}` : ''}
                {phone ? ` · ${phone}` : ''}
              </p>

              {error && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {photo && (
          <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white p-3">
            <button
              type="button"
              onClick={resetCapture}
              disabled={saving}
              className="min-h-[48px] shrink-0 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-cyan-600 px-4 text-sm font-bold text-white shadow-lg transition hover:from-primary-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save & next'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuickSurveySheet
