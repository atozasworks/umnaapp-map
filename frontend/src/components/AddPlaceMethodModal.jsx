const AddPlaceMethodModal = ({ isOpen, onClose, onSelectMapPick, onSelectManualCoords, currentLocation, onUseCurrentLocation }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/30 sm:bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-sm glass rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/30 overflow-hidden animate-slide-up sm:animate-fade-in">
        {/* Header */}
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

        {/* Options */}
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600 mb-4">How would you like to add a place?</p>

          {/* Option 1: Map / Current Location */}
          <button
            onClick={onSelectMapPick}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/50 active:bg-primary-100/60 transition-all text-left group"
          >
            <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-200 transition-colors">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-700 transition-colors">
                Choose current location / Select from map
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Click on the map to pick a location, or use your GPS position
              </p>
            </div>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary-500 flex-shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Use current location shortcut */}
          {currentLocation?.lat != null && currentLocation?.lng != null && (
            <button
              onClick={onUseCurrentLocation}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700">Use my current location</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                </p>
              </div>
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Option 2: Manual lat/lng */}
          <button
            onClick={onSelectManualCoords}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/50 active:bg-primary-100/60 transition-all text-left group"
          >
            <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-700 transition-colors">
                Add using latitude & longitude
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter coordinates manually from Google Maps or any other source
              </p>
            </div>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary-500 flex-shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddPlaceMethodModal
