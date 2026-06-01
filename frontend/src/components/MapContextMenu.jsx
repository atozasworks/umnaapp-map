import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslate } from '../lib/i18n'

const MENU_ITEMS = [
  { id: 'share', icon: 'share' },
  { id: 'directionsFrom', icon: 'routeFrom' },
  { id: 'directionsTo', icon: 'routeTo' },
  { id: 'whatsHere', icon: 'pin' },
  { id: 'searchNearby', icon: 'search' },
  { id: 'print', icon: 'print' },
  { id: 'addPlace', icon: 'add' },
  { id: 'report', icon: 'report' },
  { id: 'measure', icon: 'measure' },
]

const MenuIcon = ({ type }) => {
  const cls = 'w-4 h-4 text-slate-600 flex-shrink-0'
  switch (type) {
    case 'share':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      )
    case 'routeFrom':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="6" cy="18" r="2.5" strokeWidth={2} />
          <circle cx="18" cy="6" r="2.5" strokeWidth={2} />
          <path strokeLinecap="round" strokeWidth={2} d="M8.5 16.5L15.5 8.5" />
        </svg>
      )
    case 'routeTo':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="6" cy="6" r="2.5" strokeWidth={2} />
          <circle cx="18" cy="18" r="2.5" strokeWidth={2} />
          <path strokeLinecap="round" strokeWidth={2} d="M8.5 7.5L15.5 14.5" />
        </svg>
      )
    case 'pin':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'search':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    case 'print':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5M9 21V5a2 2 0 012-2h2a2 2 0 012 2v4m2 4a2 2 0 01-2 2H9" />
        </svg>
      )
    case 'add':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-6-6h12" />
        </svg>
      )
    case 'report':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    case 'measure':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      )
    default:
      return null
  }
}

const MapContextMenu = ({ position, coordinates, onAction, onClose }) => {
  const menuRef = useRef(null)
  const [adjusted, setAdjusted] = useState(position)

  const tCoordinates = useTranslate('Coordinates')
  const tShare = useTranslate('Share this location')
  const tDirectionsFrom = useTranslate('Directions from here')
  const tDirectionsTo = useTranslate('Directions to here')
  const tWhatsHere = useTranslate("What's here?")
  const tSearchNearby = useTranslate('Search nearby')
  const tPrint = useTranslate('Print')
  const tAddPlace = useTranslate('Add a missing place')
  const tReport = useTranslate('Report a data problem')
  const tMeasure = useTranslate('Measure distance')

  const labels = {
    share: tShare,
    directionsFrom: tDirectionsFrom,
    directionsTo: tDirectionsTo,
    whatsHere: tWhatsHere,
    searchNearby: tSearchNearby,
    print: tPrint,
    addPlace: tAddPlace,
    report: tReport,
    measure: tMeasure,
  }

  useLayoutEffect(() => {
    if (!position || !menuRef.current) {
      setAdjusted(position)
      return
    }
    const rect = menuRef.current.getBoundingClientRect()
    const pad = 8
    let { x, y } = position
    if (x + rect.width > window.innerWidth - pad) {
      x = Math.max(pad, window.innerWidth - rect.width - pad)
    }
    if (y + rect.height > window.innerHeight - pad) {
      y = Math.max(pad, window.innerHeight - rect.height - pad)
    }
    setAdjusted({ x, y })
  }, [position])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointer = (e) => {
      if (menuRef.current?.contains(e.target)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer, { passive: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [onClose])

  if (!position || !coordinates) return null

  const { lat, lng } = coordinates
  const coordText = `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Map context menu"
      className="fixed z-[55] min-w-[220px] max-w-[min(280px,calc(100vw-16px))] bg-white rounded-lg shadow-2xl border border-slate-200/90 overflow-hidden animate-fade-in origin-top-left"
      style={{
        left: adjusted?.x ?? position.x,
        top: adjusted?.y ?? position.y,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/90">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
          {tCoordinates}
        </p>
        <p className="text-xs font-mono text-slate-700 leading-snug break-all select-all">{coordText}</p>
      </div>
      <ul className="py-1 max-h-[min(70vh,420px)] overflow-y-auto overscroll-contain">
        {MENU_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAction(item.id)
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation min-h-[44px] sm:min-h-[40px] sm:py-2"
            >
              <MenuIcon type={item.icon} />
              <span className="font-normal leading-snug">{labels[item.id]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MapContextMenu
