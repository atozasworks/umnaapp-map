/** Public Utility Finder — types, radii, colors, Google Maps helpers. */

export const UTILITY_RADIUS_OPTIONS = [
  { meters: 1000, label: '1 km' },
  { meters: 2000, label: '2 km' },
  { meters: 5000, label: '5 km' },
  { meters: 10000, label: '10 km' },
]

export const UTILITY_DEFAULT_RADIUS_METERS = 2000

export const PUBLIC_UTILITY_TYPES = [
  { id: 'toilets', label: 'Public Toilets', color: '#0EA5E9', icon: 'toilet' },
  { id: 'drinking_water', label: 'Drinking Water', color: '#06B6D4', icon: 'water' },
  { id: 'charging', label: 'Charging Stations', color: '#22C55E', icon: 'bolt' },
  { id: 'wifi', label: 'Public WiFi', color: '#8B5CF6', icon: 'wifi' },
  { id: 'parking', label: 'Public Parking', color: '#6366F1', icon: 'parking' },
  { id: 'bus_stop', label: 'Bus Stops', color: '#0284C7', icon: 'bus' },
  { id: 'police', label: 'Police Stations', color: '#DC2626', icon: 'shield' },
  { id: 'fire_station', label: 'Fire Stations', color: '#EA580C', icon: 'fire' },
  { id: 'hospital', label: 'Hospitals', color: '#EF4444', icon: 'hospital' },
  { id: 'atm', label: 'ATMs', color: '#059669', icon: 'atm' },
]

const byId = new Map(PUBLIC_UTILITY_TYPES.map((t) => [t.id, t]))

export function getUtilityTypeMeta(typeId) {
  return byId.get(String(typeId || '').trim()) || null
}

export function utilityMarkerColor(typeId, category) {
  const meta = getUtilityTypeMeta(typeId)
  if (meta?.color) return meta.color
  return '#0284C7'
}

/** Google Maps directions / navigation URL. */
export function buildGoogleMapsNavUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${Number(lat)},${Number(lng)}`)}`
}

/** Map API result → overlay marker shape used by MapComponent. */
export function toUtilityOverlayPlace(place, typeId) {
  const lat = Number(place.latitude ?? place.lat)
  const lng = Number(place.longitude ?? place.lng)
  const meta = getUtilityTypeMeta(typeId)
  const category = place.category || meta?.label || 'Public Utility'
  return {
    placeId: place.placeId || place.id,
    id: place.placeId || place.id,
    displayName: place.name || place.place_name_en || category,
    name: place.name || place.place_name_en || category,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    category,
    utilityType: typeId,
    distanceMeters: place.distanceMeters ?? null,
    address: place.address || null,
    markerColor: utilityMarkerColor(typeId, category),
    source: place.source || null,
    _isUtility: true,
  }
}
