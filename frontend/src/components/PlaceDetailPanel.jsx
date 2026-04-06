import { useState, useEffect, useRef } from 'react'
import api from '../services/api'

const CATEGORY_ICONS = {
  Restaurant: '🍽️', Hospital: '🏥', Hotel: '🏨', Parking: '🅿️', Shop: '🛍️',
  'Grocery Store': '🛒', School: '🏫', Temple: '🛕', Bank: '🏦', 'Post Office': '📮',
  'Bus Stop': '🚏', 'Police Station': '🚔', 'Petrol Pump': '⛽', 'Tourist Place': '🗺️',
  Transit: '🚌', Museum: '🏛️', Pharmacy: '💊', ATM: '🏧', Cinema: '🎬',
  Gym: '💪', Salon: '💇', Other: '📍',
}

const CATEGORY_COLORS = {
  Restaurant: '#EF4444', Hospital: '#DC2626', Hotel: '#F59E0B', Parking: '#6366F1',
  Shop: '#8B5CF6', 'Grocery Store': '#A855F7', School: '#3B82F6', Temple: '#F97316',
  Bank: '#059669', 'Post Office': '#6366F1', 'Bus Stop': '#0EA5E9', 'Police Station': '#DC2626',
  'Petrol Pump': '#EAB308', 'Tourist Place': '#EC4899', Transit: '#0EA5E9', Museum: '#14B8A6',
  Pharmacy: '#10B981', ATM: '#84CC16', Cinema: '#8B5CF6', Gym: '#EF4444', Salon: '#EC4899',
  Other: '#0284C7',
}

const QUICK_FACTS = {
  Restaurant: ['Dine-in', 'Takeaway', 'Delivery'],
  Hospital: ['Emergency', '24/7', 'OPD'],
  Hotel: ['Check-in', 'Check-out', 'Amenities'],
  Pharmacy: ['Prescription', 'OTC Medicines', '24/7'],
  Bank: ['ATM', 'Deposits', 'Loans'],
  Temple: ['Darshan', 'Prasad', 'Events'],
  School: ['Pre-K – 10', 'Co-Ed', 'English Medium'],
  Museum: ['Heritage', 'Exhibits', 'Guided Tours'],
  Cinema: ['Movies', 'Tickets', 'Snacks'],
  Gym: ['Cardio', 'Weights', 'Classes'],
}

const StarRating = ({ value, onChange, readonly = false }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readonly}
        onClick={() => onChange && onChange(star)}
        className={`text-xl leading-none transition-transform ${readonly ? 'cursor-default' : 'hover:scale-110 active:scale-95'}`}
      >
        <span className={star <= value ? 'text-amber-400' : 'text-slate-200'}>★</span>
      </button>
    ))}
  </div>
)

const compressImage = (file, maxSizeKB = 400) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const MAX = 900
      if (width > MAX || height > MAX) {
        if (width > height) { height = (height / width) * MAX; width = MAX }
        else { width = (width / height) * MAX; height = MAX }
      }
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      for (let q = 0.85; q >= 0.3; q -= 0.1) {
        const dataUrl = canvas.toDataURL('image/jpeg', q)
        if (dataUrl.length < maxSizeKB * 1024 * 1.37) { resolve(dataUrl); return }
      }
      resolve(canvas.toDataURL('image/jpeg', 0.3))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })

export default function PlaceDetailPanel({
  place, onClose, onDirections, onSave, onEdit, onDelete, currentUser, isSaved, deletingId,
}) {
  const [entered, setEntered] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [address, setAddress] = useState(null)
  const [addressLoading, setAddressLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [avgRating, setAvgRating] = useState(null)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [photos, setPhotos] = useState([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [nearby, setNearby] = useState([])
  const [nearbyLoading, setNearbyLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [businessOpen, setBusinessOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [labelInput, setLabelInput] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState(null)
  const [deletingReviewId, setDeletingReviewId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [infoMsg, setInfoMsg] = useState(null)
  const showInfo = (msg) => { setInfoMsg(msg); setTimeout(() => setInfoMsg(null), 3000) }
  const photoInputRef = useRef(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [deletingPhotoId, setDeletingPhotoId] = useState(null)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  const isDbPlace = place?._isDbPlace !== false && /^[0-9a-f-]{36}$/.test(place?.id || '')

  useEffect(() => { const t = setTimeout(() => setEntered(true), 16); return () => clearTimeout(t) }, [])

  useEffect(() => {
    if (!place) return
    setAddressLoading(true); setAddress(null)
    setReviewsLoading(true); setReviews([]); setAvgRating(null)
    setPhotosLoading(true); setPhotos([])
    setNearbyLoading(true); setNearby([])
    setActiveTab('overview')
    setReviewRating(0); setReviewComment(''); setReviewError(null)

    api.get('/map/reverse', { params: { lat: place.latitude, lng: place.longitude } })
      .then(({ data }) => setAddress(data.address || null))
      .catch(() => setAddress(null))
      .finally(() => setAddressLoading(false))

    if (isDbPlace) {
      api.get(`/map/places/${place.id}/reviews`)
        .then(({ data }) => { setReviews(data.reviews || []); setAvgRating(data.avgRating) })
        .catch(() => { setReviews([]); setAvgRating(null) })
        .finally(() => setReviewsLoading(false))

      api.get(`/map/places/${place.id}/photos`)
        .then(({ data }) => setPhotos(data.photos || []))
        .catch(() => setPhotos([]))
        .finally(() => setPhotosLoading(false))

      api.get(`/map/places/${place.id}/nearby`)
        .then(({ data }) => setNearby(Array.isArray(data) ? data : []))
        .catch(() => setNearby([]))
        .finally(() => setNearbyLoading(false))
    } else {
      setReviewsLoading(false); setPhotosLoading(false); setNearbyLoading(false)
    }
  }, [place?.id])

  const handleClose = () => { setIsExiting(true); setTimeout(onClose, 280) }

  const name = place.place_name_en || place.name || 'Place'
  const localName = place.place_name_local
  const icon = CATEGORY_ICONS[place.category] || '📍'
  const color = CATEGORY_COLORS[place.category] || '#0284C7'
  const isOwner = currentUser && place.userId === currentUser.id
  const contributorName = place.user_name || place.userName || 'a user'

  const addrParts = []
  if (address) {
    if (address.road) addrParts.push(address.road)
    const locality = address.suburb || address.neighbourhood
    if (locality) addrParts.push(locality)
    const city = address.city || address.town || address.village
    if (city) addrParts.push(city)
    if (address.state) addrParts.push(address.state)
    if (address.country) addrParts.push(address.country)
  }
  const addrString = addrParts.join(', ')

  const handleShare = async () => {
    const mapUrl = `https://maps.google.com/?q=${place.latitude},${place.longitude}`
    const text = `${name} (${place.category})`
    if (navigator.share) {
      try { await navigator.share({ title: text, text: addrString || name, url: mapUrl }) } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${addrString ? addrString + '\n' : ''}${mapUrl}`)
        setCopied(true); setTimeout(() => setCopied(false), 2500)
      } catch {}
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (reviewRating === 0) { setReviewError('Please select a star rating.'); return }
    setSubmittingReview(true); setReviewError(null)
    try {
      const { data } = await api.post(`/map/places/${place.id}/reviews`, {
        rating: reviewRating, comment: reviewComment.trim() || undefined,
      })
      setReviews((prev) => {
        const rest = prev.filter((r) => r.userId !== currentUser.id)
        const updated = [data, ...rest]
        setAvgRating(Math.round((updated.reduce((s, r) => s + r.rating, 0) / updated.length) * 10) / 10)
        return updated
      })
      setReviewComment('')
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Failed to submit review.')
    } finally { setSubmittingReview(false) }
  }

  const handleDeleteReview = async (reviewId) => {
    setDeletingReviewId(reviewId)
    try {
      await api.delete(`/map/places/${place.id}/reviews/${reviewId}`)
      setReviews((prev) => {
        const updated = prev.filter((r) => r.id !== reviewId)
        const avg = updated.length ? updated.reduce((s, r) => s + r.rating, 0) / updated.length : null
        setAvgRating(avg ? Math.round(avg * 10) / 10 : null)
        return updated
      })
    } catch {}
    finally { setDeletingReviewId(null) }
  }

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploadingPhoto(true); setPhotoError(null)
    try {
      const dataUrl = await compressImage(file)
      const { data } = await api.post(`/map/places/${place.id}/photos`, { dataUrl })
      setPhotos((prev) => [data, ...prev])
    } catch (err) {
      setPhotoError(err.response?.data?.error || 'Failed to upload photo.')
    } finally { setUploadingPhoto(false); e.target.value = '' }
  }

  const handleDeletePhoto = async (photoId) => {
    setDeletingPhotoId(photoId)
    try {
      await api.delete(`/map/places/${place.id}/photos/${photoId}`)
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch {}
    finally { setDeletingPhotoId(null) }
  }

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640
  const panelTransform = (!entered || isExiting) ? (isDesktop ? 'translateX(-100%)' : 'translateY(100%)') : 'none'
  const formattedDate = place.createdAt
    ? new Date(place.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  const myReview = reviews.find((r) => r.userId === currentUser?.id)
  const TABS = [
    { id: 'overview', label: 'Overview' },
    ...(isDbPlace ? [
      { id: 'reviews', label: `Reviews${reviews.length ? ` (${reviews.length})` : ''}` },
      { id: 'photos', label: `Photos${photos.length ? ` (${photos.length})` : ''}` },
    ] : []),
  ]

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="absolute inset-0 z-40 sm:hidden pointer-events-auto"
        style={{
          background: entered && !isExiting ? 'rgba(0,0,0,0.22)' : 'transparent',
          transition: 'background 300ms',
        }}
        onClick={handleClose}
      />

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center" onClick={() => setLightboxPhoto(null)}>
          <img src={lightboxPhoto} alt="Photo" className="max-w-full max-h-full object-contain rounded" />
          <button onClick={() => setLightboxPhoto(null)} className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none">✕</button>
        </div>
      )}

      {/* Panel */}
      <div
        className="absolute z-50 bg-white shadow-2xl flex flex-col overflow-hidden pointer-events-auto
          bottom-0 left-0 right-0 max-h-[92vh] rounded-t-2xl
          sm:inset-y-0 sm:left-0 sm:right-auto sm:w-[400px] sm:max-h-none sm:rounded-none"
        style={{ transform: panelTransform, transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)' }}
      >
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>

        {/* Info toast banner */}
        {infoMsg && (
          <div className="mx-3 mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 text-white text-xs font-medium shadow-lg animate-fade-in">
            <span>ℹ️</span>
            <span className="flex-1">{infoMsg}</span>
            <button onClick={() => setInfoMsg(null)} className="opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Desktop close bar */}
        <div className="hidden sm:flex items-center justify-end px-3 flex-shrink-0" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Hero */}
          <div className="relative h-36 sm:h-44 flex-shrink-0 overflow-hidden">
            {photos.length > 0 ? (
              <img src={photos[0].dataUrl} alt={name} className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxPhoto(photos[0].dataUrl)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl" style={{ background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)` }}>
                {icon}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 right-10">
              <h2 className="text-white font-bold text-lg leading-tight drop-shadow">{name}</h2>
              {localName && localName !== name && <p className="text-white/80 text-xs mt-0.5">{localName}</p>}
            </div>
            <button onClick={handleClose} className="sm:hidden absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Category + Rating */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${color}18`, color }}>
                {icon}<span className="ml-1">{place.category}</span>
              </span>
              {isOwner && <span className="text-xs text-slate-400">· Added by you</span>}
              {!isOwner && contributorName && <span className="text-xs text-slate-400">· Added by {contributorName}</span>}
            </div>
            {avgRating && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-amber-400 text-sm">★</span>
                <span className="text-sm font-bold text-slate-700">{avgRating}</span>
                <span className="text-xs text-slate-400">({reviews.length})</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-3 pb-3 border-b border-slate-100 grid grid-cols-4 gap-1">
            {[
              { label: 'Directions', color: '#4285F4', onClick: () => onDirections && onDirections(place),
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> },
              { label: isSaved ? 'Saved' : 'Save', color: isSaved ? '#34A853' : '#0F9D58', onClick: () => !isSaved && onSave && onSave(place),
                icon: <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3-7 3V5z" /></svg> },
              { label: 'Photos', color: '#FBBC04', onClick: () => setActiveTab('photos'),
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
              { label: copied ? 'Copied!' : 'Share', color: '#EA4335', onClick: handleShare,
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> },
            ].map((a) => (
              <button key={a.label} onClick={a.onClick} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors min-h-[68px] justify-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${a.color}15`, color: a.color }}>{a.icon}</div>
                <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-slate-100 flex-shrink-0">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${activeTab === tab.id ? 'text-primary-600 border-b-2 border-primary-500' : 'text-slate-500 hover:text-slate-700'}`}
              >{tab.label}</button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div>
              {/* Status */}
              <div className="border-b border-slate-100">
                <button onClick={() => setBusinessOpen((b) => !b)} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${businessOpen ? 'bg-green-500' : 'bg-orange-400'}`} />
                  <div className="flex-1">
                    <span className={`text-sm font-semibold ${businessOpen ? 'text-green-700' : 'text-orange-600'}`}>{businessOpen ? 'Open' : 'Temporarily Closed'}</span>
                    <p className="text-xs text-slate-400 mt-0.5">Tap to toggle status</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>

              {/* Quick facts */}
              {QUICK_FACTS[place.category] && (
                <div className="px-5 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Facts</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_FACTS[place.category].map((fact) => (
                      <span key={fact} className="text-xs py-1 px-2.5 rounded-full bg-slate-100 text-slate-600 font-medium">{fact}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Address */}
              <div className="px-5 py-4 border-b border-slate-100 space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    {addressLoading ? (
                      <div className="space-y-1.5">
                        <div className="h-3.5 bg-slate-100 rounded animate-pulse w-52" />
                        <div className="h-3 bg-slate-100 rounded animate-pulse w-36" />
                      </div>
                    ) : addrString ? (
                      <p className="text-sm text-slate-700 leading-relaxed">{addrString}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Address not available</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
                  </svg>
                  <p className="text-xs text-slate-500 font-mono">{place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}</p>
                </div>
              </div>

              {/* Contributor */}
              {!isOwner && (place.user_name || place.userName) && (
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary-700">{contributorName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Contributed by</p>
                    <p className="text-sm font-medium text-slate-700">{contributorName}</p>
                  </div>
                  {formattedDate && <p className="ml-auto text-xs text-slate-400">{formattedDate}</p>}
                </div>
              )}

              {/* Manage */}
              <div className="border-b border-slate-100">
                <div className="px-5 pt-3 pb-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manage</p>
                </div>
                <button onClick={() => setShowLabelInput((s) => !s)} className="w-full flex items-center gap-3 px-5 py-3 min-h-[44px] hover:bg-slate-50 transition-colors text-left">
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  <span className="text-sm font-medium text-slate-700 flex-1">Add a label</span>
                  <svg className={`w-4 h-4 text-slate-300 transition-transform ${showLabelInput ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showLabelInput && (
                  <div className="px-5 pb-3 -mt-1">
                    <input type="text" value={labelInput} onChange={(e) => setLabelInput(e.target.value)}
                      placeholder="e.g. Home, Work, Favourite…"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700" autoFocus />
                  </div>
                )}
                <button onClick={() => onEdit && onEdit(place)} className="w-full flex items-center gap-3 px-5 py-3 min-h-[44px] hover:bg-slate-50 transition-colors text-left">
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  <span className="text-sm font-medium text-slate-700">{isOwner ? 'Edit place' : 'Suggest an edit'}</span>
                </button>
                <button onClick={() => showInfo('Business claim feature coming soon.')} className="w-full flex items-center gap-3 px-5 py-3 min-h-[44px] hover:bg-slate-50 transition-colors text-left">
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  <span className="text-sm font-medium text-slate-700">Claim this business</span>
                </button>
              </div>

              {/* Nearby */}
              {(nearbyLoading || nearby.length > 0) && (
                <div className="border-b border-slate-100">
                  <div className="px-5 pt-3 pb-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nearby Places</p>
                  </div>
                  {nearbyLoading ? (
                    <div className="px-5 pb-4 space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
                          <div className="flex-1 space-y-1">
                            <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
                            <div className="h-2.5 bg-slate-100 rounded animate-pulse w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
                      {nearby.map((np) => (
                        <div key={np.id} className="flex-shrink-0 w-28 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <div className="text-xl mb-1">{CATEGORY_ICONS[np.category] || '📍'}</div>
                          <p className="text-xs font-semibold text-slate-700 leading-tight line-clamp-2">{np.place_name_en || np.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{np.category}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Owner delete */}
              {isOwner && (
                <div className="px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
                  {formattedDate && <p className="text-xs text-slate-400 mb-3">Added {formattedDate} · by you</p>}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deletingId === place.id}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
                  >
                    {deletingId === place.id ? 'Deleting…' : 'Delete place'}
                  </button>
                </div>
              )}

              {/* Delete confirmation dialog */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
                  <div className="absolute inset-0 bg-black/50" />
                  <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Delete this place?</h3>
                        <p className="text-xs text-slate-500 mt-0.5">This cannot be undone.</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-5">
                      Are you sure you want to delete <span className="font-semibold">{name}</span> from the map?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); onDelete && onDelete(place.id) }}
                        disabled={deletingId === place.id}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {deletingId === place.id ? 'Deleting…' : 'Yes, Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── REVIEWS TAB ── */}
          {activeTab === 'reviews' && (
            <div className="pb-[env(safe-area-inset-bottom)]">
              {/* Rating summary */}
              {!reviewsLoading && reviews.length > 0 && (
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-slate-800">{avgRating}</p>
                    <StarRating value={Math.round(avgRating)} readonly />
                    <p className="text-xs text-slate-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const cnt = reviews.filter((r) => r.rating === star).length
                      const pct = reviews.length ? (cnt / reviews.length) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 w-3">{star}</span>
                          <span className="text-amber-400 text-xs">★</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400 w-4">{cnt}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Write review */}
              {currentUser && !myReview && (
                <form onSubmit={handleSubmitReview} className="px-5 py-4 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Write a review</p>
                  <div className="mb-3">
                    <StarRating value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => { setReviewComment(e.target.value); setReviewError(null) }}
                    placeholder="Share your experience (optional)…"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 resize-none"
                  />
                  {reviewError && <p className="text-xs text-red-500 mt-1">{reviewError}</p>}
                  <button
                    type="submit"
                    disabled={submittingReview || reviewRating === 0}
                    className="mt-2 w-full py-2.5 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {submittingReview ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              )}

              {/* Review list */}
              {reviewsLoading ? (
                <div className="px-5 py-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-24" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <span className="text-3xl mb-2">⭐</span>
                  <p className="text-sm font-medium">No reviews yet</p>
                  <p className="text-xs mt-1">Be the first to review this place!</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {reviews.map((review) => (
                    <li key={review.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary-700">
                              {(review.userName || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{review.userName || 'Anonymous'}</p>
                            <StarRating value={review.rating} readonly />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-slate-400">
                            {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                          {review.userId === currentUser?.id && (
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              disabled={deletingReviewId === review.id}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Delete your review"
                            >
                              {deletingReviewId === review.id ? <span className="text-xs">…</span> : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      {review.comment && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{review.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── PHOTOS TAB ── */}
          {activeTab === 'photos' && (
            <div className="pb-[env(safe-area-inset-bottom)]">
              {currentUser && (
                <div className="px-5 py-4 border-b border-slate-100">
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed border-primary-300 text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {uploadingPhoto ? (
                      <><div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /> Uploading…</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Add Photo</>
                    )}
                  </button>
                  {photoError && <p className="text-xs text-red-500 mt-2 text-center">{photoError}</p>}
                </div>
              )}

              {photosLoading ? (
                <div className="grid grid-cols-3 gap-1 p-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="aspect-square bg-slate-100 rounded-lg animate-pulse" />)}
                </div>
              ) : photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <span className="text-3xl mb-2">📷</span>
                  <p className="text-sm font-medium">No photos yet</p>
                  <p className="text-xs mt-1">Be the first to add a photo!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 p-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square group">
                      <img
                        src={photo.dataUrl}
                        alt={photo.caption || 'Place photo'}
                        className="w-full h-full object-cover rounded-lg cursor-pointer"
                        onClick={() => setLightboxPhoto(photo.dataUrl)}
                      />
                      {photo.userId === currentUser?.id && (
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          disabled={deletingPhotoId === photo.id}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                          {deletingPhotoId === photo.id ? <span className="text-[9px]">…</span> : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
                        </button>
                      )}
                      {photo.userName && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[9px] truncate">{photo.userName}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

