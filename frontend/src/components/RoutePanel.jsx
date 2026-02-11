import { useState } from 'react'
import api from '../services/api'

const RoutePanel = ({ mapRef, onCalculateRoute, onClose }) => {
  const [start, setStart] = useState({ lat: '', lng: '' })
  const [end, setEnd] = useState({ lat: '', lng: '' })
  const [isCalculating, setIsCalculating] = useState(false)
  const [routeData, setRouteData] = useState(null)
  const [error, setError] = useState(null)

  const handleCalculate = async () => {
    if (!start.lat || !start.lng || !end.lat || !end.lng) {
      setError('Please provide both start and end coordinates')
      return
    }

    setIsCalculating(true)
    setError(null)

    try {
      if (mapRef && mapRef.calculateRoute) {
        const route = await mapRef.calculateRoute(
          { lat: parseFloat(start.lat), lng: parseFloat(start.lng) },
          { lat: parseFloat(end.lat), lng: parseFloat(end.lng) }
        )
        setRouteData(route)
      } else if (onCalculateRoute) {
        const route = await onCalculateRoute(
          { lat: parseFloat(start.lat), lng: parseFloat(start.lng) },
          { lat: parseFloat(end.lat), lng: parseFloat(end.lng) }
        )
        setRouteData(route)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate route')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleClear = () => {
    if (mapRef && mapRef.clearRoute) {
      mapRef.clearRoute()
    }
    setRouteData(null)
    setError(null)
  }

  const formatDistance = (meters) => {
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(2)} km`
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <div className="glass rounded-lg p-6 shadow-xl border border-white/20 max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-700">Calculate Route</h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-700 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Start (lat, lng)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={start.lat}
              onChange={(e) => setStart({ ...start, lat: e.target.value })}
              className="flex-1 px-3 py-2 glass rounded border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={start.lng}
              onChange={(e) => setStart({ ...start, lng: e.target.value })}
              className="flex-1 px-3 py-2 glass rounded border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            End (lat, lng)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={end.lat}
              onChange={(e) => setEnd({ ...end, lat: e.target.value })}
              className="flex-1 px-3 py-2 glass rounded border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={end.lng}
              onChange={(e) => setEnd({ ...end, lng: e.target.value })}
              className="flex-1 px-3 py-2 glass rounded border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {routeData && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-slate-600">Distance</div>
                <div className="text-lg font-bold text-slate-700">
                  {formatDistance(routeData.distance)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Duration</div>
                <div className="text-lg font-bold text-slate-700">
                  {formatDuration(routeData.duration)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Route'}
          </button>
          {routeData && (
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoutePanel

