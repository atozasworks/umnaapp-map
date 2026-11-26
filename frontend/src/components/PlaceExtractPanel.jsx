import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import RegionAutoAddBox from './RegionAutoAddBox'
import { withMapRenderingConfig } from '../utils/mapRenderingConfig'
import { pointViewport, composeFullAddress, composeVicinity, staticMapContext } from '../utils/placeAddParams'
import GridExtractCompleteModal from './GridExtractCompleteModal.jsx'

/**
 * Place Extractor — bulk-add places from openly licensed datasets (Overture
 * Maps, Foursquare OS Places, imported government CSVs) held in the server's
 * OpenPlace catalogue. No Google Maps / Google Places calls are made here.
 * The panel has no map of its own: a region is typed in, the server finds its
 * area, and the places come back as a list to pick from.
 */

const MAX_PLACES_DEFAULT = 20
const MAX_AREA_KM2_DEFAULT = 9
/** Zoom stored with each added place (same as the server-side auto-add). */
const PLACE_ZOOM = 17
/** Waiting for the server to download an area that is not in the catalogue yet. */
const AREA_POLL_MS = 2500
const AREA_DOWNLOAD_TIMEOUT_MS = 4 * 60 * 1000

const EXTRACT_METHODS = [
  {
    id: 'grid',
    label: 'By Region',
    description: 'Find places across a selected region',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 4h-4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14h-4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 00-2-2z" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    description: 'Find places by name',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
]

const INITIAL_STATUS = {
  grid: '',
  search: 'Type a place name to search the open-data catalogue',
}

const FIELD_CLASS =
  'h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 sm:h-10 sm:text-sm'

const PIN_ICON = (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </>
)
const SPINNER_PATH =
  'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'

function bboxAreaKm2({ minLat, maxLat, minLng, maxLng }) {
  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180)
  return Math.abs((maxLat - minLat) * 111.32 * (maxLng - minLng) * 111.32 * Math.cos(midLat))
}

/** The largest allowed square around a point, for regions wider than the per-run area cap. */
function squareAround({ lat, lng }, areaKm2) {
  const halfKm = Math.sqrt(areaKm2) / 2
  const halfLat = halfKm / 111.32
  const halfLng = halfKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2))
  return { minLat: lat - halfLat, maxLat: lat + halfLat, minLng: lng - halfLng, maxLng: lng + halfLng }
}

/** Reverse-geocode the centre of a batch: shared admin area + the local language to translate into. */
async function lookupAreaInfo(places) {
  const empty = { village: '', taluk: '', district: '', state: '', country: '', pincode: '', targetLang: null }
  if (!places.length) return empty
  const lat = places.reduce((s, p) => s + p.lat, 0) / places.length
  const lng = places.reduce((s, p) => s + p.lng, 0) / places.length
  try {
    const { data } = await api.get('/map/reverse', { params: { lat, lng } })
    const f = data?.addressFields || {}
    // Village and pincode are only trusted when the batch is a single spot (Search tab, one pick).
    const single = places.length === 1
    return {
      village: single ? f.village || '' : '',
      pincode: single ? f.pincode || '' : '',
      taluk: f.taluk || '',
      district: f.district || '',
      state: f.state || '',
      country: f.country || '',
      targetLang: data?.targetLang || null,
    }
  } catch {
    return empty
  }
}

/** Local-language names (same translator Add Place uses), a few at a time. Missing ones stay blank. */
async function translateNames(places, targetLang) {
  const out = new Array(places.length).fill('')
  if (!targetLang || targetLang === 'en') return out
  const LIMIT = 60
  let next = 0
  const worker = async () => {
    while (next < Math.min(places.length, LIMIT)) {
      const i = next++
      try {
        const { data } = await api.post('/map/translate', { text: places[i].name, targetLang })
        const t = data?.translatedText?.trim() || ''
        if (t && t.toLowerCase() !== places[i].name.toLowerCase()) out[i] = t
      } catch {
        /* leave blank */
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return out
}

function formatAddToMapStatus(bulkResult, fallbackCount) {
  const added = bulkResult?.added ?? fallbackCount
  const skipped = bulkResult?.skipped ?? 0
  return skipped > 0
    ? `Added ${added} place(s) to the map (${skipped} skipped).`
    : `Added ${added} place(s) to the map!`
}

function addToMapSucceeded(bulkResult) {
  if ((bulkResult?.added ?? 0) > 0) return true
  return Array.isArray(bulkResult?.places) && bulkResult.places.length > 0
}

const PlaceExtractPanel = ({ isOpen, onClose, onAddToMap, onShowDuplicate }) => {
  const { user } = useAuth()
  const addInFlightRef = useRef(false)
  const resultsRef = useRef(null)

  const [method, setMethod] = useState('grid')
  const [status, setStatusMap] = useState(INITIAL_STATUS)
  const setStatus = useCallback((id, text) => setStatusMap((prev) => ({ ...prev, [id]: text })), [])

  const [region, setRegion] = useState({ country: '', state: '', district: '', taluk: '', village: '' })
  const [findingRegion, setFindingRegion] = useState(false)

  // Results and selection per method; selection is keyed by catalogue id.
  const [results, setResults] = useState({ grid: [], search: [] })
  const [selected, setSelected] = useState({ grid: new Set(), search: new Set() })
  const [extracting, setExtracting] = useState(false)
  const [addingToMap, setAddingToMap] = useState(false)

  // Catalogue + daily quota
  const [catalogue, setCatalogue] = useState({ loading: true, available: false, total: 0, sources: [] })
  const [maxPlaces, setMaxPlaces] = useState(MAX_PLACES_DEFAULT)
  const [maxAreaKm2, setMaxAreaKm2] = useState(MAX_AREA_KM2_DEFAULT)
  const [daily, setDaily] = useState({ loading: true, usedToday: false, requiresLogin: false })
  const [completeModal, setCompleteModal] = useState({ open: false, count: 0, slotReleased: false })

  // Search tab
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchBoxRef = useRef(null)
  const searchInputRef = useRef(null)
  const searchSeqRef = useRef(0)

  const activeResults = results[method]
  const activeSelected = selected[method]
  // Only a missing catalogue blocks the panel: an area with no data yet is downloaded on demand.
  const catalogueEmpty = !catalogue.loading && !catalogue.available
  const dailyBlocked = !user?.id || daily.requiresLogin || daily.usedToday

  // ---- Server status ------------------------------------------------------

  const refreshStatus = useCallback(async () => {
    if (!user?.id) {
      setDaily({ loading: false, usedToday: false, requiresLogin: true })
      setCatalogue({ loading: false, available: false, total: 0, sources: [] })
      return
    }
    const [cat, quota] = await Promise.allSettled([
      api.get('/map/open-places/status'),
      api.get('/map/grid-extract/status'),
    ])
    if (cat.status === 'fulfilled') {
      const d = cat.value.data
      setCatalogue({ loading: false, available: !!d.available, total: d.total || 0, sources: d.sources || [] })
      if (d.maxPlaces) setMaxPlaces(d.maxPlaces)
      if (d.maxAreaKm2) setMaxAreaKm2(d.maxAreaKm2)
    } else {
      setCatalogue({ loading: false, available: false, total: 0, sources: [] })
    }
    if (quota.status === 'fulfilled') {
      setDaily({ loading: false, usedToday: !!quota.value.data.usedToday, requiresLogin: false })
    } else {
      setDaily({ loading: false, usedToday: false, requiresLogin: false })
    }
  }, [user?.id])

  useEffect(() => {
    if (isOpen) refreshStatus()
  }, [isOpen, refreshStatus])

  // ---- Region -------------------------------------------------------------

  const regionString = useMemo(
    () =>
      [region.village, region.taluk, region.district, region.state, region.country]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(', '),
    [region]
  )

  const setRegionField = (key) => (e) => {
    setRegion((prev) => ({ ...prev, [key]: e.target.value }))
  }

  // ---- Extraction (By Region) --------------------------------------------

  const runExtract = useCallback(
    async (id, bbox, regionName) => {
      if (extracting) return
      if (!user?.id) {
        setStatus(id, 'Please log in to use place extract.')
        return
      }
      if (catalogueEmpty) {
        setStatus(id, 'The open place catalogue is not set up on this server yet.')
        return
      }
      if (dailyBlocked) {
        setStatus(id, 'You have already used place extract today. You can extract again tomorrow.')
        return
      }
      setExtracting(true)
      setStatus(id, 'Starting extract…')

      // An area nobody asked for before is downloaded into the catalogue first.
      // The server works in the background; keep asking until it is ready.
      try {
        const deadline = Date.now() + AREA_DOWNLOAD_TIMEOUT_MS
        for (;;) {
          const { data } = await api.post('/map/open-places/ensure', { bbox })
          if (data.status === 'ready') break
          if (data.status !== 'importing') throw new Error(data.message || 'Could not load open data for this area.')
          if (Date.now() > deadline) throw new Error('Loading this area is taking too long. Try again in a few minutes.')
          setStatus(id, `First time for this area — downloading its open place data… ${data.seconds || 0}s (usually under a minute)`)
          await new Promise((resolve) => setTimeout(resolve, AREA_POLL_MS))
        }
      } catch (err) {
        setExtracting(false)
        setStatus(id, `Could not load this area: ${err.response?.data?.message || err.message}`)
        return
      }

      setStatus(id, 'Searching the open-data catalogue…')
      let slotConsumed = false
      let found = []
      let summary = null
      let failed = null
      try {
        const { data: slot } = await api.post('/map/grid-extract/consume')
        slotConsumed = true
        if (slot.maxPlaces) setMaxPlaces(slot.maxPlaces)
        setDaily({ loading: false, usedToday: true, requiresLogin: false })

        setStatus(id, 'Searching the open-data catalogue…')
        const { data } = await api.post('/map/open-places/extract', { bbox, limit: maxPlaces })
        found = Array.isArray(data.places) ? data.places : []
        summary = data
      } catch (err) {
        failed = err
      }

      // Hand the daily slot back when the run produced nothing to add.
      let slotReleased = false
      if (slotConsumed && found.length === 0) {
        try {
          const { data } = await api.post('/map/grid-extract/release')
          if (data.released) {
            slotReleased = true
            setDaily({ loading: false, usedToday: false, requiresLogin: false })
          }
        } catch {
          /* keep used-today state if release fails */
        }
      }

      setResults((prev) => ({ ...prev, [id]: found }))
      setSelected((prev) => ({ ...prev, [id]: new Set(found.map((p) => p.id)) }))
      setExtracting(false)

      if (failed) {
        const code = failed.response?.status
        if (code === 429) {
          setDaily({ loading: false, usedToday: true, requiresLogin: false })
          setStatus(id, failed.response?.data?.message || 'You have already used place extract today.')
        } else {
          setStatus(id, `Extract failed: ${failed.response?.data?.message || failed.message}`)
        }
        return
      }

      const onMapNote = summary.alreadyOnMap > 0 ? ` — ${summary.alreadyOnMap} already on the map skipped` : ''
      if (found.length === 0) {
        setStatus(
          id,
          summary.total > 0
            ? `No new places here${onMapNote}.`
            : `The open datasets have no places for ${regionName}. Try a nearby town, or add places with Quick Survey.`
        )
      } else {
        const more = summary.available > found.length ? ` (${summary.available} available, max ${maxPlaces} per run)` : ''
        setStatus(id, `Found ${found.length} place${found.length === 1 ? '' : 's'} in ${regionName}${more}${onMapNote}.`)
      }
      // On a phone the list sits below the form; bring it into view.
      if (found.length > 0) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setCompleteModal({ open: true, count: found.length, slotReleased })
    },
    [extracting, user?.id, catalogueEmpty, dailyBlocked, maxPlaces, setStatus]
  )

  const extractRegion = useCallback(async () => {
    if (extracting || findingRegion) return
    if (!region.country.trim()) {
      setStatus('grid', 'Country is required (e.g. India).')
      return
    }
    setFindingRegion(true)
    setStatus('grid', `Finding ${regionString}…`)
    let found = null
    try {
      const { data } = await api.get('/map/open-places/region', { params: { q: regionString } })
      found = data
    } catch (err) {
      setStatus(
        'grid',
        err.response?.status === 404
          ? `Could not find "${regionString}". Check the spelling or use fewer fields.`
          : `Region lookup failed: ${err.response?.data?.message || err.message}`
      )
    } finally {
      setFindingRegion(false)
    }
    if (!found) return
    // A town or taluk is usually wider than the per-run area cap; search the
    // largest allowed square around its centre instead of refusing.
    // A village can also come back as a single point (a bus stop, a temple) with
    // a box a few metres wide; anything under 1 km² is treated the same way.
    const regionKm2 = bboxAreaKm2(found.bbox)
    const whole = regionKm2 >= 1 && regionKm2 <= maxAreaKm2
    const bbox = whole ? found.bbox : squareAround(found.center, maxAreaKm2 * 0.95)
    const shortName = String(found.name || regionString).split(',').slice(0, 2).join(',').trim()
    await runExtract('grid', bbox, whole ? shortName : `${shortName} (${maxAreaKm2} km² around its centre)`)
  }, [extracting, findingRegion, region.country, regionString, maxAreaKm2, runExtract, setStatus])

  // ---- Search tab ---------------------------------------------------------

  const fetchSuggestions = useCallback(async (value) => {
    const q = value.trim()
    if (q.length < 2) {
      setSuggestions([])
      setSearching(false)
      return
    }
    const seq = ++searchSeqRef.current
    setSearching(true)
    try {
      const { data } = await api.get('/map/open-places/search', { params: { q, limit: 8 } })
      if (seq !== searchSeqRef.current) return
      setSuggestions(Array.isArray(data.results) ? data.results : [])
      if (!data.results?.length) setStatus('search', `No match for "${q}" in the open-data catalogue.`)
    } catch (err) {
      if (seq !== searchSeqRef.current) return
      setSuggestions([])
      setStatus('search', `Search failed: ${err.response?.data?.message || err.message}`)
    } finally {
      if (seq === searchSeqRef.current) setSearching(false)
    }
  }, [setStatus])

  useEffect(() => {
    if (method !== 'search') return undefined
    const t = setTimeout(() => fetchSuggestions(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery, method, fetchSuggestions])

  useEffect(() => {
    const onDocDown = (e) => {
      if (!searchBoxRef.current?.contains(e.target)) setSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  const pickSuggestion = useCallback(
    (place) => {
      setSearchQuery('')
      setSuggestions([])
      setSuggestOpen(false)
      if (results.search.some((p) => p.id === place.id)) {
        setStatus('search', `${place.name} is already in your list.`)
        return
      }
      const next = [...results.search, place]
      setResults((prev) => ({ ...prev, search: next }))
      setSelected((prev) => ({ ...prev, search: new Set([...prev.search, place.id]) }))
      setStatus('search', `Added: ${place.name}`)
      searchInputRef.current?.focus()
    },
    [results.search, setStatus]
  )

  const removeSearchPlace = useCallback((id) => {
    setResults((prev) => ({ ...prev, search: prev.search.filter((p) => p.id !== id) }))
    setSelected((prev) => {
      const next = new Set(prev.search)
      next.delete(id)
      return { ...prev, search: next }
    })
  }, [])

  // ---- Selection, add to map ---------------------------------------------

  const togglePlace = useCallback(
    (id) => {
      setSelected((prev) => {
        const next = new Set(prev[method])
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return { ...prev, [method]: next }
      })
    },
    [method]
  )

  const allSelected = activeResults.length > 0 && activeSelected.size === activeResults.length
  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => ({
      ...prev,
      [method]: allSelected ? new Set() : new Set(results[method].map((p) => p.id)),
    }))
  }, [method, allSelected, results])

  const handleAddToMap = useCallback(async () => {
    if (addInFlightRef.current) return
    const id = method
    const chosen = results[id].filter((p) => selected[id].has(p.id))
    if (chosen.length === 0) {
      setStatus(id, 'No places selected. Select places to add.')
      return
    }
    addInFlightRef.current = true
    setAddingToMap(true)
    try {
      const zoomLevel = PLACE_ZOOM
      const useRegion = id !== 'search'

      // One reverse-geocode at the centre of the batch fills taluk / district / state /
      // country (an extract area is at most a few km wide) and tells us the local language.
      setStatus(id, 'Filling in address details…')
      const areaInfo = await lookupAreaInfo(chosen)
      const localNames = await translateNames(chosen, areaInfo.targetLang)

      const payload = chosen.map((p, i) => {
        const parts = {
          // Dataset 'locality' values are often a district or city, so a reverse-geocoded village wins when we have one.
          village: (useRegion && region.village.trim()) || areaInfo.village || p.locality || '',
          taluk: (useRegion && region.taluk.trim()) || areaInfo.taluk || '',
          district: (useRegion && region.district.trim()) || areaInfo.district || '',
          state: (useRegion && region.state.trim()) || p.region || areaInfo.state || '',
          country: (useRegion && region.country.trim()) || areaInfo.country || '',
          pincode: p.pincode || areaInfo.pincode || '',
        }
        return withMapRenderingConfig(
          {
            name: p.name,
            place_name_local: localNames[i] || undefined,
            lat: p.lat,
            lng: p.lng,
            category: p.category,
            type: p.type || undefined,
            types: p.type ? [p.type] : undefined,
            address: p.address || composeFullAddress(parts) || undefined,
            vicinity: composeVicinity(parts) || undefined,
            business_status: 'OPERATIONAL',
            phone: p.phone || undefined,
            website: p.website || undefined,
            pincode: parts.pincode || undefined,
            village: parts.village || undefined,
            taluk: parts.taluk || undefined,
            district: parts.district || undefined,
            state: parts.state || undefined,
            country: parts.country || undefined,
            zoomLevel,
            // The place's own viewport (stored in the rendering config as viewport and bounds).
            geometry: { viewport: pointViewport(p.lat, p.lng, zoomLevel) },
            data_source: p.data_source,
            open_place_id: p.open_place_id,
            ...(id === 'search' ? {} : { extractMethod: id }),
          },
          { map: staticMapContext(zoomLevel, pointViewport(p.lat, p.lng, zoomLevel)), category: p.category }
        )
      })
      setStatus(id, `Saving ${payload.length} place(s)…`)
      const bulkResult = await onAddToMap(payload)
      setStatus(id, formatAddToMapStatus(bulkResult, payload.length))
      if (addToMapSucceeded(bulkResult)) onClose()
    } catch (err) {
      if (err.response?.status === 409) {
        onShowDuplicate?.(
          {
            duplicate: true,
            message: err.response?.data?.message,
            reason: err.response?.data?.reason,
            existingPlaceId: err.response?.data?.existingPlaceId,
            existingPlaceName: err.response?.data?.existingPlaceName,
          },
          chosen[0]?.name
        )
        setStatus(id, err.response?.data?.message || 'Place already on the map')
      } else {
        setStatus(id, `Failed to add places: ${err.response?.data?.message || err.message}`)
      }
    } finally {
      addInFlightRef.current = false
      setAddingToMap(false)
    }
  }, [method, results, selected, region, onAddToMap, onClose, onShowDuplicate, setStatus])

  if (!isOpen) return null

  const extractDisabledReason = daily.requiresLogin
    ? 'Log in to extract'
    : daily.usedToday
      ? 'Already used today — try again tomorrow'
      : catalogueEmpty
        ? 'Open place catalogue is not set up'
        : null

  // ---- Render pieces -----------------------------------------------------

  const isSearch = method === 'search'
  const busy = extracting || findingRegion

  const regionFields = (
    <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5">
      {[
        ['country', 'Country', 'India', 'col-span-2 sm:col-span-1', true],
        ['state', 'State', 'Karnataka', 'col-span-2 sm:col-span-1', false],
        ['district', 'District', 'Dakshina Kannada', '', false],
        ['taluk', 'Taluk', 'Puttur', '', false],
        ['village', 'Village / town', 'e.g. Kadaba', 'col-span-2', false],
      ].map(([key, label, placeholder, span, required]) => (
        <label key={key} className={`block min-w-0 ${span}`}>
          <span className="mb-1 block text-[11px] font-semibold text-slate-600">
            {label}
            {required && <span className="ml-0.5 text-rose-500">*</span>}
          </span>
          <input
            type="text"
            value={region[key]}
            onChange={setRegionField(key)}
            placeholder={placeholder}
            autoComplete="off"
            className={FIELD_CLASS}
            onKeyDown={(e) => e.key === 'Enter' && extractRegion()}
          />
        </label>
      ))}
    </div>
  )

  const notice = (tone, title, text) => {
    const tones = {
      slate: 'border-slate-200 bg-slate-50 text-slate-700',
      blue: 'border-blue-200 bg-blue-50 text-blue-900',
      amber: 'border-amber-200 bg-amber-50 text-amber-900',
    }
    return (
      <div role="status" className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`}>
        <p className="text-xs font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug opacity-90">{text}</p>
      </div>
    )
  }

  const statusBox = (status[method] || busy) && (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm" role="status" aria-live="polite">
      <div className="flex items-start gap-2">
        {busy ? (
          <svg className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={SPINNER_PATH} />
          </svg>
        ) : (
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <p className="min-w-0 break-words text-xs leading-relaxed text-slate-700">{status[method] || 'Working…'}</p>
      </div>
      {extracting && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-primary-500 to-cyan-500" />
        </div>
      )}
    </div>
  )

  const placeCard = (place) => {
    const checked = activeSelected.has(place.id)
    return (
      <li
        key={place.id}
        className={`flex min-w-0 items-stretch rounded-xl border transition-colors ${
          checked
            ? 'border-primary-300 bg-primary-50/70 shadow-sm'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 p-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => togglePlace(place.id)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-400 peer-focus-visible:ring-offset-1 ${
              checked ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-transparent'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className="block min-w-0 flex-1">
            <span className="block break-words text-sm font-semibold leading-snug text-slate-900">{place.name}</span>
            {place.address && (
              <span className="mt-0.5 block break-words text-xs leading-snug text-slate-500 line-clamp-2">
                {place.address}
              </span>
            )}
            <span className="mt-1.5 flex flex-wrap items-center gap-1">
              {place.category && (
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-800">
                  {place.category}
                </span>
              )}
              {place.data_source_label && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  {place.data_source_label}
                </span>
              )}
              <span className="font-mono text-[10px] text-slate-400">
                {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
              </span>
            </span>
          </span>
        </label>
        {isSearch && (
          <button
            type="button"
            onClick={() => removeSearchPlace(place.id)}
            className="flex w-11 shrink-0 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Remove from list"
            aria-label={`Remove ${place.name} from list`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </li>
    )
  }

  const emptyState = (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-cyan-100 text-primary-600">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          {PIN_ICON}
        </svg>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800">No places yet</p>
      <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-slate-500">
        {isSearch
          ? 'Type a name in the search box and pick a suggestion. It will appear here.'
          : 'Enter a region and tap Extract places. The places found will appear here.'}
      </p>
    </div>
  )

  const loadingState = (
    <ul className="grid grid-cols-1 gap-2 p-3 sm:p-4 xl:grid-cols-2" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-3">
          <div className="h-3.5 w-2/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-full rounded bg-slate-100" />
          <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
        </li>
      ))}
    </ul>
  )

  return (
    <div
      className="fixed inset-0 z-40 flex h-[100dvh] max-h-[100dvh] pointer-events-none items-stretch justify-center overflow-hidden p-0 sm:items-center sm:p-4 md:p-6"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
      }}
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[3px] pointer-events-auto transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-extract-title"
        className="relative pointer-events-auto flex h-full max-h-full min-h-0 w-full max-w-[min(1120px,100vw)] flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-[0_-12px_48px_rgba(15,23,42,0.18)] sm:h-[min(90dvh,860px)] sm:max-h-[min(90dvh,860px)] sm:max-w-[min(1120px,96vw)] sm:flex-none sm:rounded-3xl sm:shadow-2xl sm:ring-1 sm:ring-slate-900/10 animate-sheet-up sm:animate-fade-in"
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-primary-600 via-primary-600 to-cyan-600 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_100%_0%,rgba(255,255,255,0.18),transparent_55%)]" aria-hidden />
          <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
            <div className="h-1 w-10 rounded-full bg-white/40" />
          </div>
          <div className="relative flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 sm:h-12 sm:w-12">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="place-extract-title" className="truncate text-lg font-bold tracking-tight sm:text-xl">
                Place Extractor
              </h2>
              <p className="truncate text-xs text-white/85 sm:text-sm">Find places of a region and add them to the map</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25 transition-colors hover:bg-white/20 active:bg-white/30"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body: one scrolling column on phones, two panes on large screens */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:flex-row lg:overflow-hidden">
          {/* ---- Controls ---- */}
          <section className="shrink-0 space-y-3 border-b border-slate-200 bg-white p-3 sm:p-5 lg:w-[400px] lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:border-r">
            <nav className="flex gap-1 rounded-2xl bg-slate-100 p-1" aria-label="Extract method">
              {EXTRACT_METHODS.map((m) => {
                const active = method === m.id
                const count = results[m.id].length
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    title={m.description}
                    aria-pressed={active}
                    className={`flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-all ${
                      active ? 'bg-white text-primary-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m.icon}
                    <span className="truncate">{m.label}</span>
                    {count > 0 && (
                      <span className="shrink-0 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-700">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {!daily.loading && daily.requiresLogin &&
              notice('slate', 'Log in required', `Sign in to use place extract (max ${maxPlaces} places, once per day).`)}
            {!daily.requiresLogin && catalogueEmpty &&
              notice(
                'amber',
                'Open place catalogue is not set up',
                'This server has no open place catalogue yet, so there is nothing to extract. An administrator needs to set it up.'
              )}

            {!isSearch && (
              <>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Region</p>
                  {regionFields}
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Max {maxPlaces} places</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Once per day</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Up to {maxAreaKm2} km²</span>
                </div>

                {!daily.loading && daily.usedToday &&
                  notice('blue', "Today's extract already used", 'One region extract per day per user. Search is still available.')}

                <button
                  type="button"
                  onClick={extractRegion}
                  disabled={!regionString || busy || Boolean(extractDisabledReason)}
                  title={extractDisabledReason || 'Find this region and list its places'}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-cyan-600 px-4 text-sm font-bold text-white shadow-md shadow-primary-600/20 transition hover:from-primary-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  <svg className={`h-4 w-4 shrink-0 ${busy ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    {busy ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={SPINNER_PATH} />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    )}
                  </svg>
                  {findingRegion ? 'Finding region…' : extracting ? 'Extracting…' : 'Extract places'}
                </button>
              </>
            )}

            {isSearch && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Search by name</p>
                <div ref={searchBoxRef} className="relative z-30">
                  <div className="flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white pl-3 pr-2 shadow-sm focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-400/30">
                    <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setSuggestOpen(true)
                      }}
                      onFocus={() => setSuggestOpen(true)}
                      placeholder="Search for a place…"
                      aria-label="Search for a place"
                      autoComplete="off"
                      disabled={catalogueEmpty}
                      className="min-h-[44px] min-w-0 flex-1 bg-transparent py-2 text-base text-slate-900 placeholder:text-slate-400 outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                    />
                    {searching && (
                      <svg className="h-4 w-4 shrink-0 animate-spin text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={SPINNER_PATH} />
                      </svg>
                    )}
                  </div>

                  {suggestOpen && searchQuery.trim().length >= 2 && (suggestions.length > 0 || searching) && (
                    <div
                      className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[min(50vh,300px)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5"
                      role="listbox"
                      aria-label="Place suggestions"
                    >
                      {searching && suggestions.length === 0 && <div className="px-3 py-3 text-sm text-slate-500">Searching…</div>}
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          role="option"
                          aria-selected="false"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickSuggestion(s)}
                          className="flex w-full items-start gap-2.5 border-b border-slate-100 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 active:bg-slate-100 sm:py-2.5"
                        >
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            {PIN_ICON}
                          </svg>
                          <span className="block min-w-0 flex-1">
                            <span className="block break-words text-sm font-semibold text-slate-900">{s.name}</span>
                            <span className="mt-0.5 block text-xs text-slate-500 line-clamp-2">
                              {[s.category, s.address].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {statusBox}

            {!isSearch && user?.isPlaceDeleteAdmin && (
              <RegionAutoAddBox regionString={regionString} hasCountry={Boolean(region.country.trim())} />
            )}

            {!catalogueEmpty && catalogue.sources.length > 0 && (
              <p className="text-[11px] leading-snug text-slate-400">
                Open data: {catalogue.sources.map((s) => `${s.label} (${s.count.toLocaleString()})`).join(' · ')}
              </p>
            )}
          </section>

          {/* ---- Results ---- */}
          <section ref={resultsRef} className="flex min-w-0 flex-1 flex-col lg:min-h-0" aria-label="Extracted places">
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/95 px-3 py-2.5 backdrop-blur sm:px-5 lg:static">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-sm font-bold text-slate-800 sm:text-base">Extracted places</h3>
                {activeResults.length > 0 && (
                  <span className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-800">
                    {activeSelected.size} of {activeResults.length} selected
                  </span>
                )}
              </div>
              {activeResults.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="-mr-1 shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            <div className="flex min-h-[220px] flex-1 flex-col lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
              {extracting ? (
                loadingState
              ) : activeResults.length === 0 ? (
                emptyState
              ) : (
                <ul className="grid grid-cols-1 content-start gap-2 p-3 sm:p-4 xl:grid-cols-2">{activeResults.map(placeCard)}</ul>
              )}
            </div>
          </section>
        </div>

        {/* Footer: add to map */}
        {activeResults.length > 0 && (
          <div
            className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-3 pt-3 shadow-[0_-8px_18px_rgba(15,23,42,0.06)] sm:px-5"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-500 sm:block">
              {activeSelected.size === 0
                ? 'Tick the places you want to add.'
                : `${activeSelected.size} place${activeSelected.size === 1 ? '' : 's'} will be added to the map.`}
            </p>
            <button
              type="button"
              onClick={handleAddToMap}
              disabled={activeSelected.size === 0 || addingToMap}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-cyan-600 px-6 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition hover:from-primary-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto sm:min-w-[220px]"
            >
              <svg className={`h-5 w-5 shrink-0 ${addingToMap ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                {addingToMap ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={SPINNER_PATH} /> : PIN_ICON}
              </svg>
              <span className="truncate">{addingToMap ? 'Adding…' : `Add ${activeSelected.size} to map`}</span>
            </button>
          </div>
        )}
      </div>

      <GridExtractCompleteModal
        isOpen={completeModal.open}
        onClose={() => setCompleteModal((m) => ({ ...m, open: false }))}
        placeCount={completeModal.count}
        maxPlaces={maxPlaces}
        slotReleased={completeModal.slotReleased}
      />
    </div>
  )
}

export default PlaceExtractPanel
