/**
 * Public Utility Finder — OSM tag filters and related DB categories.
 * Shared by the utilities nearby API (add-only feature).
 */

export const UTILITY_RADIUS_METERS = [1000, 2000, 5000, 10000]
export const UTILITY_DEFAULT_RADIUS_METERS = 2000
export const UTILITY_NEARBY_LIMIT = 60

/**
 * @typedef {{ col: string, values: string[] }} OsmTagFilter
 * @typedef {{
 *   id: string,
 *   label: string,
 *   defaultName: string,
 *   osmFilters: OsmTagFilter[],
 *   dbCategories: string[],
 *   searchQueries: string[],
 * }} UtilityTypeDef
 */

/** @type {UtilityTypeDef[]} */
export const PUBLIC_UTILITY_TYPES = [
  {
    id: 'toilets',
    label: 'Public Toilets',
    defaultName: 'Public Toilet',
    osmFilters: [{ col: 'amenity', values: ['toilets'] }],
    dbCategories: [],
    searchQueries: ['public toilet', 'toilet'],
  },
  {
    id: 'drinking_water',
    label: 'Drinking Water',
    defaultName: 'Drinking Water',
    osmFilters: [{ col: 'amenity', values: ['drinking_water'] }],
    dbCategories: [],
    searchQueries: ['drinking water', 'water point'],
  },
  {
    id: 'charging',
    label: 'Charging Stations',
    defaultName: 'Charging Station',
    osmFilters: [{ col: 'amenity', values: ['charging_station'] }],
    dbCategories: [],
    searchQueries: ['EV charging', 'charging station'],
  },
  {
    id: 'wifi',
    label: 'Public WiFi',
    defaultName: 'Public WiFi',
    osmFilters: [{ col: 'amenity', values: ['internet_cafe'] }],
    dbCategories: [],
    searchQueries: ['wifi', 'public wifi', 'internet cafe'],
  },
  {
    id: 'parking',
    label: 'Public Parking',
    defaultName: 'Parking',
    osmFilters: [{ col: 'amenity', values: ['parking'] }],
    dbCategories: ['Parking'],
    searchQueries: ['parking'],
  },
  {
    id: 'bus_stop',
    label: 'Bus Stops',
    defaultName: 'Bus Stop',
    osmFilters: [{ col: 'highway', values: ['bus_stop'] }],
    dbCategories: ['Bus Stop'],
    searchQueries: ['bus stop'],
  },
  {
    id: 'police',
    label: 'Police Stations',
    defaultName: 'Police Station',
    osmFilters: [{ col: 'amenity', values: ['police'] }],
    dbCategories: ['Police Station'],
    searchQueries: ['police station'],
  },
  {
    id: 'fire_station',
    label: 'Fire Stations',
    defaultName: 'Fire Station',
    osmFilters: [{ col: 'amenity', values: ['fire_station'] }],
    dbCategories: [],
    searchQueries: ['fire station'],
  },
  {
    id: 'hospital',
    label: 'Hospitals',
    defaultName: 'Hospital',
    osmFilters: [
      { col: 'amenity', values: ['hospital'] },
      { col: 'healthcare', values: ['hospital'] },
    ],
    dbCategories: ['Hospital'],
    searchQueries: ['hospital'],
  },
  {
    id: 'atm',
    label: 'ATMs',
    defaultName: 'ATM',
    osmFilters: [{ col: 'amenity', values: ['atm'] }],
    dbCategories: ['ATM'],
    searchQueries: ['ATM'],
  },
]

const byId = new Map(PUBLIC_UTILITY_TYPES.map((t) => [t.id, t]))

export function getUtilityType(typeId) {
  return byId.get(String(typeId || '').trim()) || null
}

export function listUtilityTypeIds() {
  return PUBLIC_UTILITY_TYPES.map((t) => t.id)
}
