/** Extract contact, media, and address fields from OSM tag objects (hstore / JSON). */

function normalizeTags(raw) {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return typeof raw === 'object' ? raw : {}
}

export function pickOsmTag(tags, keys) {
  const t = normalizeTags(tags)
  for (const key of keys) {
    const v = t[key]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

function wikimediaCommonsPhotoUrl(value) {
  const v = String(value || '').trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  const file = v.replace(/^File:/i, '').trim()
  if (!file) return null
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`
}

function normalizePhotoUrl(value) {
  const v = String(value || '').trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  if (v.startsWith('//')) return `https:${v}`
  return null
}

/** Phone, website, description, and opening_hours from OSM tags. */
export function extractOsmContact(tags) {
  const t = normalizeTags(tags)
  const phone = pickOsmTag(t, ['phone', 'contact:phone', 'contact:mobile', 'mobile', 'contact:fax'])
  const website = pickOsmTag(t, ['website', 'contact:website', 'url', 'contact:url'])
  const description = pickOsmTag(t, ['description', 'note', 'information', 'fixme'])
  const openingHoursRaw = pickOsmTag(t, ['opening_hours', 'opening_hours:covid19'])
  return { phone, website, description, openingHoursRaw }
}

/** Photo URLs from common OSM image tags. */
export function extractOsmPhotos(tags) {
  const t = normalizeTags(tags)
  const urls = []
  const seen = new Set()

  const add = (url) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    urls.push(url)
  }

  for (const key of ['image', 'image:url', 'image:0', 'thumbnail', 'photo', 'mapillary']) {
    const direct = normalizePhotoUrl(pickOsmTag(t, [key]))
    if (direct) add(direct)
  }

  const wikimedia = wikimediaCommonsPhotoUrl(pickOsmTag(t, ['wikimedia_commons', 'wikimedia_commons:path']))
  if (wikimedia) add(wikimedia)

  return urls
}

/** Structured address parts from addr:* tags. */
export function extractOsmAddressFields(tags) {
  const t = normalizeTags(tags)
  const housenumber = pickOsmTag(t, ['addr:housenumber', 'addr:house_number'])
  const street = pickOsmTag(t, ['addr:street', 'addr:road', 'addr:place'])
  const suburb = pickOsmTag(t, ['addr:suburb', 'addr:neighbourhood', 'addr:hamlet'])
  const city = pickOsmTag(t, ['addr:city', 'addr:town', 'addr:village', 'addr:locality'])
  const district = pickOsmTag(t, ['addr:district', 'addr:county', 'addr:state_district'])
  const state = pickOsmTag(t, ['addr:state', 'addr:province', 'addr:region'])
  const country = pickOsmTag(t, ['addr:country'])
  const pincode = pickOsmTag(t, ['addr:postcode', 'addr:postal_code'])

  const streetLine = [housenumber, street].filter(Boolean).join(' ').trim()
  const parts = [streetLine, suburb, city, district, state, country].filter(Boolean)
  const fullAddress = parts.join(', ')

  return {
    fullAddress: fullAddress || null,
    village: pickOsmTag(t, ['addr:village', 'addr:hamlet', 'addr:locality']) || suburb || city || null,
    taluk: pickOsmTag(t, ['addr:subdistrict']) || null,
    district: district || null,
    state: state || null,
    country: country || null,
    pincode: pincode || null,
    vicinity: streetLine || suburb || null,
  }
}

/** Map OSM opening_hours tag to the shape used by PlaceDetailPanel. */
export function formatOsmOpeningHours(raw) {
  const text = String(raw || '').trim()
  if (!text) return null
  const lines = text
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    weekday_text: lines.length > 0 ? lines : [text],
    raw: text,
    source: 'osm',
  }
}

/** Merge tag-derived detail fields into a unified OSM place record. */
export function enrichOsmPlaceFromTags(place, tags) {
  if (!place) return null
  const contact = extractOsmContact(tags)
  const photos = extractOsmPhotos(tags)
  const address = extractOsmAddressFields(tags)
  const openingHours = formatOsmOpeningHours(contact.openingHoursRaw)

  return {
    ...place,
    ...address,
    full_address: address.fullAddress,
    phone: contact.phone || null,
    website: contact.website || null,
    description: contact.description || null,
    openingHours,
    opening_hours: openingHours,
    osmPhotos: photos,
    osm_photos: photos,
    googlePhotos: photos.length ? photos.map((url) => ({ url })) : null,
    google_photos: photos.length ? photos.map((url) => ({ url })) : null,
  }
}
